#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

import {
  buildRevenueActionQueue,
  buildRevenueLoopReport,
  executeRevenueAction,
  ingestRevenueSignals,
  upsertRevenueRecord,
} from '../core/revenue-loop.mjs'
import { requiresHumanApproval } from '../core/revenue-os.mjs'
import { loadRevenueLedger, saveRevenueLedger } from '../core/revenue-store.mjs'

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

function option(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

function parseOutcome() {
  const raw = option('--outcome')
  if (!raw) return {}
  return JSON.parse(raw)
}

function usage() {
  return `RevenueOS operator CLI

Commands:
  ingest <ledger.json> <signals.json>
  queue  <ledger.json> [--max N]
  report <ledger.json>
  act    <ledger.json> <opportunity-id> <action> [--approve-by NAME] [--outcome JSON]

Examples:
  node scripts/revenue-os.mjs ingest .revenue/ledger.json signals.json
  node scripts/revenue-os.mjs queue .revenue/ledger.json --max 5
  node scripts/revenue-os.mjs act .revenue/ledger.json opp-1 research_account
  node scripts/revenue-os.mjs act .revenue/ledger.json opp-1 external_message --approve-by Michael
`
}

async function ingestCommand(ledgerPath, signalsPath) {
  if (!ledgerPath || !signalsPath) throw new Error('ingest requires <ledger.json> <signals.json>')
  const current = await loadRevenueLedger(ledgerPath)
  const parsed = JSON.parse(await readFile(signalsPath, 'utf8'))
  const signals = Array.isArray(parsed) ? parsed : parsed.signals
  if (!Array.isArray(signals)) throw new TypeError('signals file must contain an array or {"signals": [...]}')

  const result = ingestRevenueSignals({ ledger: current.records, signals })
  await saveRevenueLedger(ledgerPath, result.ledger)

  console.log(JSON.stringify({
    ok: true,
    accepted: result.accepted.length,
    duplicatesBlocked: result.duplicates.length,
    rejected: result.rejected.map((item) => ({ id: item.signal?.id ?? null, errors: item.errors })),
    totalRecords: result.ledger.length,
  }, null, 2))
}

async function queueCommand(ledgerPath) {
  if (!ledgerPath) throw new Error('queue requires <ledger.json>')
  const ledger = await loadRevenueLedger(ledgerPath)
  const rawMax = option('--max')
  const maxActions = rawMax ? Number(rawMax) : 5
  if (!Number.isInteger(maxActions) || maxActions < 1) throw new TypeError('--max must be a positive integer')
  console.log(JSON.stringify(buildRevenueActionQueue(ledger.records, { maxActions }), null, 2))
}

async function reportCommand(ledgerPath) {
  if (!ledgerPath) throw new Error('report requires <ledger.json>')
  const ledger = await loadRevenueLedger(ledgerPath)
  console.log(JSON.stringify(buildRevenueLoopReport(ledger.records), null, 2))
}

async function actCommand(ledgerPath, id, action) {
  if (!ledgerPath || !id || !action) throw new Error('act requires <ledger.json> <opportunity-id> <action>')
  const document = await loadRevenueLedger(ledgerPath)
  const record = document.records.find((candidate) => candidate.id === id)
  if (!record) throw new Error(`Opportunity not found: ${id}`)

  const approveBy = option('--approve-by')
  const approvalRequired = requiresHumanApproval(action)
  const timestamp = new Date().toISOString()
  let working = record

  if (approvalRequired && approveBy) {
    working = {
      ...record,
      history: [
        ...(Array.isArray(record.history) ? record.history : []),
        { at: timestamp, event: 'human_approval_recorded', action, by: approveBy },
      ],
    }
  }

  const updated = executeRevenueAction(working, {
    action,
    approved: approvalRequired ? Boolean(approveBy) : false,
    outcome: parseOutcome(),
    now: timestamp,
  })

  const nextLedger = upsertRevenueRecord(document.records, updated)
  await saveRevenueLedger(ledgerPath, nextLedger, { now: timestamp })

  console.log(JSON.stringify({
    ok: !updated.blocked,
    id,
    action,
    stage: updated.stage,
    blocked: updated.blocked ?? null,
    approvalRequired,
    approvedBy: approvalRequired ? approveBy : null,
  }, null, 2))

  if (updated.blocked) process.exitCode = 2
}

async function main() {
  const [, , command, ...args] = process.argv

  if (!command || command === 'help' || command === '--help') {
    console.log(usage())
    return
  }

  if (command === 'ingest') return ingestCommand(args[0], args[1])
  if (command === 'queue') return queueCommand(args[0])
  if (command === 'report') return reportCommand(args[0])
  if (command === 'act') return actCommand(args[0], args[1], args[2])

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => fail(error.stack || error.message))
