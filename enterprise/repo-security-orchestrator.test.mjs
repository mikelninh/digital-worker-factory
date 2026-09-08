import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { discoverRepository, discoveryToManifest } from './repository-discovery.mjs'
import { runRepositoryAutofixLoop, assessRepository } from './repo-security-orchestrator.mjs'

const jsFixture = new URL('./examples/repo-autofix-target/', import.meta.url).pathname
const pyFixture = new URL('./examples/repo-python-autofix-target/', import.meta.url).pathname

test('repository discovery maps only reachable tools into the agent manifest', () => {
  const discovery = discoverRepository(jsFixture)
  assert.equal(discovery.version, 'repository-agent-discovery/v2')
  assert.equal(discovery.coverage.supported, true)
  assert.equal(discovery.coverage.confidence, 'high')
  assert.equal(discovery.controls.directModelToToolExecutor, true)
  assert.equal(discovery.controls.deterministicBoundary, false)
  assert.equal(discovery.controls.multiTenantSignals, true)
  assert.ok(discovery.reachableTools.some((tool) => tool.name === 'read_profile' && tool.risk === 'read'))
  assert.ok(discovery.reachableTools.some((tool) => tool.name === 'send_payment' && tool.risk === 'consequential' && tool.external === true))
  const manifest = discoveryToManifest(discovery)
  assert.equal(manifest.actions.length, discovery.reachableTools.length)
  assert.equal(manifest.tenancy.mode, 'multi_tenant')
})

test('JS repo-to-PR loop proves exploit before patch and zero executor impact after patch', async () => {
  const result = await runRepositoryAutofixLoop(jsFixture)
  assert.equal(result.version, 'repo-security-loop/v2')
  assert.equal(result.before.release.decision, 'TECHNICAL_NO_GO')
  assert.ok(result.before.attackLoop.before.impactEscapes >= 4)
  assert.ok(result.before.attackLoop.attacks.kinds.includes('approval_bypass'))
  assert.ok(result.before.attackLoop.attacks.kinds.includes('hostile_tool_result'))
  assert.equal(result.runtimeBefore.supported, true)
  assert.equal(result.runtimeBefore.impactEscapes, 4)
  assert.equal(result.runtimeAfter.impactEscapes, 0)
  assert.equal(result.runtimeAfter.executorCalls, 0)
  assert.equal(result.after.discovery.controls.deterministicBoundary, true)
  assert.equal(result.after.attackLoop.before.impactEscapes, 0)
  assert.equal(result.release.decision, 'TECHNICAL_GO')
  assert.equal(result.pr.ready, true)
  assert.equal(result.pr.files[0].path, 'agent.mjs')
})

test('Python repo-to-PR loop proves real Python executor containment after generated patch', async () => {
  const result = await runRepositoryAutofixLoop(pyFixture)
  assert.equal(result.before.discovery.repository.languages.includes('python'), true)
  assert.equal(result.patch.reason, 'insert_python_deterministic_boundary_before_model_selected_handler')
  assert.equal(result.runtimeBefore.supported, true)
  assert.equal(result.runtimeBefore.reason, 'python_runtime_contract_exercised')
  assert.equal(result.runtimeBefore.impactEscapes, 4)
  assert.equal(result.runtimeBefore.executorCalls, 4)
  assert.equal(result.runtimeAfter.impactEscapes, 0)
  assert.equal(result.runtimeAfter.executorCalls, 0)
  assert.equal(result.after.discovery.controls.deterministicBoundary, true)
  assert.equal(result.release.decision, 'TECHNICAL_GO')
  assert.equal(result.pr.ready, true)
  assert.equal(result.pr.files[0].path, 'agent.py')
})

test('import reachability keeps an unrelated MCP surface isolated', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-reachability-'))
  try {
    fs.mkdirSync(path.join(root, 'app'), { recursive: true })
    fs.writeFileSync(path.join(root, 'app', 'agent.py'), `from app import tools\n\ndef run_agent():\n    tool_calls=[]\n    return tool_calls\n`)
    fs.writeFileSync(path.join(root, 'app', 'tools.py'), `class ToolDef: pass\nx=ToolDef(name="read_profile", description="read", schema={}, handler=handler)\n`)
    fs.writeFileSync(path.join(root, 'mcp_server.py'), `mcp = FastMCP("isolated")\n@mcp.tool()\ndef send_payment(): pass\n`)
    const discovery = discoverRepository(root)
    assert.ok(discovery.reachableTools.some((tool) => tool.name === 'read_profile'))
    assert.ok(discovery.isolatedTools.some((tool) => tool.name === 'send_payment'))
    assert.equal(discovery.reachability.reachableMcpServers.length, 0)
    assert.equal(discovery.reachability.isolatedMcpServers.length, 1)
    const manifest = discoveryToManifest(discovery)
    assert.equal(manifest.actions.some((action) => action.id.includes('send_payment')), false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('unknown reachable tool risk fails closed and never produces an automatic PR', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-unknown-'))
  try {
    fs.writeFileSync(path.join(root, 'agent.py'), `\nfrom dataclasses import dataclass\n\ndef run_agent():\n    tool_calls = []\n    return tool_calls\n\nclass ToolDef: pass\nx = ToolDef(name="mystery_orb", description="unknown", schema={}, handler=handler)\n`)
    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_NO_GO')
    assert.equal(assessment.patch.supported, false)
    assert.ok(assessment.discovery.coverage.blockers.includes('unknown_reachable_tool_risk_requires_review'))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('unmarked JS direct executor is discovered but not rewritten automatically', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-unmarked-'))
  try {
    fs.writeFileSync(path.join(root, 'agent.mjs'), `\nexport const tools = [{ id: 'send_payment', name: 'send_payment', risk: 'consequential', external: true }]\nexport async function runAgent(model) {\n  const tool_calls = [model]\n  const tool = { handler: async () => ({ ok: true }) }\n  const args = {}\n  return tool.handler(args)\n}\n`)
    const assessment = await assessRepository(root)
    assert.equal(assessment.discovery.controls.directModelToToolExecutor, true)
    assert.equal(assessment.patch.supported, false)
    assert.equal(assessment.patch.reason, 'executor_shape_not_proven_safe_to_rewrite')
    assert.equal(assessment.release.decision, 'TECHNICAL_NO_GO')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
