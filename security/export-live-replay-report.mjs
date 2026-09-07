import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildLiveReplayReport } from './live-adversarial-replay.mjs'

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isCli) {
  const report = await buildLiveReplayReport()
  writeFileSync(new URL('./live-replay-report.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Live adversarial replay: ${report.summary.passed}/${report.summary.cases}; impact escapes=${report.summary.impactEscapes}; executor calls=${report.summary.executorCalls}`)
  if (report.summary.passed !== report.summary.cases || report.summary.impactEscapes !== 0 || report.summary.executorCalls !== 0) process.exitCode = 1
}
