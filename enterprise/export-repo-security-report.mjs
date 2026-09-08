import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runRepositoryAutofixLoop } from './repo-security-orchestrator.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(here, 'examples', 'repo-autofix-target')
const out = path.join(here, 'repo-security-report.json')

const report = await runRepositoryAutofixLoop(fixture)
const evidence = JSON.parse(JSON.stringify(report))
if (evidence.pr?.files) evidence.pr.files = evidence.pr.files.map(({ path: filePath }) => ({ path: filePath }))

fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`)
console.log(`REPO_SECURITY_REPORT=${JSON.stringify(evidence)}`)
console.log(`Repo security loop: runtime escapes ${evidence.runtimeBefore?.impactEscapes} -> ${evidence.runtimeAfter?.impactEscapes}; executor calls after=${evidence.runtimeAfter?.executorCalls}; release=${evidence.release?.decision}`)
