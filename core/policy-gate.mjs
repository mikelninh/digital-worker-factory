import { RISK_LEVELS } from './capability-registry.mjs'

export function evaluateCapabilityPolicy({ registry, actor, capabilityId, approvedBy = null, mode = 'execute' }) {
  const reasons = []
  const capability = registry.get(capabilityId)

  if (!capability) {
    return { allowed: false, executionAllowed: false, approvalRequired: false, reasons: ['unknown_capability'] }
  }

  if (!actor?.id) reasons.push('missing_actor')
  if (!actor?.role) reasons.push('missing_role')
  if (actor?.role && !registry.can(actor.role, capabilityId)) reasons.push(`role_not_allowed:${actor.role}`)

  const approvalRequired = capability.risk !== RISK_LEVELS.READ || capability.external === true
  if (approvalRequired && mode === 'execute' && !approvedBy) reasons.push('human_approval_required')
  if (mode === 'shadow') reasons.push('shadow_mode')

  const hardReasons = reasons.filter((reason) => reason !== 'shadow_mode')
  const allowed = hardReasons.length === 0
  const executionAllowed = allowed && mode === 'execute'

  return {
    allowed,
    executionAllowed,
    approvalRequired,
    reasons,
    capability: {
      id: capability.id,
      provider: capability.provider,
      risk: capability.risk,
      external: capability.external === true,
    },
  }
}
