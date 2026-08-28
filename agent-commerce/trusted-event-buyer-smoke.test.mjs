import test from 'node:test'
import assert from 'node:assert/strict'

import { isDirectRun, validateTrustedBuyerConfig } from './trusted-event-buyer-smoke.mjs'

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
  assert.throws(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', OCN_SMOKE_REPEATS: '21' }), /OCN_SMOKE_REPEATS_invalid/)
  assert.throws(() => validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', MAX_PAYMENT_USDC_ATOMIC: '1000001' }), /buyer_spend_cap_invalid/)
})

test('trusted buyer smoke can reuse existing AGENT_COMMERCE_URL config', () => {
  const config = validateTrustedBuyerConfig({ BUYER_EVM_KEY: TEST_KEY, AGENT_COMMERCE_URL: 'http://localhost:4021' })
  assert.equal(config.baseUrl, 'http://localhost:4021')
})

test('module import is not treated as direct CLI run', () => {
  assert.equal(isDirectRun(import.meta.url, undefined), false)
})
