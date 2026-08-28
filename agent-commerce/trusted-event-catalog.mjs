import { TRUSTED_EVENT_OFFERS } from './trusted-events.mjs'
import { TRUSTED_EVENT_ROUTES } from './trusted-event-payment.mjs'

const PATH_BY_ID = Object.freeze(Object.fromEntries(
  Object.entries(TRUSTED_EVENT_ROUTES).map(([route, id]) => [id, route.replace(/^POST /, '')]),
))

export function buildTrustedEventCatalog({ baseUrl = null, network = 'eip155:84532' } = {}) {
  const capabilities = Object.entries(TRUSTED_EVENT_OFFERS).map(([id, offer]) => Object.freeze({
    schema: 'open-capabilities.trusted-event/1',
    id,
    name: id.replace(/\.v1$/, ''),
    description: offer.description,
    readiness: baseUrl ? 'live' : 'implemented_not_public',
    endpoint: baseUrl ? `${String(baseUrl).replace(/\/$/, '')}${PATH_BY_ID[id]}` : PATH_BY_ID[id],
    method: 'POST',
    protocols: ['http', 'x402'],
    pricing: { amountUsd: offer.priceUsd, asset: 'USDC', network, scheme: 'exact' },
    trust: {
      evidenceReturned: true,
      paymentBuysTrust: false,
      authorityOutsideModel: true,
      rawPayloadTelemetryStored: false,
    },
  }))
  return Object.freeze({
    schema: 'open-capabilities.trusted-events/1',
    generatedAt: new Date().toISOString(),
    positioning: 'Cheap trusted events designed to be called reflexively before or after consequential agent work.',
    capabilities: Object.freeze(capabilities),
  })
}
