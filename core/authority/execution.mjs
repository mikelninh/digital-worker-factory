import { DECISIONS } from './policy.mjs'
import { classifyExecutionError, createAuthorityReceipt } from './receipt.mjs'

export class InMemoryIdempotencyStore {
  #records = new Map()

  get(key) {
    return this.#records.get(key) ?? null
  }

  set(key, value) {
    this.#records.set(key, value)
    return value
  }
}

export async function executeWithAuthority({
  traceId,
  at,
  actor,
  principal,
  delegation,
  action,
  evidence,
  approval,
  decision,
  executor,
  idempotencyStore,
  errorContext,
} = {}) {
  const receiptFor = (execution, failure = null) => createAuthorityReceipt({
    traceId, at, actor, principal, delegation, action, decision, evidence, approval, execution, failure,
  })

  if (decision?.decision !== DECISIONS.ALLOW || decision?.executionAllowed !== true) {
    return {
      ok: false,
      status: decision?.decision === DECISIONS.APPROVAL ? 'approval_required' : 'blocked',
      decision,
      receipt: receiptFor({ status: 'not_executed', providerCalled: false }),
    }
  }

  const key = action?.idempotencyKey
  if (!key) {
    const blocked = { ...decision, decision: DECISIONS.BLOCK, executionAllowed: false, reasons: [...(decision.reasons || []), 'idempotency_key_required'] }
    return {
      ok: false,
      status: 'blocked',
      decision: blocked,
      receipt: createAuthorityReceipt({
        traceId, at, actor, principal, delegation, action, decision: blocked, evidence, approval,
        execution: { status: 'not_executed', providerCalled: false },
      }),
    }
  }

  const existing = idempotencyStore?.get(key)
  if (existing) {
    return {
      ok: true,
      status: 'duplicate_suppressed',
      decision,
      result: existing.result,
      originalTraceId: existing.traceId,
      receipt: receiptFor({ status: 'duplicate_suppressed', providerCalled: false, originalTraceId: existing.traceId }),
    }
  }

  if (typeof executor !== 'function') {
    const blocked = { ...decision, decision: DECISIONS.BLOCK, executionAllowed: false, reasons: [...(decision.reasons || []), 'executor_not_configured'] }
    return {
      ok: false,
      status: 'blocked',
      decision: blocked,
      receipt: createAuthorityReceipt({
        traceId, at, actor, principal, delegation, action, decision: blocked, evidence, approval,
        execution: { status: 'not_executed', providerCalled: false },
      }),
    }
  }

  try {
    const result = await executor({ actor, principal, delegation, action, evidence, approval, traceId })
    idempotencyStore?.set(key, { traceId, result })
    return {
      ok: true,
      status: 'executed',
      decision,
      result,
      receipt: receiptFor({ status: 'executed', providerCalled: true }),
    }
  } catch (error) {
    const failure = classifyExecutionError(error, errorContext)
    return {
      ok: false,
      status: 'failed',
      decision,
      error: failure.detail,
      receipt: receiptFor({ status: 'failed', providerCalled: true }, failure),
    }
  }
}
