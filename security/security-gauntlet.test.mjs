import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateSecurityBoundary } from '../core/security-boundary.mjs'
import { SECURITY_GOLDEN_CASES } from './golden-cases.mjs'

test('shared Security Stack has 40 unique adversarial golden cases', () => {
  assert.equal(SECURITY_GOLDEN_CASES.length, 40)
  assert.equal(new Set(SECURITY_GOLDEN_CASES.map((item) => item.id)).size, 40)
})

test('shared Security Stack covers all OWASP Agentic Top 10 categories', () => {
  assert.equal(new Set(SECURITY_GOLDEN_CASES.map((item) => item.category)).size, 10)
})

for (const scenario of SECURITY_GOLDEN_CASES) {
  test(`${scenario.id} ${scenario.title}`, () => {
    const verdict = evaluateSecurityBoundary({
      context: scenario.input.context,
      actor: scenario.input.actor,
      capability: scenario.input.capability,
      approvedBy: scenario.input.approvedBy,
      mode: scenario.input.mode,
    })
    assert.equal(verdict.decision, scenario.expected)
  })
}

test('zero critical impact escapes', () => {
  const escapes = SECURITY_GOLDEN_CASES.filter((scenario) => {
    if (scenario.severity !== 'critical' || scenario.expected !== 'block') return false
    return evaluateSecurityBoundary({
      context: scenario.input.context,
      actor: scenario.input.actor,
      capability: scenario.input.capability,
      approvedBy: scenario.input.approvedBy,
      mode: scenario.input.mode,
    }).decision === 'allow'
  })
  assert.deepEqual(escapes, [])
})
