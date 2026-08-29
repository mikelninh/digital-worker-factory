import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AuthorityGateway } from './gateway.mjs'
import { createAuthorityHttpServer, listenAuthorityService } from './service.mjs'
import { JsonFileRevocationStore } from './stores/json-file.mjs'

const policy = {
  version: 'http-service-test-1',
  actions: {
    'ops.case.update': {
      allowedRoles: ['ops_agent'],
      allowedPurposes: ['casework'],
      minAutonomyLevel: 2,
      requiredEvidence: ['case_ready'],
    },
  },
}

const actor = { id: 'ops-1', role: 'ops_agent', autonomyLevel: 2 }
const principal = { id: 'org-1', type: 'company' }
const delegation = {
  id: 'delegation-http-1',
  delegateId: actor.id,
  principalId: principal.id,
  scopes: ['ops.case.update'],
  purposes: ['casework'],
  validUntil: '2026-09-01T00:00:00.000Z',
}

function requestBody(idempotencyKey) {
  return {
    actor,
    principal,
    delegation,
    action: { type: 'ops.case.update', purpose: 'casework', caseId: 'case-1', idempotencyKey },
    evidence: { claims: ['case_ready'] },
  }
}

async function api(base, pathname, { method = 'GET', token = 'test-secret', body } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, body: await response.json() }
}

test('HTTP service protects the authority boundary, preflights, invokes, receipts and revocation', async (t) => {
  let providerCalls = 0
  const gateway = new AuthorityGateway({
    policy,
    executors: { 'ops.case.update': async ({ action }) => { providerCalls += 1; return { caseId: action.caseId, updated: true } } },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'authority-http-'))
  const revocations = new JsonFileRevocationStore(path.join(dir, 'revocations.json'))
  const server = createAuthorityHttpServer({
    gateway,
    token: 'test-secret',
    revocationStore: revocations,
    clock: () => new Date('2026-08-29T10:05:00Z'),
  })
  const address = await listenAuthorityService(server)
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://${address.host}:${address.port}`

  const health = await api(base, '/health', { token: null })
  assert.equal(health.status, 200)
  assert.equal(health.body.ok, true)

  const unauthorized = await api(base, '/v1/invoke', { method: 'POST', token: null, body: requestBody('http-unauthorized') })
  assert.equal(unauthorized.status, 401)
  assert.equal(providerCalls, 0)

  const preflight = await api(base, '/v1/preflight', { method: 'POST', body: requestBody('http-preflight') })
  assert.equal(preflight.status, 200)
  assert.equal(preflight.body.decision.decision, 'ALLOW')
  assert.equal(providerCalls, 0)

  const invoked = await api(base, '/v1/invoke', { method: 'POST', body: requestBody('http-execute') })
  assert.equal(invoked.status, 200)
  assert.equal(invoked.body.status, 'executed')
  assert.equal(providerCalls, 1)

  const receipts = await api(base, '/v1/receipts')
  assert.equal(receipts.status, 200)
  assert.equal(receipts.body.total, 1)
  assert.equal(receipts.body.receipts[0].execution.providerCalled, true)

  const revoked = await api(base, '/v1/delegations/delegation-http-1/revoke', {
    method: 'POST',
    body: { revokedBy: 'ops-admin-7', reason: 'emergency pause' },
  })
  assert.equal(revoked.status, 200)
  assert.equal(revoked.body.revocation.delegationId, 'delegation-http-1')
  assert.equal(revocations.isRevoked('delegation-http-1'), true)

  const afterRevoke = await api(base, '/v1/invoke', { method: 'POST', body: requestBody('http-after-revoke') })
  assert.equal(afterRevoke.status, 403)
  assert.equal(afterRevoke.body.status, 'blocked')
  assert.ok(afterRevoke.body.decision.reasons.includes('delegation_revoked'))
  assert.equal(providerCalls, 1)
})

test('HTTP service fails closed on malformed or oversized input', async (t) => {
  const gateway = new AuthorityGateway({ policy, executors: {}, clock: () => new Date('2026-08-29T10:00:00Z') })
  const server = createAuthorityHttpServer({ gateway, token: 'test-secret', maxBodyBytes: 32 })
  const address = await listenAuthorityService(server)
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://${address.host}:${address.port}`

  const malformed = await fetch(`${base}/v1/preflight`, {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret', 'content-type': 'application/json' },
    body: '{bad json',
  })
  assert.equal(malformed.status, 400)

  const oversized = await fetch(`${base}/v1/preflight`, {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret', 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(100) }),
  })
  assert.equal(oversized.status, 413)
})
