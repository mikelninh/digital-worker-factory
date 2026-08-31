import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyTrustReadyEvidence,
  buildTrustReadyBuyerPack,
  buildTrustReadyRemediationPlan,
  generateTrustReadyArtifacts,
  scanTrustReadiness,
  validateTrustReadyControlPack,
} from './trustready.mjs'

const pack = {
  schema: 'trustready-control-pack-v1',
  version: 'test',
  scoreMeaning: 'test score',
  controls: [
    { id: 'identity', title: 'Identity', category: 'company', weight: 40, evidenceKeys: ['identity'], remediation: 'Publish identity', autoGenerate: 'product_card' },
    { id: 'oversight', title: 'Oversight', category: 'ai', weight: 30, evidenceKeys: ['oversight'], remediation: 'Document oversight', autoGenerate: 'human_oversight' },
    { id: 'legal', title: 'Legal owner review', category: 'legal', weight: 30, evidenceKeys: ['legal'], remediation: 'Obtain named review', autoGenerate: 'ai_act_assessment', humanAttestationRequired: true },
  ],
}

const product = {
  id: 'demo',
  name: 'Demo Product',
  known: { intendedPurpose: 'Test readiness' },
  evidence: {
    identity: { status: 'verified', source: 'https://example.test/product' },
    oversight: { status: 'partial', source: 'https://example.test/oversight' },
    legal: { status: 'missing' },
  },
}

test('validates control packs and calculates weighted readiness', () => {
  const validated = validateTrustReadyControlPack(pack)
  assert.equal(validated.totalWeight, 100)

  const scan = scanTrustReadiness(product, pack)
  assert.equal(scan.score, 55)
  assert.equal(scan.verified, 1)
  assert.equal(scan.partial, 1)
  assert.equal(scan.missing, 1)
  assert.equal(scan.readyForBuyerPack, false)
})

test('verified claims without a source are downgraded instead of trusted', () => {
  const scan = scanTrustReadiness({
    ...product,
    evidence: { ...product.evidence, identity: { status: 'verified' } },
  }, pack)
  assert.equal(scan.controls.find((item) => item.id === 'identity').status, 'partial')
  assert.equal(scan.score, 35)
})

test('remediation separates automation from human attestation', () => {
  const scan = scanTrustReadiness(product, pack)
  const plan = buildTrustReadyRemediationPlan(scan)
  assert.deepEqual(plan.autoPrepare.map((item) => item.controlId), ['oversight'])
  assert.deepEqual(plan.humanReview.map((item) => item.controlId), ['legal'])
  assert.equal(plan.targetScore, 100)
})

test('generated drafts do not silently become readiness evidence', () => {
  const scan = scanTrustReadiness(product, pack)
  const generated = generateTrustReadyArtifacts(product, scan)
  assert.ok(generated.artifacts.some((item) => item.path === 'HUMAN_OVERSIGHT.md'))
  assert.ok(generated.artifacts.some((item) => item.path === 'AI_ACT_ROLE_ASSESSMENT.md'))
  assert.match(generated.warning, /only after implementation\/publication/)
  assert.equal(scan.score, 55)
})

test('buyer pack fails closed below 100 and opens at evidence-complete readiness', () => {
  const initial = scanTrustReadiness(product, pack)
  assert.equal(buildTrustReadyBuyerPack(product, initial).ready, false)

  const complete = applyTrustReadyEvidence(product, {
    oversight: { status: 'verified', source: 'https://example.test/oversight-live' },
    legal: { status: 'attested', source: 'human:authorised-owner:2026-08-31' },
  })
  const finalScan = scanTrustReadiness(complete, pack)
  const buyerPack = buildTrustReadyBuyerPack(complete, finalScan)
  assert.equal(finalScan.score, 100)
  assert.equal(buyerPack.ready, true)
  assert.equal(buyerPack.evidenceIndex.length, 3)
})
