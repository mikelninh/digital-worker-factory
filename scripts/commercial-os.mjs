#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

import {
  buildCommercialQueue,
  createCommercialLead,
  executeCommercialAction,
  getProduct,
  summarizeCommercialPortfolio,
  upsertCommercialRecord,
} from '../core/commercial-os.mjs'
import { loadCommercialLedger, saveCommercialLedger } from '../core/commercial-store.mjs'
import { createCustomerWorkspace } from '../core/customer-workspace.mjs'

const catalog = JSON.parse(await readFile(new URL('../commercial/products.json', import.meta.url), 'utf8'))

function option(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

function jsonOption(name, fallback = {}) {
  const raw = option(name)
  return raw ? JSON.parse(raw) : fallback
}

function usage() {
  return `CommercialOS\n\nCommands:\n  lead <ledger> <product-id> <id> <account> --evidence JSON [--hypothesis TEXT]\n  queue <ledger> [--max N]\n  report <ledger>\n  act <ledger> <id> <action> [--approve-by NAME] [--outcome JSON]\n  onboard <ledger> <id> <workspace-root>\n`
}

async function leadCommand([ledgerPath, productId, id, account]) {
  if (!ledgerPath || !productId || !id || !account) throw new Error('lead requires <ledger> <product-id> <id> <account>')
  const product = getProduct(catalog, productId)
  if (!product) throw new Error(`Unknown product: ${productId}`)
  const evidence = jsonOption('--evidence', [])
  const document = await loadCommercialLedger(ledgerPath)
  if (document.records.some((record) => record.id === id)) throw new Error(`Commercial record already exists: ${id}`)
  const lead = createCommercialLead({
    id, productId, account,
    hypothesis: option('--hypothesis') || '',
    evidence,
  })
  await saveCommercialLedger(ledgerPath, [...document.records, lead])
  console.log(JSON.stringify({ ok: true, id, productId, stage: lead.stage }, null, 2))
}

async function queueCommand([ledgerPath]) {
  if (!ledgerPath) throw new Error('queue requires <ledger>')
  const document = await loadCommercialLedger(ledgerPath)
  const max = Number(option('--max') || 10)
  if (!Number.isInteger(max) || max < 1) throw new TypeError('--max must be a positive integer')
  console.log(JSON.stringify(buildCommercialQueue(document.records, { maxActions: max }), null, 2))
}

async function reportCommand([ledgerPath]) {
  if (!ledgerPath) throw new Error('report requires <ledger>')
  const document = await loadCommercialLedger(ledgerPath)
  console.log(JSON.stringify({ portfolio: summarizeCommercialPortfolio(document.records), queue: buildCommercialQueue(document.records) }, null, 2))
}

async function actCommand([ledgerPath, id, action]) {
  if (!ledgerPath || !id || !action) throw new Error('act requires <ledger> <id> <action>')
  const document = await loadCommercialLedger(ledgerPath)
  const record = document.records.find((candidate) => candidate.id === id)
  if (!record) throw new Error(`Commercial record not found: ${id}`)
  const product = getProduct(catalog, record.productId)
  if (!product) throw new Error(`Product not found: ${record.productId}`)

  const updated = executeCommercialAction(record, {
    action,
    approvedBy: option('--approve-by'),
    outcome: jsonOption('--outcome', {}),
    product,
  })
  await saveCommercialLedger(ledgerPath, upsertCommercialRecord(document.records, updated))
  console.log(JSON.stringify({
    ok: !updated.blocked,
    id,
    action,
    stage: updated.stage,
    blocked: updated.blocked ?? null,
    collectedCashEur: updated.collectedCashEur,
    recurringMonthlyEur: updated.recurringMonthlyEur,
  }, null, 2))
}

async function onboardCommand([ledgerPath, id, workspaceRoot]) {
  if (!ledgerPath || !id || !workspaceRoot) throw new Error('onboard requires <ledger> <id> <workspace-root>')
  const document = await loadCommercialLedger(ledgerPath)
  const record = document.records.find((candidate) => candidate.id === id)
  if (!record) throw new Error(`Commercial record not found: ${id}`)
  const product = getProduct(catalog, record.productId)
  const result = await createCustomerWorkspace({ root: workspaceRoot, record, product })
  const updated = executeCommercialAction(record, {
    action: 'start_onboarding',
    product,
    outcome: { workspacePath: result.workspace },
  })
  await saveCommercialLedger(ledgerPath, upsertCommercialRecord(document.records, updated))
  console.log(JSON.stringify({ ok: true, id, stage: updated.stage, workspace: result.workspace }, null, 2))
}

const [, , command, ...args] = process.argv

try {
  if (!command || command === '--help' || command === '-h') {
    console.log(usage())
  } else if (command === 'lead') await leadCommand(args)
  else if (command === 'queue') await queueCommand(args)
  else if (command === 'report') await reportCommand(args)
  else if (command === 'act') await actCommand(args)
  else if (command === 'onboard') await onboardCommand(args)
  else throw new Error(`Unknown command: ${command}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
