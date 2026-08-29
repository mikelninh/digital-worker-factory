import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorityGateway } from '../gateway.mjs'
import { compilePublicSectorGovernance, mergeGovernanceEvidence } from './public-sector.mjs'

const policy = {
  version: 'public-sector-profile-test-1',
  hardEscalations: ['public_governance_incomplete'],
  actions: {
    'government.benefit.deny': {
      allowedRoles: ['casework_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 5,
      requiresApproval: true,
      requiredEvidence: [
        'legal_basis',
        'public_case_bound',
        'jurisdiction_declared',
        'accountable_official',
        'purpose_declared',
        'data_scope_declared',
        'contestability_route',
        'reversibility_declared',
        'decision_evidence_complete',
      ],
    },
  },
}

const actor = { id: 'case-agent-1', role: 'casework_agent', autonomyLevel: 5 }
const principal = { id: 'district-office', type: 'government' }
const delegation = {
  id: 'delegation-case-agent-1',
  delegateId: actor.id,
  principalId: principal.id,
  scopes: ['government.benefit.deny'],
  purposes: ['benefit_casework'],
  validUntil: '2026-09-01T00:00:00.000Z',
}
const action = {
  type: 'government.benefit.deny',
  purpose: 'benefit_casework',
  idempotencyKey: 'benefit-decision-1',
}
const approval = {
  approvedBy: 'official-147',
  actionType: action.type,
  delegationId: delegation.id,
}

function completeGovernance() {
  return {
    caseId: 'wohngeld-829188',
    legalBasis: 'reference:applicable-housing-benefit-law',
    jurisdiction: 'district-office-demo',
    accountableOfficial: 'official-147',
    purpose: 'benefit_casework',
    dataScope: ['household', 'income', 'rent'],
    contestability: { route: 'human-review-and-appeal', owner: 'benefits-review-team' },
    reversibility: { mode: 'reopen-and-reconsider', owner: 'benefits-review-team' },
  }
}

test('reference public-sector profile compiles explicit governance claims', () => {
  const compiled = compilePublicSectorGovernance({ action, governance: completeGovernance(), adverse: true })
  assert.equal(compiled.ok, true)
  assert.ok(compiled.evidence.claims.includes('legal_basis'))
  assert.ok(compiled.evidence.claims.includes('accountable_official'))
  assert.ok(compiled.evidence.claims.includes('contestability_route'))
  assert.ok(compiled.evidence.claims.includes('reversibility_declared'))
  assert.equal(compiled.evidence.governanceRef, 'wohngeld-829188')
})

test('missing contestability or reversibility becomes a hard fail-closed escalation', async () => {
  let providerCalls = 0
  const governance = completeGovernance()
  governance.contestability = null
  governance.reversibility = null
  const compiled = compilePublicSectorGovernance({ action, governance, adverse: true })
  const evidence = mergeGovernanceEvidence({ claims: ['decision_evidence_complete'] }, compiled)

  assert.equal(compiled.ok, false)
  assert.ok(compiled.reasons.includes('public_contestability_route_required'))
  assert.ok(compiled.reasons.includes('public_reversibility_mode_required'))
  assert.ok(evidence.flags.includes('public_governance_incomplete'))

  const gateway = new AuthorityGateway({
    policy,
    executors: { 'government.benefit.deny': async () => { providerCalls += 1; return { denied: true } } },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })
  const result = await gateway.invoke({ actor, principal, delegation, action, evidence, approval })

  assert.equal(result.status, 'blocked')
  assert.ok(result.decision.reasons.includes('hard_escalation:public_governance_incomplete'))
  assert.equal(providerCalls, 0)
})

test('complete governance plus exact-bound accountable approval may cross the provider boundary', async () => {
  let providerCalls = 0
  const compiled = compilePublicSectorGovernance({ action, governance: completeGovernance(), adverse: true })
  const evidence = mergeGovernanceEvidence({ claims: ['decision_evidence_complete'] }, compiled)
  const gateway = new AuthorityGateway({
    policy,
    executors: { 'government.benefit.deny': async () => { providerCalls += 1; return { status: 'sandbox-denied' } } },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const result = await gateway.invoke({ actor, principal, delegation, action, evidence, approval, traceId: 'public-proof-1' })
  assert.equal(result.status, 'executed')
  assert.equal(providerCalls, 1)
  assert.equal(result.receipt.principal.type, 'government')
  assert.equal(result.receipt.approval.approvedBy, 'official-147')
})
