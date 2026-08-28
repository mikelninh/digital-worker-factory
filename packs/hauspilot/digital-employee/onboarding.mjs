const ALLOWED_WORKFLOWS = new Set(['repair_intake']);

export function validateSelfServiceConfig(config = {}) {
  const errors = [];
  if (!String(config.company || '').trim()) errors.push('company_required');
  if (!ALLOWED_WORKFLOWS.has(config.workflow)) errors.push('supported_workflow_required');
  if (!String(config.manager || '').trim()) errors.push('manager_required');
  if (!String(config.reviewer || '').trim()) errors.push('reviewer_required');
  if (config.privacy_scope_confirmed !== true) errors.push('privacy_scope_confirmation_required');
  if (!Array.isArray(config.allowed_sources) || !config.allowed_sources.length) errors.push('allowed_sources_required');
  if (!Array.isArray(config.forbidden_actions) || !config.forbidden_actions.length) errors.push('forbidden_actions_required');
  if (Number(config.initial_autonomy_level) > 2) errors.push('initial_autonomy_must_start_at_copilot_or_lower');
  return { ok: errors.length === 0, errors };
}

export function buildWorkerConfig(config = {}, contract = {}) {
  const gate = validateSelfServiceConfig(config);
  if (!gate.ok) throw new Error(`self_service_onboarding_blocked:${gate.errors.join(',')}`);
  return {
    worker_id: contract?.worker?.id || 'mara-maintenance-coordinator',
    worker_name: contract?.worker?.name || 'Mara',
    role: contract?.worker?.role || 'Digital Maintenance Coordinator',
    company: config.company.trim(),
    workflow: config.workflow,
    manager: config.manager.trim(),
    reviewer: config.reviewer.trim(),
    autonomy_level: Number(config.initial_autonomy_level ?? contract?.worker?.default_autonomy_level ?? 2),
    allowed_sources: [...config.allowed_sources],
    forbidden_actions: [...config.forbidden_actions],
    privacy_scope_confirmed: true,
    activation_state: 'READY_FOR_SHADOW_TEST',
  };
}
