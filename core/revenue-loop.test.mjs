import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assessRevenueLoopReadiness,
  buildRevenueActionQueue,
  buildRevenueLearning,
  executeRevenueAction,
  ingestRevenueSignals,
  nextExecutableRevenueAction,
  upsertRevenueRecord,
} from './revenue-loop.mjs'

const economics = {
  closeProbability: 0.6,
  upfrontCashEur: 1900,
  founderHours: 2,
  urgency: 1.5,
  proofReuse: 1.5,
  riskPenalty: 1,
  expansionProbability: 0.3,
  expansionCashEur: 3000,
  customerValueEur: 6000,
}

function signal(overrides = {}) {
  return {
    id: 'opp-1',
    vertical: 'hauspilot',
    account: 'Example Hausverwaltung GmbH',
    signalType: 'hiring_ops',
    hypothesis: 'Repeated maintenance triage may be a bounded automation wedge.',
    evidence: [{ source: 'https://example.test/jobs', fact: 'Hiring operations coordinator' }],
    economics,
    ...overrides,
  }
}

test('ingestion rejects unsupported claims and suppresses duplicates', () => {
  const result = ingestRevenueSignals({
    signals: [
      signal(),
      signal(),
      signal({ id: 'opp-no-evidence', evidence: [] }),
    ],
    now: '2026-08-30T20:00:00.000Z',
  })

  assert.equal(result.accepted.length, 1)
  assert.equal(result.duplicates.length, 1)
  assert.equal(result.rejected.length, 1)
  assert.match(result.rejected[0].errors.join(','), /missing_evidence/)
})

test('action queue prioritises economics and exposes approval boundary', () => {
  const { ledger } = ingestRevenueSignals({
    signals: [
      signal({ id: 'slow', economics: { ...economics, closeProbability: 0.2, founderHours: 10 } }),
      signal({ id: 'fast', economics: { ...economics, closeProbability: 0.8, founderHours: 1 } }),
    ],
  })

  const queue = buildRevenueActionQueue(ledger)
  assert.equal(queue[0].id, 'fast')
  assert.equal(queue[0].action, 'research_account')
  assert.equal(queue[0].approvalRequired, false)
})

test('external message is fail-closed until explicit approval', () => {
  let record = signal({ stage: 'qualified', history: [] })
  record = executeRevenueAction(record, { action: 'prepare_outreach' })
  assert.equal(record.stage, 'awaiting_approval')
  assert.equal(nextExecutableRevenueAction(record), 'external_message')

  const blocked = executeRevenueAction(record, { action: 'external_message' })
  assert.equal(blocked.stage, 'awaiting_approval')
  assert.equal(blocked.blocked.reason, 'human_approval_required')

  const sent = executeRevenueAction(record, { action: 'external_message', approved: true })
  assert.equal(sent.stage, 'contacted')
})

test('one opportunity can traverse outreach, proposal, win, delivery, proof and expansion', () => {
  let record = signal({ stage: 'signal', history: [] })

  record = executeRevenueAction(record, { action: 'research_account' })
  record = executeRevenueAction(record, { action: 'qualify_opportunity' })
  record = executeRevenueAction(record, { action: 'prepare_outreach' })
  record = executeRevenueAction(record, { action: 'external_message', approved: true })
  record = executeRevenueAction(record, { action: 'record_discovery' })
  record = executeRevenueAction(record, { action: 'prepare_proposal' })

  const blockedPrice = executeRevenueAction(record, {
    action: 'commit_price',
    outcome: { priceEur: 1900 },
  })
  assert.equal(blockedPrice.blocked.reason, 'human_approval_required')

  record = executeRevenueAction(record, {
    action: 'commit_price',
    approved: true,
    outcome: { priceEur: 1900 },
  })
  record = executeRevenueAction(record, { action: 'send_proposal', approved: true })
  record = executeRevenueAction(record, {
    action: 'deal_won',
    outcome: { collectedCashEur: 1330 },
  })
  record = executeRevenueAction(record, { action: 'start_delivery' })
  record = executeRevenueAction(record, {
    action: 'measure_value',
    outcome: { measuredCustomerValueEur: 4200, actualFounderHours: 3.5 },
  })
  record = executeRevenueAction(record, {
    action: 'identify_expansion',
    outcome: { expansionCandidate: 'managed_ops_retainer' },
  })

  assert.equal(record.stage, 'expansion')
  assert.equal(record.collectedCashEur, 1330)
  assert.equal(record.measuredCustomerValueEur, 4200)
  assert.equal(record.expansionCandidate, 'managed_ops_retainer')
  assert.ok(record.history.length >= 11)
})

test('learning stays descriptive until enough real decisions exist', () => {
  const ledger = [
    signal({ id: 'w1', stage: 'proof', collectedCashEur: 1900, measuredCustomerValueEur: 5000, actualFounderHours: 2 }),
    signal({ id: 'w2', stage: 'lost', lossReason: 'no_budget' }),
    signal({ id: 'w3', stage: 'proof', collectedCashEur: 1900, measuredCustomerValueEur: 4000, actualFounderHours: 3 }),
  ]

  const learning = buildRevenueLearning(ledger, { minDecisions: 3 })
  assert.equal(learning[0].decisions, 3)
  assert.equal(learning[0].wins, 2)
  assert.equal(learning[0].losses, 1)
  assert.equal(learning[0].promotableLearning, true)
  assert.equal(learning[0].cashPerActualFounderHour, 760)
})

test('ledger upsert replaces one opportunity without duplicating it', () => {
  const first = signal({ stage: 'signal' })
  const second = { ...first, stage: 'researched' }
  const ledger = upsertRevenueRecord([first], second)
  assert.equal(ledger.length, 1)
  assert.equal(ledger[0].stage, 'researched')
})

test('readiness is all-or-nothing across the seven production gates', () => {
  const ready = assessRevenueLoopReadiness({
    evidenceGate: true,
    dedupeGate: true,
    economicRanking: true,
    approvalGate: true,
    lifecycleToProof: true,
    realOutcomeAccounting: true,
    learningLoop: true,
  })
  assert.equal(ready.ready, true)

  const notReady = assessRevenueLoopReadiness({ evidenceGate: true })
  assert.equal(notReady.ready, false)
  assert.ok(notReady.failed.includes('approvalGate'))
})
