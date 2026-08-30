import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildRevenueActionQueue,
  buildRevenueLoopReport,
  ingestRevenueSignals,
} from '../core/revenue-loop.mjs'

const snapshot = JSON.parse(await readFile(
  new URL('../revenue/examples/live-shadow-2026-08-30.json', import.meta.url),
  'utf8',
))

const result = ingestRevenueSignals({ signals: snapshot.signals, now: '2026-08-30T21:00:00.000Z' })
const queue = buildRevenueActionQueue(result.ledger)
const report = buildRevenueLoopReport(result.ledger)

const output = {
  mode: snapshot.mode,
  snapshotDate: snapshot.snapshotDate,
  accepted: result.accepted.length,
  rejected: result.rejected.length,
  duplicatesBlocked: result.duplicates.length,
  collectedCashEur: report.portfolio.collectedCashEur,
  measuredCustomerValueEur: report.portfolio.measuredCustomerValueEur,
  rankedResearchQueue: queue.map((item) => ({
    id: item.id,
    account: item.account,
    action: item.action,
    approvalRequired: item.approvalRequired,
    expectedCashEurScenario: item.economics.expectedCashEur,
    scenarioPriority: item.economics.priority,
  })),
  verdict: 'Useful as a live-signal shadow snapshot; not proof of buyer intent or production readiness.',
}

console.log(JSON.stringify(output, null, 2))

assert.equal(result.accepted.length, 3)
assert.equal(result.rejected.length, 0)
assert.equal(report.portfolio.collectedCashEur, 0)
assert.equal(report.portfolio.measuredCustomerValueEur, 0)
assert.equal(queue[0].id, 'live-berlinhaus-2026-08-30')
assert.ok(queue.every((item) => item.action === 'research_account'))
