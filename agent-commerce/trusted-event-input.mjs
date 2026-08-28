import { validateTrustedEventId } from './trusted-events.mjs'

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function invalid(message) {
  throw new Error(message)
}

export function prevalidateTrustedEventInput(capabilityId, input) {
  validateTrustedEventId(capabilityId)
  if (!isObject(input)) invalid('trusted_event_body_must_be_object')

  switch (capabilityId) {
    case 'trust.preflight.v1': {
      if (input.risk !== undefined && !['read', 'write', 'consequential'].includes(input.risk)) invalid('risk_invalid')
      if (input.freshness !== undefined && !isObject(input.freshness)) invalid('freshness_invalid')
      if (input.evidence !== undefined && !isObject(input.evidence)) invalid('evidence_invalid')
      if (input.authority !== undefined && !isObject(input.authority)) invalid('authority_invalid')
      break
    }
    case 'evidence.verify.v1': {
      if (!Array.isArray(input.claims) || input.claims.length < 1 || input.claims.length > 50) invalid('evidence_claims_invalid')
      if (!Array.isArray(input.evidence) || input.evidence.length < 1 || input.evidence.length > 100) invalid('evidence_items_invalid')
      break
    }
    case 'freshness.verify.v1': {
      if (typeof input.observedAt !== 'string' || !Number.isFinite(Date.parse(input.observedAt))) invalid('observedAt_invalid')
      if (!Number.isInteger(input.maxAgeSeconds) || input.maxAgeSeconds < 0 || input.maxAgeSeconds > 31_536_000) invalid('maxAgeSeconds_invalid')
      break
    }
    case 'authority.check.v1': {
      for (const field of ['actorId', 'capabilityId', 'action']) if (typeof input[field] !== 'string' || !input[field].trim()) invalid(`${field}_required`)
      if (input.grants !== undefined && (!Array.isArray(input.grants) || input.grants.length > 100)) invalid('authority_grants_invalid')
      break
    }
    case 'entity.resolve.org.v1': {
      if (!isObject(input.query)) invalid('entity_query_required')
      if (!Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 25) invalid('entity_candidates_invalid')
      break
    }
    default: invalid('trusted_event_not_found')
  }
  return input
}
