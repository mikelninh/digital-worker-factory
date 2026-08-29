import test from 'node:test'
import assert from 'node:assert/strict'
import { runTenEuroMission } from './mission.mjs'

test('ten euro mission completes useful work while authority invariants stay intact', async () => {
  const run = await runTenEuroMission()

  assert.equal(run.outcome.completed, true)
  assert.equal(run.outcome.spent.currency, 'EUR')
  assert.equal(run.outcome.spent.value, 5.7)
  assert.equal(run.outcome.remaining.value, 4.3)
  assert.equal(run.outcome.acquiredSources, 3)
  assert.match(run.outcome.brief.finding, /Prioritise buildings/)
  assert.equal(run.outcome.publication.channel, 'sandbox_registry')

  assert.equal(run.outcome.unauthorisedProviderCalls, 0)
  assert.equal(run.outcome.secretLeakDetected, false)
  assert.equal(run.outcome.replayProviderCalls, 0)

  assert.ok(run.attempts.some((item) => item.status === 'approval_required'))
  assert.ok(run.attempts.some((item) => item.status === 'duplicate_suppressed'))
  assert.ok(run.attempts.some((item) => item.status === 'failed' && item.failure?.failureLayer === 'facilitator_settlement'))
  assert.ok(run.attempts.some((item) => item.reasons.includes('counterparty_not_approved')))
  assert.ok(run.attempts.some((item) => item.reasons.includes('delegated_budget_exceeded')))
  assert.ok(run.attempts.some((item) => item.reasons.includes('hard_escalation:instruction_injection')))

  assert.equal(run.proof.invariants.paymentNeverGrantsAuthority, true)
  assert.equal(run.proof.invariants.retriesDoNotDuplicateConsequences, true)
  assert.equal(run.proof.invariants.receiptsRedactSensitivePaymentMaterial, true)
})

test('every mission attempt emits one proof receipt', async () => {
  const run = await runTenEuroMission()
  assert.equal(run.receipts.length, run.attempts.length)
  assert.ok(run.receipts.every((receipt) => receipt.traceId && receipt.decision && receipt.execution))
})
