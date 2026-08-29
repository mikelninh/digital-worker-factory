import test from 'node:test'
import assert from 'node:assert/strict'

import { isDirectRun, summarizeFailedResponse, TRUST_EVENT_SMOKES, validateTrustedBuyerConfig } from './trusted-event-buyer-smoke.mjs'

const TEST_KEY = `0x${'11'.repeat(32)}`

test('trusted buyer smoke accepts localhost and remote HTTPS only', () => {
  assert.doesNotThrow(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'http://127.0.0.1:4021' }))
  assert.doesNotThrow(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example' }))
  assert.throws(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'http://ocn.example' }), /remote_buyer_requires_https/)
})

test('trusted buyer smoke keeps per-call spend and repeat count bounded', () => {
  const config = validateTrustedBuyerConfig({
    BUYER_EVM_KEY: TEST_KEY,
    OCN_BASE_URL: 'https://ocn.example',
    MAX_PAYMENT_USDC_ATOMIC: '20000',
    OCN_SMOKE_REPEATS: '20',
  })
  assert.equal(config.maxPaymentAtomic, 20_000n)
  assert.equal(config.repeats, 20)
  assert.equal(config.continueOnFailure, false)
  assert.throws(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', OCN_SMOKE_REPEATS: '21' }), /OCN_SMOKE_REPEATS_invalid/)
  assert.throws(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', MAX_PAYMENT_USDC_ATOMIC: '1000001' }), /buyer_spend_cap_invalid/)
})

test('trusted buyer smoke can continue across unique failed calls without retrying them', () => {
  const config = validateTrustedBuyerConfig({
    BUYER_EVM_KEY: TEST_KEY,
    OCN_BASE_URL: 'https://ocn.example',
    OCN_SMOKE_REPEATS: '10',
    OCN_SMOKE_CONTINUE_ON_FAILURE: 'true',
  })
  assert.equal(config.repeats, 10)
  assert.equal(config.continueOnFailure, true)
})

test('trusted buyer smoke supports freshness and payment-intent targets only', () => {
  assert.equal(validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example' }).event, 'freshness')
  assert.equal(validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', OCN_SMOKE_EVENT: 'payment-intent' }).event, 'payment-intent')
  assert.equal(TRUST_EVENT_SMOKES['payment-intent'].capabilityId, 'payment.intent.preflight.v1')
  assert.throws(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', OCN_SMOKE_EVENT: 'unknown' }), /OCN_SMOKE_EVENT_invalid/)
})

test('payment-intent smoke body is exact, time-bounded and approval-observed', () => {
  const now = Date.parse('2026-08-29T00:00:00Z')
  const body = TRUST_EVENT_SMOKES['payment-intent'].body(now)
  assert.equal(body.intent.merchantId, body.request.merchantId)
  assert.equal(body.intent.beneficiary, body.request.beneficiary)
  assert.equal(body.intent.amount, body.request.amount)
  assert.equal(body.intent.currency, body.request.currency)
  assert.equal(body.merchant.verified, true)
  assert.equal(body.humanApproval, true)
  assert.equal(Date.parse(body.intent.validUntil), now + 3_600_000)
})

test('failed-response diagnostics expose safe x402 metadata without secrets', () => {
  const headers = new Headers({
    'content-type': 'application/json',
    'payment-required': 'diagnostic-payment-required',
    'authorization': 'Bearer must-not-leak',
    'x-request-id': 'req-123',
  })
  const response = { status: 402, statusText: 'Payment Required', headers }
  const summary = summarizeFailedResponse(response, { error: 'payment_required' }, { callIndex: 3, capabilityId: 'payment.intent.preflight.v1' })
  assert.equal(summary.status, 402)
  assert.equal(summary.callIndex, 3)
  assert.equal(summary.headers['payment-required'], 'diagnostic-payment-required')
  assert.equal(summary.headers['x-request-id'], 'req-123')
  assert.equal(summary.headers.authorization, undefined)
})

test('trusted buyer smoke can reuse existing AGENT_COMMERCE_URL config', () => {
  const config = validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, AGENT_COMMERCE_URL: 'http://localhost:4021' })
  assert.equal(config.baseUrl, 'http://localhost:4021')
})

test('module import is not treated as direct CLI run', () => {
  assert.equal(isDirectRun(import.meta.url, undefined), false)
})
