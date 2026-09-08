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
    agentTopology: { entrypoints: [entrypoint.path], frameworks: [...(entrypoint.frameworks ?? [])] },
    tools,
    effectCandidates: tools.filter((tool) => tool.risk !== 'read' || tool.external === true),
    controls: { ...discovery.controls, deterministicBoundary: (entrypoint.boundaries?.length ?? 0) > 0 },
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
    reachableTools: scoped.tools.map((tool) => ({ name: tool.name, source: tool.source, risk: tool.risk, external: tool.external === true })),
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

  if (scoped.tools.length === 0) return { decision: SCOPED_DECISIONS.NO_GO, reason: 'entrypoint_has_no_reachable_tool_surface', scope, attackLoop: null }
  if (scoped.coverage.unknownRiskTools.length > 0) return { decision: SCOPED_DECISIONS.NO_GO, reason: 'reachable_tool_risk_unknown', scope, attackLoop: null }
  if (reachableMcp.length > 0 && reachableNonMcp.length > 0) return { decision: SCOPED_DECISIONS.NO_GO, reason: 'mixed_reachable_mcp_and_agent_surfaces_require_review', scope, attackLoop: null }

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

  if (!boundaryReachable) return { decision: SCOPED_DECISIONS.NO_GO, reason: 'reachable_consequential_effect_without_boundary', scope, attackLoop }
  if (!nativeProof) return { decision: SCOPED_DECISIONS.NO_GO, reason: 'reachable_consequential_effect_missing_scoped_runtime_proof', scope, attackLoop }
  if (!simulatedContained) return { decision: SCOPED_DECISIONS.NO_GO, reason: 'generated_attack_set_not_contained', scope, attackLoop }

  return {
    decision: SCOPED_DECISIONS.GO,
    reason: 'scoped_consequential_surface_proven_contained',
    evidenceLevel: 'static_reachability_plus_native_runtime_proof',
    scope: { ...scope, runtimeEvidence: proof.path },
    attackLoop,
    truthBoundary: 'This scoped TECHNICAL_GO covers only the statically resolved entrypoint, its reachable declared tool/effect paths, and the named repository-native runtime evidence. It is not certification and does not prove absence of unknown or dynamic vulnerabilities.',
  }
}

function ownershipFor(reachability, tool) {
  return (reachability?.toolOwnership ?? []).find((item) => item.source === tool.source && item.name === tool.name) ?? {
    agentEntrypoints: [], deterministicRuntimes: [],
  }
}

function runtimeFor(reachability, path) {
  return (reachability?.deterministicRuntimes ?? []).find((item) => item.path === path) ?? null
}

function resolveNonAgentSurface(tool, reachability) {
  const ownership = ownershipFor(reachability, tool)

  if (tool.provider === 'declared_capability' && tool.declaredOnly === true) {
    if (tool.risk === 'read' && tool.external !== true) {
      return {
        resolved: true,
        reason: 'declarative_read_capability_outside_agent_execution',
        evidenceLevel: 'declarative_contract_static',
        owners: ownership.deterministicRuntimes,
      }
    }

    const outsideModel = tool.authority === 'outside_model'
    const approvalGated = tool.executionMode === 'approval_gated'
    const approvalRequired = tool.requiresHumanApproval === true
    const hasTransport = Boolean(tool.transport?.method && tool.transport?.path)
    if (outsideModel && approvalGated && approvalRequired && hasTransport) {
      return {
        resolved: true,
        reason: 'declarative_effect_capability_kept_outside_model_authority',
        evidenceLevel: 'declarative_authority_contract_static',
        owners: ownership.deterministicRuntimes,
        guard: {
          authority: tool.authority,
          executionMode: tool.executionMode,
          requiresHumanApproval: tool.requiresHumanApproval,
          transport: tool.transport,
        },
        caveat: 'This resolves model execution authority only. It does not prove that the transport endpoint independently enforces a dedicated approval token or workflow.',
      }
    }

    return {
      resolved: false,
      reason: 'effectful_declarative_capability_missing_outside_model_approval_contract',
      evidenceLevel: 'fail_closed',
      owners: ownership.deterministicRuntimes,
    }
  }

  const runtimes = (ownership.deterministicRuntimes ?? []).map((runtimePath) => runtimeFor(reachability, runtimePath)).filter(Boolean)
  const deterministicOwners = runtimes.filter((runtime) => runtime.modelDirectedToolExecution === false)
  if (tool.risk !== 'unknown' && ownership.agentEntrypoints?.length === 0 && deterministicOwners.length > 0) {
    return {
      resolved: true,
      reason: 'deterministic_non_agent_runtime_owns_surface',
      evidenceLevel: 'static_runtime_ownership',
      owners: deterministicOwners.map((runtime) => runtime.path),
    }
  }

  return {
    resolved: false,
    reason: tool.risk === 'unknown' ? 'non_agent_surface_risk_unknown' : 'non_agent_surface_owner_unresolved',
    evidenceLevel: 'fail_closed',
    owners: ownership.deterministicRuntimes ?? [],
  }
}

