import assert from 'node:assert/strict'
import test from 'node:test'
import { firstCohortBriefs, requestOutreachSend } from './revenue-worker.mjs'

test('Revenue Worker prepares exactly four cross-sector design partner briefs', () => {
  const briefs = firstCohortBriefs()
  assert.equal(briefs.length, 4)
  assert.deepEqual(new Set(briefs.map((item) => item.sector)), new Set(['legal', 'commercial', 'government', 'healthcare']))
  for (const brief of briefs) {
    assert.ok(brief.prospect)
    assert.ok(brief.pilot)
    assert.ok(brief.outreach?.draft)
    assert.equal(brief.outreachAction, 'APPROVAL')
  }
})

test('external outreach never sends without human approval', () => {
  assert.deepEqual(requestOutreachSend(), { decision: 'APPROVAL', reason: 'external_outreach_is_consequential' })
  assert.deepEqual(requestOutreachSend({ approved: true }), { decision: 'ALLOW', reason: 'exact_human_approval_required_by_company_01' })
})
