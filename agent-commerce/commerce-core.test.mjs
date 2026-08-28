import test from 'node:test'
import assert from 'node:assert/strict'

import { BASE_SEPOLIA, fingerprint, makeServiceReceipt, publicCapabilityDescriptor } from './commerce-core.mjs'

const baseOffer = {
  id: 'judge.output.v1',
  description: 'Evaluate an artifact against a bounded rubric.',
  version: '0.1.0',
  protocols: ['http', 'x402'],
  priceUsd: '0.02',
  asset: 'USDC',
  network: BASE_SEPOLIA,
  risk: 'read',
  humanApprovalRequired: false,
  paymentBuysTrust: false,
  retention: 'none',
  acceptsSensitiveData: false,
  deterministicCore: false,
  evidenceReturned: true,
}

test('fingerprint is stable across object key order', () => {
  assert.equal(fingerprint({ b: 2, a: 1 }), fingerprint({ a: 1, b: 2 }))
})

test('payment can never be configured to buy trust', () => {
  assert.throws(
    () => publicCapabilityDescriptor({ ...baseOffer, paymentBuysTrust: true }),
    /payment_must_not_buy_trust/,
  )
})

test('consequential capabilities require explicit human approval', () => {
  assert.throws(
    () => publicCapabilityDescriptor({ ...baseOffer, risk: 'consequential', humanApprovalRequired: false }),
    /consequential_requires_human_approval/,
  )
})

test('public descriptor exposes price, risk and privacy without secrets', () => {
  const descriptor = publicCapabilityDescriptor(baseOffer)
  assert.equal(descriptor.pricing.amountUsd, '0.02')
  assert.equal(descriptor.pricing.asset, 'USDC')
  assert.equal(descriptor.pricing.network, BASE_SEPOLIA)
  assert.equal(descriptor.paymentBuysTrust, false)
  assert.equal(descriptor.privacy.retention, 'none')
  assert.equal(JSON.stringify(descriptor).includes('privateKey'), false)
})

test('service receipt binds request/output while denying authority escalation', () => {
  const descriptor = publicCapabilityDescriptor(baseOffer)
  const receipt = makeServiceReceipt({
    descriptor,
    request: { artifact: 'hello' },
    output: { score: 0.8 },
    traceId: 'trace-1',
    payment: { settlementRef: 'test-settlement' },
  })

  assert.equal(receipt.payment.status, 'settled')
  assert.equal(receipt.payment.settlementRef, 'test-settlement')
  assert.equal(receipt.authority.paymentGrantedAuthority, false)
  assert.equal(receipt.authority.consequentialActionExecuted, false)
  assert.match(receipt.requestHash, /^[a-f0-9]{64}$/)
  assert.match(receipt.outputHash, /^[a-f0-9]{64}$/)
})
