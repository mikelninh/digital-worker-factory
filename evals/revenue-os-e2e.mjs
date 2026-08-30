import assert from 'node:assert/strict'

import {
  assessRevenueLoopReadiness,
  buildRevenueActionQueue,
  buildRevenueLearning,
  buildRevenueLoopReport,
  executeRevenueAction,
  ingestRevenueSignals,
  upsertRevenueRecord,
} from '../core/revenue-loop.mjs'

const baseEconomics = {
  closeProbability: 0.62,
  upfrontCashEur: 1900,
  founderHours: 2,
  urgency: 1.6,
  proofReuse: 1.5,
  riskPenalty: 1,
  expansionProbability: 0.35,
  expansionCashEur: 3000,
  customerValueEur: 6000,
}

const valid = {
  id: 'acct0-hauspilot-001',
  vertical: 'hauspilot',
  account: 'Customer Zero Hausverwaltung',
  signalType: 'hiring_ops',
  hypothesis: 'A repeated maintenance-intake workflow may support a bounded paid pilot.',
  evidence: [
    {
      source: 'synthetic://customer-zero/jobs/ops',
      fact: 'Synthetic account is hiring for repetitive operations coordination.',
    },
  ],
  economics: baseEconomics,
}

const slower = {
  id: 'acct0-long-deal-001',
  vertical: 'gitlaw',
  account: 'Synthetic Legal Team',
  signalType: 'workflow_volume',
  hypothesis: 'A bounded document workflow may support a governed diagnostic.',
  evidence: [{ source: 'synthetic://legal/workflow', fact: 'Synthetic repeated review workload.' }],
  economics: {
    ...baseEconomics,
    closeProbability: 0.25,
    upfrontCashEur: 6000,
    founderHours: 14,
    urgency: 1,
  },
}

const noEvidence = {
  id: 'acct0-bad-001',
  vertical: 'hauspilot',
  account: 'Unsupported Account',
  signalType: 'rumour',
  hypothesis: 'This should never become a real opportunity without evidence.',
  evidence: [],
  economics: baseEconomics,
}

const ingest = ingestRevenueSignals({
  signals: [valid, valid, slower, noEvidence],
  now: '2026-08-30T20:00:00.000Z',
})

const evidenceGate = ingest.rejected.length === 1 && ingest.rejected[0].errors.includes('missing_evidence')
const dedupeGate = ingest.duplicates.length === 1 && ingest.accepted.length === 2

let ledger = ingest.ledger
const initialReport = buildRevenueLoopReport(ledger)
const queue = buildRevenueActionQueue(ledger)
const economicRanking = queue[0]?.id === valid.id
const noSyntheticCashBeforeOutcome = initialReport.portfolio.collectedCashEur === 0

let record = ledger.find((candidate) => candidate.id === valid.id)
record = executeRevenueAction(record, { action: 'research_account', now: '2026-08-30T20:01:00.000Z' })
record = executeRevenueAction(record, { action: 'qualify_opportunity', now: '2026-08-30T20:02:00.000Z' })
record = executeRevenueAction(record, { action: 'prepare_outreach', now: '2026-08-30T20:03:00.000Z' })

const blockedOutreach = executeRevenueAction(record, {
  action: 'external_message',
  now: '2026-08-30T20:04:00.000Z',
})
const approvalGate = blockedOutreach.stage === 'awaiting_approval'
  && blockedOutreach.blocked?.reason === 'human_approval_required'

record = executeRevenueAction(record, {
  action: 'external_message',
  approved: true,
  now: '2026-08-30T20:05:00.000Z',
})
record = executeRevenueAction(record, { action: 'record_discovery', now: '2026-08-30T20:06:00.000Z' })
record = executeRevenueAction(record, { action: 'prepare_proposal', now: '2026-08-30T20:07:00.000Z' })

const blockedPrice = executeRevenueAction(record, {
  action: 'commit_price',
  outcome: { priceEur: 1900 },
  now: '2026-08-30T20:08:00.000Z',
})
assert.equal(blockedPrice.blocked?.reason, 'human_approval_required')

