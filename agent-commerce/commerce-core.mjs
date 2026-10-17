import crypto from 'node:crypto'

export const AGENT_COMMERCE_SCHEMA = 'agent-commerce.capability/1'
export const BASE_SEPOLIA = 'eip155:84532'
export const BASE_MAINNET = 'eip155:8453'

const ALLOWED_PROTOCOLS = new Set(['http', 'mcp', 'a2a', 'x402'])
const ALLOWED_RISK = new Set(['read', 'write', 'consequential'])

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

export function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')
}

export function assertCapabilityOffer(offer) {
  if (!offer || typeof offer !== 'object') throw new Error('offer_required')
  if (!offer.id || !/^[a-z0-9][a-z0-9._-]{2,80}$/.test(offer.id)) throw new Error('offer_invalid_id')
  if (!offer.description || offer.description.length > 240) throw new Error('offer_invalid_description')
  if (!ALLOWED_RISK.has(offer.risk)) throw new Error('offer_invalid_risk')
  if (!Array.isArray(offer.protocols) || offer.protocols.length === 0 || offer.protocols.some((p) => !ALLOWED_PROTOCOLS.has(p))) {
    throw new Error('offer_invalid_protocols')
  }
  if (!/^[0-9]+(?:\.[0-9]{1,6})?$/.test(String(offer.priceUsd))) throw new Error('offer_invalid_price')
  const price = Number(offer.priceUsd)
  if (!Number.isFinite(price) || price < 0 || price > 1000) throw new Error('offer_invalid_price')
  if (offer.network !== BASE_SEPOLIA && offer.network !== BASE_MAINNET) throw new Error('offer_invalid_network')
  if (offer.asset !== 'USDC') throw new Error('offer_invalid_asset')
  if (offer.risk === 'consequential' && offer.humanApprovalRequired !== true) throw new Error('consequential_requires_human_approval')
  if (offer.paymentBuysTrust !== false) throw new Error('payment_must_not_buy_trust')
  return true
}

export function publicCapabilityDescriptor(offer) {
  assertCapabilityOffer(offer)
  return Object.freeze({
    schema: AGENT_COMMERCE_SCHEMA,
    id: offer.id,
    description: offer.description,
    version: offer.version ?? '0.1.0',
    protocols: [...offer.protocols],
    pricing: {
      amountUsd: String(offer.priceUsd),
      asset: offer.asset,
      network: offer.network,
      scheme: 'exact',
    },
    risk: offer.risk,
    humanApprovalRequired: Boolean(offer.humanApprovalRequired),
    paymentBuysTrust: false,
    privacy: {
      retention: offer.retention ?? 'none',
      acceptsSensitiveData: Boolean(offer.acceptsSensitiveData),
    },
    trust: {
      deterministicCore: Boolean(offer.deterministicCore),
      evidenceReturned: Boolean(offer.evidenceReturned),
      tests: offer.tests ?? null,
    },
  })
}

export function makeServiceReceipt({ descriptor, request, traceId, output, payment = null }) {
  const requestHash = fingerprint(request)
  const outputHash = fingerprint(output)
  const settlementRef = payment?.settlementRef ?? null
  return Object.freeze({
    schema: 'agent-commerce.receipt/1',
    capabilityId: descriptor.id,
    capabilityVersion: descriptor.version,
    traceId,
    requestHash,
    outputHash,
    payment: payment
      ? {
          // x402 Express verifies before the handler and settles after the handler returns.
          // Therefore a body receipt may only claim `settled` when it already has a
          // concrete settlement reference (e.g. the explicit mock test double).
          // Real x402 settlement proof is returned later in the PAYMENT-RESPONSE header.
          status: settlementRef ? 'settled' : 'verified',
          scheme: 'x402',
          asset: descriptor.pricing.asset,
          network: descriptor.pricing.network,
          amountUsd: descriptor.pricing.amountUsd,
          settlementRef,
          settlementProof: settlementRef ? 'inline' : 'PAYMENT-RESPONSE',
        }
      : null,
    authority: {
      paymentGrantedAuthority: false,
      consequentialActionExecuted: false,
    },
  })
}
