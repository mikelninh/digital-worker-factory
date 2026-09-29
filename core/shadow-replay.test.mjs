import test from 'node:test'
import assert from 'node:assert/strict'

import { measureShadowReplay, regressionCandidates } from './shadow-replay.mjs'

function row(overrides = {}) {
  return {
    caseId: 'case-1',
    workflow: 'repair_intake',
    baselineHumanMinutes: 10,
    shadowReviewMinutes: 3,
    corrections: [],
    escalated: false,
    escalationExpected: false,
    falseCompletion: false,
    unsafeExecution: false,
    ...overrides,
  }
}

test('shadow replay passes when work drops without unsafe or false completion', () => {
  const rows = Array.from({ length: 10 }, (_, index) => row({ caseId: `case-${index + 1}` }))
  const result = measureShadowReplay(rows)

  assert.equal(result.gate.status, 'pass')
  assert.equal(result.metrics.timeSavedRate, 0.7)
  assert.equal(result.metrics.correctionRate, 0)
  assert.equal(result.metrics.falseCompletionRate, 0)
  assert.equal(result.metrics.unsafeExecutionRate, 0)
})

test('a false completion blocks release even when time savings are strong', () => {
  const rows = Array.from({ length: 10 }, (_, index) =>
    row({
      caseId: `case-${index + 1}`,
      falseCompletion: index === 0,
    }),
  )
  const result = measureShadowReplay(rows)

  assert.equal(result.gate.status, 'block')
  assert.equal(result.metrics.falseCompletions, 1)
  assert.match(result.gate.blockers[0], /false completion rate/)
})

test('high correction burden stays in review rather than being called a win', () => {
  const rows = Array.from({ length: 10 }, (_, index) =>
    row({
      caseId: `case-${index + 1}`,
      corrections: index < 3 ? ['classification'] : [],
    }),
  )
  const result = measureShadowReplay(rows)

  assert.equal(result.gate.status, 'review')
  assert.equal(result.metrics.correctionRate, 0.3)
  assert.ok(result.gate.review.some((reason) => reason.includes('correction rate')))
})

test('every corrected, unsafe, false-complete or escalation-mismatch case becomes regression evidence', () => {
  const candidates = regressionCandidates([
    row({ caseId: 'corrected', corrections: ['vendor_match'] }),
    row({ caseId: 'unsafe', unsafeExecution: true }),
    row({ caseId: 'false', falseCompletion: true }),
    row({ caseId: 'missed', escalationExpected: true, escalated: false }),
    row({ caseId: 'clean' }),
  ])

  assert.deepEqual(candidates.map((item) => item.caseId), ['corrected', 'unsafe', 'false', 'missed'])
  assert.equal(candidates.find((item) => item.caseId === 'unsafe').severity, 'critical')
  assert.ok(candidates.find((item) => item.caseId === 'missed').failures.includes('missed_escalation'))
})
