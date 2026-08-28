import { evaluateCapabilityPolicy } from './policy-gate.mjs'
import { assertOutcomeReceipt, createOutcomeReceipt } from './outcome-receipt.mjs'

export class AgentGateway {
  #registry
  #executors
  #audit

  constructor({ registry, executors = {} }) {
    this.#registry = registry
    this.#executors = { ...executors }
    this.#audit = []
  }

  auditLog() {
    return this.#audit.map((entry) => structuredClone(entry))
  }

  #record({ traceId, at, actor, capabilityId, mode, approvedBy, policy, status, error = null }) {
    const receipt = createOutcomeReceipt({
      traceId,
      at,
      actor,
      capabilityId,
      mode,
      approvedBy,
      policy,
      status,
      error,
    })
    assertOutcomeReceipt(receipt)
    this.#audit.push(receipt)
    return receipt
  }

  async invoke({ actor, capabilityId, input = {}, approvedBy = null, mode = 'execute', traceId = crypto.randomUUID() }) {
    const policy = evaluateCapabilityPolicy({
      registry: this.#registry,
      actor,
      capabilityId,
      approvedBy,
      mode,
    })
    const at = new Date().toISOString()

    if (!policy.allowed || !policy.executionAllowed) {
      const status = mode === 'shadow' && policy.allowed ? 'shadowed' : 'blocked'
      const receipt = this.#record({ traceId, at, actor, capabilityId, mode, approvedBy, policy, status })
      return { ok: false, status, traceId, policy, receipt }
    }

    const executor = this.#executors[capabilityId]
    if (typeof executor !== 'function') {
      const error = 'executor_not_configured'
      const receipt = this.#record({ traceId, at, actor, capabilityId, mode, approvedBy, policy, status: 'blocked', error })
      return { ok: false, status: 'blocked', traceId, policy, error, receipt }
    }

    try {
      const output = await executor({ input, actor, approvedBy, traceId })
      const receipt = this.#record({ traceId, at, actor, capabilityId, mode, approvedBy, policy, status: 'executed' })
      return { ok: true, status: 'executed', traceId, policy, output, receipt }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const receipt = this.#record({ traceId, at, actor, capabilityId, mode, approvedBy, policy, status: 'failed', error: message })
      return { ok: false, status: 'failed', traceId, policy, error: message, receipt }
    }
  }
}
