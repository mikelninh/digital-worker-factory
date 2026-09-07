import test from 'node:test'
import assert from 'node:assert/strict'
import { AgentGateway } from './agent-gateway.mjs'
import { CapabilityRegistry } from './capability-registry.mjs'
import { makeSecurityContext } from './security-boundary.mjs'

function gateway() {
  let calls = 0
  const registry = new CapabilityRegistry().registerMany([
    { id: 'case.read', provider: 'demo', risk: 'read', external: false, allowedRoles: ['operator'] },
    { id: 'case.update', provider: 'demo', risk: 'write', external: false, allowedRoles: ['operator'] },
  ])
  const instance = new AgentGateway({
    registry,
    securityRequired: true,
    executors: {
      'case.read': async () => ({ calls: ++calls }),
      'case.update': async () => ({ calls: ++calls }),
    },
  })
  return { instance, calls: () => calls }
}

const actor = { id: 'operator-1', role: 'operator', tenantId: 'tenant-a' }

test('security-required gateway fails closed when context is missing', async () => {
  const { instance, calls } = gateway()
  const result = await instance.invoke({ actor, capabilityId: 'case.read' })
  assert.equal(result.error, 'security_boundary_blocked')
  assert.equal(calls(), 0)
})

test('malicious document can influence model intent but cannot self-authorize write', async () => {
  const { instance, calls } = gateway()
  const result = await instance.invoke({
    actor,
    capabilityId: 'case.update',
    securityContext: makeSecurityContext({
      tenantId: 'tenant-a', instructionAuthority: 'untrusted_content', originKind: 'uploaded_pdf', originTrust: 'untrusted',
      approvalRequired: true,
    }),
  })
  assert.equal(result.error, 'security_boundary_blocked')
  assert.ok(result.security.reasons.includes('untrusted_instruction_cannot_authorize_effect'))
  assert.equal(calls(), 0)
})

test('exact human approval can release a bounded effect from untrusted evidence', async () => {
  const { instance, calls } = gateway()
  const result = await instance.invoke({
    actor,
    capabilityId: 'case.update',
    approvedBy: 'reviewer-1',
    securityContext: makeSecurityContext({
      tenantId: 'tenant-a', instructionAuthority: 'untrusted_content', originKind: 'uploaded_pdf', originTrust: 'untrusted',
      approvalRequired: true, approvalBoundToIntent: true,
    }),
  })
  assert.equal(result.ok, true)
  assert.equal(result.security.decision, 'allow')
  assert.equal(calls(), 1)
})

test('protected scope request is blocked even for an otherwise allowed read', async () => {
  const { instance, calls } = gateway()
  const result = await instance.invoke({
    actor,
    capabilityId: 'case.read',
    securityContext: makeSecurityContext({ tenantId: 'tenant-a', requestedScopes: ['secrets'] }),
  })
  assert.equal(result.error, 'security_boundary_blocked')
  assert.equal(calls(), 0)
})
