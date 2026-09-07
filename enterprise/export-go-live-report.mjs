import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { evaluateEnterpriseGoLive } from './go-live-gate.mjs'

export function buildDemoGoLiveReport() {
  const manifest = JSON.parse(readFileSync(new URL('./examples/acme-support-agent.json', import.meta.url), 'utf8'))
  return {
    version: 'enterprise-go-live-report/v1',
    generatedFrom: 'enterprise/examples/acme-support-agent.json',
    agent: manifest.agent,
    decision: evaluateEnterpriseGoLive(manifest),
    frameworkCrosswalk: {
      owasp: ['Agentic Top 10 2026', 'Agent Control Standard'],
      nist: ['AI RMF', 'Generative AI Profile'],
      eu: ['risk management', 'logging/traceability', 'human oversight', 'robustness/cybersecurity'],
    },
    commercialUse: {
      preProduction: 'Release decision and remediation plan',
      runtime: 'Deterministic authorization and effect containment',
      postLaunch: 'Audit evidence, monitoring integration and incident replay',
    },
    truthBoundary: 'This is engineering assurance evidence, not legal compliance certification or a guarantee that the system is secure.'
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isCli) {
  const report = buildDemoGoLiveReport()
  writeFileSync(new URL('./demo-go-live-report.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Enterprise go-live: ${report.decision.decision}; blockers=${report.decision.summary.blockers}; conditions=${report.decision.summary.conditions}`)
  if (report.decision.decision !== 'GO') process.exitCode = 1
}
