import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildDemoGoLiveReport } from './export-go-live-report.mjs'

test('published enterprise demo report is generated from current gate logic', () => {
  const committed = JSON.parse(readFileSync(new URL('./demo-go-live-report.json', import.meta.url), 'utf8'))
  assert.deepEqual(committed, buildDemoGoLiveReport())
})
