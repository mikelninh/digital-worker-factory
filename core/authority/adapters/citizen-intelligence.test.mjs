import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTONOMY_LEVELS } from '../policy.mjs'
import { evaluateCitizenIntelligenceAction } from './citizen-intelligence.mjs'

const policy = {
  version: 'citizen-policy/1',
  actions: {
    'brief.prepare': {
      allowedRoles: ['worker'],
      allowedPurposes: ['inform-citizen'],
      minAutonomyLevel: AUTONOMY_LEVELS.DRAFT,
      requiredEvidence: ['source_backed'],
    },
    'application.submit': {
      allowedRoles: ['worker'],
      allowedPurposes: ['help-citizen'],
      minAutonomyLevel: AUTONOMY_LEVELS.DRAFT,
      requiredEvidence: ['source_backed'],
    },
  },
}

const actor = { id: 'agent-1', role: 'worker', autonomyLevel: AUTONOMY_LEVELS.DELEGATED }
const principal = { id: 'org-1' }
const delegation = {
  id: 'del-1',
  delegateId: 'agent-1',
  principalId: 'org-1',
  scopes: ['brief.prepare', 'application.submit'],
  purposes: ['inform-citizen', 'help-citizen'],
}
const change = {
  schema_version: 'citizen-intelligence/1.0',
  id: 'chg_0123456789abcdef',
  observed_on: '2026-08-30',
  change: { headline: 'Benefit rule changed' },
  evidence: { verification_status: 'MULTI_SOURCE', sources: ['https://example.org/official', 'https://example.org/secondary'] },
  actionability: { authority: { external_or_consequential_action: 'ALLOW' } },
}

test('source-backed intelligence may support internal preparation', () => {
  const result = evaluateCitizenIntelligenceAction({
    policy, change, actor, principal, delegation,
    proposedAction: { type: 'brief.prepare', purpose: 'inform-citizen', classification: 'prepare_internal' },
  })
  assert.equal(result.decision, 'ALLOW')
  assert.equal(result.executionAllowed, true)
  assert.equal(result.intelligence.sourceAuthorityIgnored, true)
})

test('malicious or permissive source authority hint cannot authorize external action', () => {
  const result = evaluateCitizenIntelligenceAction({
    policy, change, actor, principal, delegation,
    proposedAction: { type: 'application.submit', purpose: 'help-citizen', classification: 'external_or_consequential' },
  })
  assert.equal(result.decision, 'APPROVAL')
  assert.equal(result.executionAllowed, false)
  assert.deepEqual(result.reasons, ['citizen_intelligence_consequence_requires_local_approval'])
})

test('local human approval can release an otherwise locally-authorized consequential action', () => {
  const result = evaluateCitizenIntelligenceAction({
    policy, change, actor, principal, delegation,
    approval: {
      approvedBy: 'human-owner',
      actionType: 'application.submit',
      delegationId: 'del-1',
    },
    proposedAction: { type: 'application.submit', purpose: 'help-citizen', classification: 'external_or_consequential' },
  })
  assert.equal(result.decision, 'ALLOW')
  assert.equal(result.executionAllowed, true)
})

test('unverified intelligence is blocked for consequential action', () => {
  const result = evaluateCitizenIntelligenceAction({
    policy,
    change: { ...change, evidence: { verification_status: 'UNVERIFIED', sources: [] } },
    actor, principal, delegation,
    proposedAction: { type: 'application.submit', purpose: 'help-citizen', classification: 'external_or_consequential' },
  })
  assert.equal(result.decision, 'BLOCK')
  assert.equal(result.executionAllowed, false)
  assert.ok(result.reasons.includes('missing_source_evidence'))
})

test('unknown action still fails closed through the OCN policy engine', () => {
  const result = evaluateCitizenIntelligenceAction({
    policy, change, actor, principal, delegation,
    proposedAction: { type: 'bank.change', purpose: 'help-citizen', classification: 'external_or_consequential' },
  })
  assert.equal(result.decision, 'BLOCK')
  assert.equal(result.executionAllowed, false)
  assert.ok(result.reasons.includes('unknown_action'))
})
