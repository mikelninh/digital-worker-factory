import assert from 'node:assert/strict'
import test from 'node:test'
import { decideContinuousAssurance } from './continuous-assurance.mjs'

const base = {
  actions: [{ id: 'read_case', risk: 'read', external: false, provider: 'internal', approvalRequired: false }],
  autonomousSecurity: { securityBoundaryRequired: true, modelMaySelfApproveEffects: false, maxToolCalls: 8 },
}

test('dangerous new capability blocks release before merge', () => {
  const after = { ...base, actions: [...base.actions, { id: 'customer_delete', risk: 'consequential', external: true, provider: 'crm', approvalRequired: true }] }
  const result = decideContinuousAssurance(base, after)
  assert.equal(result.decision, 'BLOCK')
  assert.ok(result.blockers.includes('new_effectful_capability:customer_delete'))
})

test('new read capability requires targeted retest instead of pretending nothing changed', () => {
  const after = { ...base, actions: [...base.actions, { id: 'lookup_policy', risk: 'read', external: false, provider: 'internal', approvalRequired: false }] }
  const result = decideContinuousAssurance(base, after)
  assert.equal(result.decision, 'RETEST_REQUIRED')
  assert.ok(result.requiredRetests.includes('new_read_capability:lookup_policy'))
})

test('removing deterministic boundary always blocks', () => {
  const after = { ...base, autonomousSecurity: { ...base.autonomousSecurity, securityBoundaryRequired: false } }
  const result = decideContinuousAssurance(base, after)
  assert.equal(result.decision, 'BLOCK')
  assert.ok(result.blockers.includes('deterministic_security_boundary_removed'))
})
