import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorityGateway } from '../gateway.mjs'
import { actorFromOidcClaims, principalFromOidcClaims } from './oidc.mjs'
import { createMcpToolExecutor } from './mcp.mjs'
import { createX402Executor } from './x402.mjs'

const policy = {
  version: 'adapter-test-1',
  actions: {
    'tool.invoke': {
      allowedRoles: ['automation_agent'],
      allowedPurposes: ['ops_casework'],
      minAutonomyLevel: 2,
      requiredEvidence: ['tool_approved'],
    },
    'payment.purchase': {
      allowedRoles: ['buyer_agent'],
      allowedPurposes: ['research'],
      minAutonomyLevel: 3,
      approvedCounterpartyOnly: true,
      maxAmount: { currency: 'EUR', value: 5 },
      requiredEvidence: ['vendor_terms_checked'],
    },
  },
}

function delegation(actorId, principalId, action, purpose) {
  return {
    id: `d-${actorId}-${action}`,
    delegateId: actorId,
    principalId,
    scopes: [action],
    purposes: [purpose],
    validUntil: '2026-09-01T00:00:00.000Z',
  }
}

test('OIDC claims become explicit actor and principal context', () => {
  const claims = { sub: 'agent-42', role: 'automation_agent', org_id: 'org-acme', iss: 'https://id.example' }
  assert.deepEqual(actorFromOidcClaims(claims, { autonomyLevel: 2 }), {
    id: 'agent-42', role: 'automation_agent', autonomyLevel: 2, identityProvider: 'https://id.example',
  })
  assert.deepEqual(principalFromOidcClaims(claims), { id: 'org-acme', type: 'organization' })
})

test('MCP tool call receives authority context only after ALLOW', async () => {
  const calls = []
  const executor = createMcpToolExecutor({ callTool: async (input) => { calls.push(input); return { ok: true } } })
  const actor = { id: 'agent-42', role: 'automation_agent', autonomyLevel: 2 }
  const principal = { id: 'org-acme', type: 'organization' }
  const gw = new AuthorityGateway({ policy, executors: { 'tool.invoke': executor }, clock: () => new Date('2026-08-29T10:00:00Z') })

  const blocked = await gw.invoke({
    actor, principal,
    delegation: delegation(actor.id, principal.id, 'tool.invoke', 'ops_casework'),
    action: { type: 'tool.invoke', purpose: 'personal', toolName: 'crm.update', arguments: { id: 7 }, idempotencyKey: 'mcp-1' },
    evidence: { claims: ['tool_approved'] },
  })
  assert.equal(blocked.status, 'blocked')
  assert.equal(calls.length, 0)

  const allowed = await gw.invoke({
    actor, principal,
    delegation: delegation(actor.id, principal.id, 'tool.invoke', 'ops_casework'),
    action: { type: 'tool.invoke', purpose: 'ops_casework', toolName: 'crm.update', arguments: { id: 7 }, idempotencyKey: 'mcp-2' },
    evidence: { claims: ['tool_approved'] },
    traceId: 'mcp-trace-2',
  })
  assert.equal(allowed.status, 'executed')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].metadata.authorityTraceId, 'mcp-trace-2')
  assert.equal(calls[0].metadata.principalId, 'org-acme')
})

test('x402 adapter is downstream of spend authority and preserves facilitator failure attribution', async () => {
  const calls = []
  const executor = createX402Executor({
    requestPaidResource: async (input) => {
      calls.push(input)
      if (input.resourceUrl.includes('glitch')) return { ok: false, detail: 'replacement transaction underpriced' }
      return { ok: true, settlement: { network: 'base-sepolia', status: 'settled' }, data: { value: 42 } }
    },
  })
  const actor = { id: 'buyer-1', role: 'buyer_agent', autonomyLevel: 3 }
  const principal = { id: 'org-acme', type: 'organization' }
  const base = {
    actor,
    principal,
    delegation: delegation(actor.id, principal.id, 'payment.purchase', 'research'),
    evidence: { claims: ['vendor_terms_checked'] },
    metrics: { cases: 100, acceptanceRate: 1, correctionRate: 0, unsafeExecutions: 0 },
  }
  const gw = new AuthorityGateway({ policy, executors: { 'payment.purchase': executor }, clock: () => new Date('2026-08-29T10:00:00Z') })

  const blocked = await gw.invoke({
    ...base,
    action: { type: 'payment.purchase', purpose: 'research', resourceUrl: 'https://data.example/large', amount: { currency: 'EUR', value: 6 }, counterpartyApproved: true, idempotencyKey: 'pay-large' },
  })
  assert.equal(blocked.status, 'blocked')
  assert.equal(calls.length, 0)

  const paid = await gw.invoke({
    ...base,
    action: { type: 'payment.purchase', purpose: 'research', resourceUrl: 'https://data.example/value', amount: { currency: 'EUR', value: 2 }, counterpartyApproved: true, idempotencyKey: 'pay-ok' },
    traceId: 'payment-trace-ok',
  })
  assert.equal(paid.status, 'executed')
  assert.equal(paid.result.transport, 'x402')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].authority.traceId, 'payment-trace-ok')

  const failed = await gw.invoke({
    ...base,
    action: { type: 'payment.purchase', purpose: 'research', resourceUrl: 'https://data.example/glitch', amount: { currency: 'EUR', value: 1 }, counterpartyApproved: true, idempotencyKey: 'pay-glitch' },
  })
  assert.equal(failed.status, 'failed')
  assert.equal(failed.receipt.failure.failureLayer, 'facilitator_settlement')
  assert.equal(failed.receipt.failure.attributedToAuthorityKernel, false)
})
