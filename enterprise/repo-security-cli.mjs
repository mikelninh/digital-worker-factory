#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { assessRepository, runRepositoryAutofixLoop } from './repo-security-orchestrator.mjs'

function compactForEvidence(result) {
  const clone = JSON.parse(JSON.stringify(result))
  if (clone.pr?.files) {
    clone.pr.files = clone.pr.files.map(({ path, ...rest }) => ({ path, ...rest, content: undefined }))
  }
  return clone
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

const result = autofix ? await runRepositoryAutofixLoop(root) : await assessRepository(root)
const evidence = compactForEvidence(result)
const json = `${JSON.stringify(evidence, null, 2)}\n`

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, json)
}

console.log(json.trimEnd())
if (autofix && result.release?.decision !== 'TECHNICAL_GO') process.exitCode = 3
