import test from 'node:test'
import assert from 'node:assert/strict'

import { paymentIntentPreflight } from './payment-intent.mjs'

const NOW = Date.parse('2026-08-29T00:00:00Z')

function base() {
  return {
    intent: {
      intentId: 'intent-1', merchantId: 'merchant-7', beneficiary: 'wallet-abc', amount: '10.00', currency: 'USD', validUntil: '2026-08-29T01:00:00Z',
    },
    request: { merchantId: 'merchant-7', beneficiary: 'wallet-abc', amount: '10.00', currency: 'USD' },
    merchant: { id: 'merchant-7', verified: true },
    mandate: {
      active: true, maxAmount: '25.00', currencies: ['USD'], merchantIds: ['merchant-7'], beneficiaries: ['wallet-abc'], validUntil: '2026-08-29T01:00:00Z',
    },
  }
}

test('allows exact payment inside verified mandate without executing it', () => {
  const result = paymentIntentPreflight(base(), { now: NOW })
  assert.equal(result.decision, 'allow')
  assert.equal(result.authority.authorizationSource, 'verified_mandate')
  assert.equal(result.authority.paymentGrantedAuthority, false)
  assert.equal(result.authority.paymentExecutionPerformed, false)
})

test('blocks beneficiary switch', () => {
  const input = base()
  input.request.beneficiary = 'wallet-attacker'
  const result = paymentIntentPreflight(input, { now: NOW })
  assert.equal(result.decision, 'block')
  assert.ok(result.blockers.includes('beneficiary:intent_mismatch'))
})

test('blocks amount inflation even when mandate max is larger', () => {
  const input = base()
  input.request.amount = '11.00'
  const result = paymentIntentPreflight(input, { now: NOW })
  assert.equal(result.decision, 'block')
  assert.ok(result.blockers.includes('amount:above_intent'))
})

test('blocks unverified or mismatched merchant', () => {
  const input = base()
  input.merchant.verified = false
  const result = paymentIntentPreflight(input, { now: NOW })
  assert.equal(result.decision, 'block')
  assert.ok(result.blockers.includes('merchant:not_verified'))
})

test('blocks expired intent and replay', () => {
  const input = base()
  input.intent.validUntil = '2026-08-28T23:00:00Z'
  input.replayDetected = true
  const result = paymentIntentPreflight(input, { now: NOW })
  assert.equal(result.decision, 'block')
  assert.ok(result.blockers.includes('intent:expired'))
  assert.ok(result.blockers.includes('request:replay_detected'))
})

test('requires human approval when no verified mandate covers the request', () => {
  const input = base()
  delete input.mandate
  const result = paymentIntentPreflight(input, { now: NOW })
  assert.equal(result.decision, 'review')
  assert.deepEqual(result.reviewReasons, ['approval_or_mandate_required'])

  input.humanApproval = true
  const approved = paymentIntentPreflight(input, { now: NOW })
  assert.equal(approved.decision, 'allow')
  assert.equal(approved.authority.authorizationSource, 'human_approval')
})
