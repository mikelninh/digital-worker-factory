const APPROVAL_ACTIONS = new Set([
  'external_message',
  'commit_price',
  'send_proposal',
  'create_payment_request',
  'send_renewal_offer',
])

const ACTION_RULES = Object.freeze({
  qualify: { from: ['lead'], to: 'qualified' },
  prepare_outreach: { from: ['qualified'], to: 'outreach_ready' },
  external_message: { from: ['outreach_ready'], to: 'contacted' },
  record_discovery: { from: ['contacted'], to: 'discovery' },
  prepare_proposal: { from: ['discovery'], to: 'proposal_ready' },
  commit_price: { from: ['proposal_ready'], to: 'proposal_ready' },
  send_proposal: { from: ['proposal_ready'], to: 'proposal_sent' },
  create_payment_request: { from: ['proposal_sent'], to: 'awaiting_payment' },
  record_payment: { from: ['awaiting_payment'], to: null },
  start_onboarding: { from: ['paid'], to: 'onboarding' },
  start_delivery: { from: ['onboarding'], to: 'delivery' },
  record_delivery_outcome: { from: ['delivery'], to: 'proof' },
  prepare_renewal: { from: ['proof'], to: 'proof' },
  send_renewal_offer: { from: ['proof'], to: 'recurring' },
  record_recurring_payment: { from: ['recurring'], to: 'recurring' },
  mark_expansion: { from: ['proof', 'recurring'], to: 'expansion' },
  deal_lost: {
    from: ['lead', 'qualified', 'outreach_ready', 'contacted', 'discovery', 'proposal_ready', 'proposal_sent', 'awaiting_payment'],
    to: 'lost',
  },
})

const TERMINAL = new Set(['lost'])

function clean(value) {
  return String(value ?? '').trim()
}

function nowIso(now) {
  if (typeof now === 'string') return now
  if (now instanceof Date) return now.toISOString()
  return new Date().toISOString()
}

function positive(value, field, { allowZero = false } = {}) {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new TypeError(`${field} must be ${allowZero ? 'a non-negative' : 'a positive'} number`)
  }
}

function clone(record) {
  return {
    ...record,
    evidence: Array.isArray(record?.evidence) ? [...record.evidence] : [],
    payments: Array.isArray(record?.payments) ? [...record.payments] : [],
    history: Array.isArray(record?.history) ? [...record.history] : [],
  }
}

function assertRule(record, action) {
  const rule = ACTION_RULES[action]
  if (!rule) throw new TypeError(`Unknown commercial action: ${action}`)
  if (!rule.from.includes(record.stage)) {
    throw new Error(`Action ${action} is not allowed from stage ${record.stage}`)
  }
  return rule
}

export function requiresCommercialApproval(action) {
  return APPROVAL_ACTIONS.has(action)
}

export function getProduct(catalog, productId) {
  const products = Array.isArray(catalog?.products) ? catalog.products : []
  return products.find((product) => product.id === productId) ?? null
}

export function createCommercialLead({
  id,
  productId,
  account,
  contact = null,
  sourceOpportunityId = null,
  evidence = [],
  hypothesis = '',
  now = new Date(),
} = {}) {
  if (!clean(id)) throw new TypeError('id is required')
  if (!clean(productId)) throw new TypeError('productId is required')
  if (!clean(account)) throw new TypeError('account is required')
  if (!Array.isArray(evidence) || evidence.length === 0) throw new TypeError('at least one evidence item is required')

  const timestamp = nowIso(now)
  return {
    id,
    productId,
    account,
    contact,
    sourceOpportunityId,
    evidence: [...evidence],
    hypothesis,
    stage: 'lead',
    committedPriceEur: null,
    kickoffRequiredEur: null,
    collectedCashEur: 0,
    recurringMonthlyEur: 0,
    measuredCustomerValueEur: 0,
    actualFounderHours: 0,
    payments: [],
    history: [{ at: timestamp, event: 'commercial_lead_created' }],
  }
}

