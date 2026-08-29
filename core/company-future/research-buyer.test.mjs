import assert from 'node:assert/strict'
import test from 'node:test'
import { createResearchBuyerAgent } from './research-buyer.mjs'

function jsonResponse(body, { status = 200 } = {}) {
  const text = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        if (String(name).toLowerCase() === 'content-type') return 'application/json'
        if (String(name).toLowerCase() === 'content-length') return String(Buffer.byteLength(text))
        return null
      },
    },
    async text() { return text },
  }
}

test('Research Buyer blocks unapproved hosts before network execution', async () => {
  let fetchCalls = 0
  const agent = createResearchBuyerAgent({
    allowedHosts: ['api.example.test'],
    fetchImpl: async () => { fetchCalls += 1; return jsonResponse({ useful: true }) },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const allowed = await agent.readSource({ sourceId: 'allowed', sourceUrl: 'https://api.example.test/data' })
  assert.equal(allowed.status, 'executed')
  assert.equal(fetchCalls, 1)

  const blocked = await agent.readSource({ sourceId: 'blocked', sourceUrl: 'https://evil.example/data' })
  assert.equal(blocked.status, 'blocked')
  assert.equal(fetchCalls, 1)
  assert.equal(blocked.receipt.execution.providerCalled, false)
})

test('Research Buyer purchase fails closed without a live payment client', async () => {
  const agent = createResearchBuyerAgent({
    allowedHosts: ['api.example.test'],
    fetchImpl: async () => jsonResponse({ useful: true }),
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const purchase = await agent.buyData({
    resourceUrl: 'https://paid.example.test/data',
    vendorId: 'paid-example',
    amount: 2,
    counterpartyApproved: true,
  })

  assert.equal(purchase.status, 'blocked')
  assert.ok(purchase.decision.reasons.includes('executor_not_configured'))
  assert.equal(purchase.receipt.execution.providerCalled, false)
  assert.equal(agent.budget().spent, 0)
})

test('Research Buyer can spend through x402 only inside the same authority envelope', async () => {
  let paymentCalls = 0
  const agent = createResearchBuyerAgent({
    allowedHosts: ['api.example.test'],
    fetchImpl: async () => jsonResponse({ useful: true }),
    requestPaidResource: async ({ amount, authority }) => {
      paymentCalls += 1
      return { ok: true, settlement: { id: `settlement-${paymentCalls}` }, data: { amount, authority } }
    },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const allowed = await agent.buyData({
    resourceUrl: 'https://paid.example.test/data-1',
    vendorId: 'approved-vendor',
    amount: 2,
    counterpartyApproved: true,
    idempotencyKey: 'buy-1',
  })
  assert.equal(allowed.status, 'executed')
  assert.equal(paymentCalls, 1)
  assert.equal(agent.budget().spent, 2)

  const overActionLimit = await agent.buyData({
    resourceUrl: 'https://paid.example.test/data-2',
    vendorId: 'approved-vendor',
    amount: 6,
    counterpartyApproved: true,
    idempotencyKey: 'buy-2',
  })
  assert.equal(overActionLimit.status, 'blocked')
  assert.equal(paymentCalls, 1)

  const unknownVendor = await agent.buyData({
    resourceUrl: 'https://paid.example.test/data-3',
    vendorId: 'unknown-vendor',
    amount: 1,
    counterpartyApproved: false,
    idempotencyKey: 'buy-3',
  })
  assert.equal(unknownVendor.status, 'blocked')
  assert.equal(paymentCalls, 1)
})
