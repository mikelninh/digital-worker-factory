import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  loadRevenueLedger,
  REVENUE_LEDGER_SCHEMA,
  saveRevenueLedger,
} from './revenue-store.mjs'

test('missing ledger loads as empty v1 document', async () => {
  const root = await mkdtemp(join(tmpdir(), 'revenue-store-'))
  try {
    const result = await loadRevenueLedger(join(root, 'ledger.json'))
    assert.equal(result.schema, REVENUE_LEDGER_SCHEMA)
    assert.deepEqual(result.records, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('ledger saves atomically and round-trips records', async () => {
  const root = await mkdtemp(join(tmpdir(), 'revenue-store-'))
  const path = join(root, 'state', 'ledger.json')
  try {
    await saveRevenueLedger(path, [{ id: 'opp-1', stage: 'signal' }], {
      now: '2026-08-30T21:00:00.000Z',
    })
    const loaded = await loadRevenueLedger(path)
    assert.equal(loaded.updatedAt, '2026-08-30T21:00:00.000Z')
    assert.equal(loaded.records[0].id, 'opp-1')

    const raw = await readFile(path, 'utf8')
    assert.match(raw, /revenue-os-ledger-v1/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('corrupt or wrong-schema state fails closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'revenue-store-'))
  const path = join(root, 'ledger.json')
  try {
    await writeFile(path, '{not-json', 'utf8')
    await assert.rejects(() => loadRevenueLedger(path))

    await writeFile(path, JSON.stringify({ schema: 'future-v9', records: [] }), 'utf8')
    await assert.rejects(() => loadRevenueLedger(path), /Unsupported revenue ledger schema/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
