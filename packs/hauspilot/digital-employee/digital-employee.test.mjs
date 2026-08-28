import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { evaluateAutonomy, DECISIONS, evaluatePromotionGate } from './autonomy.mjs';
import { createCase, transitionCase, scheduleWake, isWakeDue, wakeCase } from './case-state.mjs';
import { buildWorkerConfig, validateSelfServiceConfig } from './onboarding.mjs';
import { executeAuthorizedAction } from './executor.mjs';

const contract = JSON.parse(readFileSync(new URL('./contract.json', import.meta.url), 'utf8'));
const strongL3 = { cases: 80, acceptance_rate: 0.99, correction_rate: 0.01, unsafe_executions: 0 };
const strongL4 = { cases: 400, acceptance_rate: 0.995, correction_rate: 0.005, unsafe_executions: 0 };
const strongL5 = { cases: 1400, acceptance_rate: 0.998, correction_rate: 0.002, unsafe_executions: 0 };
const evidence = { identity_resolved: true, required_complete: true, flags: [] };

test('self-service onboarding starts safely at copilot or lower', () => {
  const bad = validateSelfServiceConfig({ company: 'Demo GmbH', workflow: 'repair_intake', manager: 'A', reviewer: 'B', privacy_scope_confirmed: true, allowed_sources: ['email'], forbidden_actions: ['payment'], initial_autonomy_level: 4 });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.includes('initial_autonomy_must_start_at_copilot_or_lower'));

  const worker = buildWorkerConfig({ company: 'Demo GmbH', workflow: 'repair_intake', manager: 'A', reviewer: 'B', privacy_scope_confirmed: true, allowed_sources: ['email'], forbidden_actions: ['payment'], initial_autonomy_level: 2 }, contract);
  assert.equal(worker.autonomy_level, 2);
  assert.equal(worker.activation_state, 'READY_FOR_SHADOW_TEST');
});

test('unknown and permanently blocked actions fail closed', () => {
  assert.equal(evaluateAutonomy({ contract, worker: { autonomy_level: 5 }, action: { type: 'mystery' }, evidence, metrics: strongL5 }).decision, DECISIONS.BLOCK);
  assert.equal(evaluateAutonomy({ contract, worker: { autonomy_level: 5 }, action: { type: 'payment' }, evidence, metrics: strongL5 }).decision, DECISIONS.BLOCK);
});

test('low-risk external communication becomes automatic only after earned level 3', () => {
  const before = evaluateAutonomy({ contract, worker: { autonomy_level: 2 }, action: { type: 'request_missing_information' }, evidence, metrics: strongL3 });
  assert.equal(before.decision, DECISIONS.APPROVAL);

  const weak = evaluateAutonomy({ contract, worker: { autonomy_level: 3 }, action: { type: 'request_missing_information' }, evidence, metrics: { cases: 10, acceptance_rate: 1, correction_rate: 0, unsafe_executions: 0 } });
  assert.equal(weak.decision, DECISIONS.APPROVAL);
  assert.ok(weak.reasons.includes('autonomy_not_earned'));

  const earned = evaluateAutonomy({ contract, worker: { autonomy_level: 3 }, action: { type: 'request_missing_information' }, evidence, metrics: strongL3 });
  assert.equal(earned.decision, DECISIONS.AUTO);
  assert.equal(earned.execution_allowed, true);
});

test('hard escalation evidence blocks even a level 5 worker', () => {
  const result = evaluateAutonomy({ contract, worker: { autonomy_level: 5 }, action: { type: 'send_status_update' }, evidence: { ...evidence, flags: ['legal_dispute'] }, metrics: strongL5 });
  assert.equal(result.decision, DECISIONS.BLOCK);
  assert.ok(result.reasons.includes('hard_escalation:legal_dispute'));
});

test('level 5 contractor order stays inside approved-vendor and budget envelope', () => {
  const ok = evaluateAutonomy({ contract, worker: { autonomy_level: 5 }, action: { type: 'contractor_order', approved_vendor: true, spend_eur: 180 }, evidence, metrics: strongL5 });
  assert.equal(ok.decision, DECISIONS.AUTO);

  const expensive = evaluateAutonomy({ contract, worker: { autonomy_level: 5 }, action: { type: 'contractor_order', approved_vendor: true, spend_eur: 300 }, evidence, metrics: strongL5 });
  assert.equal(expensive.decision, DECISIONS.BLOCK);
  assert.ok(expensive.reasons.includes('budget_exceeded'));

  const newVendor = evaluateAutonomy({ contract, worker: { autonomy_level: 5 }, action: { type: 'contractor_order', approved_vendor: false, spend_eur: 120 }, evidence, metrics: strongL5 });
  assert.equal(newVendor.decision, DECISIONS.BLOCK);
});

