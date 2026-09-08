#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => {
  const [key, ...value] = x.slice(2).split('=')
  return [key, value.join('=')]
}))
for (const key of ['safevoice', 'gitlaw', 'proofworker', 'metadata', 'out']) {
  if (!args[key]) throw new Error(`missing --${key}=...`)
}

const readJson = (file) => JSON.parse(fs.readFileSync(file instanceof URL ? file : path.resolve(file), 'utf8'))
const spec = readJson(new URL('./targets.json', import.meta.url))
const reports = {
  safevoice: readJson(args.safevoice),
  gitlaw: readJson(args.gitlaw),
  proofworker: readJson(args.proofworker),
}
const metadata = readJson(args.metadata)
const controls = args.controls ? readJson(args.controls) : null
const declared = Object.fromEntries(spec.targets.map((target) => [target.id, target]))

const assert = (condition, message) => {
  if (!condition) throw new Error(`benchmark assertion failed: ${message}`)
}

function base(id, report) {
  const target = declared[id]
  const sha = metadata.targets?.[id]?.sha
  assert(sha, `${id} exact target commit missing`)
  assert(report.version === 'repo-security-loop/v1', `${id} report version drift`)
  assert(report.mode === target.expectedMode, `${id} mode drift: ${report.mode}`)
  assert(report.release?.decision === 'TECHNICAL_GO', `${id} is ${report.release?.decision ?? 'UNKNOWN'}`)
  return {
    id,
    repository: target.repository,
    trackingRef: target.trackingRef,
    targetCommit: sha,
    language: target.language,
    architecture: target.architecture,
    assuranceMode: report.mode,
    proofShape: target.proofShape,
    decision: report.release.decision,
    reason: report.release.reason,
  }
}

function safeVoice(report) {
  const target = base('safevoice', report)
  const reach = report.reachability
  const ep = reach?.entrypoints?.[0]
  assert(reach?.resolved === true, 'SafeVoice reachability unresolved')
  assert(reach.entrypoints.length === 1, 'SafeVoice entrypoint count drift')
  assert((ep?.reachableTools?.length ?? 0) > 0, 'SafeVoice tool surface missing')
  assert((ep?.boundaries?.length ?? 0) > 0, 'SafeVoice deterministic boundary missing')
  assert(ep?.scopedRuntimeProof?.proven === true, 'SafeVoice native runtime proof missing')
  assert(ep.scopedRuntimeProof.exploitBeforeFix === true, 'SafeVoice exploit-before-fix proof missing')
  assert(ep.scopedRuntimeProof.criticalEscapesAfterBoundary === 0, 'SafeVoice critical runtime escape remains')
  const effects = (ep.effectPaths ?? []).reduce((sum, item) => sum + (item.sinks?.length ?? 0), 0)
  return {
    ...target,
    scope: {
      entrypoints: 1,
      authorityInputs: ep.contextInputs ?? [],
      reachableSurfaces: ep.reachableTools.length,
      consequentialEffectPaths: effects,
      isolatedSurfaces: reach.isolatedMcpServers ?? [],
    },
    evidence: {
      level: 'static reachability + repository-native adversarial runtime evidence',
      path: ep.scopedRuntimeProof.path ?? report.release.scope?.evidence ?? null,
      adversarialCases: ep.scopedRuntimeProof.adversarialCases,
      passed: ep.scopedRuntimeProof.passed,
      criticalEscapesAfterBoundary: ep.scopedRuntimeProof.criticalEscapesAfterBoundary,
      exploitBeforeFix: ep.scopedRuntimeProof.exploitBeforeFix,
    },
  }
}

function gitLaw(report) {
  const target = base('gitlaw', report)
  const scoped = report.entrypointSecurity
  assert(scoped?.summary?.entrypoints >= 2, 'GitLaw multi-entrypoint topology missing')
  assert(scoped.summary.go === scoped.summary.entrypoints, 'GitLaw has non-GO entrypoint')
  assert(scoped.summary.noGo === 0, 'GitLaw scoped NO_GO remains')
  assert(scoped.summary.unassignedTools === 0, 'GitLaw unassigned surfaces remain')
  assert((scoped.entrypoints ?? []).every((item) => item.decision === 'TECHNICAL_GO'), 'GitLaw entrypoint decision drift')
  const tools = new Set((scoped.entrypoints ?? []).flatMap((item) => item.scope?.reachableTools ?? []))
  return {
    ...target,
    scope: {
      entrypoints: scoped.summary.entrypoints,
      authorityInputs: [],
      reachableSurfaces: tools.size,
      consequentialEffectPaths: scoped.summary.consequentialScopes ?? 0,
      resolvedNonAgentSurfaces: scoped.summary.resolvedNonAgentSurfaces ?? 0,
      unassignedSurfaces: scoped.summary.unassignedTools,
    },
    evidence: {
      level: 'static scoped ownership + deterministic runtime/declarative authority resolution',
      entrypoints: scoped.entrypoints.map((item) => ({
        entrypoint: item.scope?.entrypoint,
        decision: item.decision,
        reason: item.reason,
        reachableTools: item.scope?.reachableTools?.length ?? 0,
      })),
      resolvedNonAgentSurfaces: scoped.resolvedNonAgentSurfaces ?? [],
    },
  }
}

