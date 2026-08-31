function scopedKey(tenantId, ...parts) { return [tenantId, ...parts].join('::') }

export function memoryPersistence({ durable = false } = {}) {
  const data = new Map()
  return {
    async put({ tenantId, namespace, id, value }) { data.set(scopedKey(tenantId, namespace, id), structuredClone(value)) },
    async get({ tenantId, namespace, id }) { return structuredClone(data.get(scopedKey(tenantId, namespace, id)) ?? null) },
    async deleteTenant({ tenantId }) { for (const key of [...data.keys()]) if (key.startsWith(`${tenantId}::`)) data.delete(key) },
    async health() { return { ok: true, durable, tenantScoped: true } },
    snapshot() { return structuredClone([...data.entries()]) },
    restore(snapshot) { data.clear(); for (const [k, v] of snapshot) data.set(k, structuredClone(v)) },
  }
}

export function memoryObjectStore({ durable = false } = {}) {
  const data = new Map()
  return {
    async put({ tenantId, key, bytes, metadata }) { data.set(scopedKey(tenantId, key), { bytes: Buffer.from(bytes), metadata: structuredClone(metadata) }) },
    async get({ tenantId, key }) { const item = data.get(scopedKey(tenantId, key)); return item ? { bytes: Buffer.from(item.bytes), metadata: structuredClone(item.metadata) } : null },
    async deleteTenant({ tenantId }) { for (const key of [...data.keys()]) if (key.startsWith(`${tenantId}::`)) data.delete(key) },
    async health() { return { ok: true, durable, tenantScoped: true } },
  }
}

export function memoryAudit({ durable = false } = {}) {
  const events = []
  return { async append(event) { events.push(structuredClone(event)) }, async health() { return { ok: true, durable, tenantScoped: true } }, events: () => structuredClone(events) }
}

export function memoryIdempotency({ durable = false } = {}) {
  const data = new Map()
  return {
    async reserve({ tenantId, key }) { const k = scopedKey(tenantId, key); if (data.has(k)) return { created: false, result: structuredClone(data.get(k).result) }; data.set(k, { result: null }); return { created: true } },
    async complete({ tenantId, key, result }) { data.set(scopedKey(tenantId, key), { result: structuredClone(result) }) },
    async health() { return { ok: true, durable, tenantScoped: true } },
  }
}

export function memoryQueue({ durable = false, maxAttempts = 3 } = {}) {
  const jobs = new Map(); let seq = 0
  return {
    async enqueue({ tenantId, kind, payload, idempotencyKey }) { const id = `job_${++seq}`; jobs.set(id, { id, tenantId, kind, payload, idempotencyKey, status: 'queued', attempts: 0 }); return { id } },
    async claim({ workerId }) { const job = [...jobs.values()].find(j => j.status === 'queued'); if (!job) return null; job.status = 'running'; job.workerId = workerId; job.attempts += 1; return structuredClone(job) },
    async complete({ jobId, result }) { const job = jobs.get(jobId); if (!job) throw new Error('job_not_found'); job.status = 'done'; job.result = structuredClone(result) },
    async fail({ jobId, error }) { const job = jobs.get(jobId); if (!job) throw new Error('job_not_found'); job.lastError = error; const deadLettered = job.attempts >= maxAttempts; job.status = deadLettered ? 'dead-letter' : 'queued'; return { attempts: job.attempts, deadLettered } },
    async health() { return { ok: true, durable, tenantScoped: true } },
    jobs: () => structuredClone([...jobs.values()]),
  }
}
