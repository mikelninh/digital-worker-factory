export const RETAINER_STATES = Object.freeze(['DRAFT','ACTIVE_MANAGED_OPS','PAUSED','CLOSED']);
export const CYCLE_STATES = Object.freeze(['RECEIVED','PREFLIGHT','RUNNING','REVIEW','PROOF','KEEP','FIX','ESCALATE','BLOCKED']);

const cycleTransitions = Object.freeze({
  RECEIVED: ['PREFLIGHT','BLOCKED'],
  PREFLIGHT: ['RUNNING','BLOCKED'],
  RUNNING: ['REVIEW','BLOCKED'],
  REVIEW: ['PROOF','BLOCKED'],
  PROOF: ['KEEP','FIX','ESCALATE'],
  KEEP: [], FIX: [], ESCALATE: [], BLOCKED: []
});

export function canAdvanceCycle(from, to) {
  return (cycleTransitions[from] || []).includes(to);
}

export function advanceCycle(cycle, to, note='') {
  if (!CYCLE_STATES.includes(cycle.status)) throw new Error(`unknown cycle state: ${cycle.status}`);
  if (!CYCLE_STATES.includes(to)) throw new Error(`unknown target state: ${to}`);
  if (!canAdvanceCycle(cycle.status, to)) throw new Error(`invalid transition: ${cycle.status} -> ${to}`);
  const now = new Date().toISOString();
  return {
    ...cycle,
    status: to,
    updated_at: now,
    history: [...(cycle.history || []), { from: cycle.status, to, at: now, note }]
  };
}

export function validateRetainerActivation(r) {
  const errors=[];
  if (r.pilot_verdict !== 'KEEP') errors.push('pilot_verdict_must_be_KEEP');
  if (!r.workflow) errors.push('workflow_required');
  if (!r.customer_reviewer) errors.push('customer_reviewer_required');
  if (!r.operations_owner) errors.push('operations_owner_required');
  if (!r.cadence) errors.push('cadence_required');
  if (!r.privacy_scope_confirmed) errors.push('privacy_scope_confirmed_required');
  if (!r.retention_confirmed) errors.push('retention_confirmed_required');
  return { ok: errors.length===0, errors };
}

export function activateRetainer(r) {
  const gate=validateRetainerActivation(r);
  if (!gate.ok) throw new Error(`retainer activation blocked: ${gate.errors.join(',')}`);
  return {...r,status:'ACTIVE_MANAGED_OPS',activated_at:new Date().toISOString()};
}

export function newCycle(retainer, cycleId) {
  if (retainer.status !== 'ACTIVE_MANAGED_OPS') throw new Error('retainer_not_active');
  if (!cycleId) throw new Error('cycle_id_required');
  return {
    cycle_id: cycleId,
    retainer_id: retainer.retainer_id,
    customer: retainer.customer,
    workflow: retainer.workflow,
    status: 'RECEIVED',
    scope_snapshot: {
      data_mode: retainer.data_mode,
      cadence: retainer.cadence,
      customer_reviewer: retainer.customer_reviewer,
      operations_owner: retainer.operations_owner
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    history: []
  };
}