function proofWorker(report) {
  const target = base('proofworker', report)
  const op = report.operatorSecurity
  assert(op?.summary?.boundedActions >= 3, 'ProofWorker bounded action coverage regressed')
  assert(op.summary.go === op.summary.boundedActions, 'ProofWorker has non-GO bounded action')
  assert(op.summary.noGo === 0, 'ProofWorker bounded NO_GO remains')
  assert(op.summary.consequentialEffects >= 3, 'ProofWorker effect coverage regressed')
  const actions = op.actions ?? []
  const execute = actions.find((item) => item.flag === '--execute')
  const allowExec = actions.find((item) => item.flag === '--allow-exec')
  const publish = actions.find((item) => item.flag === '--publish-listing')
  assert(execute?.gate?.hardFailClosed === true, 'ProofWorker --execute fail-closed gate missing')
  assert(execute.effects?.some((effect) => effect.kind === 'network_write' && effect.dynamicTarget === true && effect.humanConfirmation?.proven === true && effect.guarded === true), 'ProofWorker dynamic bid human gate missing')
  assert(allowExec?.gate?.propagated === true, 'ProofWorker --allow-exec propagation missing')
  assert(allowExec.effects?.some((effect) => effect.kind === 'process_execution' && effect.propagatedFailClosed === true && effect.guarded === true), 'ProofWorker process deny-by-default proof missing')
  assert(publish?.gate?.positiveBranch === true, 'ProofWorker publication opt-in branch missing')
  return {
    ...target,
    scope: {
      entrypoints: op.summary.runtimeRoots,
      authorityInputs: actions.map((item) => item.flag),
      reachableSurfaces: op.summary.boundedActions,
      consequentialEffectPaths: op.summary.consequentialEffects,
    },
    evidence: {
      level: 'static CLI authority + guarded process/network effects + human release gates',
      actions: actions.map((item) => ({
        source: item.source,
        flag: item.flag,
        decision: item.decision,
        effects: (item.effects ?? []).map((effect) => ({
          kind: effect.kind,
          method: effect.method,
          dynamicTarget: effect.dynamicTarget,
          guarded: effect.guarded,
          humanConfirmation: effect.humanConfirmation?.proven === true,
          propagatedFailClosed: effect.propagatedFailClosed === true,
        })),
      })),
    },
  }
}

const targets = [safeVoice(reports.safevoice), gitLaw(reports.gitlaw), proofWorker(reports.proofworker)]
const architectureFamilies = new Set(targets.map((target) => target.architecture)).size
const assuranceModes = new Set(targets.map((target) => target.assuranceMode)).size
assert(architectureFamilies === 3, `expected 3 architecture families, got ${architectureFamilies}`)
assert(assuranceModes === 3, `expected 3 assurance modes, got ${assuranceModes}`)
if (controls) for (const [name, value] of Object.entries(controls)) assert(value === 'pass', `${name} control suite failed`)

const benchmark = {
  version: 'trustready-benchmark-result/v1',
  benchmark: spec.name,
  thesis: spec.thesis,
  generatedAt: new Date().toISOString(),
  engine: { repository: 'mikelninh/digital-worker-factory', commit: metadata.engine?.sha ?? null },
  summary: {
    repositories: targets.length,
    architectureFamilies,
    assuranceModes,
    technicalGo: targets.filter((target) => target.decision === 'TECHNICAL_GO').length,
    technicalNoGo: targets.filter((target) => target.decision !== 'TECHNICAL_GO').length,
    controlSuites: controls ? Object.keys(controls).length : 0,
    verdict: targets.every((target) => target.decision === 'TECHNICAL_GO') ? 'PASS' : 'FAIL',
  },
  targets,
  controls,
  methodology: [
    'Checkout each public target independently at its tracked ref and record the exact commit.',
    'Run the same TrustReady repository security CLI against every untouched target checkout.',
    'Run generic negative/regression suites for single-agent, multi-entrypoint and bounded-operator assurance.',
    'Normalise architecture-specific evidence into one machine-readable benchmark schema.',
    'Fail when expected authority, effect, evidence or release claims drift.',
    'Verify target worktrees remain clean after scanning.',
  ],
  truthBoundary: spec.truthBoundary,
}

