function object(value, error) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(error)
  return value
}

function text(value, field, max = 256) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${field}_invalid`)
  return value.trim()
}

function amount(value, field) {
  const raw = typeof value === 'number' ? String(value) : String(value ?? '')
  if (!/^\d+(?:\.\d{1,6})?$/.test(raw)) throw new Error(`${field}_invalid`)
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field}_invalid`)
  return n
}

function parseOptionalTime(value, field) {
  if (value === undefined || value === null) return null
  const t = Date.parse(String(value))
  if (!Number.isFinite(t)) throw new Error(`${field}_invalid`)
  return t
}

function same(a, b) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
}

/**
 * Deterministic payment-intent assurance. This never executes a payment.
 * It answers whether the proposed request is still inside an externally supplied
 * user/company mandate. The model cannot create or broaden the mandate here.
 */
export function paymentIntentPreflight(input, { now = Date.now() } = {}) {
  object(input, 'payment_intent_body_must_be_object')
  const intent = object(input.intent, 'payment_intent_required')
  const request = object(input.request, 'payment_request_required')
  const merchant = object(input.merchant, 'payment_merchant_required')
  const mandate = input.mandate === undefined ? null : object(input.mandate, 'payment_mandate_invalid')

  const normalized = {
    intentId: text(intent.intentId, 'intentId', 128),
    intentMerchantId: text(intent.merchantId, 'intent_merchantId', 256),
    intentBeneficiary: text(intent.beneficiary, 'intent_beneficiary', 256),
    intentAmount: amount(intent.amount, 'intent_amount'),
    intentCurrency: text(intent.currency, 'intent_currency', 16).toUpperCase(),
    requestMerchantId: text(request.merchantId, 'request_merchantId', 256),
    requestBeneficiary: text(request.beneficiary, 'request_beneficiary', 256),
    requestAmount: amount(request.amount, 'request_amount'),
    requestCurrency: text(request.currency, 'request_currency', 16).toUpperCase(),
    merchantId: text(merchant.id, 'merchant_id', 256),
  }

  const blockers = []
  const reviewReasons = []
  const checks = {}

  checks.merchant = {
    verified: merchant.verified === true,
    identityBound: same(normalized.merchantId, normalized.requestMerchantId) && same(normalized.requestMerchantId, normalized.intentMerchantId),
  }
  if (!checks.merchant.verified) blockers.push('merchant:not_verified')
  if (!checks.merchant.identityBound) blockers.push('merchant:intent_mismatch')

  checks.beneficiary = {
    bound: same(normalized.requestBeneficiary, normalized.intentBeneficiary),
  }
  if (!checks.beneficiary.bound) blockers.push('beneficiary:intent_mismatch')

  checks.amount = {
    exact: normalized.requestAmount === normalized.intentAmount,
    requested: normalized.requestAmount,
    approved: normalized.intentAmount,
  }
  if (!checks.amount.exact) blockers.push(normalized.requestAmount > normalized.intentAmount ? 'amount:above_intent' : 'amount:intent_mismatch')

  checks.currency = {
    bound: normalized.requestCurrency === normalized.intentCurrency,
    requested: normalized.requestCurrency,
    approved: normalized.intentCurrency,
  }
  if (!checks.currency.bound) blockers.push('currency:intent_mismatch')

  const intentExpiry = parseOptionalTime(intent.validUntil, 'intent_validUntil')
  checks.intentFreshness = {
    validUntil: intentExpiry ? new Date(intentExpiry).toISOString() : null,
    valid: intentExpiry === null || intentExpiry >= now,
  }
  if (!checks.intentFreshness.valid) blockers.push('intent:expired')

  checks.replay = {
    replayDetected: input.replayDetected === true,
  }
  if (checks.replay.replayDetected) blockers.push('request:replay_detected')

  let mandateCovered = false
  if (mandate) {
    const mandateExpiry = parseOptionalTime(mandate.validUntil, 'mandate_validUntil')
    const maxAmount = amount(mandate.maxAmount, 'mandate_maxAmount')
    const currencies = Array.isArray(mandate.currencies) ? mandate.currencies.map((v) => String(v).toUpperCase()) : []
    const merchants = Array.isArray(mandate.merchantIds) ? mandate.merchantIds.map(String) : []
    const beneficiaries = Array.isArray(mandate.beneficiaries) ? mandate.beneficiaries.map(String) : []
    mandateCovered = mandate.active === true
      && (mandateExpiry === null || mandateExpiry >= now)
      && normalized.requestAmount <= maxAmount
      && currencies.some((v) => same(v, normalized.requestCurrency))
      && merchants.some((v) => same(v, normalized.requestMerchantId))
      && beneficiaries.some((v) => same(v, normalized.requestBeneficiary))
    checks.mandate = {
      active: mandate.active === true,
      valid: mandateExpiry === null || mandateExpiry >= now,
      covered: mandateCovered,
      maxAmount,
    }
  } else {
    checks.mandate = { active: false, valid: false, covered: false, maxAmount: null }
  }

  const humanApprovalPresent = input.humanApproval === true
  checks.approval = { humanApprovalPresent, mandateCovered }
  if (!humanApprovalPresent && !mandateCovered) reviewReasons.push('approval_or_mandate_required')

  const decision = blockers.length ? 'block' : reviewReasons.length ? 'review' : 'allow'

  return Object.freeze({
    decision,
    intentId: normalized.intentId,
    blockers: Object.freeze(blockers),
    reviewReasons: Object.freeze(reviewReasons),
    checks: Object.freeze(checks),
    authority: Object.freeze({
      paymentGrantedAuthority: false,
      paymentExecutionPerformed: false,
      authorizationSource: humanApprovalPresent ? 'human_approval' : mandateCovered ? 'verified_mandate' : 'none',
    }),
    checkedAt: new Date(now).toISOString(),
    limitation: 'This verifies supplied intent/merchant/beneficiary/amount/currency/mandate/replay bindings. It does not prove merchant fulfilment, source-system integrity, zero fraud, or recovery rights.',
  })
}
