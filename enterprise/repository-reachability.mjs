import fs from 'node:fs'
import path from 'node:path'

export const REPOSITORY_REACHABILITY_VERSION = 'repository-reachability/v1'

const EXECUTABLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py'])
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__', 'coverage'])
const AUTHORITY_INPUTS = new Set([
  'case_id', 'caseId', 'tenant_id', 'tenantId', 'org_id', 'orgId', 'organization_id', 'organizationId',
  'user_id', 'userId', 'account_id', 'accountId', 'workspace_id', 'workspaceId', 'matter_id', 'matterId',
  'project_id', 'projectId', 'resource_id', 'resourceId',
])

const normalise = (value) => String(value ?? '').replaceAll('\\', '/')
const uniq = (items) => [...new Set(items)]

function walk(root, current = root, out = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue
    const absolute = path.join(current, entry.name)
    if (entry.isDirectory()) walk(root, absolute, out)
    else if (entry.isFile() && EXECUTABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(absolute)
  }
  return out
}

function safeRead(file) {
  try {
    const stat = fs.statSync(file)
    if (stat.size > 250_000) return ''
    return fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

function resolveBySuffix(files, suffixes) {
  const matches = []
  for (const suffix of suffixes) {
    const normalizedSuffix = normalise(suffix).replace(/^\.\//, '')
    for (const file of files) {
      if (file === normalizedSuffix || file.endsWith(`/${normalizedSuffix}`)) matches.push(file)
    }
  }
  return uniq(matches).length === 1 ? uniq(matches)[0] : null
}

function jsImportTargets(relative, content, files) {
  const targets = []
  const dir = path.posix.dirname(relative)
  const regexes = [
    /(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g,
    /import\s*["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ]
  for (const regex of regexes) {
    for (const match of content.matchAll(regex)) {
      const spec = match[1]
      if (!spec?.startsWith('.')) continue
      const raw = normalise(path.posix.normalize(path.posix.join(dir, spec)))
      const ext = path.posix.extname(raw)
      const suffixes = ext ? [raw] : [raw, `${raw}.js`, `${raw}.mjs`, `${raw}.cjs`, `${raw}.ts`, `${raw}.tsx`, `${raw}/index.js`, `${raw}/index.mjs`, `${raw}/index.ts`]
      const resolved = resolveBySuffix(files, suffixes)
      if (resolved) targets.push(resolved)
    }
  }
  return uniq(targets)
}

function pythonImportTargets(relative, content, files) {
  const targets = []
  const currentDir = path.posix.dirname(relative)

  for (const match of content.matchAll(/^\s*from\s+([.A-Za-z0-9_]+)\s+import\s+([^\n#]+)/gm)) {
    const moduleName = match[1]
    if (moduleName.startsWith('.')) {
      const dots = moduleName.match(/^\.+/)?.[0]?.length ?? 1
      const tail = moduleName.slice(dots).replaceAll('.', '/')
      let base = currentDir
      for (let i = 1; i < dots; i += 1) base = path.posix.dirname(base)
      const raw = path.posix.normalize(path.posix.join(base, tail))
      const resolved = resolveBySuffix(files, [`${raw}.py`, `${raw}/__init__.py`])
      if (resolved) targets.push(resolved)
      continue
    }
    const suffix = `${moduleName.replaceAll('.', '/')}.py`
    const initSuffix = `${moduleName.replaceAll('.', '/')}/__init__.py`
    const resolved = resolveBySuffix(files, [suffix, initSuffix])
    if (resolved) targets.push(resolved)
  }

  for (const match of content.matchAll(/^\s*import\s+([A-Za-z0-9_.]+)(?:\s+as\s+[A-Za-z0-9_]+)?/gm)) {
    const moduleName = match[1]
    const resolved = resolveBySuffix(files, [`${moduleName.replaceAll('.', '/')}.py`, `${moduleName.replaceAll('.', '/')}/__init__.py`])
    if (resolved) targets.push(resolved)
  }

  return uniq(targets)
}

function importTargets(relative, content, files) {
  return relative.endsWith('.py')
    ? pythonImportTargets(relative, content, files)
    : jsImportTargets(relative, content, files)
}

function detectBoundary(content) {
  const signals = [
    /deterministic security boundary/i,
    /security[-_ ]boundary/i,
    /scope violation.{0,80}fail(?:s)? closed/is,
    /authority.{0,80}(?:request|authenticated).{0,80}context/is,
    /bind_[A-Za-z0-9_]*tools\s*\(/,
    /AgentGateway/,
    /makeSecurityContext/,
  ]
  const hit = signals.find((regex) => regex.test(content))
  return hit ? (content.match(hit)?.[0] ?? 'deterministic_boundary') : null
}

function detectSinks(content) {
  const sinks = []
  const hasHttpLibrary = /\b(?:httpx|requests|axios|fetch|urllib|aiohttp)\b/i.test(content)
  const networkMatch = content.match(/httpx\.(?:AsyncClient|Client)|requests\.(?:get|post|put|delete|patch)|axios\.|fetch\s*\(|aiohttp\.|urllib\.request/i)
  if (hasHttpLibrary && networkMatch) sinks.push({ kind: 'network_effect', signal: networkMatch[0] })

  const processMatch = content.match(/subprocess\.|child_process|execFile\s*\(|spawn\s*\(|os\.system\s*\(/i)
  if (processMatch) sinks.push({ kind: 'process_effect', signal: processMatch[0] })

  const fileWriteMatch = content.match(/fs\.(?:writeFile|appendFile|rm|unlink)|open\([^\n]{0,120},\s*["'][wax+]|Path\([^\n]{0,120}\)\.write_/i)
  if (fileWriteMatch) sinks.push({ kind: 'filesystem_effect', signal: fileWriteMatch[0] })

  return sinks
}

function functionParams(content) {
  const params = []
  const regexes = [
    /def\s+[A-Za-z0-9_]+\s*\(([\s\S]{0,900}?)\)\s*(?:->[^:]+)?:/g,
    /(?:function\s+[A-Za-z0-9_]+|(?:export\s+)?(?:async\s+)?function\s+[A-Za-z0-9_]+)\s*\(([^)]{0,600})\)/g,
  ]
  for (const regex of regexes) {
    for (const match of content.matchAll(regex)) {
      const raw = match[1]
      for (const token of raw.split(',')) {
        const name = token.trim().replace(/^\*/, '').split(/[:=\s]/)[0]
        if (AUTHORITY_INPUTS.has(name)) params.push(name)
      }
    }
  }
  return uniq(params)
}

function transitiveModules(start, adjacency) {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const current = queue.shift()
    for (const next of adjacency.get(current) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return [...seen]
}

function loadNativeSecurityEvidence(root, entrypoints) {
  const securityDir = path.join(root, 'security')
  if (!fs.existsSync(securityDir)) return []
  const evidence = []
  const stack = [securityDir]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(absolute)
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const value = JSON.parse(fs.readFileSync(absolute, 'utf8'))
          if (!Array.isArray(value.adversarial) || !value.summary || !value.truthBoundary) continue
          const afterEscapes = Number(value.summary.criticalEscapesAfterBoundary ?? value.summary.criticalEscapes)
          const passed = Number(value.summary.passed ?? value.adversarial.filter((item) => item.after?.impactEscaped === false || item.impactEscaped === false).length)
          const cases = Number(value.summary.adversarialCases ?? value.summary.cases ?? value.adversarial.length)
          const exploitBeforeFix = value.adversarial.some((item) => item.before?.impactEscaped === true || item.before?.networkCalls > 0 || item.before?.rawHandlerAcceptedForeignCase === true)
          const scopeText = String(value.scope ?? '').toLowerCase().replaceAll('_', '-')
          const matchedEntrypoints = entrypoints.filter((entrypoint) => {
            const base = path.basename(entrypoint.path, path.extname(entrypoint.path)).toLowerCase().replaceAll('_', '-')
            const tokens = base.split('-').filter((token) => token.length >= 4 && !['agent', 'service'].includes(token))
            return tokens.some((token) => scopeText.includes(token))
          }).map((entrypoint) => entrypoint.path)
          evidence.push({
            path: normalise(path.relative(root, absolute)),
            version: value.version ?? null,
            scope: value.scope ?? null,
            adversarialCases: cases,
            passed,
            criticalEscapesAfterBoundary: Number.isFinite(afterEscapes) ? afterEscapes : null,
            exploitBeforeFix,
            matchedEntrypoints: matchedEntrypoints.length ? matchedEntrypoints : (entrypoints.length === 1 ? [entrypoints[0].path] : []),
            truthBoundary: value.truthBoundary,
          })
        } catch {
          // Not a compatible security evidence document.
        }
      }
    }
  }
  return evidence
}

export function buildRepositoryReachability(rootDir, { agents = [], tools = [], mcpServers = [] } = {}) {
  const root = path.resolve(rootDir)
  const absoluteFiles = walk(root)
  const files = absoluteFiles.map((file) => normalise(path.relative(root, file)))
  const contentByFile = new Map(absoluteFiles.map((file, index) => [files[index], safeRead(file)]))
  const adjacency = new Map()
  const moduleEdges = []
  const boundaryFiles = []
  const sinks = []

  for (const relative of files) {
    const content = contentByFile.get(relative) ?? ''
    const targets = importTargets(relative, content, files)
    adjacency.set(relative, targets)
    for (const target of targets) moduleEdges.push({ from: `module:${relative}`, to: `module:${target}`, relation: 'imports_local_module' })
    const boundarySignal = detectBoundary(content)
    if (boundarySignal) boundaryFiles.push({ path: relative, signal: boundarySignal })
    for (const sink of detectSinks(content)) sinks.push({ path: relative, ...sink })
  }

  const entrypoints = agents.filter((agent) => agent.kind === 'entrypoint')
  const frameworks = agents.filter((agent) => agent.kind === 'framework')
  const nativeEvidence = loadNativeSecurityEvidence(root, entrypoints)
  const entrypointResults = []

  for (const entrypoint of entrypoints) {
    const modules = transitiveModules(entrypoint.path, adjacency)
    const moduleSet = new Set(modules)
    const reachableTools = tools.filter((tool) => moduleSet.has(tool.source))
    const reachableMcpServers = mcpServers.filter((server) => moduleSet.has(server.path))
    const reachableFrameworks = frameworks.filter((framework) => moduleSet.has(framework.path))
    const reachableBoundaries = boundaryFiles.filter((boundary) => moduleSet.has(boundary.path))
    const reachableSinks = sinks.filter((sink) => moduleSet.has(sink.path))
    const toolEffects = reachableTools
      .filter((tool) => tool.risk !== 'read' || tool.external)
      .map((tool) => {
        const sourceContent = contentByFile.get(tool.source) ?? ''
        const handlerName = String(tool.handler ?? '').match(/[A-Za-z_][A-Za-z0-9_]*/)?.[0] ?? tool.name
        const handlerIndex = sourceContent.indexOf(`def ${handlerName}`)
        const handlerWindow = handlerIndex >= 0 ? sourceContent.slice(handlerIndex, handlerIndex + 4500) : sourceContent
        const directImports = importTargets(tool.source, handlerWindow, files)
        const effectModules = uniq([tool.source, ...directImports.flatMap((target) => transitiveModules(target, adjacency))])
        const effectSinks = sinks.filter((sink) => effectModules.includes(sink.path))
        return {
          tool: tool.name,
          source: tool.source,
          risk: tool.risk,
          external: tool.external,
          sinks: effectSinks,
        }
      })

    const contextInputs = functionParams(contentByFile.get(entrypoint.path) ?? '')
    const matchedEvidence = nativeEvidence.filter((item) => item.matchedEntrypoints.includes(entrypoint.path))
    const scopedEvidence = matchedEvidence.find((item) => item.adversarialCases > 0 && item.passed === item.adversarialCases && item.criticalEscapesAfterBoundary === 0)

    entrypointResults.push({
      path: entrypoint.path,
      contextInputs,
      modules,
      frameworks: reachableFrameworks.map((item) => item.path),
      reachableTools: reachableTools.map((tool) => tool.name),
      reachableToolSources: uniq(reachableTools.map((tool) => tool.source)),
      reachableMcpServers: reachableMcpServers.map((item) => item.path),
      boundaries: reachableBoundaries,
      sinks: reachableSinks,
      effectPaths: toolEffects,
      nativeEvidence: matchedEvidence,
      scopedRuntimeProof: scopedEvidence ? {
        proven: true,
        path: scopedEvidence.path,
        adversarialCases: scopedEvidence.adversarialCases,
        passed: scopedEvidence.passed,
        criticalEscapesAfterBoundary: scopedEvidence.criticalEscapesAfterBoundary,
        exploitBeforeFix: scopedEvidence.exploitBeforeFix,
      } : { proven: false },
    })
  }

  const reachableMcpPaths = new Set(entrypointResults.flatMap((item) => item.reachableMcpServers))
  const isolatedMcpServers = mcpServers.filter((server) => !reachableMcpPaths.has(server.path)).map((server) => server.path)
  const nodes = [
    ...files.map((file) => ({ id: `module:${file}`, kind: 'module', path: file })),
    ...entrypoints.map((entrypoint) => ({ id: `entrypoint:${entrypoint.path}`, kind: 'agent_entrypoint', path: entrypoint.path })),
    ...tools.map((tool) => ({ id: `tool:${tool.source}:${tool.name}`, kind: 'tool', name: tool.name, path: tool.source, risk: tool.risk, external: tool.external })),
    ...sinks.map((sink) => ({ id: `sink:${sink.path}:${sink.kind}`, kind: sink.kind, path: sink.path, signal: sink.signal })),
  ]
  const edges = [...moduleEdges]
  for (const result of entrypointResults) {
    edges.push({ from: `context:${result.path}`, to: `entrypoint:${result.path}`, relation: 'binds_request_authority', inputs: result.contextInputs })
    edges.push({ from: `entrypoint:${result.path}`, to: `module:${result.path}`, relation: 'executes_module' })
    for (const tool of tools.filter((tool) => result.reachableTools.includes(tool.name) && result.modules.includes(tool.source))) {
      edges.push({ from: `module:${tool.source}`, to: `tool:${tool.source}:${tool.name}`, relation: 'declares_reachable_tool' })
    }
    for (const effect of result.effectPaths) {
      for (const sink of effect.sinks) {
        edges.push({ from: `tool:${effect.source}:${effect.tool}`, to: `sink:${sink.path}:${sink.kind}`, relation: 'may_reach_effect_sink' })
      }
    }
  }

  const resolved = entrypointResults.length === 1
    && entrypointResults[0].reachableTools.length > 0
    && (mcpServers.length === 0 || isolatedMcpServers.length === mcpServers.length || entrypointResults[0].reachableMcpServers.length > 0)

  return {
    version: REPOSITORY_REACHABILITY_VERSION,
    resolved,
    confidence: resolved ? 'high' : 'partial',
    entrypoints: entrypointResults,
    isolatedMcpServers,
    nativeEvidence,
    graph: { nodes, edges },
    truthBoundary: 'Reachability is deterministic static analysis over local imports, agent entrypoints, declared tool surfaces and effect sinks. Dynamic imports, reflection, runtime plugin registration and external configuration can create paths that are not visible statically.',
  }
}
