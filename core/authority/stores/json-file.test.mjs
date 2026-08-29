import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AuthorityGateway } from '../gateway.mjs'
import { demoMetrics, demoPolicy } from '../demo/policy.mjs'
import { JsonFileIdempotencyStore, JsonLinesReceiptStore } from './json-file.mjs'

const actor = { id: 'research-7', role: 'research_agent', autonomyLevel: 3 }
const principal = { id: 'public-buildings-lab', type: 'public_body' }
const delegation = {
  id: 'delegation-restart-proof',
  delegateId: actor.id,
  principalId: principal.id,
  scopes: ['research.purchase_data'],
  purposes: ['public_building_energy_research'],
  validUntil: '2026-09-01T00:00:00.000Z',
}
const input = {
  actor,
  principal,
  delegation,
  action: {
    type: 'research.purchase_data',
    purpose: 'public_building_energy_research',
    amount: { currency: 'EUR', value: 2 },
    counterpartyApproved: true,
    idempotencyKey: 'restart-safe-purchase-1',
  },
  evidence: { claims: ['vendor_terms_checked', 'source_relevant'] },
  metrics: demoMetrics,
  budget: { currency: 'EUR', spent: 0, limit: 10 },
}

test('duplicate consequential action is suppressed after gateway restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'authority-store-'))
  const idempotencyPath = path.join(dir, 'idempotency.json')
  const receiptPath = path.join(dir, 'receipts.jsonl')
  let providerCalls = 0
  const executor = async () => { providerCalls += 1; return { charged: 2 } }

  const firstGateway = new AuthorityGateway({
    policy: demoPolicy,
    executors: { 'research.purchase_data': executor },
    idempotencyStore: new JsonFileIdempotencyStore(idempotencyPath),
    receiptStore: new JsonLinesReceiptStore(receiptPath),
    clock: () => new Date('2026-08-29T10:00:00.000Z'),
  })
  const first = await firstGateway.invoke({ ...input, traceId: 'restart-proof-1' })
  assert.equal(first.status, 'executed')
  assert.equal(providerCalls, 1)

  const restartedGateway = new AuthorityGateway({
    policy: demoPolicy,
    executors: { 'research.purchase_data': executor },
    idempotencyStore: new JsonFileIdempotencyStore(idempotencyPath),
    receiptStore: new JsonLinesReceiptStore(receiptPath),
    clock: () => new Date('2026-08-29T10:01:00.000Z'),
  })
  const replay = await restartedGateway.invoke({ ...input, traceId: 'restart-proof-2' })

  assert.equal(replay.status, 'duplicate_suppressed')
  assert.equal(replay.originalTraceId, 'restart-proof-1')
  assert.equal(providerCalls, 1)
  assert.equal(restartedGateway.receipts().length, 2)
  assert.equal(fs.statSync(idempotencyPath).mode & 0o777, 0o600)
  assert.equal(fs.statSync(receiptPath).mode & 0o777, 0o600)
})
