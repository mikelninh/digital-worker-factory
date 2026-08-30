import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const script = new URL('./revenue-os.mjs', import.meta.url).pathname

const economics = {
  closeProbability: 0.7,
  upfrontCashEur: 1900,
  founderHours: 2,
  urgency: 1,
  proofReuse: 1,
  riskPenalty: 1,
  expansionProbability: 0,
  expansionCashEur: 0,
  customerValueEur: 5000,
}

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
}

test('operator CLI persists signal, plans work and records human-approved outbound', async () => {
  const root = await mkdtemp(join(tmpdir(), 'revenue-cli-'))
  const ledger = join(root, 'ledger.json')
  const signals = join(root, 'signals.json')

  try {
    await writeFile(signals, JSON.stringify([{
      id: 'opp-cli-1',
      vertical: 'hauspilot',
      account: 'CLI Test GmbH',
      signalType: 'hiring_ops',
      hypothesis: 'Bounded admin workflow opportunity.',
      evidence: [{ source: 'synthetic://cli', fact: 'Repeated operations workload.' }],
      economics,
    }]), 'utf8')

    let result = run(['ingest', ledger, signals])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).accepted, 1)

    result = run(['queue', ledger])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout)[0].action, 'research_account')

    result = run(['act', ledger, 'opp-cli-1', 'research_account'])
    assert.equal(result.status, 0, result.stderr)
    result = run(['act', ledger, 'opp-cli-1', 'qualify_opportunity'])
    assert.equal(result.status, 0, result.stderr)
    result = run(['act', ledger, 'opp-cli-1', 'prepare_outreach'])
    assert.equal(result.status, 0, result.stderr)

    const blocked = run(['act', ledger, 'opp-cli-1', 'external_message'])
    assert.equal(blocked.status, 2)
    assert.equal(JSON.parse(blocked.stdout).blocked.reason, 'human_approval_required')

    const approved = run(['act', ledger, 'opp-cli-1', 'external_message', '--approve-by', 'operator-test'])
    assert.equal(approved.status, 0, approved.stderr)
    assert.equal(JSON.parse(approved.stdout).stage, 'contacted')

    const report = run(['report', ledger])
    assert.equal(report.status, 0, report.stderr)
    assert.equal(JSON.parse(report.stdout).portfolio.opportunities, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
