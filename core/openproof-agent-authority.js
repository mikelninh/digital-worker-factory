/* Digital Worker Factory × OpenProof — Agent Authority MVP.
 *
 * The public proof answers only: was this exact action inside a valid,
 * human-approved authority envelope? It intentionally does not publish the
 * full capability set, internal policy, approval notes or unrelated limits.
 *
 * `agent-authority-local-v0` is a local commitment/predicate backend, not ZK.
 * Midnight is the target verification backend for production proof claims.
 */
const crypto = require('node:crypto');

const VERSION = 'openproof/0.1';
const PURPOSE = 'agent.action.authority';
const BACKEND = 'agent-authority-local-v0';

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createAgentAuthorityProof({ authority, action, nonce, now = new Date() }) {
  if (!authority || !action || !nonce) throw new Error('authority, action and nonce are required');
  if (!action.capability) throw new Error('action.capability required');

  const expiresAt = Date.parse(authority.valid_until || '');
  const predicates = [
    {
      id: 'capability_present',
      claim: 'authority.capabilities',
      op: 'contains',
      passed: Array.isArray(authority.capabilities) && authority.capabilities.includes(action.capability),
    },
    {
      id: 'amount_within_limit',
      claim: 'authority.amount_limit_eur',
      op: 'gte_requested_amount',
      passed: Number.isFinite(action.amount_eur) && Number.isFinite(authority.amount_limit_eur)
        ? action.amount_eur <= authority.amount_limit_eur
        : action.amount_eur == null,
    },
    {
      id: 'human_approval_present',
      claim: 'authority.human_approval',
      op: 'eq_true',
      passed: authority.human_approval === true,
    },
    {
      id: 'credential_current',
      claim: 'authority.valid_until',
      op: 'not_expired',
      passed: Number.isFinite(expiresAt) && expiresAt >= now.getTime(),
    },
    {
      id: 'action_scope_matches',
      claim: 'authority.scope',
      op: 'eq',
      passed: authority.scope === action.scope,
    },
  ];

  const privateWitness = { authority, action };
  return {
    openproof: VERSION,
    backend: BACKEND,
    purpose: PURPOSE,
    subject: action.agent_id,
    action_id: action.id,
    action_kind: action.kind,
    claims_commitment: `sha256:${sha256(`${canonical(privateWitness)}:${nonce}`)}`,
    predicate_results: predicates,
    disclosures: {
      capability: action.capability,
      action_kind: action.kind,
      action_id: action.id,
    },
    decision: predicates.every(x => x.passed) ? 'AUTHORIZED' : 'BLOCK',
    execution_boundary: 'proof_never_executes_action',
  };
}

function verifyAgentAuthorityProof(proof, { actionId, capability } = {}) {
  const errors = [];
  if (proof?.openproof !== VERSION) errors.push('openproof version mismatch');
  if (proof?.purpose !== PURPOSE) errors.push('purpose mismatch');
  if (!String(proof?.claims_commitment || '').startsWith('sha256:')) errors.push('claims commitment missing');
  if (proof?.execution_boundary !== 'proof_never_executes_action') errors.push('execution boundary missing');
  if (actionId && proof?.action_id !== actionId) errors.push('action id mismatch');
  if (capability && proof?.disclosures?.capability !== capability) errors.push('capability mismatch');

  const required = new Set([
    'capability_present',
    'amount_within_limit',
    'human_approval_present',
    'credential_current',
    'action_scope_matches',
  ]);
  const results = new Map((proof?.predicate_results || []).map(x => [x.id, x]));
  for (const id of required) {
    if (!results.has(id)) errors.push(`missing predicate: ${id}`);
    else if (results.get(id).passed !== true) errors.push(`predicate failed: ${id}`);
  }
  if (proof?.decision !== 'AUTHORIZED') errors.push('authority decision is not AUTHORIZED');

  return { ok: errors.length === 0, errors };
}

module.exports = { VERSION, PURPOSE, BACKEND, createAgentAuthorityProof, verifyAgentAuthorityProof };
