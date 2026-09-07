import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSecurityPosture } from './export-security-posture.mjs'

test('published security posture is generated from current executable evidence', () => {
  const committed = JSON.parse(readFileSync(new URL('./security-posture.json', import.meta.url), 'utf8'))
  assert.deepEqual(committed, buildSecurityPosture())
})
