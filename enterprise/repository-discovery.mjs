import fs from 'node:fs'
import path from 'node:path'

export const REPOSITORY_DISCOVERY_VERSION = 'repository-agent-discovery/v1'

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.json', '.toml', '.yml', '.yaml'])
const EXECUTABLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py'])
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__', 'coverage'])
const NON_RUNTIME_AGENT_PATH = /(^|\/)(tests?|alembic|migrations|scripts|evals)(\/|$)|(^|\/)[^/]*(?:_smoke|\.smoke)\.(?:py|js|mjs|ts|tsx)$/i
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
  if (/(delete|destroy|transfer|payment|refund|submit|send|publish|deploy|execute|write|update|create|archive|commit|persist)/.test(name)) {
    return {
      risk: 'consequential',
      external: /(send|submit|publish|deploy|transfer|payment|refund|archive)/.test(name) || /https?:\/\//.test(text),
    }
  }
  if (/(read|get|list|check|detect|classify|determine|generate|draft|build|search|lookup|extract|find|match|suggest|analy[sz]e|compute|summari[sz]e|prepare|resolve)/.test(name)) {
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

/**
 * TypeScript/JavaScript tool registries often return `ToolDef[]` object
 * literals without repeating risk metadata beside every tool. Discover the
 * actual declared surface and infer risk conservatively from the tool name.
 * Unknown verbs remain `unknown` and therefore fail closed upstream.
 */
function parseTsToolDefs(file, root, content) {
  if (!/(?:ToolDef(?:<[^>]+>)?\s*\[\]|build[A-Za-z0-9_]*Tools\s*\()/.test(content)) return []
  const tools = []
  const regex = /\bname\s*:\s*["']([^"']+)["']/g
  for (const match of content.matchAll(regex)) {
    const start = match.index ?? 0
    const nearby = content.slice(start, Math.min(content.length, start + 2400))
    const schemaIndex = nearby.search(/\bschema\s*:/)
    const handlerIndex = nearby.search(/\bhandler\s*:/)
    if (schemaIndex < 0 || handlerIndex < 0 || handlerIndex < schemaIndex) continue

    const directHandler = nearby.match(/handler\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/)
    const arrowHandler = nearby.match(/handler\s*:\s*\([^)]*\)\s*=>[\s\S]{0,700}?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
    const inferred = inferRisk(match[1], nearby)
    tools.push({
      id: match[1],
      name: match[1],
      provider: 'typescript_tooldef',
      risk: inferred.risk,
      external: inferred.external,
      source: normalise(path.relative(root, file)),
      handler: directHandler?.[1] ?? arrowHandler?.[1] ?? null,
      confidence: inferred.risk === 'unknown' ? 'medium' : 'high',
    })
  }
  return tools
}

function ownsConcreteToolRegistry(content) {
  return /(?:export\s+)?const\s+tools\s*(?::[^=]+)?=\s*\[/.test(content) || /ToolDef\(\s*name\s*=/.test(content)
}

function isGenericJsAgentFramework(content) {
  const definesRunAgent = /(?:export\s+)?(?:async\s+)?function\s+runAgent\s*\(/.test(content)
  const hasToolContract = /\bToolDef\b/.test(content)
  const hasDispatch = /toolCalls|tool_calls|tool\.handler\s*\(/.test(content)
  const hasModelLoop = /OpenAI|OPENAI|chat|model|maxIterations|maxCostUsd/.test(content)
  return definesRunAgent && hasToolContract && hasDispatch && hasModelLoop && !ownsConcreteToolRegistry(content)
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
    const executable = EXECUTABLE_EXTENSIONS.has(ext)
    if (ext === '.py') languages.add('python')
    else if (['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext)) languages.add('javascript/typescript')

    const lower = content.toLowerCase()
    if (/openai|chat_with_tools|responses\.create|chat\.completions/.test(lower)) providers.add('openai')
    if (/anthropic|claude/.test(lower)) providers.add('anthropic')
    if (/gemini|google\.generativeai/.test(lower)) providers.add('google')

    const agentSignals = [
      ['chat_with_tools', 'llm_tool_calling'],
      ['run_agent(', 'agent_loop'],
      ['runAgent(', 'agent_loop'],
      ['AgentGateway', 'agent_gateway'],
      ['tool_calls', 'tool_call_dispatch'],
      ['toolCalls', 'tool_call_dispatch'],
    ]
    const matchedAgentSignals = agentSignals.filter(([needle]) => content.includes(needle))
    const strongAgentSignals = matchedAgentSignals.filter(([, kind]) => kind !== 'tool_call_dispatch')
    const pathLooksAgentic =
      /(^|\/)(agents?|.*agent.*)\.(py|js|mjs|ts|tsx)$/.test(relative.toLowerCase()) ||
      /agent_loop/.test(relative.toLowerCase()) ||
      /(^|\/)agents?\//i.test(relative) ||
      (/\brunAgent\s*\(/.test(content) && /SYSTEM_PROMPT|systemPrompt/.test(content))

    if (executable && pathLooksAgentic && !NON_RUNTIME_AGENT_PATH.test(relative) && strongAgentSignals.length > 0) {
      const pythonFramework = /agent[_-]?loop/.test(path.basename(relative).toLowerCase()) && !/system_prompt\s*=|SYSTEM_PROMPT\s*=/.test(content)
      const framework = isGenericJsAgentFramework(content) || pythonFramework
      agents.push({
        id: relative.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, ''),
        kind: framework ? 'framework' : 'entrypoint',
        path: relative,
        signals: matchedAgentSignals.map(([, kind]) => kind),
      })
      for (const [needle, kind] of matchedAgentSignals) findings.push(evidence(file, root, content, needle, kind))
    }

    if (executable && /FastMCP\s*\(|@mcp\.tool\(/.test(content)) {
      mcpServers.push({ path: relative, toolDecorators: [...content.matchAll(/@mcp\.tool\(/g)].length })
      findings.push(evidence(file, root, content, 'FastMCP', 'mcp_server'))
    }

    if (executable) {
      tools.push(...parsePythonToolDefs(file, root, content))
      tools.push(...parseMcpTools(file, root, content))
      tools.push(...parseJsDeclaredTools(file, root, content))
      if (['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext)) tools.push(...parseTsToolDefs(file, root, content))
    }

    if (executable && /SecurityBoundary|security-boundary|makeSecurityContext|AgentGateway|evaluateAgentIntent/.test(content)) {
      hasDeterministicBoundary = true
      const needle = content.includes('AgentGateway')
        ? 'AgentGateway'
        : content.includes('makeSecurityContext')
          ? 'makeSecurityContext'
          : content.includes('evaluateAgentIntent')
            ? 'evaluateAgentIntent'
            : 'security-boundary'
      findings.push(evidence(file, root, content, needle, 'deterministic_security_boundary'))
    }
    if (executable && /approvalRequired|approval_required|approvedBy|approved_by|human[_ -]approval|requiresHumanApproval|requires_human_approval/i.test(content)) {
      hasExplicitApproval = true
      findings.push(evidence(file, root, content, content.match(/approvalRequired|approval_required|approvedBy|approved_by|human[_ -]approval|requiresHumanApproval|requires_human_approval/i)?.[0] ?? 'approval', 'explicit_approval_signal'))
    }
    if (executable && /max_iterations|maxIterations|maxToolCalls|max_tool_calls|max_cost_usd|maxCostUsd|tool budget/i.test(content)) {
      hasExecutionBudget = true
      const needle = content.match(/max_iterations|maxIterations|maxToolCalls|max_tool_calls|max_cost_usd|maxCostUsd/i)?.[0] ?? 'budget'
      findings.push(evidence(file, root, content, needle, 'execution_budget'))
    }
    if (executable && /ToolCallLog|tool_calls|audit|traceId|trace_id|toolTrace|tool_trace/.test(content)) {
      hasAuditTrail = true
      const needle = content.match(/ToolCallLog|tool_calls|traceId|trace_id|toolTrace|tool_trace|audit/)?.[0] ?? 'audit'
      findings.push(evidence(file, root, content, needle, 'audit_trail'))
    }
    if (/multi[_ -]tenant|tenant_id|tenantId|organization_id|org_id/.test(content)) hasMultiTenantSignals = true

    if (executable && /tool_def\.handler\s*\(|tool\.handler\s*\(|handler\s*\(args\)|tool\.handler\s*\(args/.test(content) && /tool_calls|toolCalls|chat_with_tools|model/i.test(content)) {
      directModelToToolExecutor = true
      const needle = content.match(/tool_def\.handler\s*\(|tool\.handler\s*\(|handler\s*\(args\)/)?.[0] ?? 'tool.handler('
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
  const entrypoints = agents.filter((agent) => agent.kind === 'entrypoint')
  const frameworks = agents.filter((agent) => agent.kind === 'framework')
  const supported = entrypoints.length > 0 && dedupTools.length > 0
  const confidence = !supported ? 'insufficient' : unknownRiskTools.length > 0 ? 'partial' : 'high'

  return {
    version: REPOSITORY_DISCOVERY_VERSION,
    repository: { rootName: path.basename(root), filesScanned: files.length, languages: [...languages].sort() },
    agents,
    agentTopology: { entrypoints: entrypoints.map((agent) => agent.path), frameworks: frameworks.map((agent) => agent.path) },
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
        ...(entrypoints.length === 0 ? ['no_agent_entrypoint_detected'] : []),
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
  const entrypoint = discovery.agents.find((agent) => agent.kind === 'entrypoint') ?? discovery.agents[0]
  const actions = discovery.tools.map((tool) => ({
    id: tool.id.replace(/^mcp:/, 'mcp.'),
    provider: tool.provider,
    risk: tool.risk,
    external: tool.external,
    allowedRoles: ['agent'],
    sensitive: /case|evidence|credential|secret|victim|user|mandant|document/.test(tool.name.toLowerCase()),
  }))
  return {
    agent: { id: agentId ?? entrypoint.id, name: entrypoint.path },
    tenancy: { mode: discovery.controls.multiTenantSignals ? 'multi_tenant' : 'single_tenant' },
    actions,
    autonomousSecurity: {
      securityBoundaryRequired: discovery.controls.deterministicBoundary,
      modelMaySelfApproveEffects: discovery.controls.directModelToToolExecutor && !discovery.controls.explicitApproval,
      maxToolCalls: discovery.controls.boundedExecution ? 10 : 0,
    },
  }
}
