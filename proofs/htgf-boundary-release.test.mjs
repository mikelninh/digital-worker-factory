/**
 * Release proof for HTGF: a single consequential tenant-support hand-off.
 *
 * The real ProductionAgentGateway is used throughout. No external effects happen:
 * a counting stub stands in for an external contractor/tenant message sink.
 *
 * Expected:
 * 1) No evidence -> no action even with a claimed human approval.
 * 2) Matching evidence + explicit approval + scoped identity -> exactly one action.
 * 3) Retry the same operation -> duplicate blocked without another effect.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { ProductionAgentGateway, MemoryAuditSink, InMemoryIdempotencyStore } from '../core/production-boundary.mjs'
import { makeSecurityContext } from '../core/security-boundary.mjs'

const sha = value => createHash('sha256').update(value).digest('hex')
function evidenceChain(approvedBy = 'reviewer-1') {
  return {
    version: 'trust-chain/v1',
    subject: { type: 'tenant_repair', id: 'fictional-heating-01' },
    authenticity: { status: 'original_as_received', method: 'case_intake' },
    integrity: { verified: true, sha256: sha('synthetic intake'), version: '1', capturedAt: '2026-10-15T08:00:00Z' },
    provenance: { sourceSystem: 'synthetic_fixture', sourceUri: 'demo://tenant-a/heating-01', acquiredAt: '2026-10-15T08:00:00Z' },
    authority: { id: 'tenant-support-rule', title: 'Required property evidence', version: '1', sourceUrl: 'https://example.org/fake-policy', status: 'case_specific' },
    evidence: [{ id: 'property-01', sourceId: 'property-record', locator: { kind: 'record', value: 'OBJ-001' }, excerptHash: sha('fictional property OBJ-001') }],
    derivation: { summary: 'An address must match a verified property before contractor hand-off.', method: 'deterministic_verification', evidenceIds: ['property-01'] },
    humanDecision: { required: true, status: approvedBy ? 'approved' : 'pending', actorId: approvedBy, at: approvedBy ? '2026-10-15T08:01:00Z' : null },
    audit: { traceId: 'fictional-proof-trace', createdAt: '2026-10-15T08:00:01Z' },
  }
}

async function exercise() {
  let externalEffects = 0
  const auditSink = new MemoryAuditSink()
  const gateway = new ProductionAgentGateway({
    gateway: { invoke: async () => ({ ok: true, status: 'executed', output: { preparedHandoff: 'fictional-only', effectCount: ++externalEffects } }) },
    idempotencyStore: new InMemoryIdempotencyStore(),
    auditSink,
  })
  const base = {
    tenantId: 'tenant-a',
    actor: { id: 'operator-1', role: 'operator', tenantId: 'tenant-a' },
    capabilityId: 'hauspilot.contractor.handoff',
    purpose: 'reviewed_property_repair',
    mode: 'execute',
    input: { caseId: 'fictional-heating-01' },
    approvedBy: 'reviewer-1',
    idempotencyKey: 'heating-01-handoff',
    securityContext: makeSecurityContext({
      tenantId: 'tenant-a', approvalRequired: true, approvalBoundToIntent: true,
    }),
  }
  const noEvidence = evidenceChain()
  noEvidence.evidence = []
  noEvidence.derivation.evidenceIds = []
  const missing = await gateway.invoke({ ...base, requestId: 'request-missing', trustChain: noEvidence })
  const accepted = await gateway.invoke({ ...base, requestId: 'request-approved', trustChain: evidenceChain() })
  const retry = await gateway.invoke({ ...base, requestId: 'request-retry', trustChain: evidenceChain() })
  return { missing, accepted, retry, externalEffects, audit: auditSink.events() }
}

test('missing evidence blocks the effect before invocation even when reviewer identity is present', async () => {
  const proof = await exercise()
  assert.equal(proof.missing.status, 'blocked')
  assert.equal(proof.missing.error, 'trust_chain_incomplete')
  assert.ok(proof.missing.trust.reasons.includes('evidence_required'))
  assert.equal(proof.accepted.status, 'executed')
  assert.equal(proof.externalEffects, 1)
})

test('an identical idempotency key cannot repeat a previously approved action', async () => {
  const proof = await exercise()
  assert.equal(proof.accepted.ok, true)
  assert.equal(proof.retry.ok, false)
  assert.equal(proof.retry.status, 'duplicate_blocked')
  assert.equal(proof.retry.error, 'duplicate_execution')
  assert.equal(proof.externalEffects, 1)
})

test('all three outcomes create auditable, sanitized events', async () => {
  const proof = await exercise()
  assert.deepEqual(proof.audit.map(event => event.status), ['blocked', 'executed', 'duplicate_blocked'])
  assert.equal(proof.audit[0].code, 'trust_chain_incomplete')
  assert.equal(proof.audit[2].code, 'duplicate_execution')
  assert.equal(proof.audit[1].approvedBy, '[RECORDED]')
  assert.equal(proof.audit[1].trustLevel, 'traceable')
  assert.ok(proof.audit[1].trustDigest)
})

test('missing authorization still fails even with a complete synthetic evidence chain', async () => {
  let calls = 0
  const gate = new ProductionAgentGateway({
    gateway: { invoke: async () => { calls++; return { ok:true,status:'executed' } } },
    idempotencyStore: new InMemoryIdempotencyStore(), auditSink: new MemoryAuditSink(),
  })
  const result = await gate.invoke({
    tenantId:'tenant-a', actor:{id:'operator',role:'operator',tenantId:'tenant-a'},
    requestId:'unapproved', capabilityId:'hauspilot.contractor.handoff', mode:'execute',
    idempotencyKey:'unapproved', trustChain:evidenceChain(null),
    securityContext:makeSecurityContext({tenantId:'tenant-a',approvalRequired:true,approvalBoundToIntent:true}),
  })
  assert.notEqual(result.status,'executed')
  assert.equal(calls,0)
})
