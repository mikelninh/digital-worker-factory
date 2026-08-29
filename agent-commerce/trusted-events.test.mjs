import test from 'node:test'
import assert from 'node:assert/strict'

import {
  checkAuthority,
  executeTrustedEvent,
  resolveOrganisation,
  trustPreflight,
  verifyEvidence,
  verifyFreshness,
} from './trusted-events.mjs'

const NOW = Date.parse('2026-08-28T20:00:00Z')

test('freshness check is deterministic against explicit max age', () => {
  const result = verifyFreshness({ observedAt: '2026-08-28T19:59:30Z', maxAgeSeconds: 60 }, { now: NOW })
  assert.equal(result.status, 'fresh')
  assert.equal(result.ageSeconds, 30)
  assert.equal(result.fresh, true)
})

test('freshness check rejects stale evidence', () => {
  const result = verifyFreshness({ observedAt: '2026-08-28T19:00:00Z', maxAgeSeconds: 60 }, { now: NOW })
  assert.equal(result.status, 'stale')
  assert.equal(result.fresh, false)
})

test('evidence verification requires https provenance and reports coverage', () => {
  const result = verifyEvidence({
    claims: [{ id: 'c1', text: 'A bounded claim', evidenceIds: ['e1'] }],
    evidence: [{ id: 'e1', sourceUrl: 'https://example.gov/source', retrievedAt: '2026-08-28T19:58:00Z', locator: 'section 4' }],
  }, { now: NOW })
  assert.equal(result.status, 'verified_structure')
  assert.equal(result.coverage, 1)
  assert.equal(result.provenanceCoverage, 1)
  assert.match(result.limitation, /not whether.*true/i)
})

test('authority only comes from explicit grants and never payment', () => {
  const denied = checkAuthority({
    actorId: 'agent-1', capabilityId: 'payments.send.v1', action: 'execute', scope: 'tenant-a', grants: [],
  })
  assert.equal(denied.authorized, false)
  assert.equal(denied.paymentGrantedAuthority, false)

  const allowed = checkAuthority({
    actorId: 'agent-1', capabilityId: 'payments.send.v1', action: 'execute', scope: 'tenant-a',
    grants: [{ id: 'g1', actorId: 'agent-1', capabilityId: 'payments.send.v1', actions: ['execute'], scope: 'tenant-a', active: true }],
  })
  assert.equal(allowed.authorized, true)
  assert.deepEqual(allowed.matchedGrantIds, ['g1'])
})

test('organisation resolution uses strong identifiers and does not merge', () => {
  const result = resolveOrganisation({
    query: { name: 'Acme GmbH', registrationId: 'HRB-1234', domain: 'acme.example' },
    candidates: [
      { id: 'a', name: 'ACME GmbH', registrationId: 'HRB 1234', domain: 'https://acme.example' },
      { id: 'b', name: 'Acme Services GmbH', registrationId: 'HRB 9999', domain: 'services.example' },
    ],
  })
  assert.equal(result.status, 'match')
  assert.equal(result.recommendedCandidateId, 'a')
  assert.equal(result.mergeExecuted, false)
})

test('trust preflight blocks missing authority and stale evidence', () => {
  const result = trustPreflight({
    risk: 'consequential',
    humanApproval: true,
    freshness: { observedAt: '2026-08-28T18:00:00Z', maxAgeSeconds: 60 },
    authority: { actorId: 'agent-1', capabilityId: 'case.update.v1', action: 'execute', scope: 'tenant-a', grants: [] },
  }, { now: NOW })
  assert.equal(result.decision, 'block')
  assert.ok(result.blockers.includes('freshness:stale'))
  assert.ok(result.blockers.includes('authority:not_granted'))
  assert.equal(result.authority.consequentialActionExecuted, false)
})

test('trust preflight requires review for consequential work without human approval', () => {
  const result = executeTrustedEvent('trust.preflight.v1', {
    risk: 'consequential',
    freshness: { observedAt: '2026-08-28T19:59:30Z', maxAgeSeconds: 60 },
  }, { now: NOW })
  assert.equal(result.decision, 'review')
  assert.deepEqual(result.reviewReasons, ['human_approval_required'])
})
