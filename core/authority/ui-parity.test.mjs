import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAuthority } from './policy.mjs'
import { demoPolicy } from './demo/policy.mjs'
import { evaluateUiAuthority, scenarioInput, uiScenarios } from '../../site/authority-ui-engine.mjs'

const NOW = '2026-08-29T10:00:00.000Z'

for (const scenario of uiScenarios) {
  test(`control centre parity: ${scenario.id}`, () => {
    const input = scenarioInput(scenario.id)
    const ui = evaluateUiAuthority(input)
    const core = evaluateAuthority({
      policy: demoPolicy,
      actor: input.actor,
      principal: input.principal,
      delegation: input.delegation,
      action: input.action,
      evidence: input.evidence,
      metrics: input.metrics || {},
      approval: input.approval || null,
      budget: input.budget || null,
      now: NOW,
    })

    assert.equal(ui.decision, core.decision)
    assert.deepEqual(new Set(ui.reasons), new Set(core.reasons))
  })
}
