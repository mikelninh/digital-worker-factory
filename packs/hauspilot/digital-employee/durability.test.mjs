import assert from 'node:assert/strict';
import { readFile, readFileSync } from 'node:fs';
import { mkdtemp, readFile as readFileAsync } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createCase, transitionCase, scheduleWake } from './case-state.mjs';
import { executeAuthorizedAction } from './executor.mjs';
import { createJsonCaseStore } from './store.mjs';
import { runDueCases } from './scheduler.mjs';
import { createSandboxOutboxAdapter } from './providers/sandbox-outbox.mjs';

const contract = JSON.parse(readFileSync(new URL('./contract.json', import.meta.url), 'utf8'));
const metrics = { cases: 80, acceptance_rate: 0.99, correction_rate: 0.01, unsafe_executions: 0 };
const evidence = { identity_resolved: true, required_complete: true, flags: [] };

test('durable JSON store persists cases and rejects stale concurrent writes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hauspilot-store-'));
  const store = createJsonCaseStore(root);
  const c0 = createCase({ case_id: 'CASE-2001', worker_id: 'mara', clock: '2026-08-28T08:00:00Z' });
  await store.put(c0);
  const c1 = transitionCase(c0, 'ACTIVE', { clock: '2026-08-28T08:01:00Z' });
  await store.put(c1, { expectedVersion: 1 });
  assert.equal((await store.get('CASE-2001')).status, 'ACTIVE');
  await assert.rejects(() => store.put(c0, { expectedVersion: 1 }), /case_version_conflict|case_version_regression/);
});

test('scheduler wakes only due persisted cases', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hauspilot-scheduler-'));
  const store = createJsonCaseStore(root);
  const a0 = createCase({ case_id: 'CASE-DUE', worker_id: 'mara', clock: '2026-08-28T08:00:00Z' });
  const a1 = transitionCase(a0, 'ACTIVE', { clock: '2026-08-28T08:01:00Z' });
  const due = scheduleWake(a1, '2026-08-29T08:00:00Z', 'follow_up', '2026-08-28T08:02:00Z');
  const b0 = createCase({ case_id: 'CASE-LATER', worker_id: 'mara', clock: '2026-08-28T08:00:00Z' });
  const b1 = transitionCase(b0, 'ACTIVE', { clock: '2026-08-28T08:01:00Z' });
  const later = scheduleWake(b1, '2026-09-01T08:00:00Z', 'follow_up', '2026-08-28T08:02:00Z');
  await store.put(due); await store.put(later);
  const seen = [];
  const woken = await runDueCases({ store, clock: '2026-08-29T08:00:00Z', onWake: async (item) => seen.push(item.case_id) });
  assert.deepEqual(woken.map((item) => item.case_id), ['CASE-DUE']);
  assert.deepEqual(seen, ['CASE-DUE']);
  assert.equal((await store.get('CASE-DUE')).status, 'ACTIVE');
  assert.equal((await store.get('CASE-LATER')).status, 'SCHEDULED');
});

test('sandbox outbound adapter is idempotent behind the earned-autonomy executor', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hauspilot-outbox-'));
  const adapter = createSandboxOutboxAdapter({ rootDir: root, channel: 'email' });
  const args = {
    contract,
    worker: { worker_id: 'mara', autonomy_level: 3 },
    action: { type: 'send_status_update', recipient: 'tenant@example.test', payload: { subject: 'Update' } },
    evidence,
    metrics,
    idempotencyKey: 'CASE-3001:status:1',
    adapters: { send_status_update: adapter },
  };
  const first = await executeAuthorizedAction(args);
  const second = await executeAuthorizedAction(args);
  assert.equal(first.result.deduplicated, false);
  assert.equal(second.result.deduplicated, true);
  const lines = (await readFileAsync(path.join(root, 'outbox', 'email.ndjson'), 'utf8')).trim().split('\n');
  assert.equal(lines.length, 1);
});
