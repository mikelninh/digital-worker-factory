import test from 'node:test'
import assert from 'node:assert/strict'
import { AgentGateway } from './agent-gateway.mjs'
import { createFactoryRegistry } from './catalog.mjs'

function gatewayWithSpies() {
  const calls = []
  const executors = {
    'hauspilot.case.read': async ({ input }) => {
      calls.push(['hauspilot.case.read', input])
      return { caseId: input.caseId, state: 'prepared' }
    },
    'hauspilot.review.prepare': async ({ input }) => {
      calls.push(['hauspilot.review.prepare', input])
      return { reviewId: 'review-1' }
    },
    'gitlaw.case.read': async ({ input }) => {
      calls.push(['gitlaw.case.read', input])
      return { id: input.caseId, source: 'gitlaw' }
    },
    'gitlaw.case.update': async ({ input, approvedBy }) => {
      calls.push(['gitlaw.case.update', input, approvedBy])
      return { id: input.caseId, status: input.status }
    },
  }
  return { gateway: new AgentGateway({ registry: createFactoryRegistry(), executors }), calls }
}

test('read capability executes for an allowed role without approval', async () => {
  const { gateway, calls } = gatewayWithSpies()
  const result = await gateway.invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.case.read',
    input: { caseId: 'hp-1' },
  })
  assert.equal(result.ok, true)
  assert.equal(result.status, 'executed')
  assert.deepEqual(calls, [['hauspilot.case.read', { caseId: 'hp-1' }]])
})

test('write capability is fail-closed until a human approves it', async () => {
  const { gateway, calls } = gatewayWithSpies()
  const blocked = await gateway.invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.review.prepare',
    input: { caseId: 'hp-1' },
  })
  assert.equal(blocked.ok, false)
  assert.equal(blocked.status, 'blocked')
  assert.ok(blocked.policy.reasons.includes('human_approval_required'))
  assert.equal(calls.length, 0)

  const approved = await gateway.invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'hauspilot.review.prepare',
    input: { caseId: 'hp-1' },
    approvedBy: 'reviewer-7',
  })
  assert.equal(approved.ok, true)
  assert.equal(calls.length, 1)
})

test('GitLaw case updates require both legal permission and explicit approval', async () => {
  const { gateway, calls } = gatewayWithSpies()

  const wrongRole = await gateway.invoke({
    actor: { id: 'ops-1', role: 'operator' },
    capabilityId: 'gitlaw.case.update',
    input: { caseId: 'case-42', status: 'reviewed' },
    approvedBy: 'lawyer-1',
  })
  assert.equal(wrongRole.ok, false)
  assert.ok(wrongRole.policy.reasons.includes('role_not_allowed:operator'))

  const noApproval = await gateway.invoke({
    actor: { id: 'assistant-1', role: 'legal_assistant' },
    capabilityId: 'gitlaw.case.update',
    input: { caseId: 'case-42', status: 'reviewed' },
  })
  assert.equal(noApproval.ok, false)
  assert.ok(noApproval.policy.reasons.includes('human_approval_required'))

  const approved = await gateway.invoke({
    actor: { id: 'assistant-1', role: 'legal_assistant' },
    capabilityId: 'gitlaw.case.update',
    input: { caseId: 'case-42', status: 'reviewed' },
    approvedBy: 'lawyer-1',
  })
  assert.equal(approved.ok, true)
  assert.deepEqual(approved.output, { id: 'case-42', status: 'reviewed' })
  assert.equal(calls.length, 1)
})

test('shadow mode never executes but remains auditable', async () => {
  const { gateway, calls } = gatewayWithSpies()
  const result = await gateway.invoke({
    actor: { id: 'lawyer-1', role: 'lawyer' },
    capabilityId: 'gitlaw.case.read',
    input: { caseId: 'case-1' },
    mode: 'shadow',
  })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'shadowed')
  assert.equal(calls.length, 0)
  assert.equal(gateway.auditLog().at(-1).status, 'shadowed')
})

test('unknown capabilities and missing executors are blocked and audited', async () => {
  const registry = createFactoryRegistry()
  const gateway = new AgentGateway({ registry, executors: {} })

  const unknown = await gateway.invoke({
    actor: { id: 'admin-1', role: 'admin' },
    capabilityId: 'anything.execute',
  })
  assert.equal(unknown.status, 'blocked')
  assert.deepEqual(unknown.policy.reasons, ['unknown_capability'])

  const missingExecutor = await gateway.invoke({
    actor: { id: 'admin-1', role: 'admin' },
    capabilityId: 'gitlaw.case.read',
    input: { caseId: 'case-1' },
  })
  assert.equal(missingExecutor.status, 'blocked')
  assert.equal(missingExecutor.error, 'executor_not_configured')
  assert.equal(gateway.auditLog().length, 2)
})
