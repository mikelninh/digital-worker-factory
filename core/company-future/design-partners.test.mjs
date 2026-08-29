import assert from 'node:assert/strict'
import test from 'node:test'
import { designPartners, evaluateTenantAuthority } from './design-partners.mjs'

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
