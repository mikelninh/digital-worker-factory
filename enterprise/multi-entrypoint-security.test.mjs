import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { discoverRepository } from './repository-discovery.mjs'
import { buildRepositoryReachability } from './repository-reachability.mjs'
import { assessRepository } from './repo-security-orchestrator.mjs'

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-multi-agent-'))
  const write = (relative, content) => {
    const absolute = path.join(root, relative)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, content)
  }
  return { root, write }
}

const framework = `
export type ToolDef = { name: string; description: string; schema: object; handler: (input: unknown) => unknown }
async function callModel() { return { toolCalls: [] as Array<{ name: string; args: unknown }> } }
export async function runAgent(opts: { systemPrompt: string; tools: ToolDef[]; maxIterations?: number; model?: string }) {
  const maxIterations = opts.maxIterations ?? 8
  const result = await callModel()
  for (const call of result.toolCalls) {
    const tool = opts.tools.find((item) => item.name === call.name)
    if (tool) await tool.handler(call.args)
  }
  return { maxIterations }
}
`

function entrypoint(builder, agentName) {
  return `
import { runAgent } from '../_agent'
import { ${builder} } from '../_${agentName}_tools'
const SYSTEM_PROMPT = '${agentName} prepare only'
export default async function handler() {
  const tools = ${builder}()
  return runAgent({ systemPrompt: SYSTEM_PROMPT, tools, maxIterations: 8 })
}
`
}

function registry(builder, tools) {
  return `
import type { ToolDef } from './_agent'
export function ${builder}(): ToolDef[] {
  return [
${tools.map((name) => `    { name: '${name}', description: '${name}', schema: {}, handler: async () => ({ ok: true }) },`).join('\n')}
  ]
}
`
}

function writeTwoReadAgents(write) {
  write('api/_agent.ts', framework)
  write('api/agent/a.ts', entrypoint('buildATools', 'a'))
  write('api/agent/b.ts', entrypoint('buildBTools', 'b'))
  write('api/_a_tools.ts', registry('buildATools', ['get_case', 'draft_letter']))
  write('api/_b_tools.ts', registry('buildBTools', ['match_documents', 'prepare_summary']))
}

