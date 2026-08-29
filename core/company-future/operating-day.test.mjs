import assert from 'node:assert/strict'
import test from 'node:test'
import { runMatureOperatingDay } from './operating-day.mjs'

test('mature 100-agent operating day compresses 10,000 decisions to a bounded human queue without authority violations', async () => {
  const result = await runMatureOperatingDay()

  assert.equal(result.workforce.total, 100)
  assert.equal(result.counts.decisions, 10_000)
  assert.equal(result.counts.executed, 9_850)
  assert.equal(result.counts.approval_required, 40)
  assert.equal(result.counts.blocked, 80)
  assert.equal(result.counts.duplicate_suppressed, 20)
  assert.equal(result.counts.failed, 10)
  assert.equal(result.providerCalls, 9_860)
  assert.equal(result.unauthorizedProviderCalls, 0)
  assert.equal(result.receipts, 10_000)
  assert.equal(result.humanAttentionItems, 50)
  assert.equal(result.humanAttentionRate, 0.005)
  assert.equal(result.estimatedHumanMinutes, 100)
  assert.equal(result.onePersonSupervisionTarget.passed, true)
})
