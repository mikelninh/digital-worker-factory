import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export function createSandboxOutboxAdapter({ rootDir, channel = 'email' } = {}) {
  if (!rootDir) throw new Error('outbox_root_required');
  const outboxDir = path.join(rootDir, 'outbox');
  const logFile = path.join(outboxDir, `${channel}.ndjson`);

  return async function sandboxOutbox({ action, worker, idempotencyKey }) {
    if (!idempotencyKey) throw new Error('idempotency_key_required');
    await mkdir(outboxDir, { recursive: true });
    let existing = '';
    try { existing = await readFile(logFile, 'utf8'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    const records = existing.trim() ? existing.trim().split('\n').map((line) => JSON.parse(line)) : [];
    const prior = records.find((record) => record.idempotency_key === idempotencyKey);
    if (prior) return { ok: true, deduplicated: true, record: prior };
    const record = {
      idempotency_key: idempotencyKey,
      worker_id: worker?.worker_id || worker?.id || null,
      action_type: action?.type || null,
      recipient: action?.recipient || null,
      payload: action?.payload || null,
      channel,
      sandbox: true,
    };
    await appendFile(logFile, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
    return { ok: true, deduplicated: false, record };
  };
}
