import { evaluateCapabilityPolicy } from './policy-gate.mjs'
import { SECURITY_DECISIONS, evaluateSecurityBoundary } from './security-boundary.mjs'

export class AgentGateway {
  #registry
  #executors
  #audit
  #securityRequired

  constructor({ registry, executors = {}, securityRequired = false }) {
    this.#registry = registry
    this.#executors = { ...executors }
    this.#audit = []
    this.#securityRequired = securityRequired === true
  }

  auditLog() {
    return this.#audit.map((entry) => ({ ...entry }))
  }

  async invoke({ actor, capabilityId, input = {}, approvedBy = null, mode = 'execute', traceId = crypto.randomUUID(), securityContext = null }) {
    const policy = evaluateCapabilityPolicy({
      registry: this.#registry,
      actor,
      capabilityId,
      approvedBy,
      mode,
    })

    const security = (this.#securityRequired || securityContext)
      ? evaluateSecurityBoundary({
          context: securityContext,
          actor,
          capability: policy.capability,
          approvedBy,
          mode,
        })
      : null

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
      security,
    }

    if (security?.decision === SECURITY_DECISIONS.BLOCK) {
      this.#audit.push({ ...baseAudit, status: 'blocked', error: 'security_boundary_blocked' })
      return { ok: false, status: 'blocked', traceId, policy, security, error: 'security_boundary_blocked' }
    }

    if (security?.decision === SECURITY_DECISIONS.REVIEW && mode === 'execute') {
      this.#audit.push({ ...baseAudit, status: 'review', error: 'security_review_required' })
      return { ok: false, status: 'review', traceId, policy, security, error: 'security_review_required' }
    }

    if (!policy.allowed || !policy.executionAllowed) {
      const status = mode === 'shadow' && policy.allowed ? 'shadowed' : 'blocked'
      this.#audit.push({ ...baseAudit, status })
      return { ok: false, status, traceId, policy, security }
    }

    const executor = this.#executors[capabilityId]
    if (typeof executor !== 'function') {
      const error = 'executor_not_configured'
      this.#audit.push({ ...baseAudit, status: 'blocked', error })
      return { ok: false, status: 'blocked', traceId, policy, security, error }
    }

    try {
      const output = await executor({ input, actor, approvedBy, traceId, securityContext })
      this.#audit.push({ ...baseAudit, status: 'executed' })
      return { ok: true, status: 'executed', traceId, policy, security, output }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.#audit.push({ ...baseAudit, status: 'failed', error: message })
      return { ok: false, status: 'failed', traceId, policy, security, error: message }
    }
  }
}