export async function evaluateMultiEntrypointSecurity(discovery, reachability) {
  const entrypoints = reachability?.entrypoints ?? []
  if (entrypoints.length < 2) throw new Error('multi_entrypoint_security_requires_multiple_entrypoints')

  const assigned = new Set()
  for (const entrypoint of entrypoints) {
    const sources = new Set(entrypoint.reachableToolSources ?? [])
    const names = new Set(entrypoint.reachableTools ?? [])
    for (const tool of discovery.tools) if (sources.has(tool.source) && names.has(tool.name)) assigned.add(`${tool.source}:${tool.name}`)
  }

  const candidateNonAgent = discovery.tools
    .filter((tool) => tool.provider !== 'mcp')
    .filter((tool) => !assigned.has(`${tool.source}:${tool.name}`))

  const resolvedNonAgentSurfaces = []
  const unassignedTools = []
  for (const tool of candidateNonAgent) {
    const resolution = resolveNonAgentSurface(tool, reachability)
    const item = {
      name: tool.name,
      source: tool.source,
      provider: tool.provider,
      risk: tool.risk,
      external: tool.external === true,
      ...resolution,
    }
    if (resolution.resolved) resolvedNonAgentSurfaces.push(item)
    else unassignedTools.push(item)
  }

  const decisions = []
  for (const entrypoint of entrypoints) decisions.push(await evaluateEntrypoint(discovery, entrypoint))

  const noGo = decisions.filter((item) => item.decision === SCOPED_DECISIONS.NO_GO)
  const go = decisions.filter((item) => item.decision === SCOPED_DECISIONS.GO)
  const hasUnassigned = unassignedTools.length > 0
  const decision = noGo.length > 0 || hasUnassigned ? SCOPED_DECISIONS.NO_GO : SCOPED_DECISIONS.GO

  return {
    version: MULTI_ENTRYPOINT_SECURITY_VERSION,
    decision,
    reason: hasUnassigned
      ? 'unassigned_tool_surface_requires_reachability_review'
      : noGo.length > 0
        ? 'one_or_more_entrypoint_scopes_not_proven'
        : 'all_entrypoint_and_non_agent_surfaces_resolved',
    summary: {
      entrypoints: decisions.length,
      go: go.length,
      noGo: noGo.length + (hasUnassigned ? 1 : 0),
      consequentialScopes: decisions.filter((item) => item.scope.reachableTools.some((tool) => tool.risk !== 'read' || tool.external === true)).length,
      resolvedNonAgentSurfaces: resolvedNonAgentSurfaces.length,
      unassignedTools: unassignedTools.length,
    },
    entrypoints: decisions,
    resolvedNonAgentSurfaces,
    unassignedTools,
    truthBoundary: 'Repository aggregation is conservative: any scoped TECHNICAL_NO_GO or unresolved non-MCP surface makes the repository TECHNICAL_NO_GO. Non-agent ToolDef surfaces count as resolved only when static import reachability proves ownership by a runtime without model-directed tool execution. Declarative effect capabilities count as resolved only for model authority when the contract explicitly keeps authority outside the model, requires approval-gated execution and requires human approval. That contract evidence does not certify the downstream transport endpoint itself. Dynamic paths invisible to static analysis remain outside this claim.',
  }
}