export function nextCommercialAction(record) {
  if (!record || TERMINAL.has(record.stage)) return null
  switch (record.stage) {
    case 'lead': return 'qualify'
    case 'qualified': return 'prepare_outreach'
    case 'outreach_ready': return 'external_message'
    case 'contacted': return 'record_discovery'
    case 'discovery': return 'prepare_proposal'
    case 'proposal_ready':
      if (!record.priceApproved) return 'commit_price'
      return 'send_proposal'
    case 'proposal_sent': return 'create_payment_request'
    case 'awaiting_payment': return 'record_payment'
    case 'paid': return 'start_onboarding'
    case 'onboarding': return 'start_delivery'
    case 'delivery': return 'record_delivery_outcome'
    case 'proof': return record.renewalPrepared ? 'send_renewal_offer' : 'prepare_renewal'
    case 'recurring': return 'record_recurring_payment'
    case 'expansion': return null
    default: return null
  }
}

export function buildCommercialQueue(records = [], { maxActions = 10 } = {}) {
  return records
    .filter((record) => record && !TERMINAL.has(record.stage))
    .map((record) => {
      const action = nextCommercialAction(record)
      return action ? {
        id: record.id,
        productId: record.productId,
        account: record.account,
        stage: record.stage,
        action,
        approvalRequired: requiresCommercialApproval(action),
        collectedCashEur: record.collectedCashEur ?? 0,
        recurringMonthlyEur: record.recurringMonthlyEur ?? 0,
      } : null
    })
    .filter(Boolean)
    .slice(0, maxActions)
}

export function executeCommercialAction(record, {
  action,
  approvedBy = null,
  product = null,
  outcome = {},
  now = new Date(),
} = {}) {
  if (!record || typeof record !== 'object') throw new TypeError('record is required')
  if (!action) throw new TypeError('action is required')
  const rule = assertRule(record, action)
  const approvalRequired = requiresCommercialApproval(action)
  const timestamp = nowIso(now)

  if (approvalRequired && !clean(approvedBy)) {
    const blocked = clone(record)
    blocked.blocked = { action, reason: 'human_approval_required' }
    blocked.history.push({ at: timestamp, event: 'action_blocked', action, reason: 'human_approval_required' })
    return blocked
  }

  const next = clone(record)
  delete next.blocked
  if (rule.to) next.stage = rule.to

  if (approvalRequired) {
    next.history.push({ at: timestamp, event: 'human_approval_recorded', action, by: approvedBy })
  }

  if (action === 'qualify') {
    if (outcome.qualified === false) {
      next.stage = 'lost'
      next.lossReason = outcome.lossReason || 'not_qualified'
    }
  }

  if (action === 'record_discovery') {
    if (!clean(outcome.workflow)) throw new TypeError('record_discovery requires outcome.workflow')
    next.workflow = outcome.workflow
    next.successMetric = clean(outcome.successMetric) || null
  }

  if (action === 'prepare_proposal') {
    next.proposalPrepared = true
    next.proposalVersion = (next.proposalVersion ?? 0) + 1
  }

  if (action === 'commit_price') {
    let price = outcome.priceEur
    if (product?.pricingMode === 'fixed') price = product.priceEurNet
    positive(price, 'priceEur')
    next.committedPriceEur = price
    next.priceApproved = true
    const kickoffPercent = Number.isFinite(product?.kickoffPercent) ? product.kickoffPercent : 100
    next.kickoffRequiredEur = Math.round((price * kickoffPercent) / 100 * 100) / 100
  }

  if (action === 'send_proposal') {
    if (!next.priceApproved || !Number.isFinite(next.committedPriceEur)) {
      throw new Error('proposal cannot be sent before price approval')
    }
    next.proposalSentAt = timestamp
  }

  if (action === 'create_payment_request') {
    if (!Number.isFinite(next.kickoffRequiredEur) || next.kickoffRequiredEur <= 0) {
      throw new Error('payment request requires an approved commercial price')
    }
    next.paymentRequest = {
      status: 'provider_pending',
      amountEur: next.kickoffRequiredEur,
      currency: product?.currency || 'EUR',
      provider: outcome.provider || null,
      reference: outcome.reference || null,
      createdAt: timestamp,
    }
  }

  if (action === 'record_payment' || action === 'record_recurring_payment') {
    positive(outcome.amountEur, 'amountEur')
    if (!clean(outcome.provider)) throw new TypeError('payment requires outcome.provider')
    if (!clean(outcome.reference)) throw new TypeError('payment requires outcome.reference')
    const payment = {
      amountEur: outcome.amountEur,
      provider: outcome.provider,
      reference: outcome.reference,
      occurredAt: outcome.occurredAt || timestamp,
      kind: action === 'record_recurring_payment' ? 'recurring' : 'initial',
    }
    next.payments.push(payment)
    next.collectedCashEur = next.payments.reduce((sum, item) => sum + item.amountEur, 0)

    if (action === 'record_payment') {
      const required = next.kickoffRequiredEur ?? next.committedPriceEur
      if (Number.isFinite(required) && next.collectedCashEur >= required) next.stage = 'paid'
    }
  }

  if (action === 'start_onboarding') {
    next.onboarding = {
      status: 'ready',
      requiredInputs: outcome.requiredInputs || ['named_reviewer', 'success_metric', 'bounded_sample'],
      workspacePath: outcome.workspacePath || null,
    }
  }

  if (action === 'start_delivery') {
    if (!next.onboarding) throw new Error('delivery requires onboarding')
    next.deliveryStartedAt = timestamp
  }

  if (action === 'record_delivery_outcome') {
    positive(outcome.measuredCustomerValueEur, 'measuredCustomerValueEur', { allowZero: true })
    positive(outcome.actualFounderHours, 'actualFounderHours', { allowZero: true })
    next.measuredCustomerValueEur = outcome.measuredCustomerValueEur
    next.actualFounderHours = outcome.actualFounderHours
    next.proof = {
      sampleSize: Number.isInteger(outcome.sampleSize) ? outcome.sampleSize : null,
      verdict: outcome.verdict || 'review',
      evidence: Array.isArray(outcome.evidence) ? [...outcome.evidence] : [],
      recordedAt: timestamp,
    }
  }

  if (action === 'prepare_renewal') {
    next.renewalPrepared = true
    next.renewalProposal = {
      productId: outcome.productId || product?.recurringExpansion || null,
      monthlyEur: Number.isFinite(outcome.monthlyEur) ? outcome.monthlyEur : null,
      basis: outcome.basis || 'measured_customer_value',
    }
  }

  if (action === 'send_renewal_offer') {
    if (!next.renewalPrepared) throw new Error('renewal must be prepared before sending')
    if (!Number.isFinite(outcome.monthlyEur) || outcome.monthlyEur <= 0) {
      throw new TypeError('send_renewal_offer requires positive outcome.monthlyEur')
    }
    next.recurringMonthlyEur = outcome.monthlyEur
    next.renewalSentAt = timestamp
  }

  if (action === 'mark_expansion') {
    next.expansion = {
      productId: outcome.productId || null,
      reason: outcome.reason || 'adjacent_workflow',
      recordedAt: timestamp,
    }
  }

  if (action === 'deal_lost') {
    next.lossReason = outcome.lossReason || 'unknown'
  }

  next.history.push({ at: timestamp, event: 'action_executed', action })
  return next
}

