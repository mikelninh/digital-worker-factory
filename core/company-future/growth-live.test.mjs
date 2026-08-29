import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGrowthOperatorBrief,
  planCommercialCommitment,
  planInboundLead,
  planSelectedMeeting,
  transitionLeadState,
} from './growth-live.mjs'

test('qualified consented synthetic lead can be scored, acknowledged and sandbox-onboarded autonomously', () => {
  const plan = planInboundLead({
    leadId: 'lead-1',
    explicitInboundConsent: true,
    input: {
      sector: 'legal',
      agentStage: 'production',
      dataMode: 'synthetic',
      canSendExternally: true,
      canWriteSystems: true,
      canSpendMoney: false,
      canAccessSensitiveData: true,
      canAffectPeople: true,
      explicitPurpose: true,
      toolAllowlist: false,
      approvalRules: false,
      revocation: false,
      idempotency: false,
      receipts: false,
      externalPolicy: false,
      dataScope: false,
    },
  })

  assert.equal(plan.score.qualified, true)
  assert.equal(plan.humanQueue.length, 0)
  assert.equal(plan.blocked.length, 0)
  assert.equal(plan.autonomousQueue.some((a) => a.actionType === 'growth.inbound.acknowledge'), true)
  assert.equal(plan.autonomousQueue.some((a) => a.actionType === 'growth.sandbox.onboard'), true)
})

test('sensitive or production onboarding remains a human approval even for a qualified inbound lead', () => {
  const plan = planInboundLead({
    leadId: 'lead-2',
    explicitInboundConsent: true,
    input: {
      sector: 'healthcare',
      agentStage: 'production',
      dataMode: 'production',
      canWriteSystems: true,
      canAccessSensitiveData: true,
      canAffectPeople: true,
    },
  })

  const onboarding = plan.actions.find((a) => a.actionType === 'growth.sandbox.onboard')
  assert.equal(onboarding.authority.decision, 'APPROVAL')
  assert.equal(plan.humanQueue.length, 1)
})

test('meeting confirmation is autonomous only when the prospect selected a slot that is still available', () => {
  const allowed = planSelectedMeeting({
    leadId: 'lead-3',
    slotId: 'slot-1',
    prospectSelectedSlot: true,
    slotAvailable: true,
  })
  const gated = planSelectedMeeting({
    leadId: 'lead-3',
    slotId: 'slot-2',
    prospectSelectedSlot: true,
    slotAvailable: false,
  })
  assert.equal(allowed.authority.decision, 'ALLOW')
  assert.equal(gated.authority.decision, 'APPROVAL')
})

test('Growth Agent can never make the commercial contract commitment itself', () => {
  const action = planCommercialCommitment({ leadId: 'lead-4', commitment: 'sign pilot agreement' })
  assert.equal(action.authority.decision, 'BLOCK')
})

test('lead state machine prevents skipping directly from new to pilot', () => {
  assert.deepEqual(transitionLeadState('new', 'qualified'), { allowed: true, reason: 'lead_transition_allowed' })
  assert.deepEqual(transitionLeadState('new', 'pilot'), { allowed: false, reason: 'invalid_lead_transition' })
})

test('operator brief measures exception load rather than raw agent activity', () => {
  const autonomous = planInboundLead({
    leadId: 'lead-a',
    explicitInboundConsent: true,
    input: { sector: 'commercial', agentStage: 'production', dataMode: 'synthetic', canSendExternally: true },
  })
  const gated = planInboundLead({
    leadId: 'lead-b',
    explicitInboundConsent: true,
    input: { sector: 'healthcare', agentStage: 'production', dataMode: 'production', canAccessSensitiveData: true, canAffectPeople: true },
  })

  const brief = buildGrowthOperatorBrief([autonomous, gated])
  assert.equal(brief.leads, 2)
  assert.equal(brief.operatorAttentionItems, 1)
  assert.ok(brief.autonomousActions >= 6)
})
