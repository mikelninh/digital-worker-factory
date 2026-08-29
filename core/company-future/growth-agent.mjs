export const GROWTH_AGENT_ACTIONS = Object.freeze({
  CONTENT_RESEARCH: 'growth.content.research',
  CONTENT_DRAFT: 'growth.content.draft',
  CONTENT_PUBLISH: 'growth.content.publish',
  LEAD_SCORE: 'growth.lead.score',
  REPORT_GENERATE: 'growth.report.generate',
  CRM_CREATE: 'growth.crm.create',
  INBOUND_ACK: 'growth.inbound.acknowledge',
  PILOT_RECOMMEND: 'growth.pilot.recommend',
  SANDBOX_ONBOARD: 'growth.sandbox.onboard',
  OUTBOUND_SEND: 'growth.outbound.send',
  MEETING_CONFIRM: 'growth.meeting.confirm',
  PRICE_EXCEPTION: 'growth.price.exception',
  CONTRACT_COMMIT: 'growth.contract.commit',
  PRODUCTION_ACCESS: 'growth.production_access.grant',
})

export const growthAgentAuthority = Object.freeze({
  role: 'growth_agent',
  purpose: 'company01_customer_acquisition',
  allowed: Object.freeze([
    GROWTH_AGENT_ACTIONS.CONTENT_RESEARCH,
    GROWTH_AGENT_ACTIONS.CONTENT_DRAFT,
    GROWTH_AGENT_ACTIONS.LEAD_SCORE,
    GROWTH_AGENT_ACTIONS.REPORT_GENERATE,
    GROWTH_AGENT_ACTIONS.CRM_CREATE,
    GROWTH_AGENT_ACTIONS.PILOT_RECOMMEND,
  ]),
  conditionalAllow: Object.freeze({
    [GROWTH_AGENT_ACTIONS.INBOUND_ACK]: 'prospect_explicitly_requested_followup',
    [GROWTH_AGENT_ACTIONS.SANDBOX_ONBOARD]: 'synthetic_or_non_sensitive_only',
    [GROWTH_AGENT_ACTIONS.MEETING_CONFIRM]: 'prospect_selected_available_slot',
  }),
  approval: Object.freeze([
    GROWTH_AGENT_ACTIONS.CONTENT_PUBLISH,
    GROWTH_AGENT_ACTIONS.OUTBOUND_SEND,
    GROWTH_AGENT_ACTIONS.PRODUCTION_ACCESS,
    GROWTH_AGENT_ACTIONS.PRICE_EXCEPTION,
  ]),
  blocked: Object.freeze([
    GROWTH_AGENT_ACTIONS.CONTRACT_COMMIT,
  ]),
})

export function evaluateGrowthAuthority({ actionType, context = {} } = {}) {
  if (growthAgentAuthority.blocked.includes(actionType)) {
    return { decision: 'BLOCK', reason: 'human_reserved_commercial_commitment' }
  }
  if (growthAgentAuthority.approval.includes(actionType)) {
    return { decision: 'APPROVAL', reason: 'growth_action_requires_human_approval' }
  }
  if (growthAgentAuthority.allowed.includes(actionType)) {
    return { decision: 'ALLOW', reason: 'within_growth_agent_envelope' }
  }

  const condition = growthAgentAuthority.conditionalAllow[actionType]
  if (condition === 'prospect_explicitly_requested_followup') {
    return context.explicitInboundConsent === true
      ? { decision: 'ALLOW', reason: 'inbound_followup_requested' }
      : { decision: 'APPROVAL', reason: 'no_explicit_inbound_consent' }
  }
  if (condition === 'synthetic_or_non_sensitive_only') {
    return context.dataMode === 'synthetic' || context.dataMode === 'non_sensitive'
      ? { decision: 'ALLOW', reason: 'safe_sandbox_onboarding' }
      : { decision: 'APPROVAL', reason: 'sensitive_or_production_onboarding' }
  }
  if (condition === 'prospect_selected_available_slot') {
    return context.prospectSelectedSlot === true && context.slotAvailable === true
      ? { decision: 'ALLOW', reason: 'prospect_selected_available_slot' }
      : { decision: 'APPROVAL', reason: 'meeting_not_explicitly_selected_or_available' }
  }
  return { decision: 'BLOCK', reason: 'unknown_growth_action' }
}

const sectorPilot = Object.freeze({
  legal: 'law_firm_authority_pilot',
  healthcare: 'clinical_documentation_authority_pilot',
  government: 'public_caseworker_authority_pilot',
  commercial: 'commercial_operations_authority_pilot',
  technology: 'agent_tool_authority_pilot',
})

export function scoreAuthorityReadiness(input = {}) {
  const controls = [
    input.explicitPurpose,
    input.toolAllowlist,
    input.approvalRules,
    input.revocation,
    input.idempotency,
    input.receipts,
    input.externalPolicy,
    input.dataScope,
  ]
  const readiness = Math.round((controls.filter(Boolean).length / controls.length) * 100)

  const consequenceSignals = [
    input.canSendExternally,
    input.canWriteSystems,
    input.canSpendMoney,
    input.canAccessSensitiveData,
    input.canAffectPeople,
  ].filter(Boolean).length

  const risk = Math.min(100, consequenceSignals * 14 + Math.round((100 - readiness) * 0.45))
  const urgency = consequenceSignals >= 3 && readiness < 75 ? 'high' : consequenceSignals >= 1 ? 'medium' : 'low'
  const sector = sectorPilot[input.sector] ? input.sector : 'commercial'

  return {
    readiness,
    consequenceSignals,
    risk,
    urgency,
    recommendedPilot: sectorPilot[sector],
    qualified: consequenceSignals >= 1 && (readiness < 90 || input.agentStage === 'production'),
  }
}

export function buildAuthorityMap(input = {}) {
  const allow = ['research', 'summarize', 'prepare']
  const approval = []
  const block = ['self_expand_authority']

  if (input.canSendExternally) approval.push('external_send')
  if (input.canWriteSystems) approval.push('authoritative_write')
  if (input.canSpendMoney) approval.push('material_spend')
  if (input.canAccessSensitiveData) block.push('unrelated_sensitive_data_access')
  if (input.canAffectPeople) approval.push('adverse_or_high_consequence_decision')

  return { allow, approval, block }
}

export function buildInboundOnboarding(input = {}) {
  const score = scoreAuthorityReadiness(input)
  const map = buildAuthorityMap(input)
  return {
    score,
    map,
    nextStep: score.qualified ? 'start_synthetic_or_shadow_pilot' : 'keep_building_read_only_use_case',
    requestedArtifacts: score.qualified
      ? ['one_recurring_workflow', '3_to_5_safe_examples', 'desired_output', 'human_owner', 'systems_touched']
      : ['one_read_only_workflow'],
    productionAccessRequired: false,
    commercialCommitmentMade: false,
  }
}
