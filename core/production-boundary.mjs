import { TRUST_LEVELS, validateTrustChain } from './trust-chain.mjs'

const SECRET_KEY = /(authorization|cookie|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token|private[-_]?key)/i
const SECRET_VALUE = /(bearer\s+[a-z0-9._~-]+|sk-[a-z0-9_-]{8,})/i

export class ProductionContextError extends Error {
  constructor(code, message = code) {
    super(message)
    this.name = 'ProductionContextError'
    this.code = code
  }
}

export function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY.test(key) ? '[REDACTED]' : redactSensitive(entry),
    ]))
  }
  if (typeof value === 'string' && SECRET_VALUE.test(value)) return '[REDACTED]'
  return value
}

export function validateProductionContext({ tenantId, actor, requestId, purpose = 'business_operation' } = {}) {
  if (!tenantId || typeof tenantId !== 'string') throw new ProductionContextError('tenant_required')
  if (!actor?.id) throw new ProductionContextError('actor_required')
  if (!actor?.role) throw new ProductionContextError('actor_role_required')
  if (actor.tenantId && actor.tenantId !== tenantId) throw new ProductionContextError('cross_tenant_actor_blocked')
  if (!requestId || typeof requestId !== 'string') throw new ProductionContextError('request_id_required')
  if (!purpose || typeof purpose !== 'string') throw new ProductionContextError('purpose_required')
  return {
    tenantId,
    actor: { ...actor, tenantId },
    requestId,
    purpose,
  }
}

export class InMemoryIdempotencyStore {
  #claims = new Set()

  claim(key) {
    if (!key) throw new ProductionContextError('idempotency_key_required')
    if (this.#claims.has(key)) return false
    this.#claims.add(key)
    return true
  }

  release(key) {
    this.#claims.delete(key)
  }
}

export class MemoryAuditSink {
  durable = false
  #events = []

  async append(event) {
    this.#events.push(structuredClone(redactSensitive(event)))
  }

  events() {
    return this.#events.map((event) => structuredClone(event))
  }
}

export function evaluateProductionReadiness(config = {}) {
  const gates = {
    identity_and_access: Boolean(config.identityAndAccess),
    tenant_isolation: Boolean(config.tenantIsolation),
    durable_persistence: Boolean(config.durablePersistence),
    durable_audit: Boolean(config.durableAudit),
    durable_idempotency: Boolean(config.durableIdempotency),
    secret_management: Boolean(config.secretManagement),
    observability_and_slos: Boolean(config.observabilityAndSlos),
    retention_and_deletion: Boolean(config.retentionAndDeletion),
    backup_restore_tested: Boolean(config.backupRestoreTested),
    deployment_and_rollback: Boolean(config.deploymentAndRollback),
    trust_chain_enforced: Boolean(config.trustChainEnforced),
  }
  const missing = Object.entries(gates).filter(([, ok]) => !ok).map(([name]) => name)
  return {
    ready: missing.length === 0,
    gates,
    missing,
    truthBoundary: 'Engineering readiness does not replace domain validation, customer acceptance, legal review, clinical review or external security evidence.',
  }
}

export class ProductionAgentGateway {
  #gateway
  #idempotency
  #audit
  #minimumTrust

  constructor({ gateway, idempotencyStore, auditSink, minimumTrust = TRUST_LEVELS.TRACEABLE } = {}) {
    if (!gateway || typeof gateway.invoke !== 'function') throw new TypeError('gateway with invoke() is required')
    if (!idempotencyStore || typeof idempotencyStore.claim !== 'function') throw new TypeError('idempotencyStore is required')
    if (!auditSink || typeof auditSink.append !== 'function') throw new TypeError('auditSink is required')
    if (!Object.values(TRUST_LEVELS).includes(minimumTrust)) throw new TypeError('invalid minimumTrust')
    this.#gateway = gateway
    this.#idempotency = idempotencyStore
    this.#audit = auditSink
    this.#minimumTrust = minimumTrust
  }

