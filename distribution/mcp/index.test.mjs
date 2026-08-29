import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BASE_SEPOLIA,
  BASE_SEPOLIA_USDC,
  DEFAULT_MAX_PAYMENT_ATOMIC,
  isDirectRun,
  readBridgeConfig,
  selectSafePaymentRequirement,
} from './index.mjs'

const TEST_KEY = `0x${'11'.repeat(32)}`

test('bridge config is Base Sepolia only with a hard spend cap', () => {
  const config = readBridgeConfig({ OCN_BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', OCN_NETWORK: BASE_SEPOLIA })
  assert.equal(config.baseUrl, 'https://ocn.example')
  assert.equal(config.maxPaymentAtomic, DEFAULT_MAX_PAYMENT_ATOMIC)
  assert.throws(() => readBridgeConfig({ OCN_BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', OCN_NETWORK: 'eip155:8453' }), /base_sepolia_only/)
  assert.throws(() => readBridgeConfig({ OCN_BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'https://ocn.example', OCN_MAX_PAYMENT_USDC_ATOMIC: '1000001' }), /invalid/)
})

test('bridge requires HTTPS away from localhost', () => {
  assert.throws(() => readBridgeConfig({ OCN_BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'http://ocn.example' }), /requires_https/)
  assert.doesNotThrow(() => readBridgeConfig({ OCN_BUYER_EVM_KEY: TEST_KEY, OCN_BASE_URL: 'http://127.0.0.1:4021' }))
})

test('payment selector refuses wrong network, wrong asset and over-cap offers', () => {
  const safe = {
    scheme: 'exact', network: BASE_SEPOLIA, asset: BASE_SEPOLIA_USDC, amount: '5000', payTo: '0x0000000000000000000000000000000000000001',
  }
  const selected = selectSafePaymentRequirement(2, [
    { ...safe, network: 'eip155:8453', amount: '1' },
    { ...safe, asset: '0x0000000000000000000000000000000000000002', amount: '1' },
    { ...safe, amount: '30000' },
    safe,
  ], 20_000n)
  assert.equal(selected.amount, '5000')
  assert.equal(selected.asset, BASE_SEPOLIA_USDC)
  assert.throws(() => selectSafePaymentRequirement(2, [{ ...safe, amount: '30000' }], 20_000n), /no_safe_ocn_payment_requirement/)
})

test('module import is not treated as a direct CLI run', () => {
  assert.equal(isDirectRun(import.meta.url, undefined), false)
})
