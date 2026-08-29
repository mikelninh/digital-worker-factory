import test from 'node:test'
import assert from 'node:assert/strict'

import { MemoryIdempotencyStore, normalizeIdempotencyKey } from './idempotency.mjs'
import { MemoryUsageBudgetStore } from './usage-budget.mjs'

test('idempotency replays same request and rejects conflicting payload', () => {
  const store = new MemoryIdempotencyStore()
  const first = store.begin({ capabilityId: 'openaction.execute.v1', key: 'action-12345678', request: { a: 1 } })
  assert.equal(first.status, 'started')
  store.complete(first.storeKey, { status: 200, body: { ok: true } })
  const replay = store.begin({ capabilityId: 'openaction.execute.v1', key: 'action-12345678', request: { a: 1 } })
  assert.equal(replay.status, 'replay')
  assert.deepEqual(replay.response.body, { ok: true })
  assert.throws(
    () => store.begin({ capabilityId: 'openaction.execute.v1', key: 'action-12345678', request: { a: 2 } }),
    /idempotency_key_conflict/,
  )
})

test('idempotency key validation is bounded', () => {
  assert.equal(normalizeIdempotencyKey('req-abcdefgh'), 'req-abcdefgh')
  assert.equal(normalizeIdempotencyKey(), null)
  assert.throws(() => normalizeIdempotencyKey('bad key'), /idempotency_key_invalid/)
})

test('usage budget stops calls at configured limit', () => {
  const store = new MemoryUsageBudgetStore({ defaultLimit: 2 })
  assert.equal(store.consume({ subject: 'agent-a', capabilityId: 'judge.output.v1' }).allowed, true)
  assert.equal(store.consume({ subject: 'agent-a', capabilityId: 'judge.output.v1' }).allowed, true)
  const third = store.consume({ subject: 'agent-a', capabilityId: 'judge.output.v1' })
  assert.equal(third.allowed, false)
  assert.equal(third.used, 2)
})
