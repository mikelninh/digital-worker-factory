import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { discoverRepository, discoveryToManifest } from './repository-discovery.mjs'
import { buildRepositoryReachability } from './repository-reachability.mjs'
import { runRepositoryAutofixLoop, assessRepository, repositoryReachabilityBlockers } from './repo-security-orchestrator.mjs'

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

  const reachability = buildRepositoryReachability(fixture, discovery)
  assert.equal(reachability.resolved, true)
  assert.equal(reachability.entrypoints.length, 1)
  assert.deepEqual(new Set(reachability.entrypoints[0].reachableTools), new Set(['read_profile', 'send_payment']))

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

test('reachability separates request-bound agent tools from an isolated MCP surface and consumes native runtime proof', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-reachability-'))
  const write = (relative, content) => {
    const absolute = path.join(root, relative)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, content)
  }
  try {
    write('backend/app/services/agent_loop.py', `
def run_agent(*, tools):
    tool_calls = []
    tool = tools[0]
    args = {}
    return tool.handler(args)
`)
    write('backend/app/services/court_prep_agent.py', `
from app.services import agent_loop
from app.services.court_prep_tools import build_tools
from app.services.court_prep_security import bind_court_prep_tools
SYSTEM_PROMPT = "court prep"

def run_court_prep(*, case_id, user_id=None):
    tools = bind_court_prep_tools(case_id=case_id, tools=build_tools(None))
    return agent_loop.run_agent(tools=tools)
`)
    write('backend/app/services/court_prep_tools.py', `
class ToolDef:
    def __init__(self, **kwargs): pass

def read_case(args): return {"ok": True}

def re_archive_urls(args):
    from app.services.evidence import archive_url_sync
    return archive_url_sync(args.get("url", ""))

def build_tools(db):
    return [
        ToolDef(name="read_case", description="read", schema={}, handler=read_case),
        ToolDef(name="re_archive_urls", description="archive external evidence", schema={}, handler=re_archive_urls),
    ]
`)
    write('backend/app/services/court_prep_security.py', `
"""Deterministic security boundary. Authority comes from authenticated request context; scope violations fail closed."""
def bind_court_prep_tools(*, case_id, tools): return tools
`)
    write('backend/app/services/evidence.py', `
import httpx
def archive_url_sync(url):
    with httpx.Client() as client:
        return client.get(url)
`)
    write('safevoice_mcp/server.py', `
class FastMCP:
    def __init__(self, name): pass
    def tool(self): return lambda fn: fn
mcp = FastMCP("safevoice")
@mcp.tool()
def classify(text): return {"text": text}
`)
    write('security/agent-boundary-report.json', JSON.stringify({
      version: 'safevoice-agent-boundary/v1',
      scope: 'Court-Prep agent reachable tool surface',
      summary: { adversarialCases: 2, passed: 2, criticalEscapesAfterBoundary: 0 },
      adversarial: [
        { id: 'cross-case', before: { rawHandlerAcceptedForeignCase: true }, after: { impactEscaped: false } },
        { id: 'archive-target', before: { networkCalls: 1, impactEscaped: true }, after: { networkCalls: 0, impactEscaped: false } },
      ],
      truthBoundary: 'Scoped runtime evidence only.',
    }))

    const raw = discoverRepository(root)
    const reachability = buildRepositoryReachability(root, raw)
    assert.equal(reachability.resolved, true)
    assert.equal(reachability.entrypoints.length, 1)
    const ep = reachability.entrypoints[0]
    assert.equal(ep.path, 'backend/app/services/court_prep_agent.py')
    assert.deepEqual(ep.contextInputs.sort(), ['case_id', 'user_id'])
    assert.deepEqual(ep.frameworks, ['backend/app/services/agent_loop.py'])
    assert.deepEqual(new Set(ep.reachableTools), new Set(['read_case', 're_archive_urls']))
    assert.deepEqual(ep.reachableMcpServers, [])
    assert.deepEqual(reachability.isolatedMcpServers, ['safevoice_mcp/server.py'])
    assert.ok(ep.boundaries.some((item) => item.path === 'backend/app/services/court_prep_security.py'))
    assert.ok(ep.effectPaths.some((item) => item.tool === 're_archive_urls' && item.sinks.some((sink) => sink.kind === 'network_effect')))
    assert.equal(ep.scopedRuntimeProof.proven, true)
    assert.equal(ep.scopedRuntimeProof.exploitBeforeFix, true)
    assert.deepEqual(repositoryReachabilityBlockers(raw, reachability), [])

    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_GO')
    assert.equal(assessment.release.reason, 'scoped_runtime_evidence_proves_reachable_effect_boundary')
    assert.equal(assessment.release.scope.entrypoint, 'backend/app/services/court_prep_agent.py')
    assert.deepEqual(assessment.release.scope.isolatedSurfaces, ['safevoice_mcp/server.py'])
    assert.equal(assessment.attackLoop.before.impactEscapes, 0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
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
