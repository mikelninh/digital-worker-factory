const SECRET_KEYS = /secret|token|password|api[-_]?key|authorization/i

function requireContext(ctx = {}) {
  if (!ctx.tenantId) throw new Error('tenant_required')
  if (!ctx.actorId) throw new Error('actor_required')
  if (!ctx.role) throw new Error('role_required')
  return ctx
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.test(k) ? '[REDACTED]' : redact(v)]))
  }
  return value
}

function assertAdapter(name, adapter, methods) {
  if (!adapter) throw new Error(`${name}_adapter_required`)
  for (const method of methods) if (typeof adapter[method] !== 'function') throw new Error(`${name}_${method}_required`)
}

export function createProductionPlatform({ persistence, objectStore, queue, audit, idempotency, clock = () => new Date() } = {}) {
  assertAdapter('persistence', persistence, ['put', 'get', 'deleteTenant', 'health'])
  assertAdapter('object_store', objectStore, ['put', 'get', 'deleteTenant', 'health'])
  assertAdapter('queue', queue, ['enqueue', 'claim', 'complete', 'fail', 'health'])
  assertAdapter('audit', audit, ['append', 'health'])
  assertAdapter('idempotency', idempotency, ['reserve', 'complete', 'health'])

  const emit = async (ctx, event, payload = {}) => audit.append({
    at: clock().toISOString(), tenantId: ctx.tenantId, actorId: ctx.actorId, role: ctx.role,
    requestId: ctx.requestId ?? null, event, payload: redact(payload),
  })

  return {
    async putRecord(ctx, namespace, id, value) {
      requireContext(ctx)
      await persistence.put({ tenantId: ctx.tenantId, namespace, id, value })
      await emit(ctx, 'record.put', { namespace, id })
      return { ok: true }
    },

    async getRecord(ctx, namespace, id) {
      requireContext(ctx)
      return persistence.get({ tenantId: ctx.tenantId, namespace, id })
    },

    async putObject(ctx, key, bytes, metadata = {}) {
      requireContext(ctx)
      await objectStore.put({ tenantId: ctx.tenantId, key, bytes, metadata })
      await emit(ctx, 'object.put', { key, metadata })
      return { ok: true }
    },

    async enqueueEffect(ctx, { kind, payload, idempotencyKey }) {
      requireContext(ctx)
      if (!idempotencyKey) throw new Error('idempotency_key_required')
      const reservation = await idempotency.reserve({ tenantId: ctx.tenantId, key: idempotencyKey })
      if (!reservation.created) return { ok: true, duplicate: true, jobId: reservation.result?.jobId ?? null }
      const job = await queue.enqueue({ tenantId: ctx.tenantId, kind, payload: redact(payload), idempotencyKey })
      await idempotency.complete({ tenantId: ctx.tenantId, key: idempotencyKey, result: { jobId: job.id } })
      await emit(ctx, 'effect.enqueued', { kind, jobId: job.id, idempotencyKey })
      return { ok: true, duplicate: false, jobId: job.id }
    },

    async claimJob(workerId) { return queue.claim({ workerId }) },
    async completeJob(ctx, jobId, result = {}) { requireContext(ctx); await queue.complete({ jobId, result: redact(result) }); await emit(ctx, 'job.completed', { jobId }); },
    async failJob(ctx, jobId, error) { requireContext(ctx); const state = await queue.fail({ jobId, error: String(error) }); await emit(ctx, state.deadLettered ? 'job.dead_lettered' : 'job.retry_scheduled', { jobId, attempts: state.attempts }); return state },

    async deleteTenant(ctx) {
      requireContext(ctx)
      await objectStore.deleteTenant({ tenantId: ctx.tenantId })
      await persistence.deleteTenant({ tenantId: ctx.tenantId })
      await emit(ctx, 'tenant.deleted', {})
      return { ok: true }
    },

    async readiness() {
      const checks = {
        persistence: await persistence.health(), objectStore: await objectStore.health(), queue: await queue.health(),
        audit: await audit.health(), idempotency: await idempotency.health(),
      }
      const required = Object.entries(checks).flatMap(([name, state]) => {
        const missing = []
        if (!state?.ok) missing.push(`${name}_unhealthy`)
        if (!state?.durable) missing.push(`${name}_not_durable`)
        if (state?.tenantScoped === false) missing.push(`${name}_not_tenant_scoped`)
        return missing
      })
      return {
        ready: required.length === 0,
        stage: required.length === 0 ? 'ENGINEERING_PRODUCTION_READY' : 'CONTROLLED_PRODUCTION_CANDIDATE',
        checks, missing: required,
        truthBoundary: 'Engineering readiness does not replace domain validation, customer acceptance, security review or real integration evidence.',
      }
    },
  }
}

export { redact }
