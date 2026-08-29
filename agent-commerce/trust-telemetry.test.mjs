import test from 'node:test'
import assert from 'node:assert/strict'

import { MemoryTrustEvidenceStore } from './trust-telemetry.mjs'

test('trust evidence store keeps metadata but no request/result payloads', () => {
  const store = new MemoryTrustEvidenceStore({ maxEvents: 100 })
  const event = store.record({
    capabilityId: 'trust.preflight.v1',
    requestId: 'req-12345678',
    result: { decision: 'allow', secret: 'must-not-be-stored' },
    latencyMs: 12.4,
    payment: { status: 'settled' },
  })
  assert.equal(event.decision, 'allow')
  assert.equal(event.requestPayloadStored, false)
  assert.equal(event.resultPayloadStored, false)
  assert.equal(JSON.stringify(event).includes('must-not-be-stored'), false)
  assert.equal(JSON.stringify(event).includes('req-12345678'), false)
})

test('outcome feedback creates labelled training rows without raw payloads', () => {
  const store = new MemoryTrustEvidenceStore({ maxEvents: 100 })
  const event = store.record({ capabilityId: 'evidence.verify.v1', requestId: 'req-feedback', result: { status: 'verified_structure' } })
  store.recordOutcome({ eventId: event.eventId, outcome: 'overridden', reasonCode: 'source_context_missing' })
  const rows = store.exportTrainingRows()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].outcome, 'overridden')
  assert.equal(rows[0].requestPayloadStored, false)
  assert.equal(rows[0].resultPayloadStored, false)
})

test('summary exposes calls, paid events and feedback coverage', () => {
  const store = new MemoryTrustEvidenceStore({ maxEvents: 100 })
  const a = store.record({ capabilityId: 'trust.preflight.v1', requestId: 'a', result: { decision: 'allow' }, payment: { status: 'settled' }, latencyMs: 10 })
  store.record({ capabilityId: 'trust.preflight.v1', requestId: 'b', result: { decision: 'block' }, latencyMs: 30 })
  store.recordOutcome({ eventId: a.eventId, outcome: 'correct' })
  const summary = store.summary()
  assert.equal(summary.events, 2)
  assert.equal(summary.paidEvents, 1)
  assert.equal(summary.outcomeLabels, 1)
  assert.equal(summary.avgLatencyMs, 20)
  assert.equal(summary.byCapability['trust.preflight.v1'].calls, 2)
})
