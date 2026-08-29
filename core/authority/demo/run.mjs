import { runTenEuroMission } from './mission.mjs'

const run = await runTenEuroMission()

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(run, null, 2)}\n`)
} else {
  const { outcome } = run
  console.log('Authority Mission: €10 autonomous research')
  console.log(`completed: ${outcome.completed}`)
  console.log(`spent: €${outcome.spent.value.toFixed(2)} / €10.00`)
  console.log(`remaining: €${outcome.remaining.value.toFixed(2)}`)
  console.log(`acquired sources: ${outcome.acquiredSources}`)
  console.log(`unauthorised provider calls: ${outcome.unauthorisedProviderCalls}`)
  console.log(`duplicate replay provider calls: ${outcome.replayProviderCalls}`)
  console.log(`secret leak detected: ${outcome.secretLeakDetected}`)
  console.log('')
  for (const attempt of run.attempts) {
    const reason = attempt.reasons.length ? ` — ${attempt.reasons.join(', ')}` : ''
    console.log(`${attempt.status.padEnd(20)} ${attempt.label}${reason}`)
  }
}
