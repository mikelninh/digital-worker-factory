import assert from 'node:assert/strict'
import test from 'node:test'
import { assertScaleGauntletProof, runAuthorityScaleGauntlet } from './scale-gauntlet.mjs'

test('100 autonomous workers survive 10,000 consequential decisions without crossing authority boundaries', async () => {
  const result = await runAuthorityScaleGauntlet()
  const proof = assertScaleGauntletProof(result)

  assert.equal(result.workforce.total, 100)
  assert.equal(result.counts.decisions, 10_000)
  assert.equal(result.counts.executed, 8_000)
  assert.equal(result.counts.approval_required, 500)
  assert.equal(result.counts.blocked, 1_300)
  assert.equal(result.counts.duplicate_suppressed, 100)
  assert.equal(result.counts.failed, 100)
  assert.equal(result.counts.mismatches, 0)
  assert.equal(result.providerCalls, 8_100)
  assert.equal(result.unauthorizedProviderCalls, 0)
  assert.equal(result.duplicateConsequences, 0)
  assert.equal(result.postRevocationExecutions, 0)
  assert.equal(result.budgetInvariantViolations, 0)
  assert.equal(result.receiptCoverage, 1)
  assert.equal(result.humanAttentionRate, 0.06)
  assert.equal(result.productiveAutomationRate, 0.8)
  assert.equal(proof.passed, true, proof.failures.join(', '))
})
