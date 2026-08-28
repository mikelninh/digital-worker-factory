import { paymentMiddleware } from '@x402/express'
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server'
import { registerExactEvmScheme } from '@x402/evm/exact/server'

import { BASE_MAINNET, BASE_SEPOLIA } from './commerce-core.mjs'
import { TRUSTED_EVENT_OFFERS } from './trusted-events.mjs'

export const TRUSTED_EVENT_ROUTES = Object.freeze({
  'POST /v1/trust/preflight': 'trust.preflight.v1',
  'POST /v1/evidence/verify': 'evidence.verify.v1',
  'POST /v1/freshness/verify': 'freshness.verify.v1',
  'POST /v1/authority/check': 'authority.check.v1',
  'POST /v1/entity/resolve': 'entity.resolve.org.v1',
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
          error: 'payment_required',
          testOnly: true,
          capabilityId,
          price: offer.priceUsd,
          asset: 'USDC',
          network,
          requestId: res.locals.requestId ?? null,
        })
      }
      res.locals.trustedEventPayment = { settlementRef: `mock:${req.get('x-test-payment-id') ?? 'settled'}` }
      return next()
    }
  }

  if (paymentsMode !== 'x402') throw new Error('unsupported_payments_mode')
  assertReceiverAddress(payTo)
  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl })
  const resourceServer = new x402ResourceServer(facilitatorClient)
  registerExactEvmScheme(resourceServer)

  const routes = Object.fromEntries(Object.entries(TRUSTED_EVENT_ROUTES).map(([route, capabilityId]) => {
    const offer = TRUSTED_EVENT_OFFERS[capabilityId]
    return [route, {
      accepts: [{ scheme: 'exact', price: `$${offer.priceUsd}`, network, payTo }],
      description: offer.description,
      mimeType: 'application/json',
      extensions: {
        bazaar: {
          info: {
            input: { type: 'http', method: 'POST' },
          },
        },
      },
    }]
  }))

  return paymentMiddleware(routes, resourceServer)
}
