import fs from 'node:fs'
import path from 'node:path'

export const REPOSITORY_DISCOVERY_VERSION = 'repository-agent-discovery/v2'

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.json', '.toml', '.yml', '.yaml'])
const EXECUTABLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py'])
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__', 'coverage'])
const NON_RUNTIME_AGENT_PATH = /(^|\/)(tests?|alembic|migrations|scripts|evals)(\/|$)/
const MAX_FILE_BYTES = 200_000
const normalise = (value) => String(value ?? '').replaceAll('\\', '/')

function walk(root, current = root, out = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue
    const absolute = path.join(current, entry.name)
    if (entry.isDirectory()) walk(root, absolute, out)
    else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(absolute)
  }
  return out
}

function safeRead(file) {
  const stat = fs.statSync(file)
  if (stat.size > MAX_FILE_BYTES) return ''
  return fs.readFileSync(file, 'utf8')
}

function lineOf(content, needle) {
  const index = content.indexOf(needle)
  return index < 0 ? null : content.slice(0, index).split('\n').length
}

function evidence(file, root, content, needle, kind, confidence = 'high') {
  return { kind, confidence, path: normalise(path.relative(root, file)), line: lineOf(content, needle), signal: needle }
}

function inferRisk(toolName, nearby = '') {
  const name = String(toolName ?? '').toLowerCase()
  const text = String(nearby ?? '').toLowerCase()
  if (/(delete|destroy|transfer|payment|refund|submit|send|publish|deploy|execute|write|update|create)/.test(name)) {
    return { risk: 'consequential', external: /(send|submit|publish|deploy|transfer|payment|refund)/.test(name) || /https?:\/\//.test(text) }
  }
  if (/archive/.test(name)) return { risk: 'read', external: true, effectClass: 'bounded_external' }
  if (/(read|get|list|check|detect|classify|determine|generate|draft|build|search|lookup)/.test(name)) return { risk: 'read', external: false }
  return { risk: 'unknown', external: /requests\.|httpx\.|fetch\(|axios|https?:\/\//.test(text) }
}

function parsePythonToolDefs(file, root, content) {
  const tools = []
  const regex = /ToolDef\(\s*name\s*=\s*["']([^"']+)["']/gms
  for (const match of content.matchAll(regex)) {
    const start = match.index ?? 0
    const nearby = content.slice(start, Math.min(content.length, start + 1800))
    const handlerMatch = nearby.match(/handler\s*=\s*([A-Za-z0-9_().]+)/)
    const inferred = inferRisk(match[1], nearby)
    tools.push({ id: match[1], name: match[1], provider: 'python_tooldef', risk: inferred.risk, external: inferred.external, effectClass: inferred.effectClass ?? null, source: normalise(path.relative(root, file)), handler: handlerMatch?.[1] ?? null, confidence: inferred.risk === 'unknown' ? 'medium' : 'high' })
  }
  return tools
}

function parseMcpTools(file, root, content) {
  const tools = []
  const regex = /@mcp\.tool\([^)]*\)\s*(?:@[^\n]+\s*)*(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(/gms
  for (const match of content.matchAll(regex)) {
    const inferred = inferRisk(match[1], content.slice(match.index ?? 0, (match.index ?? 0) + 1200))
    tools.push({ id: `mcp:${match[1]}`, name: match[1], provider: 'mcp', risk: inferred.risk, external: inferred.external, effectClass: inferred.effectClass ?? null, source: normalise(path.relative(root, file)), handler: match[1], confidence: inferred.risk === 'unknown' ? 'medium' : 'high' })
  }
  return tools
}

function parseJsDeclaredTools(file, root, content) {
  const tools = []
  const regex = /(?:name|id)\s*:\s*["']([^"']+)["'][\s\S]{0,500}?risk\s*:\s*["'](read|write|consequential|irreversible)["']/g
  for (const match of content.matchAll(regex)) {
    const nearby = content.slice(match.index ?? 0, (match.index ?? 0) + 800)
    const externalMatch = nearby.match(/external\s*:\s*(true|false)/)
    tools.push({ id: match[1], name: match[1], provider: 'declared_capability', risk: match[2], external: externalMatch?.[1] === 'true', effectClass: null, source: normalise(path.relative(root, file)), handler: null, confidence: 'high' })
  }
  return tools
}

function resolveModulePath(relativeFiles, moduleName) {
  if (!moduleName) return null
  const suffixes = [`${moduleName.replaceAll('.', '/')}.py`, `${moduleName.replaceAll('.', '/')}/__init__.py`]
  for (const suffix of suffixes) {
    const candidates = relativeFiles.filter((file) => file === suffix || file.endsWith(`/${suffix}`))
    if (candidates.length === 1) return candidates[0]
  }
  return null
}

function parsePythonEdges(source, content, relativeFiles) {
  const edges = []
  for (const match of content.matchAll(/^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+([^#\n]+)/gm)) {
    const base = match[1]
    const names = match[2].split(',').map((part) => part.trim().split(/\s+as\s+/)[0]).filter(Boolean)
    const baseTarget = resolveModulePath(relativeFiles, base)
    if (baseTarget) edges.push({ from: source, to: baseTarget, relation: 'imports' })
    for (const name of names) {
      const child = resolveModulePath(relativeFiles, `${base}.${name}`)
      if (child) edges.push({ from: source, to: child, relation: 'imports' })
    }
  }
  for (const match of content.matchAll(/^\s*import\s+([A-Za-z0-9_.]+)/gm)) {
    const target = resolveModulePath(relativeFiles, match[1])
    if (target) edges.push({ from: source, to: target, relation: 'imports' })
  }
  return edges
}

function resolveJsImport(source, specifier, relativeFiles) {
  if (!specifier.startsWith('.')) return null
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(source), specifier))
  const candidates = [base, `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}.ts`, `${base}.tsx`, `${base}/index.js`, `${base}/index.ts`]
  return candidates.find((candidate) => relativeFiles.includes(candidate)) ?? null
}

function parseJsEdges(source, content, relativeFiles) {
  const edges = []
  const regex = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g
  for (const match of content.matchAll(regex)) {
    const target = resolveJsImport(source, match[1], relativeFiles)
    if (target) edges.push({ from: source, to: target, relation: 'imports' })
  }
  return edges
}

function reachableFrom(entrypoints, edges) {
  const adjacency = new Map()
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
    adjacency.get(edge.from).push(edge.to)
  }
  const seen = new Set(entrypoints)
  const queue = [...entrypoints]
  while (queue.length) {
    const current = queue.shift()
    for (const next of adjacency.get(current) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return seen
}

export function discoverRepository(rootDir) {
  const root = path.resolve(rootDir)
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('repository_root_required')

  const files = walk(root)
  const relativeFiles = files.map((file) => normalise(path.relative(root, file)))
  const findings = []
  const agents = []
  const mcpServers = []
  const tools = []
  const providers = new Set()
  const languages = new Set()
  const importEdges = []
  let hasDeterministicBoundary = false
  let hasExplicitApproval = false
  let hasExecutionBudget = false
  let hasAuditTrail = false
  let hasMultiTenantSignals = false
  let directModelToToolExecutor = false

  for (const file of files) {
    const content = safeRead(file)
    if (!content) continue
    const relative = normalise(path.relative(root, file))
    const ext = path.extname(file).toLowerCase()
    const executable = EXECUTABLE_EXTENSIONS.has(ext)
    if (ext === '.py') languages.add('python')
    else if (['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext)) languages.add('javascript/typescript')

    const lower = content.toLowerCase()
    if (/openai|chat_with_tools|responses\.create|chat\.completions/.test(lower)) providers.add('openai')
    if (/anthropic|claude/.test(lower)) providers.add('anthropic')
    if (/gemini|google\.generativeai/.test(lower)) providers.add('google')

    const agentSignals = [['chat_with_tools', 'llm_tool_calling'], ['run_agent(', 'agent_loop'], ['runAgent(', 'agent_loop'], ['AgentGateway', 'agent_gateway'], ['tool_calls', 'tool_call_dispatch']]
    const pathLooksAgentic = /(^|\/)(agents?|.*agent.*)\.(py|js|mjs|ts|tsx)$/.test(relative.toLowerCase()) || /agent_loop/.test(relative.toLowerCase())
    const matched = agentSignals.filter(([needle]) => content.includes(needle))
    const strong = matched.filter(([, kind]) => kind !== 'tool_call_dispatch')
    if (executable && pathLooksAgentic && !NON_RUNTIME_AGENT_PATH.test(relative) && strong.length > 0) {
      const framework = /agent[_-]?loop/.test(path.basename(relative).toLowerCase()) && !/system_prompt\s*=|SYSTEM_PROMPT\s*=/.test(content)
      agents.push({ id: relative.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, ''), kind: framework ? 'framework' : 'entrypoint', path: relative, signals: matched.map(([, kind]) => kind) })
      for (const [needle, kind] of matched) findings.push(evidence(file, root, content, needle, kind))
    }

    if (executable && /FastMCP\s*\(|@mcp\.tool\(/.test(content)) {
      mcpServers.push({ path: relative, toolDecorators: [...content.matchAll(/@mcp\.tool\(/g)].length })
      findings.push(evidence(file, root, content, content.includes('FastMCP') ? 'FastMCP' : '@mcp.tool(', 'mcp_server'))
    }

    if (executable) {
      tools.push(...parsePythonToolDefs(file, root, content), ...parseMcpTools(file, root, content), ...parseJsDeclaredTools(file, root, content))
      if (ext === '.py') importEdges.push(...parsePythonEdges(relative, content, relativeFiles))
      else importEdges.push(...parseJsEdges(relative, content, relativeFiles))
    }

    if (executable && /trustready_authorize_tool_call|SecurityBoundary|security-boundary|makeSecurityContext|AgentGateway/.test(content)) {
      hasDeterministicBoundary = true
      const needle = content.includes('trustready_authorize_tool_call') ? 'trustready_authorize_tool_call' : content.includes('AgentGateway') ? 'AgentGateway' : content.includes('makeSecurityContext') ? 'makeSecurityContext' : 'security-boundary'
      findings.push(evidence(file, root, content, needle, 'deterministic_security_boundary'))
    }
    if (executable && /approvalRequired|approval_required|approvedBy|approved_by|human[_ -]approval|requires_human_approval/i.test(content)) {
      hasExplicitApproval = true
      findings.push(evidence(file, root, content, content.match(/approvalRequired|approval_required|approvedBy|approved_by|human[_ -]approval|requires_human_approval/i)?.[0] ?? 'approval', 'explicit_approval_signal'))
    }
    if (executable && /max_iterations|maxToolCalls|max_tool_calls|max_cost_usd|tool budget/i.test(content)) {
      hasExecutionBudget = true
      findings.push(evidence(file, root, content, content.match(/max_iterations|maxToolCalls|max_tool_calls|max_cost_usd/i)?.[0] ?? 'budget', 'execution_budget'))
    }
    if (executable && /ToolCallLog|audit|traceId|trace_id|tool_trace/.test(content)) {
      hasAuditTrail = true
      findings.push(evidence(file, root, content, content.match(/ToolCallLog|traceId|trace_id|tool_trace|audit/)?.[0] ?? 'audit', 'audit_trail'))
    }
    if (/multi[_ -]tenant|tenant_id|tenantId|organization_id|org_id/.test(content)) hasMultiTenantSignals = true
    if (executable && /tool_def\.handler\s*\(|tool\.handler\s*\(|handler\s*\(args\)/.test(content) && /tool_calls|chat_with_tools|model/i.test(content)) {
      directModelToToolExecutor = true
      findings.push(evidence(file, root, content, content.match(/tool_def\.handler\s*\(|tool\.handler\s*\(|handler\s*\(args\)/)?.[0] ?? 'handler(args)', 'direct_model_to_tool_executor'))
    }
  }

  const dedupEdges = [...new Map(importEdges.map((edge) => [`${edge.from}->${edge.to}`, edge])).values()]
  const entrypoints = agents.filter((agent) => agent.kind === 'entrypoint')
  const frameworks = agents.filter((agent) => agent.kind === 'framework')
  const reachableSources = reachableFrom(entrypoints.map((agent) => agent.path), dedupEdges)
  const dedupTools = []
  const seenTools = new Set()
  for (const tool of tools) {
    const key = `${tool.source}:${tool.id}`
    if (seenTools.has(key)) continue
    seenTools.add(key)
    dedupTools.push({ ...tool, reachable: reachableSources.has(tool.source) })
  }
  const reachableTools = dedupTools.filter((tool) => tool.reachable)
  const isolatedTools = dedupTools.filter((tool) => !tool.reachable)
  const reachableMcpServers = mcpServers.filter((server) => reachableSources.has(server.path))
  const isolatedMcpServers = mcpServers.filter((server) => !reachableSources.has(server.path))
  const effectCandidates = reachableTools.filter((tool) => tool.risk !== 'read' || tool.external)
  const unknownRiskTools = reachableTools.filter((tool) => tool.risk === 'unknown')
  const supported = entrypoints.length > 0 && reachableTools.length > 0
  const confidence = !supported ? 'insufficient' : unknownRiskTools.length > 0 ? 'partial' : 'high'

  return {
    version: REPOSITORY_DISCOVERY_VERSION,
    repository: { rootName: path.basename(root), filesScanned: files.length, languages: [...languages].sort() },
    agents,
    agentTopology: { entrypoints: entrypoints.map((agent) => agent.path), frameworks: frameworks.map((agent) => agent.path) },
    mcpServers,
    providers: [...providers].sort(),
    tools: dedupTools,
    reachableTools,
    isolatedTools,
    effectCandidates,
    reachability: { edges: dedupEdges, reachableSources: [...reachableSources].sort(), reachableToolIds: reachableTools.map((tool) => tool.id), reachableMcpServers: reachableMcpServers.map((server) => server.path), isolatedMcpServers: isolatedMcpServers.map((server) => server.path) },
    controls: { deterministicBoundary: hasDeterministicBoundary, explicitApproval: hasExplicitApproval, boundedExecution: hasExecutionBudget, auditTrail: hasAuditTrail, multiTenantSignals: hasMultiTenantSignals, directModelToToolExecutor },
    coverage: {
      supported,
      confidence,
      unknownRiskTools: unknownRiskTools.map((tool) => tool.name),
      blockers: [
        ...(entrypoints.length === 0 ? ['no_agent_entrypoint_detected'] : []),
        ...(entrypoints.length > 1 ? ['multiple_agent_entrypoints_require_reachability_review'] : []),
        ...(reachableTools.length === 0 ? ['no_reachable_tool_surface_detected'] : []),
        ...(unknownRiskTools.length > 0 ? ['unknown_reachable_tool_risk_requires_review'] : []),
      ],
    },
    findings,
  }
}

export function discoveryToManifest(discovery, { agentId = null } = {}) {
  if (!discovery?.coverage?.supported) throw new Error('repository_discovery_not_supported')
  if (discovery.coverage.unknownRiskTools?.length) throw new Error('repository_discovery_unknown_tool_risk')
  const entrypoint = discovery.agents.find((agent) => agent.kind === 'entrypoint') ?? discovery.agents[0]
  const actions = (discovery.reachableTools ?? discovery.tools).map((tool) => ({
    id: tool.id.replace(/^mcp:/, 'mcp.'),
    provider: tool.provider,
    risk: tool.risk,
    external: tool.external,
    effectClass: tool.effectClass ?? null,
    approvalRequired: tool.effectClass !== 'bounded_external' && (tool.risk !== 'read' || tool.external),
    allowedRoles: ['agent'],
    sensitive: /case|evidence|credential|secret|victim|user/.test(tool.name.toLowerCase()),
  }))
  return {
    agent: { id: agentId ?? entrypoint.id, name: entrypoint.path },
    tenancy: { mode: discovery.controls.multiTenantSignals ? 'multi_tenant' : 'single_tenant' },
    actions,
    autonomousSecurity: { securityBoundaryRequired: discovery.controls.deterministicBoundary, modelMaySelfApproveEffects: discovery.controls.directModelToToolExecutor && !discovery.controls.explicitApproval, maxToolCalls: discovery.controls.boundedExecution ? 10 : 0 },
  }
}