  async invoke({
    tenantId,
    actor,
    requestId,
    purpose,
    capabilityId,
    input = {},
    approvedBy = null,
    mode = 'execute',
    traceId = crypto.randomUUID(),
    idempotencyKey = null,
    trustChain = null,
  } = {}) {
    let context
    try {
      context = validateProductionContext({ tenantId, actor, requestId, purpose })
    } catch (error) {
      const code = error instanceof ProductionContextError ? error.code : 'invalid_production_context'
      await this.#audit.append({
        at: new Date().toISOString(), requestId: requestId ?? null, traceId, tenantId: tenantId ?? null,
        actorId: actor?.id ?? null, capabilityId: capabilityId ?? null, status: 'blocked', code,
      })
      return { ok: false, status: 'blocked', traceId, error: code }
    }

    const effectful = mode === 'execute'
    let trust = { ok: true, level: TRUST_LEVELS.NONE, reasons: [], digest: null }
    if (effectful && this.#minimumTrust !== TRUST_LEVELS.NONE) {
      trust = validateTrustChain(trustChain, { minimumLevel: this.#minimumTrust, approvedBy })
      if (!trust.ok) {
        await this.#audit.append({
          at: new Date().toISOString(), requestId, traceId, tenantId: context.tenantId,
          actorId: context.actor.id, capabilityId, status: 'blocked', code: 'trust_chain_incomplete',
          trustLevel: trust.level, trustReasons: trust.reasons, trustDigest: trust.digest ?? null,
        })
        return { ok: false, status: 'blocked', traceId, error: 'trust_chain_incomplete', trust }
      }
    }

    const claimKey = effectful ? `${context.tenantId}:${capabilityId}:${idempotencyKey ?? ''}` : null
    if (effectful) {
      if (!idempotencyKey) {
        await this.#audit.append({
          at: new Date().toISOString(), requestId, traceId, tenantId: context.tenantId,
          actorId: context.actor.id, capabilityId, status: 'blocked', code: 'idempotency_key_required', trustDigest: trust.digest,
        })
        return { ok: false, status: 'blocked', traceId, error: 'idempotency_key_required' }
      }
      if (!this.#idempotency.claim(claimKey)) {
        await this.#audit.append({
          at: new Date().toISOString(), requestId, traceId, tenantId: context.tenantId,
          actorId: context.actor.id, capabilityId, status: 'duplicate_blocked', code: 'duplicate_execution', trustDigest: trust.digest,
        })
        return { ok: false, status: 'duplicate_blocked', traceId, error: 'duplicate_execution' }
      }
    }

    const startedAt = Date.now()
    try {
      const result = await this.#gateway.invoke({
        actor: context.actor,
        capabilityId,
        input,
        approvedBy,
        mode,
        traceId,
      })
      await this.#audit.append({
        at: new Date().toISOString(),
        requestId,
        traceId,
        tenantId: context.tenantId,
        actorId: context.actor.id,
        role: context.actor.role,
        purpose: context.purpose,
        capabilityId,
        mode,
        approvedBy: approvedBy ? '[RECORDED]' : null,
        status: result.status,
        ok: result.ok,
        durationMs: Date.now() - startedAt,
        inputMetadata: redactSensitive({ keys: Object.keys(input || {}) }),
        trustLevel: trust.level,
        trustDigest: trust.digest,
      })
      return { ...result, trust: effectful ? trust : undefined }
    } catch (error) {
      if (effectful && claimKey) this.#idempotency.release?.(claimKey)
      const message = error instanceof Error ? error.message : String(error)
      await this.#audit.append({
        at: new Date().toISOString(), requestId, traceId, tenantId: context.tenantId,
        actorId: context.actor.id, capabilityId, status: 'failed', error: redactSensitive(message),
        durationMs: Date.now() - startedAt, trustDigest: trust.digest,
      })
      return { ok: false, status: 'failed', traceId, error: 'production_gateway_failure' }
    }
  }
}