test('generic shared TypeScript framework is distinguished from concrete agent entrypoints', async () => {
  const { root, write } = makeRoot()
  try {
    writeTwoReadAgents(write)

    const discovery = discoverRepository(root)
    assert.deepEqual(discovery.agentTopology.frameworks, ['api/_agent.ts'])
    assert.deepEqual(new Set(discovery.agentTopology.entrypoints), new Set(['api/agent/a.ts', 'api/agent/b.ts']))

    const reachability = buildRepositoryReachability(root, discovery)
    assert.equal(reachability.entrypoints.length, 2)
    for (const ep of reachability.entrypoints) {
      assert.ok(ep.frameworks.includes('api/_agent.ts'))
      assert.ok(ep.reachableTools.length >= 2)
    }

    const assessment = await assessRepository(root)
    assert.equal(assessment.mode, 'repository_multi_entrypoint_scoped_assurance')
    assert.equal(assessment.release.decision, 'TECHNICAL_GO')
    assert.equal(assessment.entrypointSecurity.summary.go, 2)
    assert.equal(assessment.entrypointSecurity.summary.noGo, 0)
    assert.equal(assessment.entrypointSecurity.summary.unassignedTools, 0)
    assert.ok(assessment.entrypointSecurity.entrypoints.every((item) => item.reason === 'scoped_non_consequential_surface_resolved'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('one consequential unbounded entrypoint makes a mixed multi-agent repo fail closed', async () => {
  const { root, write } = makeRoot()
  try {
    write('api/_agent.ts', framework)
    write('api/agent/a.ts', entrypoint('buildATools', 'a'))
    write('api/agent/b.ts', entrypoint('buildBTools', 'b'))
    write('api/_a_tools.ts', registry('buildATools', ['get_case', 'draft_letter']))
    write('api/_b_tools.ts', registry('buildBTools', ['read_profile', 'send_payment']))

    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_NO_GO')
    assert.equal(assessment.entrypointSecurity.summary.go, 1)
    assert.equal(assessment.entrypointSecurity.summary.noGo, 1)
    const good = assessment.entrypointSecurity.entrypoints.find((item) => item.scope.entrypoint === 'api/agent/a.ts')
    const blocked = assessment.entrypointSecurity.entrypoints.find((item) => item.scope.entrypoint === 'api/agent/b.ts')
    assert.equal(good.decision, 'TECHNICAL_GO')
    assert.equal(blocked.decision, 'TECHNICAL_NO_GO')
    assert.equal(blocked.reason, 'reachable_consequential_effect_without_boundary')
    assert.ok(blocked.scope.reachableTools.some((tool) => tool.name === 'send_payment' && tool.risk === 'consequential'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('foreign name objects in a TypeScript registry are not promoted to ToolDefs', async () => {
  const { root, write } = makeRoot()
  try {
    writeTwoReadAgents(write)
    write('api/_a_tools.ts', `
import type { ToolDef } from './_agent'
const foreignMetadata = { name: 'not_a_tool', label: 'UI metadata only' }
export function buildATools(): ToolDef[] {
  return [
    { name: 'get_case', description: 'get case', schema: {}, handler: async () => foreignMetadata },
    { name: 'draft_letter', description: 'draft', schema: {}, handler: async () => ({ ok: true }) },
  ]
}
`)

    const discovery = discoverRepository(root)
    assert.equal(discovery.tools.some((tool) => tool.name === 'not_a_tool'), false)
    assert.equal(discovery.tools.some((tool) => tool.name === 'get_case'), true)

    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_GO')
    assert.equal(assessment.entrypointSecurity.summary.unassignedTools, 0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('type-only imports do not make deterministic runtimes model-directed, and their ToolDefs get an explicit owner', async () => {
  const { root, write } = makeRoot()
  try {
    writeTwoReadAgents(write)
    write('api/_cron_tools.ts', `
import type { ToolDef } from './_agent'
export function buildCronTools(): ToolDef[] {
  return [
    { name: 'walk_open_cases', description: 'walk cases', schema: {}, handler: async () => [] },
    { name: 'draft_reminder', description: 'draft only', schema: {}, handler: async () => '' },
  ]
}
`)
    write('api/cron/monitor.ts', `
import { buildCronTools } from '../_cron_tools'
export default async function handler() {
  return { count: buildCronTools().length }
}
`)

    const discovery = discoverRepository(root)
    const reachability = buildRepositoryReachability(root, discovery)
    const runtime = reachability.deterministicRuntimes.find((item) => item.path === 'api/cron/monitor.ts')
    assert.ok(runtime)
    assert.equal(runtime.modelDirectedToolExecution, false)
    assert.deepEqual(new Set(runtime.reachableTools.map((tool) => tool.name)), new Set(['walk_open_cases', 'draft_reminder']))

    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_GO')
    assert.equal(assessment.entrypointSecurity.summary.unassignedTools, 0)
    assert.equal(assessment.entrypointSecurity.summary.resolvedNonAgentSurfaces, 2)
    assert.ok(assessment.entrypointSecurity.resolvedNonAgentSurfaces.every((item) => item.reason === 'deterministic_non_agent_runtime_owns_surface'))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('approval-gated outside-model declared writes are resolved as authority contracts, not silently filtered', async () => {
  const { root, write } = makeRoot()
  try {
    writeTwoReadAgents(write)
    write('api/pro/capabilities-contract.ts', `
export const CAPABILITIES = [
  { id: 'case.get', risk: 'read', external: false, consequential: false, requiresHumanApproval: false, transport: { method: 'GET', path: '/api/case' } },
  { id: 'case.update', risk: 'write', external: false, consequential: true, requiresHumanApproval: true, transport: { method: 'PUT', path: '/api/case' } },
]
export const AGENT_CONTRACT = {
  authority: 'outside_model',
  defaultExecutionMode: 'approval_gated',
  capabilities: CAPABILITIES,
}
`)
    write('api/pro/capabilities.ts', `
import { AGENT_CONTRACT } from './capabilities-contract'
export default async function handler() { return AGENT_CONTRACT }
`)

    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_GO')
    assert.equal(assessment.entrypointSecurity.summary.unassignedTools, 0)
    const writeSurface = assessment.entrypointSecurity.resolvedNonAgentSurfaces.find((item) => item.name === 'case.update')
    assert.ok(writeSurface)
    assert.equal(writeSurface.reason, 'declarative_effect_capability_kept_outside_model_authority')
    assert.equal(writeSurface.guard.authority, 'outside_model')
    assert.equal(writeSurface.guard.executionMode, 'approval_gated')
    assert.equal(writeSurface.guard.requiresHumanApproval, true)
    assert.match(writeSurface.caveat, /does not prove/i)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('effectful declared capability without the approval contract still fails closed', async () => {
  const { root, write } = makeRoot()
  try {
    writeTwoReadAgents(write)
    write('api/pro/capabilities-contract.ts', `
export const CAPABILITIES = [
  { id: 'case.update', risk: 'write', external: false, consequential: true, requiresHumanApproval: false, transport: { method: 'PUT', path: '/api/case' } },
]
export const AGENT_CONTRACT = {
  authority: 'outside_model',
  defaultExecutionMode: 'approval_gated',
  capabilities: CAPABILITIES,
}
`)
    write('api/pro/capabilities.ts', `
import { AGENT_CONTRACT } from './capabilities-contract'
export default async function handler() { return AGENT_CONTRACT }
`)

    const assessment = await assessRepository(root)
    assert.equal(assessment.release.decision, 'TECHNICAL_NO_GO')
    assert.equal(assessment.entrypointSecurity.summary.unassignedTools, 1)
    assert.equal(assessment.entrypointSecurity.unassignedTools[0].reason, 'effectful_declarative_capability_missing_outside_model_approval_contract')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
