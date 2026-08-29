import crypto from 'node:crypto'

const SENSITIVE_KEYS = /(?:private[_-]?key|secret|authorization[_-]?header|raw[_-]?signed|signed[_-]?transaction|payment[_-]?response[_-]?raw|payment[_-]?authorization|wallet[_-]?credential|access[_-]?token|refresh[_-]?token|signature)/i

export function redactSensitive(value, stats = { redacted: 0 }) {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, stats))
  if (!value || typeof value !== 'object') return value

  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.test(key)) {
      out[key] = '[REDACTED]'
      stats.redacted += 1
    } else {
      out[key] = redactSensitive(item, stats)
    }
  }
  return out
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value)).digest('hex')}`
}

function objectDigest(value) {
  return sha256(JSON.stringify(stable(value)))
}

export function evidenceDigest(evidence = {}) {
  const stats = { redacted: 0 }
  const sanitized = redactSensitive(evidence, stats)
  return { hash: objectDigest(sanitized), sanitized, redactedFields: stats.redacted }
}

function actionReceipt(action = {}) {
  const stats = { redacted: 0 }
  const sanitized = redactSensitive(action, stats)
  const summary = {
    type: action?.type ?? null,
    purpose: action?.purpose ?? null,
  }

  if (action?.amount && typeof action.amount === 'object') {
    summary.amount = {
      currency: action.amount.currency ?? null,
      value: Number.isFinite(Number(action.amount.value)) ? Number(action.amount.value) : null,
    }
  }
  if (typeof action?.counterpartyApproved === 'boolean') summary.counterpartyApproved = action.counterpartyApproved
  if (action?.idempotencyKey) summary.idempotencyKeyDigest = sha256(action.idempotencyKey)

  // Preserve only the fact that sensitive fields were present, never their values.
  for (const key of Object.keys(action || {})) {
    if (SENSITIVE_KEYS.test(key)) summary[key] = '[REDACTED]'
  }

  return {
    summary,
    digest: objectDigest(sanitized),
    redactedFields: stats.redacted,
  }
}

function safeFailureMessage(message) {
  return String(message || '')
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\b0x[a-fA-F0-9]{64,}\b/g, '[REDACTED_HEX]')
    .replace(/\b[A-Za-z0-9+/=_-]{96,}\b/g, '[REDACTED_BLOB]')
    .slice(0, 240)
}

export function classifyExecutionError(error, context = {}) {
  const safeContext = context || {}
  const message = String(error?.message || error || '')
  const lower = message.toLowerCase()

  if (lower.includes('replacement transaction underpriced')) {
    return {
      failureLayer: 'facilitator_settlement',
      errorReason: 'invalid_exact_evm_transaction_failed',
      detail: 'replacement transaction underpriced',
      attributedToAuthorityKernel: false,
    }
  }

  return {
    failureLayer: safeContext.failureLayer || 'provider_execution',
    errorReason: safeContext.errorReason || 'provider_execution_failed',
    detail: safeFailureMessage(message) || 'unknown execution failure',
    attributedToAuthorityKernel: false,
  }
}

export function createAuthorityReceipt({
  traceId,
  at,
  actor,
  principal,
  delegation,
  action,
  decision,
  evidence,
  approval,
  execution,
  failure = null,
} = {}) {
  const evidenceInfo = evidenceDigest(evidence || {})
  const actionInfo = actionReceipt(action || {})

  return {
    spec: 'authority-receipt/0.2',
    traceId,
    at,
    actor: { id: actor?.id ?? null, role: actor?.role ?? null },
    principal: { id: principal?.id ?? null, type: principal?.type ?? null },
    delegation: { id: delegation?.id ?? null },
    action: actionInfo.summary,
    actionDigest: actionInfo.digest,
    authority: {
      decision: decision?.decision ?? null,
      reasons: decision?.reasons ?? [],
      policyVersion: decision?.authority?.policyVersion ?? null,
      autonomyLevel: decision?.authority?.autonomyLevel ?? null,
    },
    approval: approval?.approvedBy ? { approvedBy: approval.approvedBy, at: approval.at ?? null } : null,
    execution,
    failure,
    evidence: { digest: evidenceInfo.hash },
    security: {
      sensitiveFieldsRedacted: evidenceInfo.redactedFields + actionInfo.redactedFields,
      rawSignedTransactionLogged: false,
      actionPayloadLogged: false,
      evidencePayloadLogged: false,
    },
  }
}
