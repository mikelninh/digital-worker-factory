import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  InMemoryIdempotencyStore,
  MemoryAuditSink,
  ProductionAgentGateway,
  evaluateProductionReadiness,
  redactSensitive,
  validateProductionContext,
} from './production-boundary.mjs'

function hash(text) { return createHash('sha256').update(text).digest('hex') }

function trustChain({ approvedBy = null } = {}) {
  return {
    version: 'trust-chain/v1',
    subject: { type: 'case', id: 'case-1' },
    authenticity: { status: 'original_as_received', method: 'ingest_capture' },
    integrity: { verified: true, sha256: hash('original-document-bytes'), version: 'v1', capturedAt: '2026-09-01T12:00:00Z' },
    provenance: { sourceSystem: 'customer_upload', sourceUri: 'object://tenant-a/case-1/document.pdf', acquiredAt: '2026-09-01T12:00:00Z' },
    authority: { id: 'rule-1', title: 'Applicable rule', version: '2026-08-01', sourceUrl: 'https://authority.example/rule', status: 'authoritative' },
    evidence: [{ id: 'ev-1', sourceId: 'document-1', locator: { kind: 'page', value: '3' }, excerptHash: hash('exact supporting excerpt') }],
    derivation: { summary: 'Rule requires the proof; page 3 is the supporting case evidence.', method: 'deterministic_rule_check', evidenceIds: ['ev-1'] },
    humanDecision: { required: true, status: approvedBy ? 'approved' : 'pending', actorId: approvedBy, at: approvedBy ? '2026-09-01T12:05:00Z' : null },
    audit: { traceId: 'trace-1', createdAt: '2026-09-01T12:00:01Z' },
  }
}

test('production context requires tenant actor role and request id', () => {
  assert.throws(() => validateProductionContext({}), /tenant_required/)
  assert.throws(() => validateProductionContext({ tenantId: 't1', actor: { id: 'u1' }, requestId: 'r1' }), /actor_role_required/)
  assert.throws(() => validateProductionContext({ tenantId: 't1', actor: { id: 'u1', role: 'reviewer', tenantId: 't2' }, requestId: 'r1' }), /cross_tenant_actor_blocked/)
  assert.equal(validateProductionContext({ tenantId: 't1', actor: { id: 'u1', role: 'reviewer' }, requestId: 'r1' }).actor.tenantId, 't1')
})

test('sensitive audit data is redacted', () => {
  const redacted = redactSensitive({ apiKey: 'sk-secretvalue', nested: { authorization: 'Bearer abcdef123' }, note: 'safe' })
  assert.equal(redacted.apiKey, '[REDACTED]')
  assert.equal(redacted.nested.authorization, '[REDACTED]')
  assert.equal(redacted.note, 'safe')
})

test('production execution blocks before idempotency or executor when trust chain is absent', async () => {
  let called = false
  const gateway = { invoke: async () => { called = true; return { ok: true, status: 'executed' } } }
  const auditSink = new MemoryAuditSink()
  const production = new ProductionAgentGateway({ gateway, idempotencyStore: new InMemoryIdempotencyStore(), auditSink })
  const result = await production.invoke({
    tenantId: 'tenant-a', actor: { id: 'user-1', role: 'operator' }, requestId: 'req-trust', capabilityId: 'case.update', idempotencyKey: 'op-1',
  })
  assert.equal(result.error, 'trust_chain_incomplete')
  assert.equal(called, false)
  assert.ok(auditSink.events().some((event) => event.code === 'trust_chain_incomplete'))
})

test('effectful execution requires trust chain plus idempotency and blocks duplicates', async () => {
  let calls = 0
  const gateway = { invoke: async () => ({ ok: true, status: 'executed', output: ++calls }) }
  const auditSink = new MemoryAuditSink()
  const production = new ProductionAgentGateway({ gateway, idempotencyStore: new InMemoryIdempotencyStore(), auditSink })
  const base = { tenantId: 'tenant-a', actor: { id: 'user-1', role: 'operator' }, requestId: 'req-1', capabilityId: 'case.update', trustChain: trustChain() }

  const missing = await production.invoke(base)
  assert.equal(missing.error, 'idempotency_key_required')

  const first = await production.invoke({ ...base, idempotencyKey: 'same-operation' })
  const duplicate = await production.invoke({ ...base, requestId: 'req-2', idempotencyKey: 'same-operation' })
  assert.equal(first.ok, true)
  assert.equal(first.trust.level, 'traceable')
  assert.equal(duplicate.status, 'duplicate_blocked')
  assert.equal(calls, 1)
  assert.ok(auditSink.events().some((event) => event.status === 'duplicate_blocked'))
  assert.ok(auditSink.events().some((event) => event.trustDigest))
})

test('human approval identity must match the approved trust-chain decision', async () => {
  let called = false
  const gateway = { invoke: async () => { called = true; return { ok: true, status: 'executed' } } }
  const production = new ProductionAgentGateway({ gateway, idempotencyStore: new InMemoryIdempotencyStore(), auditSink: new MemoryAuditSink() })
  const result = await production.invoke({
    tenantId: 'tenant-a', actor: { id: 'u1', role: 'operator' }, requestId: 'r1', capabilityId: 'case.update',
    approvedBy: 'reviewer-2', idempotencyKey: 'op-2', trustChain: trustChain({ approvedBy: 'reviewer-1' }),
  })
  assert.equal(result.error, 'trust_chain_incomplete')
  assert.ok(result.trust.reasons.includes('human_approval_mismatch'))
  assert.equal(called, false)
})

test('cross tenant actor is blocked before underlying gateway is called', async () => {
  let called = false
  const gateway = { invoke: async () => { called = true; return { ok: true, status: 'executed' } } }
  const production = new ProductionAgentGateway({ gateway, idempotencyStore: new InMemoryIdempotencyStore(), auditSink: new MemoryAuditSink() })
  const result = await production.invoke({
    tenantId: 'tenant-a', actor: { id: 'u1', role: 'operator', tenantId: 'tenant-b' }, requestId: 'r1',
    capabilityId: 'case.read', mode: 'shadow',
  })
  assert.equal(result.error, 'cross_tenant_actor_blocked')
  assert.equal(called, false)
})

test('production readiness is fail closed until every engineering gate including trust chain is explicit', () => {
  const incomplete = evaluateProductionReadiness({ identityAndAccess: true, tenantIsolation: true })
  assert.equal(incomplete.ready, false)
  assert.ok(incomplete.missing.includes('durable_persistence'))
  assert.ok(incomplete.missing.includes('trust_chain_enforced'))

  const ready = evaluateProductionReadiness({
    identityAndAccess: true,
    tenantIsolation: true,
    durablePersistence: true,
    durableAudit: true,
    durableIdempotency: true,
    secretManagement: true,
    observabilityAndSlos: true,
    retentionAndDeletion: true,
    backupRestoreTested: true,
    deploymentAndRollback: true,
    trustChainEnforced: true,
  })
  assert.equal(ready.ready, true)
  assert.deepEqual(ready.missing, [])
})
