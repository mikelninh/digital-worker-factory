import test from 'node:test'
import assert from 'node:assert/strict'

import { createNetworkApp } from './network-server.mjs'

async function withServer(app, fn) {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  try {
    await fn(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

const PAID = { 'content-type': 'application/json', 'x-test-payment': 'valid', 'x-agent-id': 'test-agent' }

test('trusted-event catalog is free and exposes five micropriced events', async () => {
  const app = createNetworkApp({ paymentsMode: 'mock', allowMock: true })
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/.well-known/trusted-events.json`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.capabilities.length, 5)
    const freshness = body.capabilities.find((item) => item.id === 'freshness.verify.v1')
    assert.equal(freshness.pricing.amountUsd, '0.001')
    assert.equal(freshness.readiness, 'implemented_not_public')
    assert.equal(freshness.trust.paymentBuysTrust, false)
  })
})

test('malformed trusted event fails before payment', async () => {
  const app = createNetworkApp({ paymentsMode: 'mock', allowMock: true })
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/freshness/verify`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ observedAt: 'nope', maxAgeSeconds: 60 }),
    })
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, 'observedAt_invalid')
  })
})

test('valid unpaid trusted event returns 402 with microprice', async () => {
  const app = createNetworkApp({ paymentsMode: 'mock', allowMock: true })
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/freshness/verify`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ observedAt: new Date().toISOString(), maxAgeSeconds: 60 }),
    })
    assert.equal(response.status, 402)
    const body = await response.json()
    assert.equal(body.capabilityId, 'freshness.verify.v1')
    assert.equal(body.price, '0.001')
  })
})

test('paid trusted event returns receipt, trust event id and aggregate telemetry', async () => {
  const app = createNetworkApp({ paymentsMode: 'mock', allowMock: true })
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/freshness/verify`, {
      method: 'POST', headers: PAID, body: JSON.stringify({ observedAt: new Date().toISOString(), maxAgeSeconds: 60 }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.ok, true)
    assert.equal(body.capabilityId, 'freshness.verify.v1')
    assert.match(body.trustEventId, /^[0-9a-f-]{36}$/)
    assert.equal(body.receipt.authority.paymentGrantedAuthority, false)
    assert.equal(body.receipt.authority.consequentialActionExecuted, false)

    const metrics = await (await fetch(`${base}/v1/trust/metrics`)).json()
    assert.equal(metrics.events, 1)
    assert.equal(metrics.paidEvents, 1)
    assert.equal(metrics.byCapability['freshness.verify.v1'].calls, 1)
    assert.match(metrics.privacy, /raw request\/result payloads are not stored/i)
  })
})

test('usage budget rejects over-limit traffic before a second payment', async () => {
  const app = createNetworkApp({ paymentsMode: 'mock', allowMock: true, usageLimitPerMinute: 1 })
  await withServer(app, async (base) => {
    const body = JSON.stringify({ observedAt: new Date().toISOString(), maxAgeSeconds: 60 })
    const first = await fetch(`${base}/v1/freshness/verify`, { method: 'POST', headers: PAID, body })
    assert.equal(first.status, 200)
    const second = await fetch(`${base}/v1/freshness/verify`, { method: 'POST', headers: PAID, body })
    assert.equal(second.status, 429)
    assert.equal((await second.json()).error, 'usage_budget_exceeded')
  })
})

test('authenticated outcome feedback labels a trust event without exposing payloads', async () => {
  const app = createNetworkApp({ paymentsMode: 'mock', allowMock: true, feedbackToken: 'feedback-secret' })
  await withServer(app, async (base) => {
    const paid = await fetch(`${base}/v1/freshness/verify`, {
      method: 'POST', headers: PAID, body: JSON.stringify({ observedAt: new Date().toISOString(), maxAgeSeconds: 60 }),
    })
    const event = await paid.json()
    const feedback = await fetch(`${base}/v1/trust/outcomes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer feedback-secret' },
      body: JSON.stringify({ eventId: event.trustEventId, outcome: 'correct', reasonCode: 'reviewed' }),
    })
    assert.equal(feedback.status, 200)
    const metrics = await (await fetch(`${base}/v1/trust/metrics`)).json()
    assert.equal(metrics.outcomeLabels, 1)
    assert.equal(metrics.byCapability['freshness.verify.v1'].outcomes.correct, 1)
  })
})
