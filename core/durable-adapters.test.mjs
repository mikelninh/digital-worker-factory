import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FileIdempotencyStore, JsonlAuditSink } from './durable-adapters.mjs'

function tempRoot() {
  return mkdtempSync(join(tmpdir(), 'dwf-durable-'))
}

test('file idempotency is atomic across separate store instances', () => {
  const root = tempRoot()
  try {
    const directory = join(root, 'claims')
    const first = new FileIdempotencyStore({ directory })
    const second = new FileIdempotencyStore({ directory })

    assert.equal(first.claim('tenant-a:case.update:op-1'), true)
    assert.equal(second.claim('tenant-a:case.update:op-1'), false)
    assert.equal(second.has('tenant-a:case.update:op-1'), true)

    first.release('tenant-a:case.update:op-1')
    assert.equal(second.claim('tenant-a:case.update:op-1'), true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('jsonl audit survives a new sink instance and redacts secrets', async () => {
  const root = tempRoot()
  try {
    const path = join(root, 'audit', 'events.jsonl')
    const first = new JsonlAuditSink({ path })
    await first.append({
      requestId: 'req-1',
      status: 'blocked',
      apiKey: 'sk-supersecretvalue',
      nested: { authorization: 'Bearer token123' },
    })

    const second = new JsonlAuditSink({ path })
    const events = await second.events()

    assert.equal(events.length, 1)
    assert.equal(events[0].requestId, 'req-1')
    assert.equal(events[0].apiKey, '[REDACTED]')
    assert.equal(events[0].nested.authorization, '[REDACTED]')
    assert.equal(second.durable, true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
