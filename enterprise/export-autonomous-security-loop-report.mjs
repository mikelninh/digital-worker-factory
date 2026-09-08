import { readFile, writeFile } from 'node:fs/promises'
import { runAutonomousAttackFixLoop } from './autonomous-security-loop.mjs'

const source = new URL('./examples/autonomous-loop-vulnerable-agent.json', import.meta.url)
const output = new URL('./autonomous-security-loop-report.json', import.meta.url)
const manifest = JSON.parse(await readFile(source, 'utf8'))
const report = await runAutonomousAttackFixLoop(manifest)
const evidence = {
  version: report.version,
  agent: report.agent,
  mode: report.mode,
  flow: report.flow,
  discovery: report.discovery,
  attacks: report.attacks,
  before: report.before,
  remediation: report.remediation,
  after: report.after,
  release: report.release,
  regressionCases: report.regressionCases,
  truthBoundary: report.truthBoundary,
}
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`)
console.log(JSON.stringify({
  decision: evidence.release.decision,
  generatedAttacks: evidence.attacks.generated,
  beforeEscapes: evidence.before.impactEscapes,
  afterEscapes: evidence.after.impactEscapes,
  executorCallsAfter: evidence.after.executorCalls,
}))
