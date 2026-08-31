import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildTrustReadyRemediationPlan,
  generateTrustReadyArtifacts,
  scanTrustReadiness,
} from '../core/trustready.mjs'

const controls = JSON.parse(await readFile(new URL('../trustready/controls.json', import.meta.url), 'utf8'))
const fixture = JSON.parse(await readFile(new URL('../trustready/fixtures/our-products.json', import.meta.url), 'utf8'))

assert.equal(fixture.schema, 'trustready-portfolio-fixture-v1')
assert.ok(fixture.products.length >= 5)

const results = fixture.products.map((product) => {
  const scan = scanTrustReadiness(product, controls)
  const plan = buildTrustReadyRemediationPlan(scan)
  const generated = generateTrustReadyArtifacts(product, scan)

  assert.ok(scan.score >= 0 && scan.score <= 100)
  assert.equal(scan.readyForBuyerPack, false, `${product.name} unexpectedly claims 100% buyer readiness`)
  assert.ok(plan.actions.length > 0, `${product.name} should expose evidence gaps in public-repo scan mode`)
  assert.ok(generated.artifacts.length > 0, `${product.name} should have automatable remediation drafts`)

  return {
    id: product.id,
    name: product.name,
    score: scan.score,
    verified: scan.verified,
    partial: scan.partial,
    missing: scan.missing,
    autoPrepare: plan.autoPrepare.length,
    humanReview: plan.humanReview.length,
    manualEvidence: plan.manualEvidence.length,
    topGaps: plan.actions.slice(0, 5).map((item) => item.title),
    generatedArtifacts: generated.artifacts.map((item) => item.path),
  }
})

results.sort((a, b) => b.score - a.score)

console.log('TrustReady — our products / public-repo evidence baseline')
console.log('100 = every configured control evidenced or explicitly attested; NOT a legal-compliance guarantee.')
console.log('')
for (const result of results) {
  console.log(`${result.name}: ${result.score}/100 | verified ${result.verified} | partial ${result.partial} | missing ${result.missing}`)
  console.log(`  remediation: auto ${result.autoPrepare} | human ${result.humanReview} | manual ${result.manualEvidence}`)
  console.log(`  top gaps: ${result.topGaps.join(' · ')}`)
}

const best = results[0]
const weakest = results.at(-1)
assert.ok(best.score > weakest.score, 'Portfolio fixture should distinguish readiness levels')
assert.ok(results.some((item) => item.id === 'pruefpilot'))
assert.ok(results.some((item) => item.id === 'gitlaw'))
assert.ok(results.some((item) => item.id === 'digital-worker-factory'))

console.log('')
console.log(JSON.stringify({ mode: fixture.mode, results }, null, 2))
