import test from 'node:test'
import assert from 'node:assert/strict'

import { BASE_SEPOLIA, BASE_SEPOLIA_USDC, selectSafePaymentRequirement, withOCNGuard } from './index.mjs'

test('JS SDK payment selector keeps trusted-event spend bounded', () => {
  const safe = { scheme: 'exact', network: BASE_SEPOLIA, asset: BASE_SEPOLIA_USDC, amount: '5000', payTo: '0x0000000000000000000000000000000000000001' }
  const selected = selectSafePaymentRequirement(2, [
    { ...safe, amount: '25000' },
    { ...safe, network: 'eip155:8453', amount: '1' },
    safe,
  ], { maxPaymentAtomic: 20_000n })
  assert.equal(selected.amount, '5000')
})

test('Guard blocks underlying tool on block decision', async () => {
  let called = false
  const guard = withOCNGuard({ client: { preflight: async () => ({ result: { decision: 'block' } }) } })
  const result = await guard.run({
    actorId: 'agent-1', capabilityId: 'payment.send.v1', risk: 'consequential',
    invoke: async () => { called = true; return 'bad' },
  })
  assert.equal(result.status, 'blocked')
  assert.equal(result.executed, false)
  assert.equal(called, false)
})

test('Guard requires review by default and can execute only when caller policy explicitly opts in', async () => {
  let calls = 0
  const client = { preflight: async () => ({ result: { decision: 'review' } }) }
  const safeGuard = withOCNGuard({ client })
  const review = await safeGuard.run({ actorId: 'a', capabilityId: 'case.update.v1', risk: 'write', invoke: async () => { calls += 1 } })
  assert.equal(review.status, 'review_required')
  assert.equal(calls, 0)

  const explicitGuard = withOCNGuard({ client, reviewMode: 'execute' })
  const executed = await explicitGuard.run({ actorId: 'a', capabilityId: 'case.update.v1', risk: 'write', humanApproval: true, invoke: async () => { calls += 1; return 42 } })
  assert.equal(executed.status, 'executed')
  assert.equal(executed.output, 42)
  assert.equal(calls, 1)
})

test('wrapTool makes one guard reusable across arbitrary tool executors', async () => {
  const client = { preflight: async () => ({ result: { decision: 'allow' } }) }
  const guard = withOCNGuard({ client })
  const wrapped = guard.wrapTool(
    async (name, args) => `${name}:${args.value}`,
    async (name) => ({ actorId: 'agent-1', capabilityId: `tool.${name}.v1`, risk: 'read' }),
  )
  const result = await wrapped('lookup', { value: 7 })
  assert.equal(result.executed, true)
  assert.equal(result.output, 'lookup:7')
})
