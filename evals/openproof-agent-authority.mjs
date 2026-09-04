import assert from 'node:assert/strict';
import Authority from '../core/openproof-agent-authority.js';

const authority = {
  capabilities: ['invoice.payment.prepare', 'maintenance.vendor.contact'],
  amount_limit_eur: 1000,
  human_approval: true,
  valid_until: '2026-09-30T23:59:59Z',
  scope: 'hausverwaltung-berlin-demo',
  private_policy_notes: 'never disclose this internal policy note',
};

const action = {
  id: 'act_invoice_1842',
  agent_id: 'agent_hauspilot_mara',
  kind: 'invoice.payment.prepare',
  capability: 'invoice.payment.prepare',
  amount_eur: 742,
  scope: 'hausverwaltung-berlin-demo',
  vendor_bank_account: 'DE00PRIVATE',
};

const proof = Authority.createAgentAuthorityProof({
  authority,
  action,
  nonce: 'fixed-test-nonce',
  now: new Date('2026-08-28T12:00:00Z'),
});

assert.equal(proof.decision, 'AUTHORIZED');
assert.deepEqual(Authority.verifyAgentAuthorityProof(proof, {
  actionId: action.id,
  capability: action.capability,
}), { ok: true, errors: [] });

const publicJson = JSON.stringify(proof);
assert.equal(publicJson.includes('never disclose this internal policy note'), false);
assert.equal(publicJson.includes('DE00PRIVATE'), false);
assert.equal(publicJson.includes('1000'), false, 'private total authority limit must not leak');
assert.equal(publicJson.includes('742'), false, 'requested amount need not be public in proof envelope');

const tooLarge = Authority.createAgentAuthorityProof({
  authority,
  action: { ...action, amount_eur: 1200 },
  nonce: 'n2',
  now: new Date('2026-08-28T12:00:00Z'),
});
assert.equal(tooLarge.decision, 'BLOCK');
assert(Authority.verifyAgentAuthorityProof(tooLarge).errors.includes('predicate failed: amount_within_limit'));

const noApproval = Authority.createAgentAuthorityProof({
  authority: { ...authority, human_approval: false },
  action,
  nonce: 'n3',
  now: new Date('2026-08-28T12:00:00Z'),
});
assert.equal(noApproval.decision, 'BLOCK');
assert(Authority.verifyAgentAuthorityProof(noApproval).errors.includes('predicate failed: human_approval_present'));

const missingCapability = Authority.createAgentAuthorityProof({
  authority,
  action: { ...action, capability: 'bank.account.change', kind: 'bank.account.change' },
  nonce: 'n4',
  now: new Date('2026-08-28T12:00:00Z'),
});
assert.equal(missingCapability.decision, 'BLOCK');
assert(Authority.verifyAgentAuthorityProof(missingCapability).errors.includes('predicate failed: capability_present'));

const expired = Authority.createAgentAuthorityProof({
  authority: { ...authority, valid_until: '2026-01-01T00:00:00Z' },
  action,
  nonce: 'n5',
  now: new Date('2026-08-28T12:00:00Z'),
});
assert.equal(expired.decision, 'BLOCK');
assert(Authority.verifyAgentAuthorityProof(expired).errors.includes('predicate failed: credential_current'));

console.log('OpenProof agent authority eval: PASS');
