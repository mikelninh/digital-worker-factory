import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorityGateway, DECISIONS } from './index.mjs'

const policy = {
  version: '0.1.0',
  hardEscalations: ['instruction_injection', 'privacy_scope_violation', 'identity_ambiguous'],
  promotionGates: {
    '3': { minCases: 50, minAcceptanceRate: 0.98, maxCorrectionRate: 0.02, maxUnsafeExecutions: 0 },
  },
  actions: {
    'research.purchase_data': {
      allowedRoles: ['research_agent'],
      allowedPurposes: ['market_research'],
      minAutonomyLevel: 3,
      approvedCounterpartyOnly: true,
      maxAmount: { currency: 'EUR', value: 5 },
      requiredEvidence: ['vendor_terms_checked'],
    },
    'government.case.read': {
      allowedRoles: ['casework_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 0,
      requiredEvidence: ['legal_basis'],
    },
    'government.benefit.deny': {
      allowedRoles: ['casework_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 5,
      requiresApproval: true,
      requiredEvidence: ['legal_basis', 'decision_evidence_complete'],
    },
    'legal.case.update': {
      allowedRoles: ['legal_agent'],
      allowedPurposes: ['case_assistance'],
      minAutonomyLevel: 4,
      requiresApproval: true,
      requiredEvidence: ['source_provenance'],
    },
    'finance.bank_detail_change': {
      blocked: true,
      allowedRoles: ['finance_agent'],
      minAutonomyLevel: 5,
    },
  },
}

const goodMetrics = { cases: 100, acceptanceRate: 0.99, correctionRate: 0.01, unsafeExecutions: 0 }
const principal = { id: 'acme', type: 'company' }

function delegation(actorId, scopes, purposes, extra = {}) {
  return {
    id: `delegation-${actorId}`,
    actorId,
    delegateId: actorId,
    principalId: principal.id,
    scopes,
    purposes,
    validFrom: '2026-08-01T00:00:00.000Z',
    validUntil: '2026-09-01T00:00:00.000Z',
    ...extra,
  }
}

function gateway(executors = {}) {
  return new AuthorityGateway({ policy, executors, clock: () => new Date('2026-08-29T10:00:00.000Z') })
}

test('enterprise research agent can buy approved data inside earned authority and budget', async () => {
  let calls = 0
  const gw = gateway({ 'research.purchase_data': async () => { calls += 1; return { dataset: 'market-snapshot' } } })
  const actor = { id: 'research-7', role: 'research_agent', autonomyLevel: 3 }
  const result = await gw.invoke({
    actor,
    principal,
    delegation: delegation(actor.id, ['research.purchase_data'], ['market_research']),
    action: { type: 'research.purchase_data', purpose: 'market_research', amount: { currency: 'EUR', value: 2 }, counterpartyApproved: true, idempotencyKey: 'purchase-1' },
    evidence: { claims: ['vendor_terms_checked'] },
    metrics: goodMetrics,
    budget: { currency: 'EUR', spent: 3, limit: 10 },
  })
  assert.equal(result.status, 'executed')
  assert.equal(result.decision.decision, DECISIONS.ALLOW)
  assert.equal(calls, 1)
})

test('budget and vendor limits fail closed before a provider call', async () => {
  let calls = 0
  const gw = gateway({ 'research.purchase_data': async () => { calls += 1 } })
  const actor = { id: 'research-7', role: 'research_agent', autonomyLevel: 5 }
  const base = {
    actor,
    principal,
    delegation: delegation(actor.id, ['research.purchase_data'], ['market_research']),
    evidence: { claims: ['vendor_terms_checked'] },
    metrics: goodMetrics,
  }

  const overspend = await gw.invoke({ ...base, action: { type: 'research.purchase_data', purpose: 'market_research', amount: { currency: 'EUR', value: 6 }, counterpartyApproved: true, idempotencyKey: 'over' } })
  assert.equal(overspend.status, 'blocked')
  assert.ok(overspend.decision.reasons.includes('action_budget_exceeded'))

  const vendor = await gw.invoke({ ...base, action: { type: 'research.purchase_data', purpose: 'market_research', amount: { currency: 'EUR', value: 1 }, counterpartyApproved: false, idempotencyKey: 'vendor' } })
  assert.equal(vendor.status, 'blocked')
  assert.ok(vendor.decision.reasons.includes('counterparty_not_approved'))
  assert.equal(calls, 0)
})

test('government consequential decision requires accountable human approval', async () => {
  let calls = 0
  const gw = gateway({ 'government.benefit.deny': async () => { calls += 1; return { status: 'denied' } } })
  const actor = { id: 'case-agent-1', role: 'casework_agent', autonomyLevel: 5 }
  const input = {
    actor,
    principal,
    delegation: delegation(actor.id, ['government.benefit.deny'], ['benefit_casework']),
    action: { type: 'government.benefit.deny', purpose: 'benefit_casework', idempotencyKey: 'decision-1' },
    evidence: { claims: ['legal_basis', 'decision_evidence_complete'] },
  }

  const pending = await gw.invoke(input)
  assert.equal(pending.status, 'approval_required')
  assert.equal(calls, 0)

  const approved = await gw.invoke({ ...input, approval: { approvedBy: 'official-147', actionType: 'government.benefit.deny', delegationId: 'delegation-case-agent-1', at: '2026-08-29T09:58:00.000Z' } })
  assert.equal(approved.status, 'executed')
  assert.equal(approved.receipt.approval.approvedBy, 'official-147')
  assert.equal(calls, 1)
})

test('legal action is blocked by hard escalation even when human approval exists', async () => {
  let calls = 0
  const gw = gateway({ 'legal.case.update': async () => { calls += 1 } })
  const actor = { id: 'legal-agent-1', role: 'legal_agent', autonomyLevel: 5 }
  const result = await gw.invoke({
    actor,
    principal,
    delegation: delegation(actor.id, ['legal.case.update'], ['case_assistance']),
    action: { type: 'legal.case.update', purpose: 'case_assistance', idempotencyKey: 'legal-1' },
    evidence: { claims: ['source_provenance'], flags: ['instruction_injection'] },
    approval: { approvedBy: 'lawyer-1', actionType: 'legal.case.update', delegationId: 'delegation-legal-agent-1' },
  })
  assert.equal(result.status, 'blocked')
  assert.ok(result.decision.reasons.includes('hard_escalation:instruction_injection'))
  assert.equal(calls, 0)
})

test('payment success never grants authority', async () => {
  let calls = 0
  const gw = gateway({ 'finance.bank_detail_change': async () => { calls += 1 } })
  const actor = { id: 'finance-1', role: 'finance_agent', autonomyLevel: 5 }
  const result = await gw.invoke({
    actor,
    principal,
    delegation: delegation(actor.id, ['finance.bank_detail_change'], ['finance_ops']),
    action: { type: 'finance.bank_detail_change', purpose: 'finance_ops', idempotencyKey: 'bank-1', paymentStatus: 'settled' },
    evidence: { paymentProof: { settled: true } },
    approval: { approvedBy: 'cfo-1', actionType: 'finance.bank_detail_change', delegationId: 'delegation-finance-1' },
  })
  assert.equal(result.status, 'blocked')
  assert.ok(result.decision.reasons.includes('hard_blocked_action'))
  assert.equal(calls, 0)
})

test('revoked, expired and out-of-scope delegations fail closed', async () => {
  const gw = gateway({ 'government.case.read': async () => ({ ok: true }) })
  const actor = { id: 'case-agent-1', role: 'casework_agent', autonomyLevel: 1 }
  const baseAction = { type: 'government.case.read', purpose: 'benefit_casework', idempotencyKey: 'read-1' }
  const evidence = { claims: ['legal_basis'] }

  const revoked = await gw.invoke({ actor, principal, delegation: delegation(actor.id, ['government.case.read'], ['benefit_casework'], { revoked: true }), action: baseAction, evidence })
  assert.equal(revoked.status, 'blocked')
  assert.ok(revoked.decision.reasons.includes('delegation_revoked'))

  const expired = await gw.invoke({ actor, principal, delegation: delegation(actor.id, ['government.case.read'], ['benefit_casework'], { validUntil: '2026-08-28T00:00:00.000Z' }), action: { ...baseAction, idempotencyKey: 'read-2' }, evidence })
  assert.equal(expired.status, 'blocked')
  assert.ok(expired.decision.reasons.includes('delegation_expired'))

  const wrongScope = await gw.invoke({ actor, principal, delegation: delegation(actor.id, [], ['benefit_casework']), action: { ...baseAction, idempotencyKey: 'read-3' }, evidence })
  assert.equal(wrongScope.status, 'blocked')
  assert.ok(wrongScope.decision.reasons.includes('delegation_scope_missing'))
})

test('idempotency suppresses duplicate consequential execution', async () => {
  let calls = 0
  const gw = gateway({ 'government.benefit.deny': async () => { calls += 1; return { status: 'denied' } } })
  const actor = { id: 'case-agent-1', role: 'casework_agent', autonomyLevel: 5 }
  const input = {
    actor,
    principal,
    delegation: delegation(actor.id, ['government.benefit.deny'], ['benefit_casework']),
    action: { type: 'government.benefit.deny', purpose: 'benefit_casework', idempotencyKey: 'same-decision' },
    evidence: { claims: ['legal_basis', 'decision_evidence_complete'] },
    approval: { approvedBy: 'official-147', actionType: 'government.benefit.deny', delegationId: 'delegation-case-agent-1' },
  }
  const first = await gw.invoke(input)
  const second = await gw.invoke(input)
  assert.equal(first.status, 'executed')
  assert.equal(second.status, 'duplicate_suppressed')
  assert.equal(calls, 1)
})

test('approved execution still blocks before provider if idempotency key is absent', async () => {
  let calls = 0
  const gw = gateway({ 'legal.case.update': async () => { calls += 1 } })
  const actor = { id: 'legal-agent-1', role: 'legal_agent', autonomyLevel: 5 }
  const result = await gw.invoke({
    actor,
    principal,
    delegation: delegation(actor.id, ['legal.case.update'], ['case_assistance']),
    action: { type: 'legal.case.update', purpose: 'case_assistance' },
    evidence: { claims: ['source_provenance'] },
    approval: { approvedBy: 'lawyer-1', actionType: 'legal.case.update', delegationId: 'delegation-legal-agent-1' },
  })
  assert.equal(result.status, 'blocked')
  assert.ok(result.decision.reasons.includes('idempotency_key_required'))
  assert.equal(calls, 0)
})

test('facilitator settlement failure is attributed cleanly and raw signed material is redacted', async () => {
  const gw = gateway({
    'research.purchase_data': async () => {
      throw new Error('invalid_exact_evm_transaction_failed: replacement transaction underpriced')
    },
  })
  const actor = { id: 'research-7', role: 'research_agent', autonomyLevel: 3 }
  const result = await gw.invoke({
    actor,
    principal,
    delegation: delegation(actor.id, ['research.purchase_data'], ['market_research']),
    action: {
      type: 'research.purchase_data', purpose: 'market_research', amount: { currency: 'EUR', value: 2 },
      counterpartyApproved: true, idempotencyKey: 'payment-failure', rawSignedTransaction: '0xVERY_SECRET_SIGNED_TRANSACTION',
    },
    evidence: { claims: ['vendor_terms_checked'], paymentResponseRaw: 'base64-secret-blob', signature: 'signed-secret' },
    metrics: goodMetrics,
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.receipt.failure.failureLayer, 'facilitator_settlement')
  assert.equal(result.receipt.failure.detail, 'replacement transaction underpriced')
  assert.equal(result.receipt.failure.attributedToAuthorityKernel, false)
  assert.equal(result.receipt.action.rawSignedTransaction, '[REDACTED]')
  assert.equal(result.receipt.security.rawSignedTransactionLogged, false)
  assert.ok(result.receipt.security.sensitiveFieldsRedacted >= 3)
  assert.equal(JSON.stringify(result.receipt).includes('VERY_SECRET_SIGNED_TRANSACTION'), false)
  assert.equal(JSON.stringify(result.receipt).includes('base64-secret-blob'), false)
})

test('approval is useless unless it is bound to the exact action and delegation', async () => {
  let calls = 0
  const gw = gateway({ 'government.benefit.deny': async () => { calls += 1 } })
  const actor = { id: 'case-agent-1', role: 'casework_agent', autonomyLevel: 5 }
  const result = await gw.invoke({
    actor,
    principal,
    delegation: delegation(actor.id, ['government.benefit.deny'], ['benefit_casework']),
    action: { type: 'government.benefit.deny', purpose: 'benefit_casework', idempotencyKey: 'bound-approval' },
    evidence: { claims: ['legal_basis', 'decision_evidence_complete'] },
    approval: { approvedBy: 'official-147', actionType: 'legal.case.update', delegationId: 'another-delegation' },
  })
  assert.equal(result.status, 'blocked')
  assert.ok(result.decision.reasons.includes('approval_action_mismatch'))
  assert.ok(result.decision.reasons.includes('approval_delegation_mismatch'))
  assert.equal(calls, 0)
})

test('preflight never executes a provider', () => {
  let calls = 0
  const gw = gateway({ 'government.case.read': async () => { calls += 1 } })
  const actor = { id: 'case-agent-1', role: 'casework_agent', autonomyLevel: 1 }
  const decision = gw.preflight({
    actor,
    principal,
    delegation: delegation(actor.id, ['government.case.read'], ['benefit_casework']),
    action: { type: 'government.case.read', purpose: 'benefit_casework', idempotencyKey: 'preflight-1' },
    evidence: { claims: ['legal_basis'] },
  })
  assert.equal(decision.decision, DECISIONS.ALLOW)
  assert.equal(calls, 0)
})
