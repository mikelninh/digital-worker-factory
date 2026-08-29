import test from 'node:test'
import assert from 'node:assert/strict'

import { createNetworkApp, JUDGE_CAPABILITY_ID } from './network-server.mjs'

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

test('network health is degraded when Judge provider is not configured', async () => {
  const app = createNetworkApp({ paymentsMode: 'mock', allowMock: true })
  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/network/health`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'degraded')
    assert.equal(body.providers.judge, false)
    assert.match(body.requestId, /^[a-zA-Z0-9._:-]+$/)
  })
})

test('Judge call uses provider adapter and propagates request id', async () => {
  let observedRequestId = null
  let observedBody = null
  const judgeFetchImpl = async (_url, options) => {
    observedRequestId = options.headers['x-request-id']
    observedBody = JSON.parse(options.body)
    return new Response(JSON.stringify({
      schema: 'open-capabilities.provider/1',
      capabilityId: 'agent.output.judge.v1',
      result: { overall: 9.2, summary: 'Strong and reviewable.', criteria: [], checks: [] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const app = createNetworkApp({
    paymentsMode: 'mock',
    allowMock: true,
    judgeProviderUrl: 'http://127.0.0.1:8003/v1/judge',
    judgeFetchImpl,
  })

  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/judge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-request-id': 'req-test-123456' },
      body: JSON.stringify({ artifact: 'Evidence-backed answer.', rubric_id: 'writing-clarity' }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.ok, true)
    assert.equal(body.capabilityId, JUDGE_CAPABILITY_ID)
    assert.equal(body.result.overall, 9.2)
    assert.equal(body.authority.paymentGrantedAuthority, false)
    assert.equal(body.authority.consequentialActionExecuted, false)
    assert.equal(observedRequestId, body.requestId)
    assert.equal(observedBody.rubric_id, 'writing-clarity')
  })
})

test('Judge facade blocks caller-controlled model routing before provider call', async () => {
  let called = false
  const app = createNetworkApp({
    paymentsMode: 'mock',
    allowMock: true,
    judgeProviderUrl: 'http://127.0.0.1:8003/v1/judge',
    judgeFetchImpl: async () => {
      called = true
      return new Response('{}', { status: 200 })
    },
  })

  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/judge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ artifact: 'hello', rubric_id: 'writing-clarity', model: 'unapproved-model' }),
    })
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, 'judge_model_override_not_allowed')
    assert.equal(called, false)
  })
})

test('Judge provider errors fail closed with provider details', async () => {
  const app = createNetworkApp({
    paymentsMode: 'mock',
    allowMock: true,
    judgeProviderUrl: 'http://127.0.0.1:8003/v1/judge',
    judgeFetchImpl: async () => new Response(JSON.stringify({ error: 'rubric_not_found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    }),
  })

  await withServer(app, async (base) => {
    const response = await fetch(`${base}/v1/judge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ artifact: 'hello', rubric_id: 'missing-rubric' }),
    })
    assert.equal(response.status, 502)
    const body = await response.json()
    assert.equal(body.error, 'provider_http_404')
    assert.equal(body.providerDetails.error, 'rubric_not_found')
  })
})
