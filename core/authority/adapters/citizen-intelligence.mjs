import { DECISIONS, evaluateAuthority } from '../policy.mjs'

const SUPPORTED_SCHEMA = 'citizen-intelligence/1.0'
const ACTION_CLASSES = new Set(['read', 'prepare_internal', 'external_or_consequential'])

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

export function validateCitizenIntelligence(change = {}) {
  const reasons = []
  if (change?.schema_version !== SUPPORTED_SCHEMA) reasons.push('unsupported_intelligence_schema')
  if (!change?.id) reasons.push('missing_change_id')
  if (!change?.change?.headline) reasons.push('missing_change_headline')
  const sources = Array.isArray(change?.evidence?.sources) ? change.evidence.sources.filter(Boolean) : []
  if (sources.length === 0) reasons.push('missing_source_evidence')
  return { valid: reasons.length === 0, reasons, sources }
}

export function buildCitizenAuthorityRequest({
  change,
  proposedAction = {},
  actor,
  principal,
  delegation,
  approval = null,
  metrics = {},
  budget = null,
} = {}) {
  const classification = ACTION_CLASSES.has(proposedAction.classification)
    ? proposedAction.classification
    : 'external_or_consequential'
  const validation = validateCitizenIntelligence(change)

  return {
    validation,
    classification,
    authorityInput: {
      actor,
      principal,
      delegation,
      approval,
      metrics,
      budget,
      action: {
        type: proposedAction.type,
        purpose: proposedAction.purpose,
        target: proposedAction.target,
        counterpartyApproved: proposedAction.counterpartyApproved,
        amount: proposedAction.amount,
        currency: proposedAction.currency,
        metadata: {
          ...(proposedAction.metadata || {}),
          citizenIntelligenceId: change?.id || null,
          citizenIntelligenceSchema: change?.schema_version || null,
          intelligenceActionClass: classification,
        },
      },
      evidence: {
        claims: {
          source_backed: validation.sources.length > 0,
          citizen_intelligence_present: Boolean(change?.id),
        },
        flags: unique([
          ...(Array.isArray(proposedAction.evidenceFlags) ? proposedAction.evidenceFlags : []),
          validation.sources.length === 0 ? 'unverified_intelligence' : null,
        ]),
        sources: validation.sources,
        intelligence: {
          id: change?.id || null,
          verificationStatus: change?.evidence?.verification_status || null,
          observedOn: change?.observed_on || null,
        },
      },
    },
  }
}

export function evaluateCitizenIntelligenceAction({ policy, change, proposedAction, ...context } = {}) {
  const request = buildCitizenAuthorityRequest({ change, proposedAction, ...context })
  const { validation, classification, authorityInput } = request

  if (!validation.valid && classification === 'external_or_consequential') {
    return {
      decision: DECISIONS.BLOCK,
      executionAllowed: false,
      actionType: String(proposedAction?.type || 'unknown'),
      reasons: ['intelligence_not_safe_for_consequential_action', ...validation.reasons],
      intelligence: { id: change?.id || null, sourceAuthorityIgnored: true },
    }
  }

  const result = evaluateAuthority({ policy, ...authorityInput })
  const hasHumanApproval = Boolean(context?.approval?.approvedBy)

  // Citizen Agents may suggest an action, but its payload can never grant execution authority.
  // Consequential actions require a local OCN approval unless the organisation's policy already blocks them.
  if (classification === 'external_or_consequential' && result.decision === DECISIONS.ALLOW && !hasHumanApproval) {
    return {
      ...result,
      decision: DECISIONS.APPROVAL,
      executionAllowed: false,
      reasons: ['citizen_intelligence_consequence_requires_local_approval'],
      intelligence: { id: change?.id || null, sourceAuthorityIgnored: true },
    }
  }

  return {
    ...result,
    intelligence: {
      id: change?.id || null,
      sourceAuthorityIgnored: true,
      verificationStatus: change?.evidence?.verification_status || null,
      sourceCount: validation.sources.length,
    },
  }
}
