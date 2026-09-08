export const CONTINUOUS_ASSURANCE_VERSION = 'continuous-assurance/v1'

function mapActions(manifest) {
  return new Map((manifest?.actions ?? []).map((action) => [action.id, action]))
}

function effectful(action) {
  return ['write', 'consequential', 'irreversible'].includes(action?.risk) || action?.external === true
}

export function authorityDelta(before, after) {
  const previous = mapActions(before)
  const next = mapActions(after)
  const added = [...next.values()].filter((action) => !previous.has(action.id))
  const removed = [...previous.values()].filter((action) => !next.has(action.id))
  const changed = []
  for (const [id, action] of next) {
    const old = previous.get(id)
    if (!old) continue
    if (old.risk !== action.risk || old.external !== action.external || old.approvalRequired !== action.approvalRequired || old.provider !== action.provider) changed.push({ before: old, after: action })
  }
  const controls = {
    securityBoundaryRemoved: before?.autonomousSecurity?.securityBoundaryRequired === true && after?.autonomousSecurity?.securityBoundaryRequired !== true,
    modelSelfApprovalEnabled: before?.autonomousSecurity?.modelMaySelfApproveEffects !== true && after?.autonomousSecurity?.modelMaySelfApproveEffects === true,
    toolBudgetRemoved: Number(before?.autonomousSecurity?.maxToolCalls ?? 0) > 0 && Number(after?.autonomousSecurity?.maxToolCalls ?? 0) < 1,
  }
  return { added, removed, changed, controls }
}

export function decideContinuousAssurance(before, after) {
  const delta = authorityDelta(before, after)
  const blockers = []
  const retest = new Set()
  if (delta.controls.securityBoundaryRemoved) blockers.push('deterministic_security_boundary_removed')
  if (delta.controls.modelSelfApprovalEnabled) blockers.push('model_self_approval_enabled')
  if (delta.controls.toolBudgetRemoved) blockers.push('bounded_execution_removed')
  for (const action of delta.added) {
    if (effectful(action)) blockers.push(`new_effectful_capability:${action.id}`)
    else retest.add(`new_read_capability:${action.id}`)
  }
  for (const change of delta.changed) {
    if (!effectful(change.before) && effectful(change.after)) blockers.push(`capability_became_effectful:${change.after.id}`)
    else if (change.before.provider !== change.after.provider || change.before.approvalRequired !== change.after.approvalRequired) retest.add(`authority_changed:${change.after.id}`)
  }
  const decision = blockers.length > 0 ? 'BLOCK' : retest.size > 0 ? 'RETEST_REQUIRED' : 'GO'
  return {
    version: CONTINUOUS_ASSURANCE_VERSION,
    decision,
    delta,
    blockers,
    requiredRetests: [...retest],
    attacksToRun: [
      ...blockers.map((item) => `attack:${item}`),
      ...[...retest].map((item) => `attack:${item}`),
    ],
    truthBoundary: 'This gate evaluates changes in observed agent authority. BLOCK means a release must not proceed until the newly reachable effect or removed control is attacked and contained; it is not a universal vulnerability verdict.',
  }
}
