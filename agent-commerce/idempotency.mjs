import crypto from 'node:crypto'

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function normalizeIdempotencyKey(value) {
  const key = String(value ?? '').trim()
  if (!key) return null
  if (!IDEMPOTENCY_KEY_RE.test(key)) throw new Error('idempotency_key_invalid')
  return key
}

export class MemoryIdempotencyStore {
  constructor({ ttlMs = 15 * 60_000, maxEntries = 10_000 } = {}) {
    if (!Number.isInteger(ttlMs) || ttlMs < 1_000) throw new Error('idempotency_ttl_invalid')
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error('idempotency_max_entries_invalid')
    this.ttlMs = ttlMs
    this.maxEntries = maxEntries
    this.records = new Map()
  }

  cleanup(now = Date.now()) {
    for (const [key, record] of this.records) if (record.expiresAt <= now) this.records.delete(key)
    while (this.records.size > this.maxEntries) this.records.delete(this.records.keys().next().value)
  }

  begin({ tenant = 'public', capabilityId, key, request }) {
    if (!capabilityId) throw new Error('idempotency_capability_required')
    const normalized = normalizeIdempotencyKey(key)
    if (!normalized) return { status: 'disabled' }
    this.cleanup()
    const storeKey = `${tenant}:${capabilityId}:${normalized}`
    const requestHash = hash(request)
    const existing = this.records.get(storeKey)
    if (existing) {
      if (existing.requestHash !== requestHash) throw new Error('idempotency_key_conflict')
      return existing.status === 'complete'
        ? { status: 'replay', response: existing.response }
        : { status: 'in_progress' }
    }
    this.records.set(storeKey, {
      requestHash,
      status: 'in_progress',
      response: null,
      expiresAt: Date.now() + this.ttlMs,
    })
    return { status: 'started', storeKey }
  }

  complete(storeKey, response) {
    if (!storeKey) return
    const existing = this.records.get(storeKey)
    if (!existing) throw new Error('idempotency_record_missing')
    this.records.set(storeKey, { ...existing, status: 'complete', response })
  }

  fail(storeKey) {
    if (storeKey) this.records.delete(storeKey)
  }
}

export function idempotencyMiddleware({
  store,
  capabilityId,
  tenantResolver = () => 'public',
  required = false,
} = {}) {
  if (!store || typeof store.begin !== 'function') throw new Error('idempotency_store_required')
  if (!capabilityId) throw new Error('idempotency_capability_required')

  return (req, res, next) => {
    try {
      const key = normalizeIdempotencyKey(req.get('idempotency-key'))
      if (required && !key) return res.status(400).json({ error: 'idempotency_key_required', requestId: res.locals.requestId ?? null })
      const state = store.begin({ tenant: tenantResolver(req, res), capabilityId, key, request: req.body })
      if (state.status === 'replay') {
        res.set('idempotency-replayed', 'true')
        return res.status(state.response.status).json(state.response.body)
      }
      if (state.status === 'in_progress') {
        return res.status(409).json({ error: 'idempotency_request_in_progress', requestId: res.locals.requestId ?? null })
      }
      res.locals.idempotency = state
      return next()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const status = message === 'idempotency_key_conflict' ? 409 : 400
      return res.status(status).json({ error: message, requestId: res.locals.requestId ?? null })
    }
  }
}

export function completeIdempotency(res, { status = 200, body }) {
  const state = res.locals.idempotency
  if (state?.status === 'started') res.app.locals.idempotencyStore?.complete(state.storeKey, { status, body })
}

export function failIdempotency(res) {
  const state = res.locals.idempotency
  if (state?.status === 'started') res.app.locals.idempotencyStore?.fail(state.storeKey)
}
