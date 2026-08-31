#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  buildTrustReadyBuyerPack,
  buildTrustReadyRemediationPlan,
  generateTrustReadyArtifacts,
  scanTrustReadiness,
} from '../core/trustready.mjs'
import { collectGitHubTrustEvidence } from '../core/trustready-github.mjs'

function usage() {
  console.log(`TrustReady\n\nUsage:\n  node scripts/trustready.mjs scan <product.json>\n  node scripts/trustready.mjs scan-github <https://github.com/owner/repo>\n  node scripts/trustready.mjs remediate <product.json> <output-dir>\n  node scripts/trustready.mjs remediate-github <https://github.com/owner/repo> <output-dir>\n  node scripts/trustready.mjs buyer-pack <product.json> <output.json>\n  node scripts/trustready.mjs portfolio <portfolio.json>\n\nProduct JSON must contain { id, name, url?, known?, evidence }.\n100 means every configured buyer-readiness control is evidence-backed or explicitly human-attested; it is not a legal-compliance guarantee.`)
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function writeRemediation(product, outputDir) {
  const scan = scanTrustReadiness(product, controls)
  const plan = buildTrustReadyRemediationPlan(scan)
  const generated = generateTrustReadyArtifacts(product, scan)
  const dir = outputDir || path.join('trustready-output', product.id)
  await mkdir(dir, { recursive: true })

  for (const artifact of generated.artifacts) {
    await writeFile(path.join(dir, artifact.path), artifact.content, 'utf8')
  }
  await writeFile(path.join(dir, 'product-evidence.json'), JSON.stringify(product, null, 2) + '\n', 'utf8')
  await writeFile(path.join(dir, 'scan.json'), JSON.stringify(scan, null, 2) + '\n', 'utf8')
  await writeFile(path.join(dir, 'remediation-plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8')
  await writeFile(path.join(dir, 'README.txt'), `${generated.warning}\nCurrent readiness: ${scan.score}/100\nRemaining controls: ${plan.remainingTo100}\n`, 'utf8')

  return { dir, scan, plan, generated }
}

const controls = JSON.parse(await readFile(new URL('../trustready/controls.json', import.meta.url), 'utf8'))
const [command, inputPath, outputPath] = process.argv.slice(2)

if (!command) {
  usage()
  process.exit(1)
}

if (command === 'scan') {
  const product = await loadJson(inputPath)
  const scan = scanTrustReadiness(product, controls)
  const plan = buildTrustReadyRemediationPlan(scan)
  console.log(JSON.stringify({ scan, remediation: plan }, null, 2))
  process.exit(0)
}

if (command === 'scan-github') {
  const product = await collectGitHubTrustEvidence(inputPath)
  const scan = scanTrustReadiness(product, controls)
  const plan = buildTrustReadyRemediationPlan(scan)
  console.log(JSON.stringify({ product, scan, remediation: plan }, null, 2))
  process.exit(0)
}

if (command === 'remediate') {
  const product = await loadJson(inputPath)
  const result = await writeRemediation(product, outputPath)
  console.log(JSON.stringify({ outputDir: result.dir, score: result.scan.score, remaining: result.plan.remainingTo100, artifacts: result.generated.artifacts.map((item) => item.path) }, null, 2))
  process.exit(0)
}

if (command === 'remediate-github') {
  const product = await collectGitHubTrustEvidence(inputPath)
  const result = await writeRemediation(product, outputPath)
  console.log(JSON.stringify({ outputDir: result.dir, score: result.scan.score, remaining: result.plan.remainingTo100, filesObserved: product.collection.filesObserved, artifacts: result.generated.artifacts.map((item) => item.path) }, null, 2))
  process.exit(0)
}

if (command === 'buyer-pack') {
  const product = await loadJson(inputPath)
  const scan = scanTrustReadiness(product, controls)
  const buyerPack = buildTrustReadyBuyerPack(product, scan)
  const target = outputPath || `${product.id}-buyer-pack.json`
  await writeFile(target, JSON.stringify(buyerPack, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ output: target, ready: buyerPack.ready, score: scan.score }, null, 2))
  process.exit(buyerPack.ready ? 0 : 2)
}

if (command === 'portfolio') {
  const fixture = await loadJson(inputPath)
  const products = Array.isArray(fixture) ? fixture : fixture.products
  if (!Array.isArray(products)) throw new TypeError('Portfolio input must be an array or { products: [] }')
  const results = products
    .map((product) => {
      const scan = scanTrustReadiness(product, controls)
      const plan = buildTrustReadyRemediationPlan(scan)
      return { id: product.id, name: product.name, score: scan.score, remaining: plan.remainingTo100, topAction: plan.actions[0] || null }
    })
    .sort((a, b) => b.score - a.score)
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

usage()
process.exit(1)
