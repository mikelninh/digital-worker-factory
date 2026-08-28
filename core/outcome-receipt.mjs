export const OUTCOME_RECEIPT_VERSION = 'dwf.capability-outcome/1'

const EXECUTED = 'executed'

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) freeze(child)
  return Object.freeze(value)
}

export function createOutcomeReceipt({
  traceId,
  at,
  actor,
  capabilityId,
  mode,
  approvedBy,
  policy,
  status,
  error = null,
}) {
  const executed = status === EXECUTED
  const approvalSatisfied = !policy?.approvalRequired || Boolean(approvedBy)
  const billable = Boolean(
    executed
    && mode === 'execute'
    && policy?.allowed
    && policy?.executionAllowed
    && approvalSatisfied
  )

  return freeze({
    version: OUTCOME_RECEIPT_VERSION,
    traceId,
    at,
    actor: {
      id: actor?.id ?? null,
      role: actor?.role ?? null,
    },
    capability: {
      id: capabilityId,
      provider: policy?.capability?.provider ?? null,
      risk: policy?.capability?.risk ?? null,
      external: policy?.capability?.external === true,
    },
    mode,
    approval: {
      required: policy?.approvalRequired === true,
      present: Boolean(approvedBy),
      approvedBy: approvedBy ?? null,
    },
    policy: {
      allowed: policy?.allowed === true,
      executionAllowed: policy?.executionAllowed === true,
      reasons: [...(policy?.reasons ?? [])],
    },
    status,
    error,
    billing: {
      billable,
      basis: billable ? 'successful_bounded_execution' : `not_billable:${status}`,
    },
  })
}

export function assertOutcomeReceipt(receipt) {
  if (receipt?.version !== OUTCOME_RECEIPT_VERSION) throw new Error('outcome_receipt_version_invalid')
  if (!receipt.traceId) throw new Error('outcome_receipt_trace_missing')
  if (!receipt.capability?.id) throw new Error('outcome_receipt_capability_missing')
  if (!['blocked', 'shadowed', 'executed', 'failed'].includes(receipt.status)) {
    throw new Error('outcome_receipt_status_invalid')
  }
  if (receipt.billing?.billable && receipt.status !== EXECUTED) {
    throw new Error('outcome_receipt_non_execution_billable')
  }
  if (receipt.billing?.billable && receipt.approval?.required && !receipt.approval?.present) {
    throw new Error('outcome_receipt_missing_required_approval')
  }
  for (const forbidden of ['input', 'output', 'prompt', 'messages', 'secret', 'token']) {
    if (Object.hasOwn(receipt, forbidden)) throw new Error(`outcome_receipt_private_field:${forbidden}`)
  }
  return true
}
