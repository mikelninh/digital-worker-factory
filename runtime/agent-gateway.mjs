import { auditMetadata } from './audit-log.mjs'
import { principalFor } from './permission-graph.mjs'

export class GatewayError extends Error {
  constructor(code, message, options = {}) {
    super(message, options)
    this.name = 'GatewayError'
    this.code = code
  }
}

export class AgentGateway {
  constructor({ registry, permissions, audit, policyCheck = defaultPolicyCheck }) {
    if (!registry || !permissions || !audit) throw new TypeError('registry, permissions and audit are required')
    this.registry = registry
    this.permissions = permissions
    this.audit = audit
    this.policyCheck = policyCheck
  }

  async invoke(request) {
    const { actor, agent, capability: capabilityId, action, args = {}, context = {} } = request ?? {}
    const capability = this.registry.get(capabilityId)
    const baseEvent = {
      actor: actor ?? null,
      agent: agent ?? null,
      capability: capabilityId ?? null,
      action: action ?? null,
      ...auditMetadata({ args, context }),
    }

    if (!capability) {
      this.audit.append({ ...baseEvent, outcome: 'denied', code: 'CAPABILITY_NOT_FOUND' })
      throw new GatewayError('CAPABILITY_NOT_FOUND', `Unknown capability: ${capabilityId}`)
    }

    if (!capability.actions.includes(action)) {
      this.audit.append({ ...baseEvent, provider: capability.provider, outcome: 'denied', code: 'ACTION_NOT_ALLOWED' })
      throw new GatewayError('ACTION_NOT_ALLOWED', `Action ${action} is not exposed by ${capabilityId}`)
    }

    const principal = principalFor({ actor, agent })
    if (!principal || !this.permissions.allows({ principal, capability: capabilityId, action })) {
      this.audit.append({ ...baseEvent, provider: capability.provider, outcome: 'denied', code: 'PERMISSION_DENIED' })
      throw new GatewayError('PERMISSION_DENIED', 'Capability permission denied')
    }

    const policy = await this.policyCheck({ capability, actor, agent, action, args, context })
    if (!policy?.allow) {
      this.audit.append({
        ...baseEvent,
        provider: capability.provider,
        outcome: 'denied',
        code: 'POLICY_DENIED',
        policyReason: policy?.reason ?? 'policy_denied',
      })
      throw new GatewayError('POLICY_DENIED', policy?.reason ?? 'Policy denied capability invocation')
    }

    this.audit.append({ ...baseEvent, provider: capability.provider, outcome: 'allowed', policyReason: policy.reason ?? 'allowed' })

    try {
      const result = await capability.invoke({ actor, agent, action, args, context })
      this.audit.append({ ...baseEvent, provider: capability.provider, outcome: 'succeeded' })
      return result
    } catch (cause) {
      this.audit.append({ ...baseEvent, provider: capability.provider, outcome: 'failed', code: 'PROVIDER_FAILED' })
      throw new GatewayError('PROVIDER_FAILED', `Provider ${capability.provider} failed`, { cause })
    }
  }
}

async function defaultPolicyCheck({ capability }) {
  if (capability.risk === 'low') return { allow: true, reason: 'low_risk_read' }
  return { allow: false, reason: 'explicit_policy_required' }
}
