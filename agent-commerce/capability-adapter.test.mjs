import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createCapabilityAdapter,
  createHttpJsonAdapter,
  invokeCapabilityAdapter,
} from './capability-adapter.mjs'

test('local adapter validates and executes with request context', async () => {
  const adapter = createCapabilityAdapter({
    capabilityId: 'judge.output.v1',
    version: '0.1.0',
    protocol: 'local',
    timeoutMs: 500,
    validate: (input) => ({ value: String(input.value).trim() }),
    execute: async ({ input, context }) => ({ value: input.value, requestId: context.requestId }),
  })

  const result = await invokeCapabilityAdapter(adapter, {
    input: { value: ' hello ' },
    context: { requestId: 'req-12345678' },
  })
  assert.deepEqual(result, { value: 'hello', requestId: 'req-12345678' })
})

test('adapter fails closed on timeout', async () => {
  const adapter = createCapabilityAdapter({
    capabilityId: 'document.preflight.v1',
    version: '0.1.0',
    protocol: 'local',
    timeoutMs: 50,
    validate: (input) => input,
    execute: async ({ signal }) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 500)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(signal.reason)
        }, { once: true })
      })
      return { ok: true }
    },
  })

  await assert.rejects(() => invokeCapabilityAdapter(adapter, { input: {} }), /provider_timeout/)
})

test('remote HTTP adapter requires HTTPS', () => {
  assert.throws(
    () => createHttpJsonAdapter({
      capabilityId: 'judge.output.v1',
      version: '0.1.0',
      provider: 'judge-mcp',
      endpoint: 'http://example.com/judge',
    }),
    /remote_adapter_requires_https/,
  )
})

test('HTTP adapter forwards request IDs and returns JSON', async () => {
  let seenRequestId = null
  const fetchImpl = async (_url, options) => {
    seenRequestId = options.headers['x-request-id']
    return new Response(JSON.stringify({ score: 0.9 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const adapter = createHttpJsonAdapter({
    capabilityId: 'judge.output.v1',
    version: '0.1.0',
    provider: 'judge-mcp',
    endpoint: 'https://judge.example.test/v1/judge',
    fetchImpl,
  })

  const result = await invokeCapabilityAdapter(adapter, {
    input: { artifact: 'x' },
    context: { requestId: 'req-forward-1234' },
  })
  assert.equal(seenRequestId, 'req-forward-1234')
  assert.equal(result.score, 0.9)
})
