import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeRequestId } from './request-context.mjs'

test('request ID preserves a valid caller correlation ID', () => {
  assert.equal(normalizeRequestId('req-client-123456'), 'req-client-123456')
})

test('request ID is generated when absent', () => {
  assert.match(normalizeRequestId(), /^[0-9a-f-]{36}$/)
})

test('invalid request IDs fail closed', () => {
  assert.throws(() => normalizeRequestId('bad id'), /request_id_invalid/)
  assert.throws(() => normalizeRequestId('short'), /request_id_invalid/)
})
