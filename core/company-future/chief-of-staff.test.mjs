import assert from 'node:assert/strict'
import test from 'node:test'
import { runCompanyOfFutureProof } from './company-proof.mjs'
import { buildChiefOfStaffBrief } from './chief-of-staff.mjs'

test('Chief of Staff compresses the operating day without gaining approval authority', async () => {
  const proof = await runCompanyOfFutureProof()
  const brief = buildChiefOfStaffBrief({ proof })

  assert.equal(brief.workforce.total, 100)
  assert.equal(brief.today.decisions, 10_000)
  assert.equal(brief.today.humanAttentionItems, 50)
  assert.equal(brief.today.estimatedHumanMinutes, 100)
  assert.equal(brief.safety.healthy, true)
  assert.equal(brief.safety.receiptCoverage, 1)
  assert.equal(brief.permissions.canReadAuthorityState, true)
  assert.equal(brief.permissions.canSummarize, true)
  assert.equal(brief.permissions.canRecommend, true)
  assert.equal(brief.permissions.canApprove, false)
  assert.equal(brief.permissions.canExpandAuthority, false)
  assert.equal(brief.permissions.canExecuteConsequentialActions, false)
  assert.ok(brief.queue.some((item) => item.type === 'approval_queue'))
  assert.ok(brief.queue.some((item) => item.type === 'provider_reconciliation'))
  assert.ok(brief.autonomyChanges.some((item) => item.action === 'reduce_authority'))
})
