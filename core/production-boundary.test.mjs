import test from 'node:test'
import assert from 'node:assert/strict'
import {
  InMemoryIdempotencyStore,
  MemoryAuditSink,
  ProductionAgentGateway,
  evaluateProductionReadiness,
  redactSensitive,
  validateProductionContext,
} from './production-boundary.mjs'

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

test('effectful execution requires idempotency and blocks duplicates', async () => {
  let calls = 0
  const gateway = { invoke: async () => ({ ok: true, status: 'executed', output: ++calls }) }
  const auditSink = new MemoryAuditSink()
  const production = new ProductionAgentGateway({ gateway, idempotencyStore: new InMemoryIdempotencyStore(), auditSink })
  const base = { tenantId: 'tenant-a', actor: { id: 'user-1', role: 'operator' }, requestId: 'req-1', capabilityId: 'case.update' }

  const missing = await production.invoke(base)
  assert.equal(missing.error, 'idempotency_key_required')

  const first = await production.invoke({ ...base, idempotencyKey: 'same-operation' })
  const duplicate = await production.invoke({ ...base, requestId: 'req-2', idempotencyKey: 'same-operation' })
  assert.equal(first.ok, true)
  assert.equal(duplicate.status, 'duplicate_blocked')
  assert.equal(calls, 1)
  assert.ok(auditSink.events().some((event) => event.status === 'duplicate_blocked'))
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

test('production readiness is fail closed until every engineering gate is explicit', () => {
  const incomplete = evaluateProductionReadiness({ identityAndAccess: true, tenantIsolation: true })
  assert.equal(incomplete.ready, false)
  assert.ok(incomplete.missing.includes('durable_persistence'))

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
  })
  assert.equal(ready.ready, true)
  assert.deepEqual(ready.missing, [])
})
