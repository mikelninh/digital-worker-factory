import assert from 'node:assert/strict'
import test from 'node:test'
import { runGovernmentCaseworkerProof } from './government-caseworker.mjs'

test('synthetic benefits caseworker automates routine work but cannot issue an adverse decision without complete governance and exact approval', async () => {
  const result = await runGovernmentCaseworkerProof()

  assert.deepEqual(result.programs, ['Buergergeld', 'Wohngeld', 'Kinderzuschlag'])
  assert.equal(result.positive.length, 3)

  for (const caseResult of result.positive) {
    assert.equal(caseResult.read.status, 'executed')
    assert.equal(caseResult.calculate.status, 'executed')
    assert.equal(caseResult.prepare.status, 'executed')
    assert.equal(caseResult.award.status, 'executed')
  }

  assert.equal(result.adverse.withoutApproval.status, 'approval_required')
  assert.equal(result.adverse.withApproval.status, 'executed')
  assert.equal(result.adverse.incompleteGovernance.status, 'blocked')
  assert.ok(result.adverse.incompleteGovernance.decision.reasons.some((reason) => reason.includes('hard_escalation:public_governance_incomplete')))

  assert.equal(result.providerCalls.filter((action) => action === 'government.denial.issue').length, 1)
  assert.equal(result.receipts.length, 15)
})
