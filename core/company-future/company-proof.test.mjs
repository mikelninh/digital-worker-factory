import assert from 'node:assert/strict'
import test from 'node:test'
import { runCompanyOfFutureProof } from './company-proof.mjs'

test('company-of-the-future proof keeps scale, supervision, autonomy, and government boundaries consistent', async () => {
  const report = await runCompanyOfFutureProof()

  assert.equal(report.scale.passed, true, report.scale.failures.join(', '))
  assert.equal(report.scale.workforce.total, 100)
  assert.equal(report.scale.counts.decisions, 10_000)
  assert.equal(report.scale.unauthorizedProviderCalls, 0)
  assert.equal(report.scale.duplicateConsequences, 0)
  assert.equal(report.scale.postRevocationExecutions, 0)
  assert.equal(report.scale.budgetInvariantViolations, 0)
  assert.equal(report.scale.receiptCoverage, 1)

  assert.equal(report.operatingDay.counts.decisions, 10_000)
  assert.equal(report.operatingDay.humanAttentionItems, 50)
  assert.equal(report.operatingDay.humanAttentionRate, 0.005)
  assert.equal(report.operatingDay.estimatedHumanMinutes, 100)
  assert.equal(report.operatingDay.unauthorizedProviderCalls, 0)
  assert.equal(report.operatingDay.onePersonSupervisionTarget.passed, true)

  assert.equal(report.progressiveAutonomy.novice.eligibleLevel, 2)
  assert.equal(report.progressiveAutonomy.bounded.eligibleLevel, 3)
  assert.equal(report.progressiveAutonomy.supervised.eligibleLevel, 4)
  assert.equal(report.progressiveAutonomy.regression.demotionRequired, true)

  assert.equal(report.government.positiveCases.length, 3)
  assert.equal(report.government.adverse.withoutApproval, 'approval_required')
  assert.equal(report.government.adverse.withApproval, 'executed')
  assert.equal(report.government.adverse.incompleteGovernance, 'blocked')
})
