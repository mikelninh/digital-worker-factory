import assert from 'node:assert/strict'
import test from 'node:test'
import { AuthorityGateway } from '../authority/index.mjs'
import { recommendAutonomyLevel } from './autonomy.mjs'
import { companyPolicy } from './policy.mjs'

const baseInput = {
  actor: { id: 'research-agent-01', role: 'research_agent', autonomyLevel: 3 },
  principal: { id: 'future-company', type: 'company' },
  delegation: {
    id: 'delegation-research-01',
    delegateId: 'research-agent-01',
    principalId: 'future-company',
    scopes: ['research.purchase_data'],
    purposes: ['market_intelligence'],
    validUntil: '2027-08-01T00:00:00Z',
  },
  action: {
    type: 'research.purchase_data',
    purpose: 'market_intelligence',
    idempotencyKey: 'progressive-autonomy-proof',
    counterpartyApproved: true,
    amount: { currency: 'EUR', value: 2 },
  },
  evidence: { claims: ['vendor_terms_checked', 'source_relevant'] },
  budget: { currency: 'EUR', spent: 0, limit: 10 },
}

test('autonomy is earned from evidence and can be removed after unsafe performance', async () => {
  const novice = { cases: 20, acceptanceRate: 1, correctionRate: 0, unsafeExecutions: 0 }
  const bounded = { cases: 75, acceptanceRate: 0.99, correctionRate: 0.01, unsafeExecutions: 0 }
  const supervised = { cases: 500, acceptanceRate: 0.995, correctionRate: 0.004, unsafeExecutions: 0 }
  const regression = { ...supervised, unsafeExecutions: 1 }

  assert.equal(recommendAutonomyLevel({ policy: companyPolicy, metrics: novice, currentLevel: 2 }).eligibleLevel, 2)
  assert.equal(recommendAutonomyLevel({ policy: companyPolicy, metrics: bounded, currentLevel: 2 }).eligibleLevel, 3)
  assert.equal(recommendAutonomyLevel({ policy: companyPolicy, metrics: supervised, currentLevel: 3 }).eligibleLevel, 4)

  const demotion = recommendAutonomyLevel({ policy: companyPolicy, metrics: regression, currentLevel: 4 })
  assert.equal(demotion.eligibleLevel, 2)
  assert.equal(demotion.demotionRequired, true)

  let calls = 0
  const gateway = new AuthorityGateway({
    policy: companyPolicy,
    executors: { 'research.purchase_data': async () => { calls += 1; return { ok: true } } },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const beforeEarned = await gateway.invoke({ ...baseInput, metrics: novice })
  assert.equal(beforeEarned.status, 'approval_required')
  assert.equal(calls, 0)

  const earned = await gateway.invoke({ ...baseInput, action: { ...baseInput.action, idempotencyKey: 'progressive-autonomy-proof-earned' }, metrics: bounded })
  assert.equal(earned.status, 'executed')
  assert.equal(calls, 1)

  const lost = await gateway.invoke({ ...baseInput, action: { ...baseInput.action, idempotencyKey: 'progressive-autonomy-proof-lost' }, metrics: regression })
  assert.equal(lost.status, 'approval_required')
  assert.equal(calls, 1)
})
