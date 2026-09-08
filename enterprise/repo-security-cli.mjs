#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { assessRepository, runRepositoryAutofixLoop } from './repo-security-orchestrator.mjs'
import { assessBoundedOperators } from './operator-security.mjs'

function compactForEvidence(result) {
  const clone = JSON.parse(JSON.stringify(result))
  if (clone.pr?.files) {
    clone.pr.files = clone.pr.files.map(({ path, ...rest }) => ({ path, ...rest, content: undefined }))
  }
  return clone
}

function shouldTryBoundedOperatorFallback(result) {
  if (result?.mode !== 'repository_discovery_fail_closed') return false
  const blockers = result?.discovery?.coverage?.blockers ?? []
  return blockers.includes('no_agent_entrypoint_detected')
}

const args = process.argv.slice(2)
const rootArg = args.find((arg) => !arg.startsWith('--'))
if (!rootArg) {
  console.error('usage: node enterprise/repo-security-cli.mjs <repository-root> [--autofix] [--out=<path>]')
  process.exit(2)
}

const root = path.resolve(rootArg)
const autofix = args.includes('--autofix')
const outArg = args.find((arg) => arg.startsWith('--out='))
const outPath = outArg ? path.resolve(outArg.slice('--out='.length)) : null

let result
if (autofix) {
  result = await runRepositoryAutofixLoop(root)
} else {
  result = await assessRepository(root)
  if (shouldTryBoundedOperatorFallback(result)) {
    const operatorResult = assessBoundedOperators(root)
    if (operatorResult.applicable) result = operatorResult
  }
}

const evidence = compactForEvidence(result)
const json = `${JSON.stringify(evidence, null, 2)}\n`

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, json)
}

console.log(json.trimEnd())
if (autofix && result.release?.decision !== 'TECHNICAL_GO') process.exitCode = 3