const out = path.resolve(args.out)
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, 'evidence'), { recursive: true })
fs.writeFileSync(path.join(out, 'benchmark.json'), `${JSON.stringify(benchmark, null, 2)}\n`)
for (const [id, report] of Object.entries(reports)) fs.writeFileSync(path.join(out, 'evidence', `${id}.json`), `${JSON.stringify(report, null, 2)}\n`)

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]))
const short = (sha) => String(sha ?? '').slice(0, 7)
const title = (id) => ({ safevoice: 'SafeVoice', gitlaw: 'GitLaw', proofworker: 'ProofWorker' }[id] ?? id)
const label = (mode) => ({
  repository_reachability_attack_patch_plan: 'Scoped runtime',
  repository_multi_entrypoint_scoped_assurance: 'Multi-entrypoint',
  repository_bounded_operator_assurance: 'Bounded operator',
}[mode] ?? mode)
const targetUrl = (target) => `https://github.com/${target.repository}/tree/${target.targetCommit}`

const cards = targets.map((target) => `
<article class="card">
  <div class="cardtop"><div><small>${esc(target.language)} · ${esc(label(target.assuranceMode))}</small><h2>${esc(title(target.id))}</h2><p>${esc(target.architecture)}</p></div><b class="go">GO</b></div>
  <div class="facts"><div><strong>${esc(target.scope.entrypoints)}</strong><span>${target.id === 'proofworker' ? 'runtime roots' : 'entrypoints'}</span></div><div><strong>${esc(target.scope.reachableSurfaces)}</strong><span>surfaces</span></div><div><strong>${esc(target.scope.consequentialEffectPaths)}</strong><span>effects</span></div></div>
  <p class="shape">${esc(target.proofShape)}</p>
  <dl><div><dt>Evidence</dt><dd>${esc(target.evidence.level)}</dd></div><div><dt>Commit</dt><dd><a href="${targetUrl(target)}">${esc(short(target.targetCommit))}</a></dd></div></dl>
</article>`).join('')

