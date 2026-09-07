import { readFile, writeFile } from 'node:fs/promises'
import { runAutonomousAttackFixLoop } from './autonomous-security-loop.mjs'

const source = new URL('./examples/autonomous-loop-vulnerable-agent.json', import.meta.url)
const output = new URL('./autonomous-security-loop-report.json', import.meta.url)
const manifest = JSON.parse(await readFile(source, 'utf8'))
const report = await runAutonomousAttackFixLoop(manifest)
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({
  decision: report.release.decision,
  generatedAttacks: report.attacks.generated,
  beforeEscapes: report.before.impactEscapes,
  afterEscapes: report.after.impactEscapes,
  executorCallsAfter: report.after.executorCalls,
}))
