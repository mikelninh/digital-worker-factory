export const AUTONOMY_LEVELS = Object.freeze({
  OBSERVE: 0,
  DRAFT: 1,
  COPILOT: 2,
  LIMITED_AUTO: 3,
  WORKFLOW_OWNER: 4,
  DIGITAL_EMPLOYEE: 5,
});

export const DECISIONS = Object.freeze({
  AUTO: 'AUTO',
  APPROVAL: 'APPROVAL',
  BLOCK: 'BLOCK',
});

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function evaluatePromotionGate(metrics = {}, gate = {}) {
  const cases = finiteNumber(metrics.cases);
  const acceptanceRate = finiteNumber(metrics.acceptance_rate);
  const correctionRate = finiteNumber(metrics.correction_rate, 1);
  const unsafeExecutions = finiteNumber(metrics.unsafe_executions);
  const reasons = [];

  if (cases < finiteNumber(gate.min_cases)) reasons.push('insufficient_cases');
  if (acceptanceRate < finiteNumber(gate.min_acceptance_rate)) reasons.push('acceptance_rate_below_gate');
  if (correctionRate > finiteNumber(gate.max_correction_rate)) reasons.push('correction_rate_above_gate');
  if (unsafeExecutions > finiteNumber(gate.max_unsafe_executions)) reasons.push('unsafe_execution_history');

  return { earned: reasons.length === 0, reasons };
}

export function evaluateAutonomy({
  contract,
  worker = {},
  action = {},
  evidence = {},
  metrics = {},
  humanApproval = false,
} = {}) {
  const actionType = String(action.type || 'unknown');
  const policy = contract?.authority_envelope?.[actionType];
  const reasons = [];
  const level = finiteNumber(worker.autonomy_level, finiteNumber(contract?.worker?.default_autonomy_level, 0));

  if (!policy) {
    return { decision: DECISIONS.BLOCK, execution_allowed: false, action_type: actionType, reasons: ['unknown_action'] };
  }
  if (policy.blocked === true) {
    return { decision: DECISIONS.BLOCK, execution_allowed: false, action_type: actionType, reasons: ['hard_blocked_action'] };
  }

  const hardEscalations = new Set(contract?.hard_escalations || []);
  for (const flag of evidence.flags || []) {
    if (hardEscalations.has(flag)) reasons.push(`hard_escalation:${flag}`);
  }
  if (evidence.identity_resolved === false) reasons.push('identity_not_resolved');
  if (evidence.required_complete === false) reasons.push('required_evidence_missing');
  if (reasons.length) {
    return { decision: DECISIONS.BLOCK, execution_allowed: false, action_type: actionType, reasons: [...new Set(reasons)] };
  }

  if (policy.approved_vendor_only && action.approved_vendor !== true) reasons.push('unapproved_vendor');
  if (policy.max_spend_eur != null && finiteNumber(action.spend_eur) > finiteNumber(policy.max_spend_eur)) reasons.push('budget_exceeded');
  if (reasons.length) {
    return { decision: DECISIONS.BLOCK, execution_allowed: false, action_type: actionType, reasons: [...new Set(reasons)] };
  }

  const autoMinLevel = finiteNumber(policy.auto_min_level, 6);
  if (humanApproval === true) {
    return {
      decision: DECISIONS.AUTO,
      execution_allowed: true,
      action_type: actionType,
      reasons: ['human_approval_present'],
      authority: { level, auto_min_level: autoMinLevel },
    };
  }

  if (level < autoMinLevel) {
    return {
      decision: DECISIONS.APPROVAL,
      execution_allowed: false,
      action_type: actionType,
      reasons: ['autonomy_level_below_action_gate'],
      authority: { level, auto_min_level: autoMinLevel },
    };
  }

  if (autoMinLevel >= AUTONOMY_LEVELS.LIMITED_AUTO) {
    const gate = contract?.promotion_gates?.[String(autoMinLevel)];
    const performance = evaluatePromotionGate(metrics, gate || {});
    if (!performance.earned) {
      return {
        decision: DECISIONS.APPROVAL,
        execution_allowed: false,
        action_type: actionType,
        reasons: ['autonomy_not_earned', ...performance.reasons],
        authority: { level, auto_min_level: autoMinLevel },
      };
    }
  }

  return {
    decision: DECISIONS.AUTO,
    execution_allowed: true,
    action_type: actionType,
    reasons: ['within_earned_authority_envelope'],
    authority: { level, auto_min_level: autoMinLevel },
  };
}