const rows = targets.map((target) => `<tr><td><a href="${targetUrl(target)}">${esc(target.repository)}</a></td><td>${esc(target.language)}</td><td>${esc(target.architecture)}</td><td><code>${esc(label(target.assuranceMode))}</code></td><td>${target.scope.reachableSurfaces}</td><td>${target.scope.consequentialEffectPaths}</td><td><b class="pill">GO</b></td></tr>`).join('')

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrustReady Benchmark v1</title><meta name="description" content="Reproducible TrustReady assurance benchmark across three real repository architectures."><style>
:root{color-scheme:dark;--bg:#07110f;--panel:#0d1916;--panel2:#10221d;--text:#f2f6f4;--muted:#91a9a0;--line:#203a32;--green:#80f2b4;--blue:#74b6ff;--yellow:#f4d47b}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0,#14352b 0,transparent 34rem),var(--bg);color:var(--text);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--green);text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(1160px,calc(100% - 40px));margin:auto}.hero{padding:84px 0 42px}.kicker,small{font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--blue)}h1{font-size:clamp(46px,7vw,84px);line-height:.96;letter-spacing:-.055em;margin:15px 0 24px;max-width:920px}.lead{max-width:800px;color:#c9d8d2;font-size:clamp(18px,2.2vw,25px)}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:42px 0}.metric,.card{border:1px solid var(--line);background:rgba(13,25,22,.9);border-radius:18px}.metric{padding:20px}.metric b{display:block;font-size:35px;letter-spacing:-.04em}.metric span,.card p,dt{color:var(--muted)}.note{padding:20px 22px;border:1px solid #2d5c4c;border-radius:18px;background:linear-gradient(135deg,rgba(128,242,180,.08),rgba(116,182,255,.04))}.note strong{color:var(--green)}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:6px 0 52px}.card{padding:23px;background:linear-gradient(180deg,var(--panel2),var(--panel))}.cardtop{display:flex;justify-content:space-between;gap:14px}.card h2{font-size:28px;letter-spacing:-.03em;margin:7px 0 2px}.go,.pill{background:var(--green);color:#082115;border-radius:999px;font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:8px 10px;height:max-content}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:23px 0}.facts div{padding:11px;border-radius:11px;border:1px solid #1a312a;background:#08130f}.facts strong{font-size:21px;display:block}.facts span{font-size:10px;color:var(--muted)}.shape{min-height:70px}dl{margin:20px 0 0}dl div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid var(--line);font-size:12px}dd{margin:0;text-align:right;max-width:70%}.section{padding:46px 0}.section h3{font-size:31px;letter-spacing:-.03em;margin:0 0 18px}.table{overflow:auto;border:1px solid var(--line);border-radius:16px}table{width:100%;min-width:900px;border-collapse:collapse;background:var(--panel)}th,td{text-align:left;padding:13px 15px;border-bottom:1px solid var(--line);font-size:13px}th{color:var(--muted);background:#0a1512}.pill{padding:5px 7px}.method{display:grid;grid-template-columns:1fr 1fr;gap:30px}.method ol{padding-left:20px;color:#c9d8d2}.truth{border-left:3px solid var(--yellow);padding-left:18px;color:#cbd8d3}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.button{padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--panel)}footer{margin-top:24px;border-top:1px solid var(--line);padding:28px 0 50px;color:var(--muted);font-size:12px}code{color:#bdd9ff}@media(max-width:900px){.grid,.method{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.shape{min-height:0}}@media(max-width:520px){.wrap{width:calc(100% - 24px)}.hero{padding-top:54px}.metric{padding:15px}.metric b{font-size:29px}.cardtop{display:block}.go{display:inline-block;margin-top:12px}}
</style></head><body><main class="wrap"><header class="hero"><div class="kicker">TrustReady · reproducible assurance benchmark</div><h1>Different systems.<br>Same hard question.</h1><p class="lead">Who has authority, what can execute, what effect can happen — and what evidence proves the boundary? Benchmark v1 runs the same engine against three structurally different real repositories.</p><div class="metrics"><div class="metric"><b>${benchmark.summary.repositories}</b><span>real repositories</span></div><div class="metric"><b>${benchmark.summary.architectureFamilies}</b><span>architecture families</span></div><div class="metric"><b>${benchmark.summary.assuranceModes}</b><span>assurance modes</span></div><div class="metric"><b>${benchmark.summary.technicalGo}/${benchmark.summary.repositories}</b><span>scoped TECHNICAL_GO</span></div></div><div class="note"><strong>No repository-name shortcuts.</strong> Expectations live in the benchmark. The assessor remains architecture-driven; lost proof makes CI fail instead of producing a cosmetic green badge.</div></header><section class="grid">${cards}</section><section class="section"><h3>Compatibility matrix</h3><div class="table"><table><thead><tr><th>Repository</th><th>Runtime</th><th>Architecture</th><th>Assurance</th><th>Surfaces</th><th>Effects</th><th>Gate</th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="section method"><div><h3>Method</h3><ol>${benchmark.methodology.map((step) => `<li>${esc(step)}</li>`).join('')}</ol></div><div><h3>Truth boundary</h3><p class="truth">${esc(benchmark.truthBoundary)}</p><div class="buttons"><a class="button" href="benchmark.json">benchmark.json</a><a class="button" href="evidence/safevoice.json">SafeVoice evidence</a><a class="button" href="evidence/gitlaw.json">GitLaw evidence</a><a class="button" href="evidence/proofworker.json">ProofWorker evidence</a></div></div></section></main><footer><div class="wrap">Generated from TrustReady engine <code>${esc(short(benchmark.engine.commit))}</code> · result ${esc(benchmark.summary.verdict)} · exact target commits recorded in benchmark.json</div></footer></body></html>`
fs.writeFileSync(path.join(out, 'index.html'), html)

const summary = `# TrustReady Benchmark v1\n\n**${benchmark.summary.verdict}** — ${benchmark.summary.technicalGo}/${benchmark.summary.repositories} real repositories scoped TECHNICAL_GO across ${benchmark.summary.architectureFamilies} architecture families and ${benchmark.summary.assuranceModes} assurance modes.\n\n| Target | Architecture | Mode | Surfaces | Effects | Decision |\n| --- | --- | --- | ---: | ---: | --- |\n${targets.map((target) => `| ${target.repository} | ${target.architecture} | ${label(target.assuranceMode)} | ${target.scope.reachableSurfaces} | ${target.scope.consequentialEffectPaths} | ${target.decision} |`).join('\n')}\n\nTruth boundary: ${benchmark.truthBoundary}\n`
fs.writeFileSync(path.join(out, 'summary.md'), summary)
console.log(summary.trim())
