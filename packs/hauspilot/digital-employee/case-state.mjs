export const CASE_STATES = Object.freeze([
  'NEW',
  'ACTIVE',
  'WAITING_EXTERNAL',
  'WAITING_HUMAN',
  'SCHEDULED',
  'BLOCKED',
  'RESOLVED',
  'CLOSED',
]);

const TRANSITIONS = Object.freeze({
  NEW: ['ACTIVE', 'BLOCKED'],
  ACTIVE: ['WAITING_EXTERNAL', 'WAITING_HUMAN', 'SCHEDULED', 'BLOCKED', 'RESOLVED'],
  WAITING_EXTERNAL: ['ACTIVE', 'SCHEDULED', 'BLOCKED'],
  WAITING_HUMAN: ['ACTIVE', 'BLOCKED'],
  SCHEDULED: ['ACTIVE', 'BLOCKED'],
  BLOCKED: ['ACTIVE', 'CLOSED'],
  RESOLVED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
});

function nowIso(clock) {
  return (clock ? new Date(clock) : new Date()).toISOString();
}

export function createCase({ case_id, worker_id, workflow = 'repair_intake', clock } = {}) {
  if (!case_id) throw new Error('case_id_required');
  if (!worker_id) throw new Error('worker_id_required');
  const at = nowIso(clock);
  return {
    case_id,
    worker_id,
    workflow,
    status: 'NEW',
    wake_at: null,
    waiting_for: null,
    created_at: at,
    updated_at: at,
    version: 1,
    history: [],
  };
}

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function transitionCase(caseState, to, { reason = '', wake_at = null, waiting_for = null, clock } = {}) {
  if (!CASE_STATES.includes(caseState?.status)) throw new Error(`unknown_case_state:${caseState?.status}`);
  if (!CASE_STATES.includes(to)) throw new Error(`unknown_target_state:${to}`);
  if (!canTransition(caseState.status, to)) throw new Error(`invalid_case_transition:${caseState.status}->${to}`);
  const at = nowIso(clock);
  return {
    ...caseState,
    status: to,
    wake_at: to === 'SCHEDULED' ? wake_at : null,
    waiting_for: ['WAITING_EXTERNAL', 'WAITING_HUMAN'].includes(to) ? waiting_for : null,
    updated_at: at,
    version: Number(caseState.version || 0) + 1,
    history: [...(caseState.history || []), { from: caseState.status, to, at, reason }],
  };
}

export function scheduleWake(caseState, wakeAt, reason = 'timer', clock) {
  if (!wakeAt || Number.isNaN(Date.parse(wakeAt))) throw new Error('valid_wake_at_required');
  return transitionCase(caseState, 'SCHEDULED', { reason, wake_at: new Date(wakeAt).toISOString(), clock });
}

export function isWakeDue(caseState, clock = new Date()) {
  if (caseState?.status !== 'SCHEDULED' || !caseState.wake_at) return false;
  return Date.parse(caseState.wake_at) <= new Date(clock).getTime();
}

export function wakeCase(caseState, { event = 'timer', clock } = {}) {
  if (caseState?.status === 'SCHEDULED' && !isWakeDue(caseState, clock || new Date())) throw new Error('wake_not_due');
  if (!['SCHEDULED', 'WAITING_EXTERNAL', 'WAITING_HUMAN'].includes(caseState?.status)) throw new Error('case_not_waiting');
  return transitionCase(caseState, 'ACTIVE', { reason: `wake:${event}`, clock });
}