export function upsertCommercialRecord(records = [], record) {
  const index = records.findIndex((candidate) => candidate.id === record.id)
  if (index < 0) return [...records, clone(record)]
  const next = [...records]
  next[index] = clone(record)
  return next
}

export function summarizeCommercialPortfolio(records = []) {
  const decided = records.filter((record) => record.stage === 'lost' || record.collectedCashEur > 0)
  const paid = records.filter((record) => record.collectedCashEur > 0)
  const collectedCashEur = records.reduce((sum, record) => sum + (Number.isFinite(record.collectedCashEur) ? record.collectedCashEur : 0), 0)
  const recurringMonthlyEur = records.reduce((sum, record) => sum + (Number.isFinite(record.recurringMonthlyEur) ? record.recurringMonthlyEur : 0), 0)
  const measuredCustomerValueEur = records.reduce((sum, record) => sum + (Number.isFinite(record.measuredCustomerValueEur) ? record.measuredCustomerValueEur : 0), 0)
  const actualFounderHours = records.reduce((sum, record) => sum + (Number.isFinite(record.actualFounderHours) ? record.actualFounderHours : 0), 0)

  return {
    records: records.length,
    paidCustomers: paid.length,
    lost: records.filter((record) => record.stage === 'lost').length,
    conversionRate: decided.length === 0 ? null : paid.length / decided.length,
    collectedCashEur,
    recurringMonthlyEur,
    measuredCustomerValueEur,
    actualFounderHours,
    cashPerFounderHour: actualFounderHours > 0 ? collectedCashEur / actualFounderHours : null,
  }
}

export const COMMERCIAL_APPROVAL_ACTIONS = Object.freeze([...APPROVAL_ACTIONS])
export const COMMERCIAL_ACTIONS = Object.freeze(Object.keys(ACTION_RULES))
