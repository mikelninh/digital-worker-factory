import { evaluateCapabilityPolicy } from './policy-gate.mjs'

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
    return this.#audit.map((entry) => ({ ...entry }))
  }

  async invoke({ actor, capabilityId, input = {}, approvedBy = null, mode = 'execute', traceId = crypto.randomUUID() }) {
    const policy = evaluateCapabilityPolicy({
      registry: this.#registry,
      actor,
      capabilityId,
      approvedBy,
      mode,
    })

    const baseAudit = {
      traceId,
      at: new Date().toISOString(),
      actorId: actor?.id ?? null,
      role: actor?.role ?? null,
      capabilityId,
      provider: policy.capability?.provider ?? null,
      mode,
      approvedBy,
      policy,
    }

    if (!policy.allowed || !policy.executionAllowed) {
      const status = mode === 'shadow' && policy.allowed ? 'shadowed' : 'blocked'
      this.#audit.push({ ...baseAudit, status })
      return { ok: false, status, traceId, policy }
    }

    const executor = this.#executors[capabilityId]
    if (typeof executor !== 'function') {
      const error = 'executor_not_configured'
      this.#audit.push({ ...baseAudit, status: 'blocked', error })
      return { ok: false, status: 'blocked', traceId, policy, error }
    }

    try {
      const output = await executor({ input, actor, approvedBy, traceId })
      this.#audit.push({ ...baseAudit, status: 'executed' })
      return { ok: true, status: 'executed', traceId, policy, output }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.#audit.push({ ...baseAudit, status: 'failed', error: message })
      return { ok: false, status: 'failed', traceId, policy, error: message }
    }
  }
}