record = executeRevenueAction(record, {
  action: 'commit_price',
  approved: true,
  outcome: { priceEur: 1900 },
  now: '2026-08-30T20:09:00.000Z',
})

const blockedProposalSend = executeRevenueAction(record, {
  action: 'send_proposal',
  now: '2026-08-30T20:10:00.000Z',
})
assert.equal(blockedProposalSend.blocked?.reason, 'human_approval_required')

record = executeRevenueAction(record, {
  action: 'send_proposal',
  approved: true,
  now: '2026-08-30T20:11:00.000Z',
})
record = executeRevenueAction(record, {
  action: 'deal_won',
  outcome: { collectedCashEur: 1330 },
  now: '2026-08-30T20:12:00.000Z',
})
record = executeRevenueAction(record, { action: 'start_delivery', now: '2026-08-30T20:13:00.000Z' })
record = executeRevenueAction(record, {
  action: 'measure_value',
  outcome: { measuredCustomerValueEur: 4700, actualFounderHours: 3.25 },
  now: '2026-08-30T20:14:00.000Z',
})
record = executeRevenueAction(record, {
  action: 'identify_expansion',
  outcome: { expansionCandidate: 'managed_ops_retainer' },
  now: '2026-08-30T20:15:00.000Z',
})
ledger = upsertRevenueRecord(ledger, record)

let lost = ledger.find((candidate) => candidate.id === slower.id)
lost = executeRevenueAction(lost, { action: 'research_account', now: '2026-08-30T20:20:00.000Z' })
lost = executeRevenueAction(lost, { action: 'qualify_opportunity', now: '2026-08-30T20:21:00.000Z' })
lost = executeRevenueAction(lost, {
  action: 'deal_lost',
  outcome: { lossReason: 'low_urgency' },
  now: '2026-08-30T20:22:00.000Z',
})
ledger = upsertRevenueRecord(ledger, lost)

const finalReport = buildRevenueLoopReport(ledger)
const learning = buildRevenueLearning(ledger, { minDecisions: 1 })
const lifecycleToProof = record.stage === 'expansion'
  && record.expansionCandidate === 'managed_ops_retainer'
  && record.history.some((event) => event.action === 'measure_value')
const realOutcomeAccounting = noSyntheticCashBeforeOutcome
  && finalReport.portfolio.collectedCashEur === 1330
  && finalReport.portfolio.measuredCustomerValueEur === 4700
const learningLoop = learning.some((row) => row.signalType === 'hiring_ops'
  && row.decisions === 1
  && row.winRate === 1
  && row.promotableLearning === true)

const readiness = assessRevenueLoopReadiness({
  evidenceGate,
  dedupeGate,
  economicRanking,
  approvalGate,
  lifecycleToProof,
  realOutcomeAccounting,
  learningLoop,
})

const output = {
  mode: 'synthetic_shadow',
  ready: readiness.ready,
  readiness,
  ingestion: {
    accepted: ingest.accepted.length,
    duplicatesBlocked: ingest.duplicates.length,
    unsupportedRejected: ingest.rejected.length,
  },
  portfolio: finalReport.portfolio,
  topInitialAction: queue[0] ?? null,
  winningOpportunity: {
    id: record.id,
    stage: record.stage,
    collectedCashEur: record.collectedCashEur,
    measuredCustomerValueEur: record.measuredCustomerValueEur,
    actualFounderHours: record.actualFounderHours,
    expansionCandidate: record.expansionCandidate,
  },
  learning,
  limitations: [
    'Synthetic shadow run only: no live web signal connector was invoked.',
    'No real outbound message, payment, CRM write or customer production action was executed.',
    'Readiness means the deterministic closed-loop control plane is ready for supervised live shadowing, not unattended production autonomy.',
  ],
}

console.log(JSON.stringify(output, null, 2))

assert.equal(readiness.ready, true, `RevenueOS readiness failed: ${readiness.failed.join(', ')}`)
assert.equal(finalReport.portfolio.collectedCashEur, 1330)
assert.equal(finalReport.portfolio.measuredCustomerValueEur, 4700)
