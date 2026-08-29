import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assertOpenCapability,
  buildOpenCapabilitiesCatalog,
  OPEN_CAPABILITIES,
  OPEN_CAPABILITIES_SCHEMA,
} from './open-capabilities.mjs'

test('catalog has a stable schema and a meaningful first capability set', () => {
  const catalog = buildOpenCapabilitiesCatalog({ generatedAt: '2026-08-28T00:00:00.000Z' })
  assert.equal(catalog.schema, OPEN_CAPABILITIES_SCHEMA)
  assert.equal(catalog.generatedAt, '2026-08-28T00:00:00.000Z')
  assert.ok(catalog.capabilities.length >= 10)
  assert.equal(catalog.counts.live + catalog.counts.adapter_ready + catalog.counts.pilot, catalog.capabilities.length)
})

test('every catalog capability passes the trust/readiness contract', () => {
  for (const capability of OPEN_CAPABILITIES) {
    assert.equal(assertOpenCapability(capability), true)
    assert.ok(capability.sourceRepo.startsWith('https://github.com/'))
    assert.ok(capability.deployment.length > 0)
    assert.ok(capability.commercial.models.length > 0)
  }
})

test('a capability cannot be called live without a public endpoint', () => {
  const base = { ...OPEN_CAPABILITIES[0], readiness: 'live', endpoint: null }
  assert.throws(() => assertOpenCapability(base), /live_capability_requires_endpoint/)
})

test('a consequential capability cannot remove human approval', () => {
  const clinical = OPEN_CAPABILITIES.find((capability) => capability.id === 'careos.review.v1')
  assert.ok(clinical)
  assert.throws(
    () => assertOpenCapability({ ...clinical, authority: { ...clinical.authority, humanApprovalRequired: false } }),
    /consequential_capability_requires_human_approval/,
  )
})

test('readiness is truthful: currently no capability is labelled live before public hosting', () => {
  assert.equal(OPEN_CAPABILITIES.some((capability) => capability.readiness === 'live'), false)
  const triage = OPEN_CAPABILITIES.find((capability) => capability.id === 'hauspilot.triage.v1')
  assert.equal(triage.readiness, 'adapter_ready')
  assert.equal(triage.proof.status, 'base-sepolia-x402-settlement-proven')
})
