import crypto from 'node:crypto'

export const TRUSTED_EVENT_OFFERS = Object.freeze({
  'trust.preflight.v1': Object.freeze({ priceUsd: '0.005', description: 'Deterministic preflight over evidence, freshness, authority and risk before a consequential agent action.' }),
  'evidence.verify.v1': Object.freeze({ priceUsd: '0.003', description: 'Verify evidence coverage, provenance shape and claim binding without asserting source truth.' }),
  'freshness.verify.v1': Object.freeze({ priceUsd: '0.001', description: 'Check whether time-sensitive evidence satisfies an explicit freshness policy.' }),
  'authority.check.v1': Object.freeze({ priceUsd: '0.002', description: 'Check whether an explicit grant covers a requested capability, scope and action.' }),
  'entity.resolve.org.v1': Object.freeze({ priceUsd: '0.01', description: 'Resolve an organisation candidate using bounded identifiers and return match evidence or ambiguity.' }),
})

const URL_RE = /^https:\/\/[^\s]+$/i
const EVM_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function object(value, error) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(error)
  return value
}

function boundedString(value, { field, max = 5000, required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field}_required`)
    return null
  }
  if (typeof value !== 'string') throw new Error(`${field}_invalid`)
  const clean = value.trim()
  if ((required && !clean) || clean.length > max) throw new Error(`${field}_invalid`)
  return clean
}

function parseIso(value, field) {
  const clean = boundedString(value, { field, max: 64 })
  const time = Date.parse(clean)
  if (!Number.isFinite(time)) throw new Error(`${field}_invalid`)
  return { iso: new Date(time).toISOString(), time }
}

export function verifyFreshness(input, { now = Date.now() } = {}) {
  object(input, 'freshness_body_must_be_object')
  const observed = parseIso(input.observedAt, 'observedAt')
  const maxAgeSeconds = Number(input.maxAgeSeconds)
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 0 || maxAgeSeconds > 31_536_000) {
    throw new Error('maxAgeSeconds_invalid')
  }
  const ageSeconds = Math.max(0, Math.floor((now - observed.time) / 1000))
  const futureSkewSeconds = Math.max(0, Math.floor((observed.time - now) / 1000))
  const maxFutureSkewSeconds = Number.isInteger(input.maxFutureSkewSeconds) ? input.maxFutureSkewSeconds : 300
  const status = futureSkewSeconds > maxFutureSkewSeconds ? 'invalid_future' : ageSeconds <= maxAgeSeconds ? 'fresh' : 'stale'
  return Object.freeze({
    status,
    fresh: status === 'fresh',
    observedAt: observed.iso,
    checkedAt: new Date(now).toISOString(),
    ageSeconds,
    maxAgeSeconds,
    policy: 'explicit-max-age',
  })
}

export function verifyEvidence(input, { now = Date.now() } = {}) {
  object(input, 'evidence_body_must_be_object')
  const claims = Array.isArray(input.claims) ? input.claims : null
  const evidence = Array.isArray(input.evidence) ? input.evidence : null
  if (!claims || claims.length < 1 || claims.length > 50) throw new Error('evidence_claims_invalid')
  if (!evidence || evidence.length < 1 || evidence.length > 100) throw new Error('evidence_items_invalid')

  const evidenceById = new Map()
  for (const item of evidence) {
    object(item, 'evidence_item_invalid')
    const id = boundedString(item.id, { field: 'evidence_id', max: 128 })
    if (evidenceById.has(id)) throw new Error('evidence_id_duplicate')
    const sourceUrl = boundedString(item.sourceUrl, { field: 'evidence_sourceUrl', max: 2048 })
    if (!URL_RE.test(sourceUrl)) throw new Error('evidence_sourceUrl_https_required')
    const retrieved = parseIso(item.retrievedAt, 'evidence_retrievedAt')
    const contentHash = item.contentHash ? boundedString(item.contentHash, { field: 'evidence_contentHash', max: 128 }) : null
    const locator = item.locator ? boundedString(item.locator, { field: 'evidence_locator', max: 500 }) : null
    evidenceById.set(id, {
      id,
      sourceUrl,
      retrievedAt: retrieved.iso,
      contentHash,
      locator,
      provenanceComplete: Boolean(contentHash || locator),
    })
  }

  const claimResults = []
  let covered = 0
  let fullyBound = 0
  for (const claim of claims) {
    object(claim, 'evidence_claim_invalid')
    const id = boundedString(claim.id, { field: 'claim_id', max: 128 })
    const text = boundedString(claim.text, { field: 'claim_text', max: 5000 })
    const refs = Array.isArray(claim.evidenceIds) ? [...new Set(claim.evidenceIds.map(String))] : []
    const found = refs.map((ref) => evidenceById.get(ref)).filter(Boolean)
    const missing = refs.filter((ref) => !evidenceById.has(ref))
    const isCovered = found.length > 0 && missing.length === 0
    const isBound = isCovered && found.every((item) => item.provenanceComplete)
    if (isCovered) covered += 1
    if (isBound) fullyBound += 1
    claimResults.push({
      id,
      claimHash: sha256(text),
      covered: isCovered,
      provenanceBound: isBound,
      evidenceIds: refs,
      missingEvidenceIds: missing,
    })
  }

  const coverage = covered / claims.length
  const provenanceCoverage = fullyBound / claims.length
  return Object.freeze({
    status: coverage === 1 && provenanceCoverage === 1 ? 'verified_structure' : coverage === 1 ? 'covered_with_provenance_gaps' : 'insufficient_evidence',
    claimCount: claims.length,
    evidenceCount: evidence.length,
    coverage,
    provenanceCoverage,
    claims: Object.freeze(claimResults),
    checkedAt: new Date(now).toISOString(),
    limitation: 'This verifies evidence binding and provenance shape, not whether a source or claim is substantively true.',
  })
}

export function checkAuthority(input) {
  object(input, 'authority_body_must_be_object')
  const actorId = boundedString(input.actorId, { field: 'actorId', max: 128 })
  const capabilityId = boundedString(input.capabilityId, { field: 'capabilityId', max: 128 })
  const requestedAction = boundedString(input.action, { field: 'action', max: 128 })
  const requestedScope = boundedString(input.scope ?? 'default', { field: 'scope', max: 256 })
  const grants = Array.isArray(input.grants) ? input.grants : []
  if (grants.length > 100) throw new Error('authority_grants_invalid')

  const matches = grants.filter((grant) => {
    if (!grant || typeof grant !== 'object') return false
    const active = grant.active !== false
    const actorMatch = grant.actorId === actorId || grant.actorId === '*'
    const capabilityMatch = grant.capabilityId === capabilityId || grant.capabilityId === '*'
    const actionMatch = grant.actions === '*' || (Array.isArray(grant.actions) && grant.actions.includes(requestedAction))
    const scopeMatch = grant.scope === '*' || grant.scope === requestedScope
    return active && actorMatch && capabilityMatch && actionMatch && scopeMatch
  })

  return Object.freeze({
    authorized: matches.length > 0,
    decision: matches.length > 0 ? 'allow' : 'block',
    actorId,
    capabilityId,
    action: requestedAction,
    scope: requestedScope,
    matchedGrantIds: Object.freeze(matches.map((grant) => String(grant.id ?? 'unnamed'))),
    authoritySource: 'explicit-grants-only',
    paymentGrantedAuthority: false,
  })
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\b(gmbh|ag|ug|mbh|ltd|limited|inc|llc|ev|e\.v\.)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeDomain(value) {
  return String(value ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
}

function normalizeId(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function resolveOrganisation(input) {
  object(input, 'entity_body_must_be_object')
  const query = object(input.query, 'entity_query_required')
  const candidates = Array.isArray(input.candidates) ? input.candidates : null
  if (!candidates || candidates.length < 1 || candidates.length > 25) throw new Error('entity_candidates_invalid')

  const q = {
    name: normalizeName(query.name),
    domain: normalizeDomain(query.domain),
    registrationId: normalizeId(query.registrationId),
    address: normalizeName(query.address),
  }
  if (!q.name && !q.domain && !q.registrationId) throw new Error('entity_query_identifier_required')

  const scored = candidates.map((candidate, index) => {
    object(candidate, 'entity_candidate_invalid')
    const c = {
      name: normalizeName(candidate.name),
      domain: normalizeDomain(candidate.domain),
      registrationId: normalizeId(candidate.registrationId),
      address: normalizeName(candidate.address),
    }
    const signals = []
    let score = 0
    let possible = 0
    if (q.registrationId) {
      possible += 0.6
      if (c.registrationId && q.registrationId === c.registrationId) { score += 0.6; signals.push('registration_id_exact') }
    }
    if (q.domain) {
      possible += 0.2
      if (c.domain && q.domain === c.domain) { score += 0.2; signals.push('domain_exact') }
    }
    if (q.name) {
      possible += 0.15
      if (c.name && q.name === c.name) { score += 0.15; signals.push('normalized_name_exact') }
    }
    if (q.address) {
      possible += 0.05
      if (c.address && q.address === c.address) { score += 0.05; signals.push('normalized_address_exact') }
    }
    const normalizedScore = possible > 0 ? score / possible : 0
    return {
      candidateId: String(candidate.id ?? index + 1),
      score: Number(normalizedScore.toFixed(4)),
      signals,
    }
  }).sort((a, b) => b.score - a.score)

  const top = scored[0]
  const second = scored[1]
  const gap = top.score - (second?.score ?? 0)
  const status = top.score >= 0.85 && gap >= 0.1 ? 'match' : top.score >= 0.6 ? 'ambiguous' : 'no_match'
  return Object.freeze({
    status,
    recommendedCandidateId: status === 'match' ? top.candidateId : null,
    topScore: top.score,
    scoreGap: Number(gap.toFixed(4)),
    candidates: Object.freeze(scored),
    mergeExecuted: false,
    humanReviewRequired: status !== 'match',
    limitation: 'Bounded identifier matching only; no external registry lookup is performed by this capability.',
  })
}

export function trustPreflight(input, { now = Date.now() } = {}) {
  object(input, 'preflight_body_must_be_object')
  const risk = boundedString(input.risk ?? 'read', { field: 'risk', max: 32 })
  if (!['read', 'write', 'consequential'].includes(risk)) throw new Error('risk_invalid')

  const checks = {}
  if (input.freshness) checks.freshness = verifyFreshness(input.freshness, { now })
  if (input.evidence) checks.evidence = verifyEvidence(input.evidence, { now })
  if (input.authority) checks.authority = checkAuthority(input.authority)

  const blockers = []
  const reviewReasons = []
  if (checks.freshness && !checks.freshness.fresh) blockers.push(`freshness:${checks.freshness.status}`)
  if (checks.evidence?.status === 'insufficient_evidence') blockers.push('evidence:insufficient')
  if (checks.evidence?.status === 'covered_with_provenance_gaps') reviewReasons.push('evidence:provenance_gaps')
  if (checks.authority && !checks.authority.authorized) blockers.push('authority:not_granted')
  if ((risk === 'write' || risk === 'consequential') && input.humanApproval !== true) reviewReasons.push('human_approval_required')

  const decision = blockers.length ? 'block' : reviewReasons.length ? 'review' : 'allow'
  return Object.freeze({
    decision,
    risk,
    blockers: Object.freeze(blockers),
    reviewReasons: Object.freeze(reviewReasons),
    checks: Object.freeze(checks),
    authority: Object.freeze({
      paymentGrantedAuthority: false,
      consequentialActionExecuted: false,
      humanApprovalObserved: input.humanApproval === true,
    }),
    checkedAt: new Date(now).toISOString(),
  })
}

export function validateTrustedEventId(id) {
  if (!EVM_ID_RE.test(String(id ?? '')) || !TRUSTED_EVENT_OFFERS[id]) throw new Error('trusted_event_not_found')
  return id
}

export function executeTrustedEvent(id, input, options = {}) {
  validateTrustedEventId(id)
  switch (id) {
    case 'trust.preflight.v1': return trustPreflight(input, options)
    case 'evidence.verify.v1': return verifyEvidence(input, options)
    case 'freshness.verify.v1': return verifyFreshness(input, options)
    case 'authority.check.v1': return checkAuthority(input)
    case 'entity.resolve.org.v1': return resolveOrganisation(input)
    default: throw new Error('trusted_event_not_found')
  }
}
