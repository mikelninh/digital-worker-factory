import test from 'node:test'
import assert from 'node:assert/strict'
import { runCohereFdeDemo } from './runtime.mjs'

test('routes a consequential write to human review when evidence is complete', async () => {
  const result = await runCohereFdeDemo({ contractPresent: true, requestId: 'review-case' })

  assert.equal(result.synthetic, true)
  assert.equal(result.decision, 'REVIEW_REQUIRED')
  assert.equal(result.actionEffect, 'NONE')
  assert.equal(result.evidence.length, 3)
  assert.equal(result.evidence.every((item) => item.status === 'verified'), true)
  assert.equal(result.tools.at(-1).capabilityId, 'case.update.release')
  assert.equal(result.tools.at(-1).status, 'blocked')
  assert.match(JSON.stringify(result.policy?.reasons ?? []), /human_approval_required/)
})

test('fails closed before prepare/release when required contract evidence is missing', async () => {
  const result = await runCohereFdeDemo({ contractPresent: false, requestId: 'missing-contract' })

  assert.equal(result.decision, 'BLOCKED')
  assert.equal(result.reason, 'required_evidence_missing')
  assert.deepEqual(result.missingEvidence, ['orion-labs-contract.pdf'])
  assert.equal(result.actionEffect, 'NONE')
  assert.equal(result.tools.some((item) => item.capabilityId === 'case.update.prepare'), false)
  assert.equal(result.tools.some((item) => item.capabilityId === 'case.update.release'), false)
})

test('executes only the synthetic release after explicit human approval', async () => {
  const result = await runCohereFdeDemo({
    contractPresent: true,
    approvedBy: 'human-reviewer-01',
    requestId: 'approved-case',
  })

  assert.equal(result.decision, 'APPROVED')
  assert.equal(result.actionEffect, 'synthetic_only')
  assert.equal(result.releaseReceipt?.simulated, true)
  assert.equal(result.releaseReceipt?.releasedBy, 'human-reviewer-01')
  assert.equal(result.tools.at(-1).status, 'executed')
  assert.equal(result.policy?.approvalRequired, true)
})
