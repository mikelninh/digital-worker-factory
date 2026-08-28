import test from 'node:test'
import assert from 'node:assert/strict'
import { AgentGateway } from './agent-gateway.mjs'
import { createFactoryRegistry } from './catalog.mjs'
import { assertOutcomeReceipt, createOutcomeReceipt } from './outcome-receipt.mjs'

function gateway(executors = {}) {
  return new AgentGateway({ registry: createFactoryRegistry(), executors })
}

test('blocked, shadowed and failed work is never billable', async () => {
  const blocked = await gateway().invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.review.prepare',
    input: { privateTenantMessage: 'do not put this in receipts' },
  })
  assert.equal(blocked.receipt.billing.billable, false)
  assert.equal(blocked.receipt.billing.basis, 'not_billable:blocked')

  const shadowed = await gateway().invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.case.read',
    mode: 'shadow',
    input: { privateTenantMessage: 'still private' },
  })
  assert.equal(shadowed.receipt.billing.billable, false)

  const failed = await gateway({
    'hauspilot.case.read': async () => { throw new Error('provider unavailable') },
  }).invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.case.read',
    input: { privateTenantMessage: 'never audit raw input' },
  })
  assert.equal(failed.receipt.billing.billable, false)
  assert.equal(failed.receipt.status, 'failed')
})

test('successful bounded execution is billable only after required approval is satisfied', async () => {
  const result = await gateway({
    'hauspilot.review.prepare': async () => ({ reviewId: 'review-1' }),
  }).invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.review.prepare',
    approvedBy: 'reviewer-1',
    input: { caseId: 'case-1' },
  })

  assert.equal(result.status, 'executed')
  assert.equal(result.receipt.approval.required, true)
  assert.equal(result.receipt.approval.present, true)
  assert.equal(result.receipt.billing.billable, true)
  assert.equal(result.receipt.billing.basis, 'successful_bounded_execution')
})

test('safe read execution can be billable without inventing an approval requirement', async () => {
  const result = await gateway({
    'hauspilot.case.read': async () => ({ state: 'prepared' }),
  }).invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.case.read',
  })

  assert.equal(result.receipt.approval.required, false)
  assert.equal(result.receipt.billing.billable, true)
})

test('outcome receipt deliberately excludes raw input and executor output', async () => {
  const secret = 'tenant-bank-account-DE00-PRIVATE'
  const result = await gateway({
    'hauspilot.case.read': async () => ({ privateProviderPayload: secret }),
  }).invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.case.read',
    input: { message: secret },
  })

  const encoded = JSON.stringify(result.receipt)
  assert.equal(encoded.includes(secret), false)
  assert.equal(Object.hasOwn(result.receipt, 'input'), false)
  assert.equal(Object.hasOwn(result.receipt, 'output'), false)
  assert.equal(assertOutcomeReceipt(result.receipt), true)
})

test('receipt validator rejects a non-executed billable outcome', () => {
  const receipt = createOutcomeReceipt({
    traceId: 'trace-1',
    at: '2026-08-28T00:00:00.000Z',
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.case.read',
    mode: 'execute',
    approvedBy: null,
    policy: {
      allowed: true,
      executionAllowed: true,
      approvalRequired: false,
      reasons: [],
      capability: { provider: 'hauspilot', risk: 'read', external: false },
    },
    status: 'executed',
  })
  assert.equal(assertOutcomeReceipt(receipt), true)
  assert.equal(Object.isFrozen(receipt), true)
})
