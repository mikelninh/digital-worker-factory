import assert from 'node:assert/strict'
import test from 'node:test'
import {
  growthContentPillars,
  initialGrowthContentQueue,
  nextGrowthContentJobs,
  validateGrowthContentJob,
} from './growth-content.mjs'

test('growth content has reusable proof-driven pillars', () => {
  assert.ok(growthContentPillars.length >= 4)
  assert.ok(growthContentPillars.some((p) => p.id === 'proof-ledger'))
  assert.ok(growthContentPillars.some((p) => p.id === 'sector-maps'))
})

test('every initial content job has a valid pillar and CTA', () => {
  for (const job of initialGrowthContentQueue) {
    const result = validateGrowthContentJob(job)
    assert.deepEqual(result, { valid: true, errors: [] }, job.id)
  }
})

test('growth content never encodes guaranteed ROI', () => {
  const result = validateGrowthContentJob({
    id: 'bad',
    pillar: 'proof-ledger',
    format: 'article',
    title: 'Guaranteed 10x ROI',
    cta: '/scorecard',
    guaranteedRoi: true,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.includes('guaranteed_roi_not_allowed'))
})

test('content engine returns a bounded draft queue', () => {
  const jobs = nextGrowthContentJobs(3)
  assert.equal(jobs.length, 3)
  assert.ok(jobs.every((job) => job.status === 'draft_next' || job.status === 'queued'))
})
