import test from 'node:test'
import assert from 'node:assert/strict'

import { createOCNClient, createOCNGuard, createGuardedFetch, deriveTrustPlan, wrapToolExecutor } from './ocn-guard.mjs'

test('deriveTrustPlan adds freshness, evidence and authority only when needed', () => {
  assert.deepEqual(deriveTrustPlan({ risk: 'read' }).events, ['trust.preflight.v1'])
  assert.deepEqual(
    deriveTrustPlan({ risk: 'consequential', timeSensitive: true, hasEvidence: true }).events,
    ['trust.preflight.v1', 'freshness.verify.v1', 'evidence.verify.v1', 'authority.check.v1'],
  )
})

test('OCN client requires HTTPS for remote services', () => {
  assert.throws(() => createOCNClient({ baseUrl: 'http://example.com' }), /ocn_remote_https_required/)
  assert.doesNotThrow(() => createOCNClient({ baseUrl: 'http://127.0.0.1:4021' }))
})

test('guard blocks invocation when preflight blocks', async () => {
  let invoked = false
  const guard = createOCNGuard({
    client: { preflight: async () => ({ result: { decision: 'block' } }) },
  })
  const result = await guard.execute({
    actorId: 'a', capabilityId: 'payments.send.v1', risk: 'consequential',
    invoke: async () => { invoked = true },
  })
  assert.equal(result.status, 'blocked')
  assert.equal(result.executed, false)
  assert.equal(invoked, false)
})

test('guard returns review_required without executing by default', async () => {
  let invoked = false
  const guard = createOCNGuard({
    client: { preflight: async () => ({ result: { decision: 'review' } }) },
  })
  const result = await guard.execute({
    actorId: 'a', capabilityId: 'case.update.v1', risk: 'write',
    invoke: async () => { invoked = true },
  })
  assert.equal(result.status, 'review_required')
  assert.equal(invoked, false)
})

test('guard executes and can post-verify evidence', async () => {
  let verified = null
  const guard = createOCNGuard({
    client: {
      preflight: async () => ({ result: { decision: 'allow' } }),
      verifyEvidence: async (input) => { verified = input; return { result: { status: 'verified_structure' } } },
    },
  })
  const postEvidence = {
    claims: [{ id: 'c', text: 'claim', evidenceIds: ['e'] }],
    evidence: [{ id: 'e', sourceUrl: 'https://example.gov', retrievedAt: '2026-08-28T20:00:00Z', locator: '1' }],
  }
  const result = await guard.execute({
    actorId: 'a', capabilityId: 'search.v1', risk: 'read', postEvidence,
    invoke: async () => ({ answer: 42 }),
  })
  assert.equal(result.status, 'executed')
  assert.equal(result.output.answer, 42)
  assert.equal(verified.claims[0].id, 'c')
})

test('wrapToolExecutor applies one guard around arbitrary tools', async () => {
  const calls = []
  const guard = {
    execute: async (options) => {
      calls.push(options.capabilityId)
      return { executed: true, output: await options.invoke() }
    },
  }
  const wrapped = wrapToolExecutor(async (name, args) => `${name}:${args.value}`, {
    guard,
    describe: async (name) => ({ actorId: 'agent-1', capabilityId: `tool.${name}.v1`, risk: 'read' }),
  })
  const result = await wrapped('lookup', { value: 7 })
  assert.equal(result.output, 'lookup:7')
  assert.deepEqual(calls, ['tool.lookup.v1'])
})

test('createGuardedFetch can guard existing HTTP clients without proxying arbitrary URLs server-side', async () => {
  const guard = {
    execute: async ({ invoke, capabilityId }) => ({ executed: true, output: await invoke(), capabilityId }),
  }
  const guardedFetch = createGuardedFetch({
    guard,
    fetchImpl: async () => new Response('ok', { status: 200 }),
    classifyRequest: async ({ url }) => ({ actorId: 'agent-1', capabilityId: `http.${new URL(url).hostname}.v1`, risk: 'read' }),
  })
  const response = await guardedFetch('https://api.example.com/data')
  assert.equal(await response.text(), 'ok')
})
