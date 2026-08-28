import { paymentMiddleware } from '@x402/express'
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server'
import { registerExactEvmScheme } from '@x402/evm/exact/server'
import { bazaarResourceServerExtension, declareDiscoveryExtension, withBazaar } from '@x402/extensions/bazaar'

import { BASE_MAINNET, BASE_SEPOLIA } from './commerce-core.mjs'
import { TRUSTED_EVENT_OFFERS } from './trusted-events.mjs'

export const TRUSTED_EVENT_ROUTES = Object.freeze({
  'POST /v1/trust/preflight': 'trust.preflight.v1',
  'POST /v1/evidence/verify': 'evidence.verify.v1',
  'POST /v1/freshness/verify': 'freshness.verify.v1',
  'POST /v1/authority/check': 'authority.check.v1',
  'POST /v1/entity/resolve': 'entity.resolve.org.v1',
})

const DISCOVERY = Object.freeze({
  'trust.preflight.v1': {
    input: { risk: 'consequential', humanApproval: false },
    inputSchema: {
      properties: {
        risk: { type: 'string', enum: ['read', 'write', 'consequential'] },
        humanApproval: { type: 'boolean' },
        freshness: { type: 'object' },
        evidence: { type: 'object' },
        authority: { type: 'object' },
      },
      required: ['risk'],
    },
  },
  'evidence.verify.v1': {
    input: { claims: [{ id: 'c1', text: 'Claim', evidenceIds: ['e1'] }], evidence: [{ id: 'e1', sourceUrl: 'https://example.gov', retrievedAt: '2026-08-28T20:00:00Z', locator: 'section 1' }] },
    inputSchema: {
      properties: { claims: { type: 'array' }, evidence: { type: 'array' } },
      required: ['claims', 'evidence'],
    },
  },
  'freshness.verify.v1': {
    input: { observedAt: '2026-08-28T20:00:00Z', maxAgeSeconds: 3600 },
    inputSchema: {
      properties: { observedAt: { type: 'string', format: 'date-time' }, maxAgeSeconds: { type: 'integer', minimum: 0 } },
      required: ['observedAt', 'maxAgeSeconds'],
    },
  },
  'authority.check.v1': {
    input: { actorId: 'agent-1', capabilityId: 'case.update.v1', action: 'execute', scope: 'tenant-a', grants: [] },
    inputSchema: {
      properties: {
        actorId: { type: 'string' }, capabilityId: { type: 'string' }, action: { type: 'string' }, scope: { type: 'string' }, grants: { type: 'array' },
      },
      required: ['actorId', 'capabilityId', 'action'],
    },
  },
  'entity.resolve.org.v1': {
    input: { query: { name: 'Example GmbH' }, candidates: [{ id: '1', name: 'Example GmbH' }] },
    inputSchema: {
      properties: { query: { type: 'object' }, candidates: { type: 'array' } },
      required: ['query', 'candidates'],
    },
  },
})

function assertReceiverAddress(payTo) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(payTo ?? '')) throw new Error('PAY_TO_must_be_an_EVM_address')
}

function requestRouteKey(req) {
  return `${req.method.toUpperCase()} ${req.path}`
}

export function createTrustedEventPaymentGate({
  paymentsMode = process.env.PAYMENTS_MODE ?? 'x402',
  payTo = process.env.PAY_TO,
  network = process.env.X402_NETWORK ?? BASE_SEPOLIA,
  facilitatorUrl = process.env.X402_FACILITATOR_URL ?? 'https://x402.org/facilitator',
  allowMock = false,
  allowMainnet = process.env.ALLOW_MAINNET === 'true',
} = {}) {
  if (![BASE_SEPOLIA, BASE_MAINNET].includes(network)) throw new Error('unsupported_x402_network')
  if (network === BASE_MAINNET && !allowMainnet) throw new Error('mainnet_requires_explicit_ALLOW_MAINNET')

  if (paymentsMode === 'mock') {
    if (!allowMock) throw new Error('mock_payments_are_test_only')
    return (req, res, next) => {
      const capabilityId = TRUSTED_EVENT_ROUTES[requestRouteKey(req)]
      if (!capabilityId) return next()
      const offer = TRUSTED_EVENT_OFFERS[capabilityId]
      if (req.get('x-test-payment') !== 'valid') {
        return res.status(402).json({
          error: 'payment_required', testOnly: true, capabilityId, price: offer.priceUsd,
          asset: 'USDC', network, requestId: res.locals.requestId ?? null,
        })
      }
      res.locals.trustedEventPayment = { settlementRef: `mock:${req.get('x-test-payment-id') ?? 'settled'}` }
      return next()
    }
  }

  if (paymentsMode !== 'x402') throw new Error('unsupported_payments_mode')
  assertReceiverAddress(payTo)
  const facilitatorClient = withBazaar(new HTTPFacilitatorClient({ url: facilitatorUrl }))
  const resourceServer = new x402ResourceServer(facilitatorClient)
  registerExactEvmScheme(resourceServer)
  resourceServer.registerExtension(bazaarResourceServerExtension)

  const routes = Object.fromEntries(Object.entries(TRUSTED_EVENT_ROUTES).map(([route, capabilityId]) => {
    const offer = TRUSTED_EVENT_OFFERS[capabilityId]
    return [route, {
      accepts: [{ scheme: 'exact', price: `$${offer.priceUsd}`, network, payTo }],
      description: offer.description,
      mimeType: 'application/json',
      extensions: {
        ...declareDiscoveryExtension(DISCOVERY[capabilityId]),
      },
    }]
  }))

  return paymentMiddleware(routes, resourceServer)
}
