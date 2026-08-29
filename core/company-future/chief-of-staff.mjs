export function buildChiefOfStaffBrief({ proof } = {}) {
  if (!proof?.scale || !proof?.operatingDay) throw new Error('company_proof_required')

  const approvals = Number(proof.operatingDay.counts?.approval_required || 0)
  const failures = Number(proof.operatingDay.counts?.failed || 0)
  const blocks = Number(proof.operatingDay.counts?.blocked || 0)
  const automated = Number(proof.operatingDay.counts?.executed || 0)
  const unsafeSignals = [
    ['unauthorized_provider_calls', proof.scale.unauthorizedProviderCalls],
    ['duplicate_consequences', proof.scale.duplicateConsequences],
    ['post_revocation_executions', proof.scale.postRevocationExecutions],
    ['budget_invariant_violations', proof.scale.budgetInvariantViolations],
  ].filter(([, value]) => Number(value || 0) > 0)

  const autonomy = proof.progressiveAutonomy || {}
  const autonomyChanges = []
  if (autonomy.bounded?.promoted) autonomyChanges.push({ workerClass: 'novice_to_bounded', recommendedLevel: autonomy.bounded.eligibleLevel })
  if (autonomy.supervised?.promoted) autonomyChanges.push({ workerClass: 'bounded_to_supervised', recommendedLevel: autonomy.supervised.eligibleLevel })
  if (autonomy.regression?.demotionRequired) autonomyChanges.push({ workerClass: 'unsafe_regression', recommendedLevel: autonomy.regression.eligibleLevel, action: 'reduce_authority' })

  const queue = [
    ...(approvals > 0 ? [{ type: 'approval_queue', count: approvals, priority: 'high', humanDecisionRequired: true }] : []),
    ...(failures > 0 ? [{ type: 'provider_reconciliation', count: failures, priority: 'high', humanDecisionRequired: true }] : []),
    ...(autonomyChanges.length > 0 ? [{ type: 'autonomy_review', count: autonomyChanges.length, priority: 'medium', humanDecisionRequired: true }] : []),
  ]

  return {
    title: 'Company of the Future — Operator Brief',
    workforce: proof.operatingDay.workforce,
    today: {
      decisions: proof.operatingDay.counts?.decisions ?? 0,
      automated,
      blockedWithoutHumanWork: blocks,
      humanAttentionItems: approvals + failures,
      estimatedHumanMinutes: proof.operatingDay.estimatedHumanMinutes ?? null,
    },
    safety: {
      healthy: unsafeSignals.length === 0,
      unsafeSignals,
      receiptCoverage: proof.scale.receiptCoverage,
    },
    queue,
    autonomyChanges,
    governmentProof: proof.government,
    permissions: {
      canReadAuthorityState: true,
      canSummarize: true,
      canRecommend: true,
      canApprove: false,
      canExpandAuthority: false,
      canExecuteConsequentialActions: false,
    },
  }
}
