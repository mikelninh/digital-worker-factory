import { DECISIONS } from '../policy.mjs'

export function toAgentHooksVerdict(authorityDecision, { contextIdentity = null } = {}) {
  if (!authorityDecision || typeof authorityDecision !== 'object') {
    return { decision: 'deny', reason: 'authority_runtime_error:missing_decision' }
  }

  if (authorityDecision.decision === DECISIONS.ALLOW && authorityDecision.executionAllowed === true) {
    return {
      decision: 'allow',
      reason: 'authority_allow',
    }
  }

  if (authorityDecision.decision === DECISIONS.APPROVAL) {
    if (!contextIdentity) {
      return {
        decision: 'deny',
        reason: 'authority_approval_context_missing',
        message: 'approval cannot be lifted without an exact context identity',
      }
    }

    return {
      decision: 'deny',
      reason: 'authority_approval_required',
      message: 'requires human approval',
      approval: {
        resolver: 'host',
        context_identity: contextIdentity,
      },
    }
  }

  return {
    decision: 'deny',
    reason: `authority_denied:${(authorityDecision.reasons || ['unspecified']).join(',')}`,
  }
}
