import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GROWTH_AGENT_ACTIONS,
  buildInboundOnboarding,
  evaluateGrowthAuthority,
  scoreAuthorityReadiness,
} from './growth-agent.mjs'

test('unsolicited outbound remains human-approved', () => {
  assert.deepEqual(evaluateGrowthAuthority({ actionType: GROWTH_AGENT_ACTIONS.OUTBOUND_SEND }), {
    decision: 'APPROVAL',
    reason: 'growth_action_requires_human_approval',
  })
})

test('requested inbound acknowledgement may execute inside explicit consent', () => {
  assert.equal(evaluateGrowthAuthority({
    actionType: GROWTH_AGENT_ACTIONS.INBOUND_ACK,
    context: { explicitInboundConsent: true },
  }).decision, 'ALLOW')
  assert.equal(evaluateGrowthAuthority({
    actionType: GROWTH_AGENT_ACTIONS.INBOUND_ACK,
    context: { explicitInboundConsent: false },
  }).decision, 'APPROVAL')
})

test('contract commitment remains blocked from the Growth Agent', () => {
  assert.equal(evaluateGrowthAuthority({ actionType: GROWTH_AGENT_ACTIONS.CONTRACT_COMMIT }).decision, 'BLOCK')
})

test('safe sandbox onboarding is autonomous but production/sensitive onboarding is not', () => {
  assert.equal(evaluateGrowthAuthority({
    actionType: GROWTH_AGENT_ACTIONS.SANDBOX_ONBOARD,
    context: { dataMode: 'synthetic' },
  }).decision, 'ALLOW')
  assert.equal(evaluateGrowthAuthority({
    actionType: GROWTH_AGENT_ACTIONS.SANDBOX_ONBOARD,
    context: { dataMode: 'sensitive' },
  }).decision, 'APPROVAL')
})

test('high-consequence production agent with weak controls qualifies urgently', () => {
  const result = scoreAuthorityReadiness({
    sector: 'healthcare',
    agentStage: 'production',
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
    dataScope: true,
  })
  assert.equal(result.urgency, 'high')
  assert.equal(result.qualified, true)
  assert.equal(result.recommendedPilot, 'clinical_documentation_authority_pilot')
  assert.ok(result.readiness < 75)
})

test('inbound onboarding never silently requires production access or makes a commercial commitment', () => {
  const packet = buildInboundOnboarding({
    sector: 'legal',
    agentStage: 'pilot',
    canSendExternally: true,
    canAccessSensitiveData: true,
  })
  assert.equal(packet.productionAccessRequired, false)
  assert.equal(packet.commercialCommitmentMade, false)
  assert.ok(packet.map.approval.includes('external_send'))
  assert.ok(packet.map.block.includes('unrelated_sensitive_data_access'))
})
