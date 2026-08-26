export function enforceShadowPolicy(result, template, clientPolicy = {}) {
  const violations = [];
  const action = result?.proposed_action || {};
  const actionType = String(action.type || 'unknown');
  const neverAuto = new Set(template?.never_auto || []);
  const approvalRequired = new Set(template?.approval_required || []);

  if (neverAuto.has(actionType)) violations.push(`never_auto:${actionType}`);
  if (clientPolicy[actionType] === 'blocked') violations.push(`client_blocked:${actionType}`);
  if (approvalRequired.has(actionType)) violations.push(`human_approval:${actionType}`);
  if (action.external === true) violations.push('external_action');
  if (action.consequential === true) violations.push('consequential_action');

  return {
    ...result,
    approval_state: 'shadow_only',
    policy: {
      mode: 'shadow',
      execution_allowed: false,
      human_review_required: true,
      violations: [...new Set(violations)],
      reason: 'HausPilot V1 is observation/preparation only. No external or consequential action can execute.'
    }
  };
}

export function assertTemplateSafety(template) {
  const failures = [];
  if (!template?.id) failures.push('missing_template_id');
  if (!Array.isArray(template?.approval_required) || !template.approval_required.length) failures.push('missing_approval_gate');
  if (!Array.isArray(template?.never_auto) || !template.never_auto.length) failures.push('missing_never_auto');
  if ((template?.never_auto || []).includes('payment') === false && template?.id === 'invoice_review') failures.push('invoice_payment_not_blocked');
  return failures;
}
