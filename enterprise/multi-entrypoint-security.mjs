import { discoveryToManifest } from './repository-discovery.mjs'
import { runAutonomousAttackFixLoop } from './autonomous-security-loop.mjs'

export const MULTI_ENTRYPOINT_SECURITY_VERSION = 'multi-entrypoint-security/v1'
export const SCOPED_DECISIONS = Object.freeze({
  GO: 'TECHNICAL_GO',
  NO_GO: 'TECHNICAL_NO_GO',
})

function scopedDiscovery(discovery, entrypoint) {
  const sources = new Set(entrypoint.reachableToolSources ?? [])
  const names = new Set(entrypoint.reachableTools ?? [])
  const tools = discovery.tools.filter((tool) => sources.has(tool.source) && names.has(tool.name))
  const unknownRiskTools = tools.filter((tool) => tool.risk === 'unknown').map((tool) => tool.name)
  return {
    ...discovery,
    agents: discovery.agents.filter((agent) => agent.path === entrypoint.path || (entrypoint.frameworks ?? []).includes(agent.path)),
    agentTopology: {
      entrypoints: [entrypoint.path],
      frameworks: [...(entrypoint.frameworks ?? [])],
    },
    tools,
    effectCandidates: tools.filter((tool) => tool.risk !== 'read' || tool.external === true),
    controls: {
      ...discovery.controls,
      deterministicBoundary: (entrypoint.boundaries?.length ?? 0) > 0,
    },
    coverage: {
      ...discovery.coverage,
      supported: tools.length > 0,
      unknownRiskTools,
      confidence: unknownRiskTools.length > 0 ? 'partial' : tools.length > 0 ? 'high' : 'insufficient',
      blockers: [
        ...(tools.length === 0 ? ['entrypoint_has_no_reachable_tool_surface'] : []),
        ...(unknownRiskTools.length > 0 ? ['unknown_tool_risk_requires_review'] : []),
      ],
    },
  }
}

function scopeSummary(entrypoint, scoped) {
  return {
    entrypoint: entrypoint.path,
    frameworks: [...(entrypoint.frameworks ?? [])],
    contextInputs: [...(entrypoint.contextInputs ?? [])],
    reachableTools: scoped.tools.map((tool) => ({
      name: tool.name,
      source: tool.source,
      risk: tool.risk,
      external: tool.external === true,
    })),
    reachableBoundaries: (entrypoint.boundaries ?? []).map((item) => item.path),
    effectPaths: [...(entrypoint.effectPaths ?? [])],
    nativeEvidence: [...(entrypoint.nativeEvidence ?? [])],
  }
}

async function evaluateEntrypoint(discovery, entrypoint) {
  const scoped = scopedDiscovery(discovery, entrypoint)
  const scope = scopeSummary(entrypoint, scoped)
  const reachableMcp = entrypoint.reachableMcpServers ?? []
  const reachableNonMcp = scoped.tools.filter((tool) => tool.provider !== 'mcp')

  if (scoped.tools.length === 0) {
    return { decision: SCOPED_DECISIONS.NO_GO, reason: 'entrypoint_has_no_reachable_tool_surface', scope, attackLoop: null }
  }
  if (scoped.coverage.unknownRiskTools.length > 0) {
    return { decision: SCOPED_DECISIONS.NO_GO, reason: 'reachable_tool_risk_unknown', scope, attackLoop: null }
  }
  if (reachableMcp.length > 0 && reachableNonMcp.length > 0) {
    return { decision: SCOPED_DECISIONS.NO_GO, reason: 'mixed_reachable_mcp_and_agent_surfaces_require_review', scope, attackLoop: null }
  }

  const effectful = scoped.effectCandidates
  if (effectful.length === 0) {
    return {
      decision: SCOPED_DECISIONS.GO,
      reason: 'scoped_non_consequential_surface_resolved',
      evidenceLevel: 'static_reachability_effect_scope',
      scope,
      attackLoop: null,
      truthBoundary: 'This scoped TECHNICAL_GO says the statically reachable declared tool surface contains no consequential or external effect capability. It does not certify confidentiality, model correctness, legal compliance, or dynamic runtime paths that static analysis cannot see.',
    }
  }

  const manifest = discoveryToManifest(scoped, { agentId: entrypoint.path })
  const attackLoop = await runAutonomousAttackFixLoop(manifest)
  const boundaryReachable = (entrypoint.boundaries?.length ?? 0) > 0
  const proof = entrypoint.scopedRuntimeProof
  const nativeProof = proof?.proven === true && proof.criticalEscapesAfterBoundary === 0
  const simulatedContained = attackLoop.before?.impactEscapes === 0 && attackLoop.before?.executorCalls === 0

  if (!boundaryReachable) {
    return {
      decision: SCOPED_DECISIONS.NO_GO,
      reason: 'reachable_consequential_effect_without_boundary',
      scope,
      attackLoop,
    }
  }
  if (!nativeProof) {
    return {
      decision: SCOPED_DECISIONS.NO_GO,
      reason: 'reachable_consequential_effect_missing_scoped_runtime_proof',
      scope,
      attackLoop,
    }
  }
  if (!simulatedContained) {
    return {
      decision: SCOPED_DECISIONS.NO_GO,
      reason: 'generated_attack_set_not_contained',
      scope,
      attackLoop,
    }
  }

  return {
    decision: SCOPED_DECISIONS.GO,
    reason: 'scoped_consequential_surface_proven_contained',
    evidenceLevel: 'static_reachability_plus_native_runtime_proof',
    scope: { ...scope, runtimeEvidence: proof.path },
    attackLoop,
    truthBoundary: 'This scoped TECHNICAL_GO covers only the statically resolved entrypoint, its reachable declared tool/effect paths, and the named repository-native runtime evidence. It is not certification and does not prove absence of unknown or dynamic vulnerabilities.',
  }
}

export async function evaluateMultiEntrypointSecurity(discovery, reachability) {
  const entrypoints = reachability?.entrypoints ?? []
  if (entrypoints.length < 2) throw new Error('multi_entrypoint_security_requires_multiple_entrypoints')

  const decisions = []
  for (const entrypoint of entrypoints) decisions.push(await evaluateEntrypoint(discovery, entrypoint))

  const noGo = decisions.filter((item) => item.decision === SCOPED_DECISIONS.NO_GO)
  const go = decisions.filter((item) => item.decision === SCOPED_DECISIONS.GO)
  const decision = noGo.length > 0 ? SCOPED_DECISIONS.NO_GO : SCOPED_DECISIONS.GO

  return {
    version: MULTI_ENTRYPOINT_SECURITY_VERSION,
    decision,
    reason: noGo.length > 0 ? 'one_or_more_entrypoint_scopes_not_proven' : 'all_entrypoint_effect_scopes_resolved',
    summary: {
      entrypoints: decisions.length,
      go: go.length,
      noGo: noGo.length,
      consequentialScopes: decisions.filter((item) => (item.scope.effectPaths ?? []).some((path) => path.risk !== 'read' || path.external === true)).length,
    },
    entrypoints: decisions,
    truthBoundary: 'Repository aggregation is conservative: any scoped TECHNICAL_NO_GO makes the repository TECHNICAL_NO_GO. Scoped GO decisions cover reachable effect authority only; they do not certify confidentiality, legal compliance, model correctness, or dynamic paths invisible to static analysis.',
  }
}
