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

test('generic shared TypeScript framework is distinguished from concrete agent entrypoints', async () => {
  const { root, write } = makeRoot()
  try {
    write('api/_agent.ts', framework)
    write('api/agent/a.ts', entrypoint('buildATools', 'a'))
    write('api/agent/b.ts', entrypoint('buildBTools', 'b'))
    write('api/_a_tools.ts', registry('buildATools', ['get_case', 'draft_letter']))
    write('api/_b_tools.ts', registry('buildBTools', ['match_documents', 'prepare_summary']))

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
