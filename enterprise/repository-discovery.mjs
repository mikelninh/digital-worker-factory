import fs from 'node:fs'
import path from 'node:path'

export const REPOSITORY_DISCOVERY_VERSION = 'repository-agent-discovery/v1'

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.json', '.toml', '.yml', '.yaml'])
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__', 'coverage'])
const MAX_FILE_BYTES = 200_000

const uniq = (items) => [...new Set(items)]
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
  return {
    kind,
    confidence,
    path: normalise(path.relative(root, file)),
    line: lineOf(content, needle),
    signal: needle,
  }
}

function inferRisk(toolName, nearby = '') {
  const name = String(toolName ?? '').toLowerCase()
  const text = String(nearby ?? '').toLowerCase()
  if (/(delete|destroy|transfer|payment|refund|submit|send|publish|deploy|execute|write|update|create|archive)/.test(name)) {
    return { risk: 'consequential', external: /(send|submit|publish|deploy|transfer|payment|refund|archive)/.test(name) || /https?:\/\//.test(text) }
  }
  if (/(read|get|list|check|detect|classify|determine|generate|draft|build|search|lookup)/.test(name)) {
    return { risk: 'read', external: false }
  }
  return { risk: 'unknown', external: /requests\.|httpx\.|fetch\(|axios|https?:\/\//.test(text) }
}

function parsePythonToolDefs(file, root, content) {
  const tools = []
  const regex = /ToolDef\(\s*name\s*=\s*["']([^"']+)["']/gms
  for (const match of content.matchAll(regex)) {
    const start = match.index ?? 0
    const nearby = content.slice(start, Math.min(content.length, start + 1400))
    const handlerMatch = nearby.match(/handler\s*=\s*([A-Za-z0-9_().]+)/)
    const inferred = inferRisk(match[1], nearby)
    tools.push({
      id: match[1],
      name: match[1],
      provider: 'python_tooldef',
      risk: inferred.risk,
      external: inferred.external,
      source: normalise(path.relative(root, file)),
      handler: handlerMatch?.[1] ?? null,
      confidence: inferred.risk === 'unknown' ? 'medium' : 'high',
    })
  }
  return tools
}

function parseMcpTools(file, root, content) {
  const tools = []
  const regex = /@mcp\.tool\([^)]*\)\s*(?:@[^\n]+\s*)*def\s+([A-Za-z0-9_]+)\s*\(/gms
  for (const match of content.matchAll(regex)) {
    const inferred = inferRisk(match[1], content.slice(match.index ?? 0, (match.index ?? 0) + 900))
    tools.push({
      id: `mcp:${match[1]}`,
      name: match[1],
      provider: 'mcp',
      risk: inferred.risk,
      external: inferred.external,
      source: normalise(path.relative(root, file)),
      handler: match[1],
      confidence: inferred.risk === 'unknown' ? 'medium' : 'high',
    })
  }
  return tools
}

function parseJsDeclaredTools(file, root, content) {
  const tools = []
  const regex = /(?:name|id)\s*:\s*["']([^"']+)["'][\s\S]{0,500}?risk\s*:\s*["'](read|write|consequential|irreversible)["']/g
  for (const match of content.matchAll(regex)) {
    const nearby = content.slice(match.index ?? 0, (match.index ?? 0) + 800)
    const externalMatch = nearby.match(/external\s*:\s*(true|false)/)
    tools.push({
      id: match[1],
      name: match[1],
      provider: 'declared_capability',
      risk: match[2],
      external: externalMatch?.[1] === 'true',
      source: normalise(path.relative(root, file)),
      handler: null,
      confidence: 'high',
    })
  }
  return tools
}

export function discoverRepository(rootDir) {
  const root = path.resolve(rootDir)
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('repository_root_required')

  const files = walk(root)
  const findings = []
  const agents = []
  const mcpServers = []
  const tools = []
  const providers = new Set()
  const languages = new Set()

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
    if (ext === '.py') languages.add('python')
    else if (['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext)) languages.add('javascript/typescript')

    const lower = content.toLowerCase()
    if (/openai|chat_with_tools|responses\.create|chat\.completions/.test(lower)) providers.add('openai')
    if (/anthropic|claude/.test(lower)) providers.add('anthropic')
    if (/gemini|google\.generativeai/.test(lower)) providers.add('google')

    const agentSignals = [
      ['chat_with_tools', 'llm_tool_calling'],
      ['run_agent(', 'agent_loop'],
      ['AgentGateway', 'agent_gateway'],
      ['tool_calls', 'tool_call_dispatch'],
    ]
    const pathLooksAgentic = /(^|\/)(agents?|.*agent.*)\.(py|js|mjs|ts|tsx)$/.test(relative.toLowerCase()) || /agent_loop/.test(relative.toLowerCase())
    const matchedAgentSignals = agentSignals.filter(([needle]) => content.includes(needle))
    if (pathLooksAgentic && matchedAgentSignals.length > 0) {
      agents.push({
        id: relative.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, ''),
        path: relative,
        signals: matchedAgentSignals.map(([, kind]) => kind),
      })
      for (const [needle, kind] of matchedAgentSignals) findings.push(evidence(file, root, content, needle, kind))
    }

    if (/FastMCP\s*\(|@mcp\.tool\(/.test(content)) {
      mcpServers.push({ path: relative, toolDecorators: [...content.matchAll(/@mcp\.tool\(/g)].length })
      findings.push(evidence(file, root, content, 'FastMCP', 'mcp_server'))
    }

    tools.push(...parsePythonToolDefs(file, root, content))
    tools.push(...parseMcpTools(file, root, content))
    tools.push(...parseJsDeclaredTools(file, root, content))

    if (/SecurityBoundary|security-boundary|makeSecurityContext|AgentGateway/.test(content)) {
      hasDeterministicBoundary = true
      const needle = content.includes('AgentGateway') ? 'AgentGateway' : content.includes('makeSecurityContext') ? 'makeSecurityContext' : 'security-boundary'
      findings.push(evidence(file, root, content, needle, 'deterministic_security_boundary'))
    }
    if (/approvalRequired|approval_required|approvedBy|approved_by|human[_ -]approval|requires_human_approval/i.test(content)) {
      hasExplicitApproval = true
      findings.push(evidence(file, root, content, content.match(/approvalRequired|approval_required|approvedBy|approved_by|human[_ -]approval|requires_human_approval/i)?.[0] ?? 'approval', 'explicit_approval_signal'))
    }
    if (/max_iterations|maxToolCalls|max_tool_calls|max_cost_usd|tool budget/i.test(content)) {
      hasExecutionBudget = true
      const needle = content.match(/max_iterations|maxToolCalls|max_tool_calls|max_cost_usd/i)?.[0] ?? 'budget'
      findings.push(evidence(file, root, content, needle, 'execution_budget'))
    }
    if (/ToolCallLog|audit|traceId|trace_id|tool_trace/.test(content)) {
      hasAuditTrail = true
      const needle = content.match(/ToolCallLog|traceId|trace_id|tool_trace|audit/)?.[0] ?? 'audit'
      findings.push(evidence(file, root, content, needle, 'audit_trail'))
    }
    if (/multi[_ -]tenant|tenant_id|tenantId|organization_id|org_id/.test(content)) hasMultiTenantSignals = true

    if (/tool_def\.handler\s*\(|tool\.handler\s*\(|handler\s*\(args\)/.test(content) && /tool_calls|chat_with_tools|model/i.test(content)) {
      directModelToToolExecutor = true
      const needle = content.match(/tool_def\.handler\s*\(|tool\.handler\s*\(|handler\s*\(args\)/)?.[0] ?? 'handler(args)'
      findings.push(evidence(file, root, content, needle, 'direct_model_to_tool_executor'))
    }
  }

  const dedupTools = []
  const seenTools = new Set()
  for (const tool of tools) {
    const key = `${tool.source}:${tool.id}`
    if (seenTools.has(key)) continue
    seenTools.add(key)
    dedupTools.push(tool)
  }

  const effectCandidates = dedupTools.filter((tool) => tool.risk !== 'read' || tool.external)
  const unknownRiskTools = dedupTools.filter((tool) => tool.risk === 'unknown')
  const supported = agents.length > 0 && dedupTools.length > 0
  const confidence = !supported ? 'insufficient' : unknownRiskTools.length > 0 ? 'partial' : 'high'

  return {
    version: REPOSITORY_DISCOVERY_VERSION,
    repository: { rootName: path.basename(root), filesScanned: files.length, languages: [...languages].sort() },
    agents,
    mcpServers,
    providers: [...providers].sort(),
    tools: dedupTools,
    effectCandidates,
    controls: {
      deterministicBoundary: hasDeterministicBoundary,
      explicitApproval: hasExplicitApproval,
      boundedExecution: hasExecutionBudget,
      auditTrail: hasAuditTrail,
      multiTenantSignals: hasMultiTenantSignals,
      directModelToToolExecutor,
    },
    coverage: {
      supported,
      confidence,
      unknownRiskTools: unknownRiskTools.map((tool) => tool.name),
      blockers: [
        ...(agents.length === 0 ? ['no_agent_runtime_detected'] : []),
        ...(dedupTools.length === 0 ? ['no_tool_surface_detected'] : []),
        ...(unknownRiskTools.length > 0 ? ['unknown_tool_risk_requires_review'] : []),
      ],
    },
    findings,
  }
}

export function discoveryToManifest(discovery, { agentId = null } = {}) {
  if (!discovery?.coverage?.supported) throw new Error('repository_discovery_not_supported')
  if (discovery.coverage.unknownRiskTools?.length) throw new Error('repository_discovery_unknown_tool_risk')
  const actions = discovery.tools.map((tool) => ({
    id: tool.id.replace(/^mcp:/, 'mcp.'),
    provider: tool.provider,
    risk: tool.risk,
    external: tool.external,
    allowedRoles: ['agent'],
    sensitive: /case|evidence|credential|secret|victim|user/.test(tool.name.toLowerCase()),
  }))
  return {
    agent: { id: agentId ?? discovery.agents[0].id, name: discovery.agents[0].path },
    tenancy: { mode: discovery.controls.multiTenantSignals ? 'multi_tenant' : 'single_tenant' },
    actions,
    autonomousSecurity: {
      securityBoundaryRequired: discovery.controls.deterministicBoundary,
      modelMaySelfApproveEffects: discovery.controls.directModelToToolExecutor && !discovery.controls.explicitApproval,
      maxToolCalls: discovery.controls.boundedExecution ? 10 : 0,
    },
  }
}
