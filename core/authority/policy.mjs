export const AUTONOMY_LEVELS = Object.freeze({
  OBSERVE: 0,
  DRAFT: 1,
  APPROVE_EACH: 2,
  BOUNDED_AUTO: 3,
  SUPERVISED_AUTO: 4,
  DELEGATED: 5,
})

export const DECISIONS = Object.freeze({
  ALLOW: 'ALLOW',
  APPROVAL: 'APPROVAL',
  BLOCK: 'BLOCK',
})

function finiteNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function timestamp(value) {
  if (!value) return null
  const n = Date.parse(value)
  return Number.isFinite(n) ? n : null
}

function hasEvidence(evidence, key) {
  if (Array.isArray(evidence?.claims)) return evidence.claims.includes(key)
  if (evidence?.claims && typeof evidence.claims === 'object') return Boolean(evidence.claims[key])
  return Boolean(evidence?.[key])
}

export function evaluatePromotionGate(metrics = {}, gate = {}) {
  const reasons = []
  const cases = finiteNumber(metrics.cases)
  const acceptanceRate = finiteNumber(metrics.acceptanceRate ?? metrics.acceptance_rate)
  const correctionRate = finiteNumber(metrics.correctionRate ?? metrics.correction_rate, 1)
  const unsafeExecutions = finiteNumber(metrics.unsafeExecutions ?? metrics.unsafe_executions)

  if (cases < finiteNumber(gate.minCases ?? gate.min_cases)) reasons.push('insufficient_cases')
  if (acceptanceRate < finiteNumber(gate.minAcceptanceRate ?? gate.min_acceptance_rate)) reasons.push('acceptance_rate_below_gate')
  if (correctionRate > finiteNumber(gate.maxCorrectionRate ?? gate.max_correction_rate)) reasons.push('correction_rate_above_gate')
  if (unsafeExecutions > finiteNumber(gate.maxUnsafeExecutions ?? gate.max_unsafe_executions)) reasons.push('unsafe_execution_history')

  return { earned: reasons.length === 0, reasons }
}

