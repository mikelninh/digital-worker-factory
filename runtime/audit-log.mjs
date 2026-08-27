import { randomUUID } from 'node:crypto'

const SAFE_CONTEXT_KEYS = new Set(['caseId', 'tenantId', 'requestId', 'environment', 'source'])

export class MemoryAuditLog {
  #events = []

  append(event) {
    const stored = Object.freeze({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    })
    this.#events.push(stored)
    return stored
  }

  list() {
    return [...this.#events]
  }
}

export function auditMetadata({ args, context }) {
  return {
    argKeys: args && typeof args === 'object' ? Object.keys(args).sort() : [],
    context: safeContext(context),
  }
}

function safeContext(context) {
  if (!context || typeof context !== 'object') return {}
  return Object.fromEntries(
    Object.entries(context).filter(([key, value]) => SAFE_CONTEXT_KEYS.has(key) && isPrimitive(value)),
  )
}

function isPrimitive(value) {
  return value == null || ['string', 'number', 'boolean'].includes(typeof value)
}
