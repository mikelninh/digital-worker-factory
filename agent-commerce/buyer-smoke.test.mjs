import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BASE_SEPOLIA_USDC,
  DEFAULT_MAX_PAYMENT_ATOMIC,
  selectSafePaymentRequirement,
  validateBuyerConfig,
} from './buyer-smoke.mjs'

const safe = {
  scheme: 'exact',
  network: 'eip155:84532',
  amount: '10000',
  asset: BASE_SEPOLIA_USDC,
  payTo: '0x1111111111111111111111111111111111111111',
  maxTimeoutSeconds: 60,
  extra: { name: 'USDC', version: '2' },
}

test('buyer chooses a safe $0.01 Base Sepolia USDC requirement', () => {
  const selected = selectSafePaymentRequirement(2, [safe])
  assert.equal(selected.amount, '10000')
  assert.equal(selected.network, 'eip155:84532')
  assert.equal(selected.asset, BASE_SEPOLIA_USDC)
})

test('buyer rejects mainnet even when price is cheap', () => {
  assert.throws(
    () => selectSafePaymentRequirement(2, [{ ...safe, network: 'eip155:8453' }]),
    /no_safe_payment_requirement/,
  )
})

test('buyer rejects a non-USDC asset', () => {
  assert.throws(
    () => selectSafePaymentRequirement(2, [{ ...safe, asset: '0x2222222222222222222222222222222222222222' }]),
    /no_safe_payment_requirement/,
  )
})

test('buyer rejects an unexpected overcharge before signing', () => {
  assert.throws(
    () => selectSafePaymentRequirement(2, [{ ...safe, amount: String(DEFAULT_MAX_PAYMENT_ATOMIC + 1n) }]),
    /no_safe_payment_requirement/,
  )
})

test('buyer chooses the cheapest safe requirement', () => {
  const selected = selectSafePaymentRequirement(2, [
    { ...safe, amount: '15000' },
    { ...safe, amount: '5000' },
    { ...safe, amount: '10000' },
  ])
  assert.equal(selected.amount, '5000')
})

test('remote buyer endpoint must use HTTPS', () => {
  assert.throws(
    () => validateBuyerConfig({
      BUYER_EVM_KEY: `0x${'1'.repeat(64)}`,
      AGENT_COMMERCE_URL: 'http://example.com',
    }),
    /remote_buyer_requires_https/,
  )
})

test('localhost is allowed for local smoke', () => {
  const config = validateBuyerConfig({
    BUYER_EVM_KEY: `0x${'1'.repeat(64)}`,
    AGENT_COMMERCE_URL: 'http://127.0.0.1:4021',
  })
  assert.equal(config.baseUrl, 'http://127.0.0.1:4021')
  assert.equal(config.maxPaymentAtomic, DEFAULT_MAX_PAYMENT_ATOMIC)
})

test('buyer spend cap cannot exceed $1 in RC0', () => {
  assert.throws(
    () => validateBuyerConfig({
      BUYER_EVM_KEY: `0x${'1'.repeat(64)}`,
      AGENT_COMMERCE_URL: 'https://example.com',
      MAX_PAYMENT_USDC_ATOMIC: '1000001',
    }),
    /buyer_spend_cap_invalid/,
  )
})
