import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createProductionPlatform } from './platform-v1.mjs'
import { memoryAudit, memoryIdempotency, memoryObjectStore, memoryPersistence, memoryQueue } from './memory-adapters.mjs'

function makePlatform({ durable = false, maxAttempts = 2 } = {}) {
  const persistence = memoryPersistence({ durable })
  const objectStore = memoryObjectStore({ durable })
  const audit = memoryAudit({ durable })
  const idempotency = memoryIdempotency({ durable })
  const queue = memoryQueue({ durable, maxAttempts })
  const platform = createProductionPlatform({ persistence, objectStore, audit, idempotency, queue, clock: () => new Date('2026-08-31T10:00:00Z') })
  return { platform, persistence, objectStore, audit, idempotency, queue }
}

const a = { tenantId: 'tenant-a', actorId: 'reviewer-a', role: 'reviewer', requestId: 'req-a' }
const b = { tenantId: 'tenant-b', actorId: 'reviewer-b', role: 'reviewer', requestId: 'req-b' }
const hash = (text) => createHash('sha256').update(text).digest('hex')
function approvedTrust(ctx = a) {
  return {
    version: 'trust-chain/v1', subject: { type: 'case', id: '42' },
    authenticity: { status: 'original_as_received', method: 'raw_capture' },
    integrity: { verified: true, sha256: hash('doc'), version: 'v1', capturedAt: '2026-08-31T09:00:00Z' },
    provenance: { sourceSystem: 'customer_upload', sourceUri: 'object://tenant-a/42.pdf', acquiredAt: '2026-08-31T09:00:00Z' },
    authority: { id: 'rule-1', title: 'Rule', version: '2026-08-01', sourceUrl: 'https://authority.example/rule', status: 'authoritative' },
    evidence: [{ id: 'ev-1', sourceId: 'doc-1', locator: { kind: 'page', value: '2' }, excerptHash: hash('supporting text') }],
    derivation: { summary: 'Rule and evidence support the prepared action.', method: 'deterministic_rule_check', evidenceIds: ['ev-1'] },
    humanDecision: { required: true, status: 'approved', actorId: ctx.actorId, at: '2026-08-31T09:10:00Z' },
    audit: { traceId: 'trace-1', createdAt: '2026-08-31T09:00:01Z' },
  }
}

test('tenant data never crosses persistence or object boundaries', async () => {
  const { platform, objectStore } = makePlatform()
  await platform.putRecord(a, 'cases', '42', { answer: 'A' })
  assert.deepEqual(await platform.getRecord(a, 'cases', '42'), { answer: 'A' })
  assert.equal(await platform.getRecord(b, 'cases', '42'), null)
  await platform.putObject(a, 'doc.pdf', Buffer.from('a'), { caseId: '42' })
  assert.equal(await objectStore.get({ tenantId: b.tenantId, key: 'doc.pdf' }), null)
})

test('effectful work requires trust chain, is idempotent and redacts secrets', async () => {
  const { platform, audit, queue } = makePlatform()
  await assert.rejects(() => platform.enqueueEffect(a, { kind: 'send_notice', payload: {}, idempotencyKey: 'no-trust' }), /trust_chain_incomplete/)
  assert.equal(queue.jobs().length, 0)
  const args = { kind: 'send_notice', payload: { message: 'hello', api_key: 'secret-value' }, idempotencyKey: 'idem-1', trustChain: approvedTrust() }
  const first = await platform.enqueueEffect(a, args)
  const second = await platform.enqueueEffect(a, args)
  assert.equal(first.duplicate, false)
  assert.equal(first.trust.level, 'traceable')
  assert.equal(second.duplicate, true)
  assert.equal(queue.jobs().length, 1)
  assert.equal(JSON.stringify(audit.events()).includes('secret-value'), false)
  assert.equal(JSON.stringify(audit.events()).includes('[REDACTED]'), true)
  assert.ok(audit.events().some((event) => event.event === 'effect.blocked'))
})

test('queue retries and dead-letters after bounded attempts', async () => {
  const { platform } = makePlatform({ maxAttempts: 2 })
  const created = await platform.enqueueEffect(a, { kind: 'write', payload: {}, idempotencyKey: 'idem-dlq', trustChain: approvedTrust() })
  let job = await platform.claimJob('worker-1')
  assert.equal(job.id, created.jobId)
  let state = await platform.failJob(a, job.id, 'provider unavailable')
  assert.equal(state.deadLettered, false)
  job = await platform.claimJob('worker-1')
  state = await platform.failJob(a, job.id, 'provider unavailable')
  assert.equal(state.deadLettered, true)
})

test('tenant deletion removes tenant records without touching another tenant', async () => {
  const { platform } = makePlatform()
  await platform.putRecord(a, 'cases', '1', { x: 1 })
  await platform.putRecord(b, 'cases', '1', { x: 2 })
  await platform.deleteTenant(a)
  assert.equal(await platform.getRecord(a, 'cases', '1'), null)
  assert.deepEqual(await platform.getRecord(b, 'cases', '1'), { x: 2 })
})

test('backup snapshot restores state in the reference persistence adapter', async () => {
  const { platform, persistence } = makePlatform()
  await platform.putRecord(a, 'cases', 'restore-me', { state: 'before' })
  const snapshot = persistence.snapshot()
  await platform.putRecord(a, 'cases', 'restore-me', { state: 'after' })
  persistence.restore(snapshot)
  assert.deepEqual(await platform.getRecord(a, 'cases', 'restore-me'), { state: 'before' })
})

test('readiness is fail-closed until every adapter is durable', async () => {
  const demo = makePlatform({ durable: false })
  const prod = makePlatform({ durable: true })
  const red = await demo.platform.readiness()
  const green = await prod.platform.readiness()
  assert.equal(red.ready, false)
  assert.ok(red.missing.includes('persistence_not_durable'))
  assert.equal(green.ready, true)
  assert.equal(green.stage, 'ENGINEERING_PRODUCTION_READY')
  assert.equal(green.checks.trustChain.enforced, true)
})

test('missing tenant and missing idempotency fail closed', async () => {
  const { platform } = makePlatform()
  await assert.rejects(() => platform.putRecord({ actorId: 'x', role: 'reviewer' }, 'cases', '1', {}), /tenant_required/)
  await assert.rejects(() => platform.enqueueEffect(a, { kind: 'write', payload: {}, trustChain: approvedTrust() }), /idempotency_key_required/)
})
