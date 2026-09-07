import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  TECHNICAL_DECISIONS,
  applyAutomaticRemediation,
  discoverCapabilityGraph,
  generateAttacks,
  runAutonomousAttackFixLoop,
} from './autonomous-security-loop.mjs'

const fixture = JSON.parse(await readFile(new URL('./examples/autonomous-loop-vulnerable-agent.json', import.meta.url), 'utf8'))

test('discovers a capability graph and generates agent-specific attacks', () => {
  const graph = discoverCapabilityGraph(fixture)
  const attacks = generateAttacks(graph)
  assert.equal(graph.summary.capabilities, 2)
  assert.equal(graph.summary.effectfulCapabilities, 1)
  assert.equal(graph.summary.multiTenant, true)
  assert.equal(attacks.length, 4)
  assert.deepEqual(new Set(attacks.map((attack) => attack.kind)), new Set([
    'untrusted_instruction_effect',
    'cross_tenant_effect',
    'protected_scope_exfiltration',
    'sensitive_egress',
  ]))
})

test('autonomously turns real executor escapes into zero-impact regression cases', async () => {
  const report = await runAutonomousAttackFixLoop(fixture)
  assert.equal(report.before.impactEscapes, 4)
  assert.equal(report.before.executorCalls, 4)
  assert.equal(report.remediation.automatic, true)
  assert.equal(report.remediation.patch.securityBoundaryRequired, true)
  assert.equal(report.remediation.patch.modelMaySelfApproveEffects, false)
  assert.equal(report.after.impactEscapes, 0)
  assert.equal(report.after.executorCalls, 0)
  assert.equal(report.release.decision, TECHNICAL_DECISIONS.GO)
  assert.ok(report.regressionCases.every((item) => item.passed && item.executorCalls === 0))
})

test('remediation is idempotent after the architecture is hardened', async () => {
  const first = await runAutonomousAttackFixLoop(fixture)
  const hardened = applyAutomaticRemediation(fixture, first.remediation)
  const second = await runAutonomousAttackFixLoop(hardened)
  assert.equal(second.before.impactEscapes, 0)
  assert.equal(second.remediation.changed, false)
  assert.deepEqual(second.remediation.patch, {})
  assert.equal(second.release.decision, TECHNICAL_DECISIONS.GO)
})

test('fails closed when no attack coverage can be generated', async () => {
  const report = await runAutonomousAttackFixLoop({
    agent: { id: 'empty-agent' },
    actions: [],
    autonomousSecurity: { securityBoundaryRequired: true, modelMaySelfApproveEffects: false, maxToolCalls: 8 },
  })
  assert.equal(report.attacks.generated, 0)
  assert.equal(report.release.decision, TECHNICAL_DECISIONS.NO_GO)
  assert.equal(report.release.reason, 'no_generated_attack_coverage')
})
