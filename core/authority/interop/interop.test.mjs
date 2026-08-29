import test from 'node:test'
import assert from 'node:assert/strict'
import { DECISIONS } from '../policy.mjs'
import { applyPortableContractGate, evaluatePortableContractResult } from './portable-contract.mjs'
import { toAgentHooksVerdict } from './agent-hooks.mjs'

test('portable contract conformance is upstream evidence, never execution permission by itself', () => {
  const portable = {
    outcome: 'conformant',
    contract_id: 'gc-1',
    contract_spec_version: '1.1.0',
    contract_digest: 'sha256:abc123',
  }
  const checked = evaluatePortableContractResult(portable)
  assert.equal(checked.eligible, true)

  const localBlock = { decision: DECISIONS.BLOCK, executionAllowed: false, actionType: 'finance.bank_detail_change', reasons: ['hard_blocked_action'] }
  const gated = applyPortableContractGate(localBlock, portable)
  assert.equal(gated.decision, DECISIONS.BLOCK)
  assert.ok(gated.reasons.includes('hard_blocked_action'))
})

test('non-conformant, stale or changed portable contracts fail closed', () => {
  const localAllow = { decision: DECISIONS.ALLOW, executionAllowed: true, actionType: 'research.purchase_data', reasons: ['within_delegated_authority'] }

  const expired = applyPortableContractGate(localAllow, {
    outcome: 'expired', contract_id: 'gc-1', contract_spec_version: '1.1.0', contract_digest: 'sha256:abc',
  })
  assert.equal(expired.decision, DECISIONS.BLOCK)
  assert.ok(expired.reasons.includes('portable_contract_expired'))

  const changed = applyPortableContractGate(localAllow, {
    outcome: 'conformant', contract_id: 'gc-1', contract_spec_version: '1.1.0', contract_digest: 'sha256:abc',
  }, { outcome: 'contract_changed', requires_fresh_conformance: true })
  assert.equal(changed.decision, DECISIONS.BLOCK)
  assert.ok(changed.reasons.includes('portable_contract_changed'))
})

test('Agent Hooks interop preserves fail-closed approval semantics', () => {
  const approvalDecision = {
    decision: DECISIONS.APPROVAL,
    executionAllowed: false,
    reasons: ['explicit_approval_required'],
  }

  const noIdentity = toAgentHooksVerdict(approvalDecision)
  assert.equal(noIdentity.decision, 'deny')
  assert.equal(noIdentity.approval, undefined)

  const liftable = toAgentHooksVerdict(approvalDecision, { contextIdentity: 'sha256:context-1' })
  assert.equal(liftable.decision, 'deny')
  assert.equal(liftable.approval.resolver, 'host')
  assert.equal(liftable.approval.context_identity, 'sha256:context-1')
})

test('Agent Hooks interop maps local allow/block without weakening them', () => {
  const allow = toAgentHooksVerdict({ decision: DECISIONS.ALLOW, executionAllowed: true, reasons: [] })
  assert.equal(allow.decision, 'allow')

  const deny = toAgentHooksVerdict({ decision: DECISIONS.BLOCK, executionAllowed: false, reasons: ['delegation_revoked'] })
  assert.equal(deny.decision, 'deny')
  assert.ok(deny.reason.includes('delegation_revoked'))
})
