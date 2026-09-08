import fs from 'node:fs'
import path from 'node:path'

export const OPERATOR_SECURITY_VERSION = 'bounded-operator-security/v1'
export const OPERATOR_DECISIONS = Object.freeze({ GO: 'TECHNICAL_GO', NO_GO: 'TECHNICAL_NO_GO' })

const EXECUTABLE_EXTENSIONS = new Set(['.py'])
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__', 'coverage', 'tests', 'test', 'examples'])
const SENSITIVE_FLAG = /^(?:execute|allow[-_]exec(?:ution)?|apply|publish(?:[-_].*)?|submit(?:[-_].*)?|write|commit|deploy|release|send|claim|spend)$/i
const HTTP_WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const norm = (value) => String(value ?? '').replaceAll('\\', '/')

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

function read(file) {
  try { return fs.statSync(file).size <= 300_000 ? fs.readFileSync(file, 'utf8') : '' } catch { return '' }
}

function indentation(line) {
  return line.match(/^\s*/)?.[0].length ?? 0
}

function pythonFunctions(relative, source) {
  const lines = source.split('\n')
  const functions = []
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(\s*)def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)$/)
    if (!match) continue
    const indent = match[1].length
    const name = match[2]
    let end = lines.length
    for (let j = i + 1; j < lines.length; j += 1) {
      const trimmed = lines[j].trim()
      if (!trimmed) continue
      if (indentation(lines[j]) <= indent && /^(?:async\s+)?def\s+|^class\s+/.test(lines[j].trimStart())) { end = j; break }
      if (indentation(lines[j]) < indent) { end = j; break }
    }
    const body = lines.slice(i, end).join('\n')
    functions.push({ file: relative, name, body, startLine: i + 1 })
  }
  return functions
}

