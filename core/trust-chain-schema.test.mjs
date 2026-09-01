import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { TRUST_CHAIN_VERSION, validateTrustChain } from './trust-chain.mjs'

const schema = JSON.parse(await readFile(new URL('../architecture/trust-chain-v1.schema.json', import.meta.url), 'utf8'))
const hash = 'a'.repeat(64)

function sampleChain() {
  return {
    version: TRUST_CHAIN_VERSION,
    subject: { type: 'case', id: 'case-1' },
    authenticity: { status: 'original_as_received', method: 'source_adapter' },
    integrity: { verified: true, sha256: hash, version: 'source/v1', capturedAt: '2026-09-01T17:00:00Z' },
    provenance: { sourceSystem: 'domain', sourceUri: 'source://case-1', acquiredAt: '2026-09-01T17:00:00Z' },
    authority: { id: 'authority-1', title: 'Authority', version: '1', sourceUrl: 'https://authority.example/1', status: 'authoritative' },
    evidence: [{ id: 'ev-1', sourceId: 'source-1', locator: { kind: 'page', value: '2' }, excerptHash: hash }],
    derivation: { summary: 'Evidence supports the prepared finding.', method: 'domain_adapter/v1', evidenceIds: ['ev-1'] },
    humanDecision: { required: true, status: 'pending', actorId: null, at: null },
    audit: { traceId: 'trace-1', createdAt: '2026-09-01T17:00:01Z' },
  }
}

test('language-neutral schema pins the same top-level Trust Chain v1 contract as the runtime', () => {
  assert.equal(schema.properties.version.const, TRUST_CHAIN_VERSION)
  assert.deepEqual(
    new Set(schema.required),
    new Set(['version', 'subject', 'authenticity', 'integrity', 'provenance', 'authority', 'evidence', 'derivation', 'humanDecision', 'audit']),
  )
  assert.equal(schema.properties.integrity.properties.verified.const, true)
  assert.deepEqual(schema.properties.humanDecision.properties.status.enum, ['pending', 'approved', 'rejected'])
  assert.ok(schema.properties.evidence.items.properties.locator.properties.kind.enum.includes('page'))
  assert.ok(schema.properties.evidence.items.properties.locator.properties.kind.enum.includes('field'))
})

test('canonical sample is accepted by the runtime validator', () => {
  const result = validateTrustChain(sampleChain())
  assert.equal(result.ok, true)
  assert.equal(result.level, 'traceable')
})

test('schema and runtime both require exact evidence locators and human decision state', () => {
  assert.ok(schema.properties.evidence.items.required.includes('locator'))
  assert.ok(schema.properties.humanDecision.required.includes('status'))

  const chain = sampleChain()
  chain.evidence[0].locator.value = ''
  assert.ok(validateTrustChain(chain).reasons.includes('evidence_exact_locator_required'))
})
