import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { discoverRepository, discoveryToManifest } from './repository-discovery.mjs'
import { runRepositoryAutofixLoop, assessRepository } from './repo-security-orchestrator.mjs'

const fixture = new URL('./examples/repo-autofix-target/', import.meta.url).pathname

test('repository discovery maps agent, tools, tenancy and direct executor from source', () => {
  const discovery = discoverRepository(fixture)
  assert.equal(discovery.version, 'repository-agent-discovery/v1')
  assert.equal(discovery.coverage.supported, true)
  assert.equal(discovery.coverage.confidence, 'high')
  assert.ok(discovery.agents.length >= 1)
  assert.equal(discovery.controls.directModelToToolExecutor, true)
  assert.equal(discovery.controls.deterministicBoundary, false)
  assert.equal(discovery.controls.multiTenantSignals, true)
  assert.ok(discovery.tools.some((tool) => tool.name === 'read_profile' && tool.risk === 'read'))
  assert.ok(discovery.tools.some((tool) => tool.name === 'send_payment' && tool.risk === 'consequential' && tool.external === true))

  const manifest = discoveryToManifest(discovery)
  assert.equal(manifest.tenancy.mode, 'multi_tenant')
  assert.equal(manifest.autonomousSecurity.securityBoundaryRequired, false)
  assert.equal(manifest.autonomousSecurity.modelMaySelfApproveEffects, true)
})

test('repo-to-PR loop proves exploit before patch and zero executor impact after patch', async () => {
  const result = await runRepositoryAutofixLoop(fixture)
  assert.equal(result.version, 'repo-security-loop/v1')
  assert.equal(result.before.release.decision, 'TECHNICAL_NO_GO')
  assert.equal(result.before.attackLoop.before.impactEscapes, 4)
  assert.equal(result.runtimeBefore.supported, true)
  assert.equal(result.runtimeBefore.impactEscapes, 4)
  assert.equal(result.runtimeBefore.executorCalls, 4)
  assert.equal(result.patch.supported, true)
  assert.equal(result.patch.changed, true)
  assert.equal(result.runtimeAfter.supported, true)
  assert.equal(result.runtimeAfter.impactEscapes, 0)
  assert.equal(result.runtimeAfter.executorCalls, 0)
  assert.equal(result.after.discovery.controls.deterministicBoundary, true)
  assert.equal(result.after.discovery.controls.explicitApproval, true)
  assert.equal(result.after.attackLoop.before.impactEscapes, 0)
  assert.equal(result.after.attackLoop.before.executorCalls, 0)
  assert.equal(result.release.decision, 'TECHNICAL_GO')
  assert.equal(result.pr.ready, true)
  assert.equal(result.pr.files.length, 1)
  assert.equal(result.pr.files[0].path, 'agent.mjs')
})

test('unknown tool risk fails closed and never produces an automatic PR', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-unknown-'))
  try {
    fs.writeFileSync(path.join(root, 'agent.py'), `
from dataclasses import dataclass

def run_agent():
    tool_calls = []
    return tool_calls

class ToolDef: pass
x = ToolDef(name="mystery_orb", description="unknown", schema={}, handler=handler)
`)
    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_NO_GO')
    assert.equal(assessment.release.reason, 'repository_discovery_requires_manual_review')
    assert.equal(assessment.patch.supported, false)
    assert.ok(assessment.discovery.coverage.blockers.includes('unknown_tool_risk_requires_review'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('unmarked direct executor is discovered but not rewritten automatically', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-unmarked-'))
  try {
    fs.writeFileSync(path.join(root, 'agent.mjs'), `
export const tools = [{ id: 'send_payment', name: 'send_payment', risk: 'consequential', external: true }]
export async function runAgent(model) {
  const tool_calls = [model]
  const tool = { handler: async () => ({ ok: true }) }
  const args = {}
  return tool.handler(args)
}
`)
    const assessment = await assessRepository(root)
    assert.equal(assessment.discovery.controls.directModelToToolExecutor, true)
    assert.equal(assessment.patch.supported, false)
    assert.equal(assessment.patch.reason, 'executor_shape_not_proven_safe_to_rewrite')
    assert.equal(assessment.release.decision, 'TECHNICAL_NO_GO')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
