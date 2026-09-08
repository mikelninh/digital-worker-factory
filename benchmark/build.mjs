#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => {
  const [key, ...rest] = x.slice(2).split('=')
  return [key, rest.join('=')]
}))

const required = ['safevoice', 'gitlaw', 'proofworker', 'metadata', 'out']
for (const key of required) if (!args[key]) throw new Error(`missing --${key}=...`)

const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
const spec = readJson(new URL('./targets.json', import.meta.url))
const reports = {
  safevoice: readJson(args.safevoice),
  gitlaw: readJson(args.gitlaw),
  proofworker: readJson(args.proofworker),
}
const metadata = readJson(args.metadata)
const controls = args.controls && fs.existsSync(path.resolve(args.controls)) ? readJson(args.controls) : null
const targetSpec = Object.fromEntries(spec.targets.map((target) => [target.id, target]))

function requireClaim(condition, message) {
  if (!condition) throw new Error(`benchmark assertion failed: ${message}`)
}

function commitMeta(id) {
  const meta = metadata.targets?.[id]
  requireClaim(meta?.sha, `${id} target commit missing`)
  return meta
}

function baseTarget(id, report) {
  const declared = targetSpec[id]
  const commit = commitMeta(id)
  requireClaim(report.version === 'repo-security-loop/v1', `${id} report version drift`)
  requireClaim(report.mode === declared.expectedMode, `${id} mode drift: ${report.mode}`)
  requireClaim(report.release?.decision === 'TECHNICAL_GO', `${id} is not TECHNICAL_GO`)
  return {
    id,
    repository: declared.repository,
    trackingRef: declared.trackingRef,
    targetCommit: commit.sha,
    language: declared.language,
    architecture: declared.architecture,
    assuranceMode: report.mode,
    proofShape: declared.proofShape,
    decision: report.release.decision,
    reason: report.release.reason,
  }
}

