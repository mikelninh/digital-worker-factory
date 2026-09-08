import fs from 'node:fs'
import path from 'node:path'

export const REPOSITORY_REACHABILITY_VERSION = 'repository-reachability/v1'

const EXECUTABLE = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py'])
const IGNORE = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__', 'coverage'])
const AUTHORITY_INPUTS = new Set(['case_id','caseId','tenant_id','tenantId','org_id','orgId','organization_id','organizationId','user_id','userId','account_id','accountId','workspace_id','workspaceId','matter_id','matterId','project_id','projectId','resource_id','resourceId'])
const norm = (v) => String(v ?? '').replaceAll('\\', '/')
const uniq = (xs) => [...new Set(xs)]

function walk(root, current = root, out = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue
    if (entry.isDirectory() && IGNORE.has(entry.name)) continue
    const abs = path.join(current, entry.name)
    if (entry.isDirectory()) walk(root, abs, out)
    else if (entry.isFile() && EXECUTABLE.has(path.extname(entry.name).toLowerCase())) out.push(abs)
  }
  return out
}

function read(file) {
  try { return fs.statSync(file).size <= 250_000 ? fs.readFileSync(file, 'utf8') : '' } catch { return '' }
}

function resolveSuffix(files, suffixes) {
  const matches = uniq(suffixes.flatMap((suffix) => {
    const s = norm(suffix).replace(/^\.\//, '')
    return files.filter((file) => file === s || file.endsWith(`/${s}`))
  }))
  return matches.length === 1 ? matches[0] : null
}

function pythonImports(relative, content, files) {
  const targets = []
  const dir = path.posix.dirname(relative)
  for (const match of content.matchAll(/^\s*from\s+([.A-Za-z0-9_]+)\s+import\s+([^\n#]+)/gm)) {
    const moduleName = match[1]
    const imported = match[2].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter((x) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(x))
    if (moduleName.startsWith('.')) {
      const dots = moduleName.match(/^\.+/)?.[0]?.length ?? 1
      let base = dir
      for (let i = 1; i < dots; i += 1) base = path.posix.dirname(base)
      const tail = moduleName.slice(dots).replaceAll('.', '/')
      const raw = path.posix.normalize(path.posix.join(base, tail))
      const candidates = imported.map((name) => `${raw}/${name}.py`)
      const resolved = resolveSuffix(files, [...candidates, `${raw}.py`, `${raw}/__init__.py`])
      if (resolved) targets.push(resolved)
      continue
    }
    const base = moduleName.replaceAll('.', '/')
    for (const name of imported) {
      const child = resolveSuffix(files, [`${base}/${name}.py`])
      if (child) targets.push(child)
    }
    const moduleFile = resolveSuffix(files, [`${base}.py`, `${base}/__init__.py`])
    if (moduleFile) targets.push(moduleFile)
  }
  for (const match of content.matchAll(/^\s*import\s+([A-Za-z0-9_.]+)(?:\s+as\s+[A-Za-z0-9_]+)?/gm)) {
    const base = match[1].replaceAll('.', '/')
    const resolved = resolveSuffix(files, [`${base}.py`, `${base}/__init__.py`])
    if (resolved) targets.push(resolved)
  }
  return uniq(targets)
}

function jsImports(relative, content, files) {
  const targets = []
  const dir = path.posix.dirname(relative)
  const regexes = [/(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g, /import\s*["']([^"']+)["']/g, /require\(\s*["']([^"']+)["']\s*\)/g]
  for (const regex of regexes) for (const match of content.matchAll(regex)) {
    if (/^import\s+type\b/.test(match[0])) continue
    const spec = match[1]
    if (!spec?.startsWith('.')) continue
    const raw = norm(path.posix.normalize(path.posix.join(dir, spec)))
    const ext = path.posix.extname(raw)
    const resolved = resolveSuffix(files, ext ? [raw] : [raw,`${raw}.js`,`${raw}.mjs`,`${raw}.cjs`,`${raw}.ts`,`${raw}.tsx`,`${raw}/index.js`,`${raw}/index.mjs`,`${raw}/index.ts`])
    if (resolved) targets.push(resolved)
  }
  return uniq(targets)
}

function imports(relative, content, files) { return relative.endsWith('.py') ? pythonImports(relative, content, files) : jsImports(relative, content, files) }

function boundarySignal(content) {
  const patterns = [/deterministic security boundary/i,/security[-_ ]boundary/i,/scope violation.{0,80}fail(?:s)? closed/is,/authority.{0,100}(?:request|authenticated).{0,100}context/is,/bind_[A-Za-z0-9_]*tools\s*\(/,/AgentGateway/,/makeSecurityContext/]
  const pattern = patterns.find((p) => p.test(content))
  return pattern ? (content.match(pattern)?.[0] ?? 'deterministic_boundary') : null
}

function sinks(content) {
  const out = []
  const net = content.match(/httpx\.(?:AsyncClient|Client)|requests\.(?:get|post|put|delete|patch)|axios\.|fetch\s*\(|aiohttp\.|urllib\.request/i)
  if (net) out.push({ kind: 'network_effect', signal: net[0] })
  const proc = content.match(/subprocess\.|child_process|execFile\s*\(|spawn\s*\(|os\.system\s*\(/i)
  if (proc) out.push({ kind: 'process_effect', signal: proc[0] })
  const file = content.match(/fs\.(?:writeFile|appendFile|rm|unlink)|open\([^\n]{0,120},\s*["'][wax+]|Path\([^\n]{0,120}\)\.write_/i)
  if (file) out.push({ kind: 'filesystem_effect', signal: file[0] })
  return out
}

function authorityInputs(content) {
  const out = []
  const regexes = [/def\s+[A-Za-z0-9_]+\s*\(([\s\S]{0,900}?)\)\s*(?:->[^:]+)?:/g,/(?:export\s+)?(?:async\s+)?function\s+[A-Za-z0-9_]+\s*\(([^)]{0,600})\)/g]
  for (const regex of regexes) for (const match of content.matchAll(regex)) for (const token of match[1].split(',')) {
    const name = token.trim().replace(/^\*/, '').split(/[:=\s]/)[0]
    if (AUTHORITY_INPUTS.has(name)) out.push(name)
  }
  return uniq(out)
}

function closure(start, adjacency) {
  const seen = new Set([start]); const queue = [start]
  while (queue.length) {
    const current = queue.shift()
    for (const next of adjacency.get(current) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next) }
  }
  return [...seen]
}

function runtimeRootSignal(relative, source) {
  if (/\bexport\s+default\s+(?:async\s+)?function\s+[A-Za-z0-9_]*\s*\(/.test(source)) return 'default_export_handler'
  if (/\bexport\s+default\s+(?:async\s*)?\([^)]*\)\s*=>/.test(source)) return 'default_export_handler'
  if (/\bmodule\.exports\s*=\s*(?:async\s+)?function/.test(source)) return 'module_export_handler'
  if (relative.endsWith('.py') && /@(?:app|router)\.(?:get|post|put|patch|delete)\s*\(/.test(source)) return 'http_route_handler'
  return null
}

function modelDirectedToolExecutionSignal(source) {
  return /\brunAgent\s*\(|\brun_agent\s*\(|chat_with_tools|tool_calls|toolCalls|AgentGateway|tool\.handler\s*\(|tool_def\.handler\s*\(/i.test(source)
}

function nativeEvidence(root, entrypoints) {
  const security = path.join(root, 'security')
  if (!fs.existsSync(security)) return []
  const files = []
  const stack = [security]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(abs)
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(abs)
    }
  }
  const out = []
  for (const abs of files) {
    try {
      const value = JSON.parse(fs.readFileSync(abs, 'utf8'))
      if (!Array.isArray(value.adversarial) || !value.summary || !value.truthBoundary) continue
      const cases = Number(value.summary.adversarialCases ?? value.summary.cases ?? value.adversarial.length)
      const passed = Number(value.summary.passed ?? value.adversarial.filter((x) => x.after?.impactEscaped === false || x.impactEscaped === false).length)
      const escapes = Number(value.summary.criticalEscapesAfterBoundary ?? value.summary.criticalEscapes)
      const before = value.adversarial.some((x) => x.before?.impactEscaped === true || x.before?.networkCalls > 0 || x.before?.handlerCalls > 0 || x.before?.rawHandlerAcceptedForeignCase === true)
      const scope = String(value.scope ?? '').toLowerCase().replaceAll('_','-')
      let matched = entrypoints.filter((ep) => {
        const base = path.basename(ep.path, path.extname(ep.path)).toLowerCase().replaceAll('_','-')
        return base.split('-').filter((t) => t.length >= 4 && !['agent','service'].includes(t)).some((t) => scope.includes(t))
      }).map((ep) => ep.path)
      if (!matched.length && entrypoints.length === 1) matched = [entrypoints[0].path]
      out.push({ path:norm(path.relative(root,abs)), version:value.version ?? null, scope:value.scope ?? null, adversarialCases:cases, passed, criticalEscapesAfterBoundary:Number.isFinite(escapes)?escapes:null, exploitBeforeFix:before, matchedEntrypoints:matched, truthBoundary:value.truthBoundary })
    } catch {}
  }
  return out
}

export function buildRepositoryReachability(rootDir, { agents = [], tools = [], mcpServers = [] } = {}) {
  const root = path.resolve(rootDir)
  const absFiles = walk(root)
  const files = absFiles.map((f) => norm(path.relative(root,f)))
  const content = new Map(absFiles.map((f,i) => [files[i],read(f)]))
  const adjacency = new Map(); const moduleEdges = []; const boundaries = []; const effectSinks = []
  for (const file of files) {
    const targets = imports(file,content.get(file) ?? '',files); adjacency.set(file,targets)
    targets.forEach((target) => moduleEdges.push({from:`module:${file}`,to:`module:${target}`,relation:'imports_local_module'}))
    const b = boundarySignal(content.get(file) ?? ''); if (b) boundaries.push({path:file,signal:b})
    sinks(content.get(file) ?? '').forEach((sink) => effectSinks.push({path:file,...sink}))
  }

  const entrypoints = agents.filter((a) => a.kind === 'entrypoint')
  const frameworks = agents.filter((a) => a.kind === 'framework')
  const agentPaths = new Set(agents.map((a) => a.path))
  const evidence = nativeEvidence(root,entrypoints)
  const results = entrypoints.map((entrypoint) => {
    const modules = closure(entrypoint.path,adjacency); const moduleSet = new Set(modules)
    const reachableTools = tools.filter((tool) => moduleSet.has(tool.source))
    const reachableBoundaries = boundaries.filter((b) => moduleSet.has(b.path))
    const reachableSinks = effectSinks.filter((s) => moduleSet.has(s.path))
    const paths = reachableTools.filter((tool) => tool.risk !== 'read' || tool.external).map((tool) => {
      const source = content.get(tool.source) ?? ''
      const handler = String(tool.handler ?? '').match(/[A-Za-z_][A-Za-z0-9_]*/)?.[0] ?? tool.name
      const index = source.indexOf(`def ${handler}`)
      const window = index >= 0 ? source.slice(index,index+5000) : source
      const direct = imports(tool.source,window,files)
      const modulesForTool = uniq([tool.source,...direct.flatMap((x) => closure(x,adjacency))])
      return {tool:tool.name,source:tool.source,risk:tool.risk,external:tool.external,sinks:effectSinks.filter((sink) => modulesForTool.includes(sink.path))}
    })
    const matchedEvidence = evidence.filter((e) => e.matchedEntrypoints.includes(entrypoint.path))
    const proof = matchedEvidence.find((e) => e.adversarialCases > 0 && e.passed === e.adversarialCases && e.criticalEscapesAfterBoundary === 0)
    return {
      path:entrypoint.path,
      contextInputs:authorityInputs(content.get(entrypoint.path) ?? ''), modules,
      frameworks:frameworks.filter((f) => moduleSet.has(f.path)).map((f) => f.path),
      reachableTools:reachableTools.map((t) => t.name), reachableToolSources:uniq(reachableTools.map((t) => t.source)),
      reachableMcpServers:mcpServers.filter((m) => moduleSet.has(m.path)).map((m) => m.path),
      boundaries:reachableBoundaries, sinks:reachableSinks, effectPaths:paths, nativeEvidence:matchedEvidence,
      scopedRuntimeProof:proof?{proven:true,path:proof.path,adversarialCases:proof.adversarialCases,passed:proof.passed,criticalEscapesAfterBoundary:proof.criticalEscapesAfterBoundary,exploitBeforeFix:proof.exploitBeforeFix}:{proven:false},
    }
  })

  // Externally invokable non-agent handlers are deterministic runtime roots.
  // Their imported tool registries remain visible in assurance, but are not
  // falsely attributed to an LLM agent merely because they use ToolDef-shaped
  // helper objects.
  const deterministicRuntimes = files
    .filter((file) => !agentPaths.has(file))
    .map((file) => ({ path:file, signal:runtimeRootSignal(file, content.get(file) ?? '') }))
    .filter((item) => item.signal)
    .map((runtime) => {
      const modules = closure(runtime.path, adjacency)
      const reachableTools = tools.filter((tool) => modules.includes(tool.source))
      const modelDirectedToolExecution = modules.some((module) => modelDirectedToolExecutionSignal(content.get(module) ?? ''))
      return {
        ...runtime, modules, modelDirectedToolExecution,
        reachableTools: reachableTools.map((tool) => ({ name:tool.name, source:tool.source, risk:tool.risk, provider:tool.provider })),
      }
    })

  const toolOwnership = tools.map((tool) => ({
    name: tool.name,
    source: tool.source,
    provider: tool.provider,
    agentEntrypoints: results.filter((result) => result.modules.includes(tool.source) && result.reachableTools.includes(tool.name)).map((result) => result.path),
    deterministicRuntimes: deterministicRuntimes.filter((runtime) => runtime.modules.includes(tool.source)).map((runtime) => runtime.path),
  }))

  const reachableMcp = new Set(results.flatMap((r) => r.reachableMcpServers))
  const isolatedMcpServers = mcpServers.filter((m) => !reachableMcp.has(m.path)).map((m) => m.path)
  const graphEdges = [...moduleEdges]
  for (const result of results) {
    graphEdges.push({from:`context:${result.path}`,to:`entrypoint:${result.path}`,relation:'binds_request_authority',inputs:result.contextInputs})
    for (const tool of tools.filter((t) => result.modules.includes(t.source) && result.reachableTools.includes(t.name))) graphEdges.push({from:`module:${tool.source}`,to:`tool:${tool.source}:${tool.name}`,relation:'declares_reachable_tool'})
    for (const effect of result.effectPaths) for (const sink of effect.sinks) graphEdges.push({from:`tool:${effect.source}:${effect.tool}`,to:`sink:${sink.path}:${sink.kind}`,relation:'may_reach_effect_sink'})
  }
  for (const runtime of deterministicRuntimes) {
    for (const tool of runtime.reachableTools) graphEdges.push({from:`runtime:${runtime.path}`,to:`tool:${tool.source}:${tool.name}`,relation:'deterministic_runtime_owns_surface'})
  }

  const resolved = results.length === 1 && results[0].reachableTools.length > 0
  return {
    version:REPOSITORY_REACHABILITY_VERSION,
    resolved,
    confidence:resolved?'high':'partial',
    entrypoints:results,
    deterministicRuntimes,
    toolOwnership,
    isolatedMcpServers,
    nativeEvidence:evidence,
    graph:{nodes:[
      ...files.map((f)=>({id:`module:${f}`,kind:'module',path:f})),
      ...entrypoints.map((e)=>({id:`entrypoint:${e.path}`,kind:'agent_entrypoint',path:e.path})),
      ...deterministicRuntimes.map((r)=>({id:`runtime:${r.path}`,kind:'deterministic_runtime',path:r.path,modelDirectedToolExecution:r.modelDirectedToolExecution})),
      ...tools.map((t)=>({id:`tool:${t.source}:${t.name}`,kind:'tool',name:t.name,path:t.source,risk:t.risk,external:t.external})),
      ...effectSinks.map((s)=>({id:`sink:${s.path}:${s.kind}`,kind:s.kind,path:s.path,signal:s.signal})),
    ],edges:graphEdges},
    truthBoundary:'Reachability is deterministic static analysis over local imports, agent entrypoints, non-agent runtime roots, declared tool surfaces and effect sinks. Dynamic imports, reflection, runtime plugin registration and external configuration can create paths that are not visible statically. Deterministic-runtime ownership proves only that a non-model-directed runtime statically owns a surface; it does not certify the business correctness of that runtime or the content produced by fixed LLM drafting calls.',
  }
}
