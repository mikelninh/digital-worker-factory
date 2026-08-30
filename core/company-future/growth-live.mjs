import crypto from 'node:crypto'
import {
  GROWTH_AGENT_ACTIONS,
  buildInboundOnboarding,
  evaluateGrowthAuthority,
} from './growth-agent.mjs'

export const GROWTH_LEAD_STATES = Object.freeze([
  'new',
  'qualified',
  'contacted',
  'onboarding',
  'pilot',
  'won',
  'lost',
  'do_not_contact',
])

const transitions = Object.freeze({
  new: ['qualified', 'lost', 'do_not_contact'],
  qualified: ['contacted', 'onboarding', 'lost', 'do_not_contact'],
  contacted: ['onboarding', 'lost', 'do_not_contact'],
  onboarding: ['pilot', 'lost', 'do_not_contact'],
  pilot: ['won', 'lost', 'do_not_contact'],
  won: [],
  lost: [],
  do_not_contact: [],
})

export function transitionLeadState(current, next) {
  if (!GROWTH_LEAD_STATES.includes(current) || !GROWTH_LEAD_STATES.includes(next)) {
    return { allowed: false, reason: 'unknown_lead_state' }
  }
  if (!(transitions[current] || []).includes(next)) {
    return { allowed: false, reason: 'invalid_lead_transition' }
  }
  return { allowed: true, reason: 'lead_transition_allowed' }
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function plannedAction({ leadId, actionType, context, payload }) {
  const authority = evaluateGrowthAuthority({ actionType, context })
  const canonical = { leadId, actionType, context, payload }
  return {
    leadId,
    actionType,
    authority,
    contextDigest: digest(canonical),
    idempotencyKey: `growth:${leadId}:${actionType}:${digest(canonical).slice(0, 24)}`,
    payload,
  }
}

export function planInboundLead({ leadId, input = {}, explicitInboundConsent = false } = {}) {
  if (!leadId) throw new Error('leadId_required')

  const onboarding = buildInboundOnboarding(input)
  const dataMode = input.dataMode || 'synthetic'

  const actions = [
    plannedAction({
      leadId,
      actionType: GROWTH_AGENT_ACTIONS.LEAD_SCORE,
      context: {},
      payload: { score: onboarding.score },
    }),
    plannedAction({
      leadId,
      actionType: GROWTH_AGENT_ACTIONS.REPORT_GENERATE,
      context: {},
      payload: { map: onboarding.map, nextStep: onboarding.nextStep },
    }),
    plannedAction({
      leadId,
      actionType: GROWTH_AGENT_ACTIONS.CRM_CREATE,
      context: {},
      payload: { status: onboarding.score.qualified ? 'qualified' : 'new' },
    }),
  ]

  if (explicitInboundConsent) {
    actions.push(plannedAction({
      leadId,
      actionType: GROWTH_AGENT_ACTIONS.INBOUND_ACK,
      context: { explicitInboundConsent: true },
      payload: { template: 'authority_scorecard_followup' },
    }))
  }

  if (onboarding.score.qualified) {
    actions.push(plannedAction({
      leadId,
      actionType: GROWTH_AGENT_ACTIONS.SANDBOX_ONBOARD,
      context: { dataMode },
      payload: {
        dataMode,
        requestedArtifacts: onboarding.requestedArtifacts,
        productionAccessRequired: false,
      },
    }))
  }

  return {
    leadId,
    score: onboarding.score,
    authorityMap: onboarding.map,
    nextStep: onboarding.nextStep,
    actions,
    autonomousQueue: actions.filter((a) => a.authority.decision === 'ALLOW'),
    humanQueue: actions.filter((a) => a.authority.decision === 'APPROVAL'),
    blocked: actions.filter((a) => a.authority.decision === 'BLOCK'),
  }
}

export function planSelectedMeeting({ leadId, slotId, prospectSelectedSlot, slotAvailable } = {}) {
  return plannedAction({
    leadId,
    actionType: GROWTH_AGENT_ACTIONS.MEETING_CONFIRM,
    context: { prospectSelectedSlot, slotAvailable },
    payload: { slotId },
  })
}

export function planCommercialCommitment({ leadId, commitment } = {}) {
  return plannedAction({
    leadId,
    actionType: GROWTH_AGENT_ACTIONS.CONTRACT_COMMIT,
    context: {},
    payload: { commitment },
  })
}

export function buildGrowthOperatorBrief(items = []) {
  const counters = {
    leads: items.length,
    qualified: 0,
    autonomousActions: 0,
    approvals: 0,
    blocked: 0,
    highUrgency: 0,
  }

  for (const item of items) {
    if (item?.score?.qualified) counters.qualified += 1
    if (item?.score?.urgency === 'high') counters.highUrgency += 1
    counters.autonomousActions += item?.autonomousQueue?.length || 0
    counters.approvals += item?.humanQueue?.length || 0
    counters.blocked += item?.blocked?.length || 0
  }

  return {
    ...counters,
    operatorAttentionItems: counters.approvals,
    autonomousActionsPerHumanIntervention: counters.approvals === 0
      ? counters.autonomousActions
      : Number((counters.autonomousActions / counters.approvals).toFixed(2)),
  }
}
