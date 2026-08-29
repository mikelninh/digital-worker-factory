import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorityGateway } from './gateway.mjs'

const policy = {
  version: 'concurrency-proof-1',
  actions: {
    'ops.consequential_write': {
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
  id: 'delegation-concurrency',
  delegateId: actor.id,
  principalId: principal.id,
  scopes: ['ops.consequential_write'],
  purposes: ['casework'],
  validUntil: '2026-09-01T00:00:00.000Z',
}
const base = {
  actor,
  principal,
  delegation,
  action: {
    type: 'ops.consequential_write',
    purpose: 'casework',
    idempotencyKey: 'same-consequence-1',
  },
  evidence: { claims: ['case_ready'] },
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('two simultaneous identical actions make at most one provider call', async () => {
  let calls = 0
  const gateway = new AuthorityGateway({
    policy,
    executors: {
      'ops.consequential_write': async () => {
        calls += 1
        await sleep(30)
        return { written: true }
      },
    },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const [a, b] = await Promise.all([
    gateway.invoke({ ...base, traceId: 'concurrent-a' }),
    gateway.invoke({ ...base, traceId: 'concurrent-b' }),
  ])

  assert.equal(calls, 1)
  assert.deepEqual(new Set([a.status, b.status]), new Set(['executed', 'duplicate_in_flight']))

  const replay = await gateway.invoke({ ...base, traceId: 'concurrent-c' })
  assert.equal(replay.status, 'duplicate_suppressed')
  assert.equal(calls, 1)
})

test('a failed consequential execution is not blindly replayed with the same key', async () => {
  let calls = 0
  const gateway = new AuthorityGateway({
    policy,
    executors: {
      'ops.consequential_write': async () => {
        calls += 1
        throw new Error('provider_timeout_after_submission')
      },
    },
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const first = await gateway.invoke({ ...base, action: { ...base.action, idempotencyKey: 'uncertain-failure-1' }, traceId: 'failed-a' })
  assert.equal(first.status, 'failed')
  assert.equal(calls, 1)

  const retry = await gateway.invoke({ ...base, action: { ...base.action, idempotencyKey: 'uncertain-failure-1' }, traceId: 'failed-b' })
  assert.equal(retry.status, 'reconciliation_required')
  assert.equal(retry.originalTraceId, 'failed-a')
  assert.equal(calls, 1)
  assert.equal(retry.receipt.execution.providerCalled, false)
})
