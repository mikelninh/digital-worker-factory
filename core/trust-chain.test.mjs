import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { TRUST_LEVELS, buildEvidenceRef, trustChainDigest, validateTrustChain } from './trust-chain.mjs'

const hash = (text) => createHash('sha256').update(text).digest('hex')

function chain(overrides = {}) {
  const base = {
    version: 'trust-chain/v1',
    subject: { type: 'case', id: 'case-42' },
    authenticity: { status: 'original_as_received', method: 'raw_capture' },
    integrity: { verified: true, sha256: hash('original bytes'), version: 'sha256:v1', capturedAt: '2026-09-01T12:00:00Z' },
    provenance: { sourceSystem: 'customer_upload', sourceUri: 'object://tenant/case-42.pdf', acquiredAt: '2026-09-01T12:00:00Z' },
    authority: { id: 'rule-1', title: 'Applicable rule', version: '2026-08-01', sourceUrl: 'https://authority.example/rule', status: 'authoritative' },
    evidence: [buildEvidenceRef({ id: 'ev-1', sourceId: 'doc-1', locatorKind: 'page', locatorValue: '3', excerpt: 'supporting text' })],
    derivation: { summary: 'The cited rule and page 3 support the prepared finding.', method: 'deterministic_rule_check', evidenceIds: ['ev-1'] },
    humanDecision: { required: true, status: 'pending', actorId: null, at: null },
    audit: { traceId: 'trace-1', createdAt: '2026-09-01T12:00:01Z' },
  }
  return { ...base, ...overrides }
}

test('a complete original-as-received chain is traceable', () => {
  const result = validateTrustChain(chain())
  assert.equal(result.ok, true)
  assert.equal(result.level, TRUST_LEVELS.TRACEABLE)
  assert.match(result.digest, /^[a-f0-9]{64}$/)
})

test('verified issuer plus authoritative rule can reach verified assurance', () => {
  const result = validateTrustChain(chain({ authenticity: { status: 'verified_issuer', method: 'valid_digital_signature' } }), { minimumLevel: TRUST_LEVELS.VERIFIED })
  assert.equal(result.ok, true)
  assert.equal(result.level, TRUST_LEVELS.VERIFIED)
})

test('missing authority or exact evidence locator fails closed', () => {
  const noAuthority = validateTrustChain(chain({ authority: { id: '', title: '', version: '', sourceUrl: '', status: 'authoritative' } }))
  assert.equal(noAuthority.ok, false)
  assert.ok(noAuthority.reasons.includes('authority_required'))

  const badEvidence = chain()
  badEvidence.evidence[0].locator.value = ''
  const noLocator = validateTrustChain(badEvidence)
  assert.equal(noLocator.ok, false)
  assert.ok(noLocator.reasons.includes('evidence_exact_locator_required'))
})

test('derivation cannot cite evidence that is not in the chain', () => {
  const result = validateTrustChain(chain({ derivation: { summary: 'summary', method: 'rule', evidenceIds: ['invented'] } }))
  assert.equal(result.ok, false)
  assert.ok(result.reasons.includes('derivation_unknown_evidence:invented'))
})

test('runtime approval must be recorded in the chain and match the approver', () => {
  const pending = validateTrustChain(chain(), { approvedBy: 'reviewer-1' })
  assert.equal(pending.ok, false)
  assert.ok(pending.reasons.includes('human_approval_not_recorded'))

  const approved = chain({ humanDecision: { required: true, status: 'approved', actorId: 'reviewer-1', at: '2026-09-01T12:05:00Z' } })
  assert.equal(validateTrustChain(approved, { approvedBy: 'reviewer-1' }).ok, true)
  assert.ok(validateTrustChain(approved, { approvedBy: 'reviewer-2' }).reasons.includes('human_approval_mismatch'))
})

test('trust-chain digest changes when material evidence changes', () => {
  const original = chain()
  const changed = chain()
  changed.evidence[0].excerptHash = hash('different evidence')
  assert.notEqual(trustChainDigest(original), trustChainDigest(changed))
})
