import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSecurityDeltaProof } from './security-delta.mjs'

test('security delta reduces attack impact without breaking benign reads', async () => {
  const report = await buildSecurityDeltaProof()
  assert.equal(report.version, 'security-delta-target-proof/v1')
  assert.ok(report.summary.attackCases >= 4)
  assert.equal(report.summary.before.impactEscapes, report.summary.attackCases)
  assert.equal(report.summary.after.impactEscapes, 0)
  assert.equal(report.summary.delta.relativeImpactReduction, 1)
  assert.equal(report.summary.holdout.contained, report.summary.holdout.total)
  assert.equal(report.summary.benign.retentionRate, 1)
  assert.equal(report.methodology.holdoutUsedForRemediation, false)
  assert.equal(report.mutation.historicalVulnerabilityClaimed, false)
})