function mainGuard(source) {
  return /if\s+__name__\s*==\s*["']__main__["']\s*:/.test(source)
}

function cliSignal(source) {
  return /argparse\.ArgumentParser\s*\(|click\.(?:command|group)\s*\(|typer\.Typer\s*\(/.test(source)
}

function parseSensitiveFlags(relative, source) {
  if (!mainGuard(source) || !cliSignal(source)) return []
  const out = []
  // Do not let one add_argument() match borrow action='store_true' from a
  // later argument declaration. This is deliberately object/call scoped in
  // the same spirit as the TypeScript ToolDef parser.
  const regex = /add_argument\(\s*["']--([^"']+)["'](?:(?!\badd_argument\s*\()[\s\S]){0,500}?\baction\s*=\s*["']store_true["']/g
  for (const match of source.matchAll(regex)) {
    const flag = match[1]
    if (!SENSITIVE_FLAG.test(flag)) continue
    out.push({
      source: relative,
      flag: `--${flag}`,
      attr: flag.replaceAll('-', '_'),
      line: source.slice(0, match.index ?? 0).split('\n').length,
    })
  }
  return out
}

function getFunction(index, name) {
  const matches = index.get(name) ?? []
  return matches.length === 1 ? matches[0] : null
}

function calledFunctions(body, functionIndex) {
  const names = []
  for (const name of functionIndex.keys()) {
    if (new RegExp(`\\b${name}\\s*\\(`).test(body)) names.push(name)
  }
  return names
}

function functionClosure(startNames, functionIndex) {
  const seen = new Set()
  const queue = [...startNames]
  const out = []
  while (queue.length) {
    const name = queue.shift()
    if (seen.has(name)) continue
    seen.add(name)
    const fn = getFunction(functionIndex, name)
    if (!fn) continue
    out.push(fn)
    for (const called of calledFunctions(fn.body, functionIndex)) if (!seen.has(called)) queue.push(called)
  }
  return out
}

function mainFunction(functions, source) {
  const own = functions.find((fn) => fn.name === 'main')
  if (own) return own
  const guardCall = source.match(/if\s+__name__\s*==\s*["']__main__["']\s*:[\s\S]{0,240}?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
  return guardCall ? functions.find((fn) => fn.name === guardCall[1]) ?? null : null
}

function actionGate(mainBody, flag) {
  const attr = flag.attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const hard = new RegExp(`if\\s+not\\s+args\\.${attr}\\s*:[\\s\\S]{0,260}?\\breturn\\b`, 'm').test(mainBody)
  const positive = new RegExp(`if\\s+args\\.${attr}\\s*:`, 'm').test(mainBody)
  const propagated = new RegExp(`\\b[A-Za-z_][A-Za-z0-9_]*\\s*=\\s*args\\.${attr}\\b`).test(mainBody)
  return { hardFailClosed: hard, positiveBranch: positive, propagated }
}

function actionStartFunctions(mainBody, flag, functionIndex) {
  const attr = flag.attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const starts = new Set()

  // Positive branch: collect calls in the branch body until the next line at
  // the same/lower indentation. This is the strongest mapping for one-shot
  // effects such as `if args.publish: publish(...)`.
  const lines = mainBody.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    if (!new RegExp(`^\\s*if\\s+args\\.${attr}\\s*:`).test(lines[i])) continue
    const baseIndent = indentation(lines[i])
    const block = []
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j].trim() && indentation(lines[j]) <= baseIndent) break
      block.push(lines[j])
    }
    for (const name of calledFunctions(block.join('\n'), functionIndex)) starts.add(name)
  }

  // Fail-closed gate: once the non-enabled path returns, calls after the gate
  // are within the enabled execution region.
  const hardMatch = mainBody.match(new RegExp(`if\\s+not\\s+args\\.${attr}\\s*:[\\s\\S]{0,260}?\\breturn\\b`))
  if (hardMatch?.index != null) {
    const after = mainBody.slice(hardMatch.index + hardMatch[0].length)
    for (const name of calledFunctions(after, functionIndex)) starts.add(name)
  }

  // Propagated boolean authority, e.g. verify(... allow_exec=args.allow_exec).
  // The call matcher cannot span a prior function header or a previous call's
  // closing parenthesis; otherwise duplicate `main` functions can erase the
  // real authority path from the unique-function index.
  const propRegex = new RegExp(`\\b([A-Za-z_][A-Za-z0-9_]*)\\s*\\(([^)]*?args\\.${attr}[^)]*)\\)`, 'g')
  for (const match of mainBody.matchAll(propRegex)) if (functionIndex.has(match[1])) starts.add(match[1])

  return [...starts]
}

function effectCalls(fn) {
  const out = []
  const body = fn.body

  const requestJson = /\brequest_json\s*\(\s*[^,\n]+\s*,\s*["'](POST|PUT|PATCH|DELETE)["']\s*,\s*([^,\n\)]+)/gi
  for (const match of body.matchAll(requestJson)) {
    const method = match[1].toUpperCase()
    if (!HTTP_WRITE.has(method)) continue
    const target = String(match[2] ?? '').trim()
    out.push({ kind: 'network_write', method, target, dynamicTarget: /f["']|\{|\[|\.format\s*\(/.test(target), function: fn.name, file: fn.file, offset: match.index ?? 0 })
  }

  const directHttp = /\b(?:requests|httpx)\.(post|put|patch|delete)\s*\(\s*([^,\n\)]+)/gi
  for (const match of body.matchAll(directHttp)) {
    const target = String(match[2] ?? '').trim()
    out.push({ kind: 'network_write', method: match[1].toUpperCase(), target, dynamicTarget: /f["']|\{|\[|\.format\s*\(/.test(target), function: fn.name, file: fn.file, offset: match.index ?? 0 })
  }

  const proc = /\b(?:subprocess\.(?:run|Popen|call|check_call|check_output)|os\.system)\s*\(/g
  for (const match of body.matchAll(proc)) out.push({ kind: 'process_execution', method: null, target: match[0], dynamicTarget: true, function: fn.name, file: fn.file, offset: match.index ?? 0 })

  return out
}

function exactHumanConfirmation(fn, effectOffset) {
  const before = fn.body.slice(0, effectOffset)
  const inputs = [...before.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*input\s*\(/g)]
  for (const inputMatch of inputs) {
    const variable = inputMatch[1]
    const tail = before.slice(inputMatch.index ?? 0)
    const comparison = new RegExp(`if\\s+${variable}\\s*(?:!=|not\\s+in)\\s*[^:]+:[\\s\\S]{0,260}?\\breturn\\b`).test(tail)
    if (comparison) return { proven: true, variable, kind: 'exact_or_membership_confirmation_before_effect' }
  }
  return { proven: false }
}

function parameterFailClosed(fn, attr, effectOffset) {
  const before = fn.body.slice(0, effectOffset)
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`if\\s+not\\s+${escaped}\\s*:[\\s\\S]{0,320}?\\breturn\\b`).test(before)
}

function actionAssessment(action, functionIndex) {
  const reachableFunctions = functionClosure(action.startFunctions, functionIndex)
  const effects = reachableFunctions.flatMap(effectCalls)
  const gateProven = action.gate.hardFailClosed || action.gate.positiveBranch || action.gate.propagated
  const evaluatedEffects = effects.map((effect) => {
    const fn = getFunction(functionIndex, effect.function)
    const human = fn ? exactHumanConfirmation(fn, effect.offset) : { proven: false }
    const propagatedFailClosed = fn ? parameterFailClosed(fn, action.attr, effect.offset) : false
    const effectGuarded = effect.kind === 'network_write'
      ? (effect.dynamicTarget ? gateProven && human.proven : gateProven)
      : effect.kind === 'process_execution'
        ? gateProven && (action.gate.hardFailClosed || propagatedFailClosed)
        : false
    return { ...effect, humanConfirmation: human, propagatedFailClosed, guarded: effectGuarded }
  })

  let decision = OPERATOR_DECISIONS.GO
  let reason = effects.length ? 'bounded_consequential_effects_guarded' : 'bounded_action_has_no_discovered_consequential_effect'
  if (!gateProven) {
    decision = OPERATOR_DECISIONS.NO_GO
    reason = 'bounded_action_missing_explicit_opt_in_gate'
  } else if (evaluatedEffects.some((effect) => !effect.guarded)) {
    decision = OPERATOR_DECISIONS.NO_GO
    reason = evaluatedEffects.some((effect) => effect.kind === 'network_write' && effect.dynamicTarget && !effect.humanConfirmation.proven)
      ? 'dynamic_consequential_effect_missing_per_action_confirmation'
      : 'consequential_effect_not_proven_behind_operator_gate'
  }

  return {
    flag: action.flag,
    attr: action.attr,
    source: action.source,
    line: action.line,
    gate: action.gate,
    startFunctions: action.startFunctions,
    reachableFunctions: reachableFunctions.map((fn) => ({ name: fn.name, file: fn.file, line: fn.startLine })),
    effects: evaluatedEffects,
    decision,
    reason,
  }
}

export function discoverBoundedOperators(rootDir) {
  const root = path.resolve(rootDir)
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('repository_root_required')
  const absoluteFiles = walk(root)
  const sources = new Map(absoluteFiles.map((file) => [norm(path.relative(root, file)), read(file)]))
  const allFunctions = []
  for (const [relative, source] of sources) allFunctions.push(...pythonFunctions(relative, source))
  const functionIndex = new Map()
  for (const fn of allFunctions) {
    if (!functionIndex.has(fn.name)) functionIndex.set(fn.name, [])
    functionIndex.get(fn.name).push(fn)
  }

  const actions = []
  const runtimeRoots = []
  for (const [relative, source] of sources) {
    if (!mainGuard(source) || !cliSignal(source)) continue
    const functions = allFunctions.filter((fn) => fn.file === relative)
    const main = mainFunction(functions, source)
    const flags = parseSensitiveFlags(relative, source)
    runtimeRoots.push({ path: relative, sensitiveFlags: flags.map((flag) => flag.flag) })
    if (!main) continue
    for (const flag of flags) {
      const gate = actionGate(main.body, flag)
      const startFunctions = actionStartFunctions(main.body, flag, functionIndex)
      actions.push({ ...flag, gate, startFunctions })
    }
  }

  return {
    version: OPERATOR_SECURITY_VERSION,
    rootName: path.basename(root),
    filesScanned: sources.size,
    runtimeRoots,
    actions,
    functionIndex,
  }
}

export function assessBoundedOperators(rootDir) {
  const discovered = discoverBoundedOperators(rootDir)
  const assessments = discovered.actions.map((action) => actionAssessment(action, discovered.functionIndex))
  const applicable = assessments.length > 0
  const noGo = assessments.filter((action) => action.decision === OPERATOR_DECISIONS.NO_GO)
  const decision = applicable && noGo.length === 0 ? OPERATOR_DECISIONS.GO : OPERATOR_DECISIONS.NO_GO

  return {
    version: 'repo-security-loop/v1',
    mode: 'repository_bounded_operator_assurance',
    applicable,
    operatorSecurity: {
      version: OPERATOR_SECURITY_VERSION,
      decision,
      reason: !applicable
        ? 'no_bounded_operator_actions_detected'
        : noGo.length
          ? 'one_or_more_bounded_operator_actions_not_proven'
          : 'all_discovered_bounded_operator_actions_guarded',
      summary: {
        runtimeRoots: discovered.runtimeRoots.length,
        boundedActions: assessments.length,
        go: assessments.filter((action) => action.decision === OPERATOR_DECISIONS.GO).length,
        noGo: noGo.length,
        consequentialEffects: assessments.reduce((sum, action) => sum + action.effects.length, 0),
      },
      runtimeRoots: discovered.runtimeRoots,
      actions: assessments,
    },
    discovery: {
      version: OPERATOR_SECURITY_VERSION,
      repository: { rootName: discovered.rootName, filesScanned: discovered.filesScanned, languages: ['python'] },
      operatorTopology: { runtimeRoots: discovered.runtimeRoots.map((root) => root.path) },
      boundedActions: assessments.map((action) => ({ flag: action.flag, source: action.source, decision: action.decision, effects: action.effects.length })),
      coverage: { supported: applicable, confidence: applicable ? (noGo.length ? 'partial' : 'high') : 'insufficient', blockers: noGo.map((action) => action.reason) },
    },
    reachability: null,
    attackLoop: null,
    patch: { automatic: false, supported: false, changed: false, reason: decision === OPERATOR_DECISIONS.GO ? 'no_operator_patch_required' : 'operator_authority_requires_manual_remediation', changes: [] },
    release: {
      decision,
      reason: applicable && noGo.length === 0 ? 'bounded_operator_effect_authority_resolved' : 'bounded_operator_effect_authority_not_resolved',
      scope: applicable ? {
        boundedActions: assessments.map((action) => ({ source: action.source, flag: action.flag, decision: action.decision, reason: action.reason, effects: action.effects })),
      } : null,
    },
    truthBoundary: 'TECHNICAL_GO in bounded-operator mode is scoped to statically discovered CLI actions with explicit opt-in authority and the consequential effects reachable from those actions. Dynamic effect targets additionally require a per-action human confirmation before the effect; process execution must remain deny-by-default behind the propagated opt-in. This does not certify unrelated CLI behavior, business correctness, remote services, dynamic imports, reflection, or effect paths that static analysis cannot resolve.',
  }
}
