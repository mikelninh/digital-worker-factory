import assert from 'node:assert/strict'
import test from 'node:test'
import {
  company01Prospects,
  designPartners,
  evaluateTenantAuthority,
  firstCrossSectorCohort,
  prospectsBySector,
  trustedAgentPilotSpecs,
} from './design-partners.mjs'

test('design partner lab has distinct law and commercial tenants', () => {
  assert.equal(designPartners.length, 2)
  assert.notEqual(designPartners[0].tenantId, designPartners[1].tenantId)
})

test('law-firm profile allows preparation but gates external legal consequences', () => {
  const tenantId = 'tenant-law-01'
  assert.equal(evaluateTenantAuthority({ tenantId, delegationTenantId: tenantId, actionType: 'legal.research' }).decision, 'ALLOW')
  assert.equal(evaluateTenantAuthority({ tenantId, delegationTenantId: tenantId, actionType: 'client_communication.send' }).decision, 'APPROVAL')
  assert.equal(evaluateTenantAuthority({ tenantId, delegationTenantId: tenantId, actionType: 'client_funds.instruct' }).decision, 'BLOCK')
})

test('commercial profile keeps routine preparation fast while consequential actions stay governed', () => {
  const tenantId = 'tenant-commercial-01'
  assert.equal(evaluateTenantAuthority({ tenantId, delegationTenantId: tenantId, actionType: 'prospect.research' }).decision, 'ALLOW')
  assert.equal(evaluateTenantAuthority({ tenantId, delegationTenantId: tenantId, actionType: 'external_outreach.send' }).decision, 'APPROVAL')
  assert.equal(evaluateTenantAuthority({ tenantId, delegationTenantId: tenantId, actionType: 'payment_details.change' }).decision, 'BLOCK')
})

test('authority from one design partner can never be replayed in another tenant', () => {
  const result = evaluateTenantAuthority({
    tenantId: 'tenant-commercial-01',
    delegationTenantId: 'tenant-law-01',
    actionType: 'prospect.research',
  })
  assert.deepEqual(result, { decision: 'BLOCK', reason: 'tenant_delegation_mismatch' })
})

test('research cohort contains exactly five prospects in each of four sectors', () => {
  assert.equal(company01Prospects.length, 20)
  assert.equal(new Set(company01Prospects.map((p) => p.id)).size, 20)
  for (const sector of ['commercial', 'legal', 'government', 'healthcare']) {
    assert.equal(prospectsBySector(sector).length, 5)
  }
})

test('first cohort has one tailored pilot in each sector', () => {
  assert.deepEqual(Object.keys(firstCrossSectorCohort).sort(), ['commercial', 'government', 'healthcare', 'legal'])
  for (const prospectId of Object.values(firstCrossSectorCohort)) {
    assert.ok(company01Prospects.some((p) => p.id === prospectId))
    assert.ok(trustedAgentPilotSpecs[prospectId])
  }
})