test('human approval can authorize an otherwise gated known action but never a hard-blocked one', () => {
  const approved = evaluateAutonomy({ contract, worker: { autonomy_level: 2 }, action: { type: 'appointment_commitment' }, evidence, metrics: {}, humanApproval: true });
  assert.equal(approved.decision, DECISIONS.AUTO);
  assert.equal(evaluateAutonomy({ contract, worker: { autonomy_level: 2 }, action: { type: 'payment' }, evidence, humanApproval: true }).decision, DECISIONS.BLOCK);
});

test('promotion gate requires safe performance evidence', () => {
  assert.equal(evaluatePromotionGate(strongL4, contract.promotion_gates['4']).earned, true);
  assert.equal(evaluatePromotionGate({ ...strongL4, unsafe_executions: 1 }, contract.promotion_gates['4']).earned, false);
});

test('durable cases survive waiting and timer wake cycles deterministically', () => {
  const c0 = createCase({ case_id: 'CASE-1729', worker_id: 'mara', clock: '2026-08-28T08:00:00Z' });
  const c1 = transitionCase(c0, 'ACTIVE', { reason: 'email_received', clock: '2026-08-28T08:01:00Z' });
  const c2 = transitionCase(c1, 'WAITING_EXTERNAL', { reason: 'need_tenant_photo', waiting_for: 'tenant', clock: '2026-08-28T08:02:00Z' });
  const c3 = wakeCase(c2, { event: 'tenant_reply', clock: '2026-08-29T08:00:00Z' });
  const c4 = scheduleWake(c3, '2026-08-30T08:00:00Z', 'contractor_follow_up', '2026-08-29T08:01:00Z');
  assert.equal(isWakeDue(c4, '2026-08-29T23:59:00Z'), false);
  assert.equal(isWakeDue(c4, '2026-08-30T08:00:00Z'), true);
  const c5 = wakeCase(c4, { event: 'timer', clock: '2026-08-30T08:00:00Z' });
  assert.equal(c5.status, 'ACTIVE');
  assert.equal(c5.version, 6);
  assert.equal(c5.history.length, 5);
});

test('executor calls exactly one explicit adapter for an authorized action', async () => {
  let calls = 0;
  const out = await executeAuthorizedAction({
    contract,
    worker: { worker_id: 'mara', autonomy_level: 3 },
    action: { type: 'send_status_update', external: true },
    evidence,
    metrics: strongL3,
    idempotencyKey: 'CASE-1:status:1',
    adapters: { send_status_update: async ({ idempotencyKey }) => { calls += 1; return { ok: true, idempotencyKey }; } },
  });
  assert.equal(out.decision.decision, DECISIONS.AUTO);
  assert.equal(out.trace.provider_called, true);
  assert.equal(calls, 1);
});

test('executor makes zero provider calls for approval, block or missing adapter', async () => {
  let calls = 0;
  const adapters = { send_status_update: async () => { calls += 1; } };
  const approval = await executeAuthorizedAction({ contract, worker: { autonomy_level: 2 }, action: { type: 'send_status_update' }, evidence, metrics: strongL3, idempotencyKey: 'x', adapters });
  assert.equal(approval.trace.provider_called, false);
  const blocked = await executeAuthorizedAction({ contract, worker: { autonomy_level: 5 }, action: { type: 'payment' }, evidence, metrics: strongL5, idempotencyKey: 'y', adapters });
  assert.equal(blocked.trace.provider_called, false);
  const missing = await executeAuthorizedAction({ contract, worker: { autonomy_level: 3 }, action: { type: 'request_missing_information' }, evidence, metrics: strongL3, idempotencyKey: 'z', adapters: {} });
  assert.equal(missing.decision.decision, DECISIONS.BLOCK);
  assert.ok(missing.decision.reasons.includes('missing_execution_adapter'));
  assert.equal(calls, 0);
});