function normaliseSafeVoice(report) {
  const base = baseTarget('safevoice', report)
  const reach = report.reachability
  const ep = reach?.entrypoints?.[0]
  requireClaim(reach?.resolved === true, 'SafeVoice reachability unresolved')
  requireClaim(reach.entrypoints.length === 1, 'SafeVoice must remain a single scoped entrypoint benchmark')
  requireClaim(ep?.scopedRuntimeProof?.proven === true, 'SafeVoice native runtime proof missing')
  requireClaim(ep.scopedRuntimeProof.criticalEscapesAfterBoundary === 0, 'SafeVoice runtime escape remains')
  requireClaim(ep.scopedRuntimeProof.exploitBeforeFix === true, 'SafeVoice exploit-before-fix evidence missing')
  requireClaim((ep.reachableTools?.length ?? 0) > 0, 'SafeVoice reachable tool surface missing')
  requireClaim((ep.boundaries?.length ?? 0) > 0, 'SafeVoice deterministic boundary missing')

  const sinkCount = (ep.effectPaths ?? []).reduce((sum, item) => sum + (item.sinks?.length ?? 0), 0)
  return {
    ...base,
    scope: {
      entrypoints: 1,
      authorityInputs: ep.contextInputs ?? [],
      reachableSurfaces: ep.reachableTools?.length ?? 0,
      consequentialEffectPaths: sinkCount,
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

function normaliseGitLaw(report) {
  const base = baseTarget('gitlaw', report)
  const scoped = report.entrypointSecurity
  requireClaim(scoped?.summary?.entrypoints >= 2, 'GitLaw multi-entrypoint topology missing')
  requireClaim(scoped.summary.go === scoped.summary.entrypoints, 'GitLaw has non-GO entrypoint')
  requireClaim(scoped.summary.noGo === 0, 'GitLaw has scoped NO_GO entrypoint')
  requireClaim(scoped.summary.unassignedTools === 0, 'GitLaw has unassigned tool surfaces')
  requireClaim((scoped.entrypoints ?? []).every((item) => item.decision === 'TECHNICAL_GO'), 'GitLaw entrypoint decision drift')

  const uniqueTools = new Set((scoped.entrypoints ?? []).flatMap((item) => item.scope?.reachableTools ?? []))
  return {
    ...base,
    scope: {
      entrypoints: scoped.summary.entrypoints,
      authorityInputs: [],
      reachableSurfaces: uniqueTools.size,
      consequentialEffectPaths: scoped.summary.consequentialScopes ?? 0,
      resolvedNonAgentSurfaces: scoped.summary.resolvedNonAgentSurfaces ?? 0,
      unassignedSurfaces: scoped.summary.unassignedTools,
    },
    evidence: {
      level: 'static scoped ownership + deterministic runtime/declarative authority resolution',
      perEntrypoint: scoped.entrypoints.map((item) => ({
        entrypoint: item.scope?.entrypoint,
        decision: item.decision,
        reason: item.reason,
        reachableTools: item.scope?.reachableTools?.length ?? 0,
      })),
      resolvedNonAgentSurfaces: scoped.resolvedNonAgentSurfaces ?? [],
    },
  }
}

function normaliseProofWorker(report) {
  const base = baseTarget('proofworker', report)
  const op = report.operatorSecurity
  requireClaim(op?.summary?.boundedActions >= 3, 'ProofWorker bounded actions missing')
  requireClaim(op.summary.go === op.summary.boundedActions, 'ProofWorker has non-GO bounded action')
  requireClaim(op.summary.noGo === 0, 'ProofWorker has bounded NO_GO action')
  requireClaim(op.summary.consequentialEffects >= 3, 'ProofWorker consequential effect coverage regressed')

  const actions = op.actions ?? []
  const execute = actions.find((item) => item.flag === '--execute')
  const allowExec = actions.find((item) => item.flag === '--allow-exec')
  const publish = actions.find((item) => item.flag === '--publish-listing')
  requireClaim(execute?.gate?.hardFailClosed === true, 'ProofWorker --execute fail-closed gate missing')
  requireClaim(execute.effects?.some((effect) => effect.kind === 'network_write' && effect.dynamicTarget === true && effect.humanConfirmation?.proven === true && effect.guarded === true), 'ProofWorker dynamic bid confirmation proof missing')
  requireClaim(allowExec?.gate?.propagated === true, 'ProofWorker --allow-exec propagation missing')
  requireClaim(allowExec.effects?.some((effect) => effect.kind === 'process_execution' && effect.propagatedFailClosed === true && effect.guarded === true), 'ProofWorker process deny-by-default proof missing')
  requireClaim(publish?.gate?.positiveBranch === true, 'ProofWorker publish opt-in branch missing')

  return {
    ...base,
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
        reason: item.reason,
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

const targets = [
  normaliseSafeVoice(reports.safevoice),
  normaliseGitLaw(reports.gitlaw),
  normaliseProofWorker(reports.proofworker),
]

const modes = new Set(targets.map((target) => target.assuranceMode))
const architectures = new Set(targets.map((target) => target.architecture))
const allGo = targets.every((target) => target.decision === 'TECHNICAL_GO')
requireClaim(modes.size === 3, `expected 3 assurance modes, got ${modes.size}`)
requireClaim(architectures.size === 3, `expected 3 architecture families, got ${architectures.size}`)

if (controls) {
  for (const [name, status] of Object.entries(controls)) requireClaim(status === 'pass', `negative/control suite ${name} did not pass`)
}

const benchmark = {
  version: 'trustready-benchmark-result/v1',
  benchmark: spec.name,
  thesis: spec.thesis,
  generatedAt: new Date().toISOString(),
  engine: {
    repository: 'mikelninh/digital-worker-factory',
    commit: metadata.engine?.sha ?? null,
  },
  summary: {
    repositories: targets.length,
    architectureFamilies: architectures.size,
    assuranceModes: modes.size,
    technicalGo: targets.filter((target) => target.decision === 'TECHNICAL_GO').length,
    technicalNoGo: targets.filter((target) => target.decision !== 'TECHNICAL_GO').length,
    controlSuites: controls ? Object.keys(controls).length : 0,
    verdict: allGo ? 'PASS' : 'FAIL',
  },
  targets,
  controls,
  methodology: [
    'Checkout each public target repository independently at its tracked ref.',
    'Record the exact target commit before scanning.',
    'Run the same TrustReady repository security CLI against each untouched checkout.',
    'Normalise architecture-specific evidence into this benchmark schema.',
    'Fail the benchmark when expected authority, effect, evidence or release claims drift.',
    'Verify each target checkout remains clean after the scan.',
  ],
  truthBoundary: spec.truthBoundary,
}

const outDir = path.resolve(args.out)
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(path.join(outDir, 'evidence'), { recursive: true })
fs.writeFileSync(path.join(outDir, 'benchmark.json'), `${JSON.stringify(benchmark, null, 2)}\n`)
for (const [id, report] of Object.entries(reports)) fs.writeFileSync(path.join(outDir, 'evidence', `${id}.json`), `${JSON.stringify(report, null, 2)}\n`)

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]))
const shortSha = (sha) => String(sha ?? '').slice(0, 7)
const repoUrl = (target) => `https://github.com/${target.repository}/tree/${target.targetCommit}`
const modeLabel = (mode) => ({
  repository_reachability_attack_patch_plan: 'Scoped runtime',
  repository_multi_entrypoint_scoped_assurance: 'Multi-entrypoint',
  repository_bounded_operator_assurance: 'Bounded operator',
}[mode] ?? mode)

const targetCards = targets.map((target) => `
<section class="target-card">
  <div class="target-head">
    <div>
      <div class="eyebrow">${escapeHtml(target.language)} · ${escapeHtml(modeLabel(target.assuranceMode))}</div>
      <h2>${escapeHtml(target.id === 'safevoice' ? 'SafeVoice' : target.id === 'gitlaw' ? 'GitLaw' : 'ProofWorker')}</h2>
      <p>${escapeHtml(target.architecture)}</p>
    </div>
    <span class="status">${escapeHtml(target.decision)}</span>
  </div>
  <div class="facts">
    <div><strong>${escapeHtml(target.scope.entrypoints)}</strong><span>${target.id === 'proofworker' ? 'runtime roots' : 'entrypoints'}</span></div>
    <div><strong>${escapeHtml(target.scope.reachableSurfaces)}</strong><span>resolved surfaces</span></div>
    <div><strong>${escapeHtml(target.scope.consequentialEffectPaths)}</strong><span>effect paths</span></div>
  </div>
  <p class="shape">${escapeHtml(target.proofShape)}</p>
  <div class="evidence-row"><span>Evidence</span><b>${escapeHtml(target.evidence.level)}</b></div>
  <div class="evidence-row"><span>Commit</span><a href="${repoUrl(target)}">${escapeHtml(shortSha(target.targetCommit))}</a></div>
</section>`).join('\n')

const rows = targets.map((target) => `<tr>
<td><a href="${repoUrl(target)}">${escapeHtml(target.repository)}</a></td>
<td>${escapeHtml(target.language)}</td>
<td>${escapeHtml(target.architecture)}</td>
<td><code>${escapeHtml(modeLabel(target.assuranceMode))}</code></td>
<td>${escapeHtml(target.scope.reachableSurfaces)}</td>
<td>${escapeHtml(target.scope.consequentialEffectPaths)}</td>
<td><span class="tiny-status">GO</span></td>
</tr>`).join('\n')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>TrustReady Benchmark v1</title>
<meta name="description" content="A reproducible TrustReady compatibility benchmark across SafeVoice, GitLaw and ProofWorker." />
<style>
:root{color-scheme:dark;--bg:#07110f;--panel:#0d1916;--panel2:#10221d;--text:#f2f6f4;--muted:#91a9a0;--line:#203a32;--accent:#80f2b4;--accent2:#74b6ff;--warn:#f4d47b}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 15% 0%,#14352b 0,transparent 34rem),var(--bg);color:var(--text);line-height:1.55}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}.wrap{width:min(1160px,calc(100% - 40px));margin:auto}.hero{padding:88px 0 44px}.kicker{font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}h1{font-size:clamp(44px,7vw,86px);line-height:.96;letter-spacing:-.055em;margin:16px 0 22px;max-width:900px}.lead{font-size:clamp(18px,2.2vw,25px);max-width:780px;color:#c8d7d1}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:44px 0}.metric{border:1px solid var(--line);background:rgba(13,25,22,.82);border-radius:18px;padding:22px}.metric b{font-size:36px;display:block;letter-spacing:-.04em}.metric span{color:var(--muted);font-size:13px}.callout{border:1px solid #2c5c4b;border-radius:22px;padding:22px 24px;background:linear-gradient(135deg,rgba(128,242,180,.08),rgba(116,182,255,.04));margin-bottom:38px}.callout strong{color:var(--accent)}.targets{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.target-card{border:1px solid var(--line);background:linear-gradient(180deg,var(--panel2),var(--panel));border-radius:22px;padding:24px;min-width:0}.target-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.eyebrow{font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--accent2)}h2{font-size:28px;margin:8px 0 0;letter-spacing:-.03em}.target-head p{color:var(--muted);margin:5px 0 0}.status,.tiny-status{font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;color:#082115;background:var(--accent);border-radius:999px;padding:9px 11px;white-space:nowrap}.tiny-status{padding:6px 8px}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:26px 0}.facts div{background:#08130f;border:1px solid #1a312a;border-radius:12px;padding:12px}.facts strong{display:block;font-size:22px}.facts span{color:var(--muted);font-size:11px}.shape{min-height:74px;color:#c9d8d2}.evidence-row{display:flex;gap:14px;justify-content:space-between;border-top:1px solid var(--line);padding:11px 0;font-size:12px}.evidence-row span{color:var(--muted)}.evidence-row b{max-width:68%;text-align:right}.section{padding:54px 0}.section h3{font-size:30px;letter-spacing:-.03em;margin:0 0 18px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:18px}table{border-collapse:collapse;width:100%;min-width:900px;background:var(--panel)}th,td{text-align:left;padding:14px 16px;border-bottom:1px solid var(--line);font-size:13px}th{color:var(--muted);font-weight:650;background:#0a1512}code{font-size:11px;color:#b9d7ff}.method{display:grid;grid-template-columns:1fr 1fr;gap:24px}.method ol{padding-left:22px;color:#c8d7d1}.truth{border-left:3px solid var(--warn);padding:2px 0 2px 20px;color:#cbd8d3}.links{display:flex;gap:16px;flex-wrap:wrap;margin-top:24px}.button{border:1px solid var(--line);padding:10px 14px;border-radius:10px;background:var(--panel)}footer{border-top:1px solid var(--line);padding:30px 0 54px;color:var(--muted);font-size:13px}@media(max-width:900px){.metrics{grid-template-columns:repeat(2,1fr)}.targets,.method{grid-template-columns:1fr}.shape{min-height:0}}@media(max-width:520px){.wrap{width:min(100% - 24px,1160px)}.hero{padding-top:54px}.metrics{grid-template-columns:1fr 1fr}.metric{padding:16px}.metric b{font-size:29px}.target-head{display:block}.status{display:inline-block;margin-top:14px}}
</style>
</head>
<body>
<main class="wrap">
<header class="hero">
  <div class="kicker">TrustReady · reproducible assurance benchmark</div>
  <h1>Different systems.<br/>Same hard question.</h1>
  <p class="lead">Who has authority, what can execute, what effect can happen — and what evidence proves the boundary? Benchmark v1 runs the same TrustReady engine against three structurally different real repositories.</p>
  <div class="metrics">
    <div class="metric"><b>${benchmark.summary.repositories}</b><span>real repositories</span></div>
    <div class="metric"><b>${benchmark.summary.architectureFamilies}</b><span>architecture families</span></div>
    <div class="metric"><b>${benchmark.summary.assuranceModes}</b><span>assurance modes</span></div>
    <div class="metric"><b>${benchmark.summary.technicalGo}/${benchmark.summary.repositories}</b><span>scoped TECHNICAL_GO</span></div>
  </div>
  <div class="callout"><strong>No repository-name shortcuts.</strong> The benchmark asserts outcomes, but the TrustReady assessor itself is architecture-driven. A target that loses its authority/effect proof makes CI fail rather than receiving a cosmetic green badge.</div>
</header>
<section class="targets">${targetCards}</section>
<section class="section">
  <h3>Compatibility matrix</h3>
  <div class="table-wrap"><table><thead><tr><th>Repository</th><th>Runtime</th><th>Architecture</th><th>Assurance</th><th>Surfaces</th><th>Effects</th><th>Gate</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>
<section class="section method">
  <div><h3>Method</h3><ol>${benchmark.methodology.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol></div>
  <div><h3>Truth boundary</h3><p class="truth">${escapeHtml(benchmark.truthBoundary)}</p><div class="links"><a class="button" href="benchmark.json">Machine-readable result</a><a class="button" href="evidence/safevoice.json">SafeVoice evidence</a><a class="button" href="evidence/gitlaw.json">GitLaw evidence</a><a class="button" href="evidence/proofworker.json">ProofWorker evidence</a></div></div>
</section>
</main>
<footer><div class="wrap">Generated from TrustReady engine <code>${escapeHtml(shortSha(benchmark.engine.commit))}</code> · target commits are recorded above · benchmark result ${escapeHtml(benchmark.summary.verdict)}</div></footer>
</body>
</html>`

fs.writeFileSync(path.join(outDir, 'index.html'), html)

const summaryMd = `# TrustReady Benchmark v1\n\n**${benchmark.summary.verdict}** — ${benchmark.summary.technicalGo}/${benchmark.summary.repositories} real repositories scoped TECHNICAL_GO across ${benchmark.summary.architectureFamilies} architecture families and ${benchmark.summary.assuranceModes} assurance modes.\n\n| Target | Architecture | Mode | Surfaces | Effects | Decision |\n| --- | --- | --- | ---: | ---: | --- |\n${targets.map((target) => `| ${target.repository} | ${target.architecture} | ${modeLabel(target.assuranceMode)} | ${target.scope.reachableSurfaces} | ${target.scope.consequentialEffectPaths} | ${target.decision} |`).join('\n')}\n\nTruth boundary: ${benchmark.truthBoundary}\n`
fs.writeFileSync(path.join(outDir, 'summary.md'), summaryMd)
console.log(summaryMd.trim())
