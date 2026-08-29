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

export function evidenceDigest(evidence = {}) {
  const stats = { redacted: 0 }
  const sanitized = redactSensitive(evidence, stats)
  const hash = crypto.createHash('sha256').update(JSON.stringify(stable(sanitized))).digest('hex')
  return { hash: `sha256:${hash}`, sanitized, redactedFields: stats.redacted }
}

export function classifyExecutionError(error, context = {}) {
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
    failureLayer: context.failureLayer || 'provider_execution',
    errorReason: context.errorReason || 'provider_execution_failed',
    detail: message.slice(0, 240) || 'unknown execution failure',
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
  const safeActionStats = { redacted: 0 }
  const safeAction = redactSensitive(action || {}, safeActionStats)

  return {
    spec: 'authority-receipt/0.1',
    traceId,
    at,
    actor: { id: actor?.id ?? null, role: actor?.role ?? null },
    principal: { id: principal?.id ?? null, type: principal?.type ?? null },
    delegation: { id: delegation?.id ?? null },
    action: safeAction,
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
      sensitiveFieldsRedacted: evidenceInfo.redactedFields + safeActionStats.redacted,
      rawSignedTransactionLogged: false,
    },
  }
}
