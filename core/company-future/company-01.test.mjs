import assert from 'node:assert/strict'
import test from 'node:test'
import { company01, company01NorthStar } from './company-01.mjs'

test('Company 01 reserves ultimate authority for consequential human decisions', () => {
  assert.ok(company01.humanReservedAuthority.includes('authority.policy.change'))
  assert.ok(company01.humanReservedAuthority.includes('authority.emergency_revoke'))
  const chief = company01.initialWorkers.find((worker) => worker.role === 'chief_of_staff')
  assert.ok(chief)
  assert.ok(chief.mayNot.includes('authority.approve'))
  assert.ok(chief.mayNot.includes('authority.expand'))
  assert.ok(chief.mayNot.includes('consequence.execute'))
})

test('Company 01 north star requires useful work, economic value and zero authority violations', () => {
  assert.equal(company01NorthStar({ usefulWork: 10, economicValueEur: 100, invariantViolations: 0 }).passed, true)
  assert.equal(company01NorthStar({ usefulWork: 10, economicValueEur: 0, invariantViolations: 0 }).passed, false)
  assert.equal(company01NorthStar({ usefulWork: 10, economicValueEur: 100, invariantViolations: 1 }).passed, false)
})

test('weekly invariant targets are explicitly zero', () => {
  assert.ok(Object.values(company01.weeklyScoreboard.invariants).every((value) => value === 0))
})
