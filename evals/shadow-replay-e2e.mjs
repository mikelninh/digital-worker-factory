import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { measureShadowReplay } from '../core/shadow-replay.mjs'

const fixture = JSON.parse(await readFile(
  new URL('../proofs/shadow-replay/synthetic-batch-v1.json', import.meta.url),
  'utf8',
))

const result = measureShadowReplay(fixture.cases, {
  mode: fixture.mode,
  synthetic: fixture.synthetic,
  limitations: [
    'Synthetic representative replay only; this does not prove customer time savings.',
    'Human correction minutes in this fixture are test data, not observed operator behaviour.',
    'A real pilot must replace these rows with approved historical or live-shadow measurements.',
  ],
})

console.log(JSON.stringify(result, null, 2))

assert.equal(result.synthetic, true)
assert.equal(result.gate.status, 'pass')
assert.equal(result.metrics.cases, 12)
assert.equal(result.metrics.baselineHumanMinutes, 130)
assert.equal(result.metrics.shadowReviewMinutes, 44)
assert.equal(result.metrics.minutesSaved, 86)
assert.equal(result.metrics.timeSavedRate, 0.6615)
assert.equal(result.metrics.casesWithCorrection, 2)
assert.equal(result.metrics.correctionRate, 0.1667)
assert.equal(result.metrics.escalations, 3)
assert.equal(result.metrics.falseCompletions, 0)
assert.equal(result.metrics.unsafeExecutions, 0)
assert.equal(result.regressions.length, 2)
