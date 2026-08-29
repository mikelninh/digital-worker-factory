import { DECISIONS } from './policy.mjs'
import { classifyExecutionError, createAuthorityReceipt } from './receipt.mjs'

export class InMemoryIdempotencyStore {
  #records = new Map()

  get(key) {
    return this.#records.get(key) ?? null
  }

  claim(key, value = {}) {
    const existing = this.get(key)
    if (existing) return { claimed: false, record: existing }
    const record = { state: 'pending', ...value }
    this.#records.set(key, record)
    return { claimed: true, record }
  }

  complete(key, value = {}) {
    const record = { state: 'completed', ...value }
    this.#records.set(key, record)
    return record
  }

  fail(key, value = {}) {
    const record = { state: 'failed', ...value }
    this.#records.set(key, record)
    return record
  }

  set(key, value) {
    return this.complete(key, value)
  }
}

function duplicateResult({ existing, decision, receiptFor }) {
  const state = existing?.state || 'completed'
  const originalTraceId = existing?.traceId ?? null

  if (state === 'pending') {
    return {
      ok: false,
      status: 'duplicate_in_flight',
      decision,
      originalTraceId,
      receipt: receiptFor({ status: 'duplicate_in_flight', providerCalled: false, originalTraceId }),
    }
  }

  if (state === 'failed') {
    return {
      ok: false,
      status: 'reconciliation_required',
      decision,
      error: existing?.failure?.detail ?? 'prior_execution_failed',
      originalTraceId,
      receipt: receiptFor(
        { status: 'reconciliation_required', providerCalled: false, originalTraceId },
        existing?.failure ?? null,
      ),
    }
  }

  return {
    ok: true,
    status: 'duplicate_suppressed',
    decision,
    result: existing?.result,
    originalTraceId,
    receipt: receiptFor({ status: 'duplicate_suppressed', providerCalled: false, originalTraceId }),
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

  if (typeof idempotencyStore?.claim === 'function') {
    const claim = idempotencyStore.claim(key, { traceId, at })
    if (!claim.claimed) return duplicateResult({ existing: claim.record, decision, receiptFor })
  } else {
    const existing = idempotencyStore?.get(key)
    if (existing) return duplicateResult({ existing, decision, receiptFor })
    idempotencyStore?.set?.(key, { state: 'pending', traceId, at })
  }

  try {
    const result = await executor({ actor, principal, delegation, action, evidence, approval, traceId })
    if (typeof idempotencyStore?.complete === 'function') idempotencyStore.complete(key, { traceId, at, result })
    else idempotencyStore?.set?.(key, { state: 'completed', traceId, at, result })
    return {
      ok: true,
      status: 'executed',
      decision,
      result,
      receipt: receiptFor({ status: 'executed', providerCalled: true }),
    }
  } catch (error) {
    const failure = classifyExecutionError(error, errorContext)
    if (typeof idempotencyStore?.fail === 'function') idempotencyStore.fail(key, { traceId, at, failure })
    else idempotencyStore?.set?.(key, { state: 'failed', traceId, at, failure })
    return {
      ok: false,
      status: 'failed',
      decision,
      error: failure.detail,
      receipt: receiptFor({ status: 'failed', providerCalled: true }, failure),
    }
  }
}