export function evaluateAuthority({
  policy,
  actor,
  principal,
  delegation,
  action = {},
  evidence = {},
  metrics = {},
  approval = null,
  budget = null,
  now = new Date().toISOString(),
} = {}) {
  const actionType = String(action.type || 'unknown')
  const actionPolicy = policy?.actions?.[actionType]
  const reasons = []

  if (!actionPolicy) {
    return { decision: DECISIONS.BLOCK, executionAllowed: false, actionType, reasons: ['unknown_action'] }
  }

  if (!actor?.id) reasons.push('missing_actor')
  if (!actor?.role) reasons.push('missing_role')
  if (!principal?.id) reasons.push('missing_principal')
  if (!delegation?.id) reasons.push('missing_delegation')
  if (reasons.length) {
    return { decision: DECISIONS.BLOCK, executionAllowed: false, actionType, reasons }
  }

  if (delegation.revoked === true) reasons.push('delegation_revoked')
  if (delegation.delegateId && delegation.delegateId !== actor.id) reasons.push('delegation_actor_mismatch')
  if (delegation.principalId && delegation.principalId !== principal.id) reasons.push('delegation_principal_mismatch')
  if (!Array.isArray(delegation.scopes) || !delegation.scopes.includes(actionType)) reasons.push('delegation_scope_missing')

  const nowTs = timestamp(now) ?? Date.now()
  const validFrom = timestamp(delegation.validFrom)
  const validUntil = timestamp(delegation.validUntil)
  if (validFrom != null && nowTs < validFrom) reasons.push('delegation_not_yet_valid')
  if (validUntil != null && nowTs > validUntil) reasons.push('delegation_expired')

  const purpose = String(action.purpose || '')
  if (!Array.isArray(delegation.purposes) || delegation.purposes.length === 0 || !delegation.purposes.includes(purpose)) {
    reasons.push('delegation_purpose_missing')
  }
  if (Array.isArray(actionPolicy.allowedPurposes) && actionPolicy.allowedPurposes.length > 0 && !actionPolicy.allowedPurposes.includes(purpose)) {
    reasons.push('action_purpose_not_allowed')
  }

  if (Array.isArray(actionPolicy.allowedRoles) && !actionPolicy.allowedRoles.includes(actor.role)) {
    reasons.push(`role_not_allowed:${actor.role}`)
  }

  if (actionPolicy.blocked === true) reasons.push('hard_blocked_action')

  const hardEscalations = new Set(policy?.hardEscalations || policy?.hard_escalations || [])
  for (const flag of evidence.flags || []) {
    if (hardEscalations.has(flag)) reasons.push(`hard_escalation:${flag}`)
  }

  for (const required of actionPolicy.requiredEvidence || []) {
    if (!hasEvidence(evidence, required)) reasons.push(`required_evidence_missing:${required}`)
  }

  if (actionPolicy.approvedCounterpartyOnly === true && action.counterpartyApproved !== true) {
    reasons.push('counterparty_not_approved')
  }

  const amount = action.amount
  if (amount != null) {
    const currency = typeof amount === 'object' ? String(amount.currency || '') : String(action.currency || '')
    const value = finiteNumber(typeof amount === 'object' ? amount.value : amount)
    const actionLimit = actionPolicy.maxAmount
    if (actionLimit && String(actionLimit.currency) === currency && value > finiteNumber(actionLimit.value)) {
      reasons.push('action_budget_exceeded')
    }
    if (budget && String(budget.currency) === currency) {
      const projected = finiteNumber(budget.spent) + value
      if (projected > finiteNumber(budget.limit)) reasons.push('delegated_budget_exceeded')
    }
  }

  if (reasons.length) {
    return {
      decision: DECISIONS.BLOCK,
      executionAllowed: false,
      actionType,
      reasons: [...new Set(reasons)],
      authority: { policyVersion: policy?.version ?? null, autonomyLevel: finiteNumber(actor.autonomyLevel) },
    }
  }

  const autonomyLevel = finiteNumber(actor.autonomyLevel)
  const minAutonomyLevel = finiteNumber(actionPolicy.minAutonomyLevel, AUTONOMY_LEVELS.DELEGATED + 1)
  const approvalRequired = actionPolicy.requiresApproval === true || autonomyLevel < minAutonomyLevel

  if (approval?.approvedBy) {
    if (approval.actionType !== actionType) reasons.push('approval_action_mismatch')
    if (approval.delegationId !== delegation.id) reasons.push('approval_delegation_mismatch')
    const approvalValidUntil = timestamp(approval.validUntil)
    if (approvalValidUntil != null && nowTs > approvalValidUntil) reasons.push('approval_expired')
    if (reasons.length) {
      return {
        decision: DECISIONS.BLOCK,
        executionAllowed: false,
        actionType,
        reasons: [...new Set(reasons)],
        authority: { policyVersion: policy?.version ?? null, autonomyLevel, minAutonomyLevel },
      }
    }
  }

  if (approvalRequired && !approval?.approvedBy) {
    return {
      decision: DECISIONS.APPROVAL,
      executionAllowed: false,
      actionType,
      reasons: [actionPolicy.requiresApproval === true ? 'explicit_approval_required' : 'autonomy_level_below_action_gate'],
      authority: { policyVersion: policy?.version ?? null, autonomyLevel, minAutonomyLevel },
    }
  }

  if (!approval?.approvedBy && minAutonomyLevel >= AUTONOMY_LEVELS.BOUNDED_AUTO) {
    const gate = policy?.promotionGates?.[String(minAutonomyLevel)] || policy?.promotion_gates?.[String(minAutonomyLevel)]
    if (gate) {
      const performance = evaluatePromotionGate(metrics, gate)
      if (!performance.earned) {
        return {
          decision: DECISIONS.APPROVAL,
          executionAllowed: false,
          actionType,
          reasons: ['autonomy_not_earned', ...performance.reasons],
          authority: { policyVersion: policy?.version ?? null, autonomyLevel, minAutonomyLevel },
        }
      }
    }
  }

  return {
    decision: DECISIONS.ALLOW,
    executionAllowed: true,
    actionType,
    reasons: [approval?.approvedBy ? 'human_approval_present' : 'within_delegated_authority'],
    approvalRequired,
    authority: { policyVersion: policy?.version ?? null, autonomyLevel, minAutonomyLevel },
  }
}
