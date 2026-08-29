import crypto from 'node:crypto'

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

const OUTCOMES = new Set(['correct', 'incorrect', 'overridden', 'failed', 'unknown'])

export class MemoryTrustEvidenceStore {
  constructor({ maxEvents = 100_000 } = {}) {
    if (!Number.isInteger(maxEvents) || maxEvents < 100) throw new Error('telemetry_max_events_invalid')
    this.maxEvents = maxEvents
    this.events = []
    this.feedback = new Map()
  }

  record({ capabilityId, requestId, result, latencyMs = null, payment = null, actorClass = 'external_agent' } = {}) {
    if (!capabilityId || !requestId) throw new Error('telemetry_identity_required')
    const decision = result?.decision ?? result?.status ?? 'unknown'
    const event = Object.freeze({
      schema: 'ocn.trust-event/1',
      eventId: crypto.randomUUID(),
      capabilityId,
      requestIdHash: hash(requestId),
      actorClass,
      decision,
      latencyMs: Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : null,
      paid: Boolean(payment),
      paymentStatus: payment?.status ?? null,
      requestPayloadStored: false,
      resultPayloadStored: false,
      observedAt: new Date().toISOString(),
    })
    this.events.push(event)
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents)
    return event
  }

  recordOutcome({ eventId, outcome, reasonCode = null, source = 'human_review' } = {}) {
    if (!eventId) throw new Error('feedback_event_id_required')
    if (!OUTCOMES.has(outcome)) throw new Error('feedback_outcome_invalid')
    const event = this.events.find((item) => item.eventId === eventId)
    if (!event) throw new Error('feedback_event_not_found')
    const feedback = Object.freeze({ eventId, outcome, reasonCode, source, recordedAt: new Date().toISOString() })
    this.feedback.set(eventId, feedback)
    return feedback
  }

  summary() {
    const byCapability = {}
    let paid = 0
    let totalLatency = 0
    let latencyCount = 0
    for (const event of this.events) {
      const bucket = byCapability[event.capabilityId] ??= { calls: 0, paid: 0, decisions: {}, outcomes: {} }
      bucket.calls += 1
      bucket.decisions[event.decision] = (bucket.decisions[event.decision] ?? 0) + 1
      if (event.paid) { bucket.paid += 1; paid += 1 }
      if (event.latencyMs !== null) { totalLatency += event.latencyMs; latencyCount += 1 }
    }
    for (const feedback of this.feedback.values()) {
      const event = this.events.find((item) => item.eventId === feedback.eventId)
      if (!event) continue
      const bucket = byCapability[event.capabilityId]
      bucket.outcomes[feedback.outcome] = (bucket.outcomes[feedback.outcome] ?? 0) + 1
    }
    return Object.freeze({
      schema: 'ocn.trust-metrics/1',
      events: this.events.length,
      paidEvents: paid,
      outcomeLabels: this.feedback.size,
      avgLatencyMs: latencyCount ? Math.round(totalLatency / latencyCount) : null,
      byCapability,
      privacy: 'aggregate-only; raw request/result payloads are not stored by this reference implementation',
    })
  }

  exportTrainingRows() {
    return this.events
      .filter((event) => this.feedback.has(event.eventId))
      .map((event) => ({
        capabilityId: event.capabilityId,
        decision: event.decision,
        latencyMs: event.latencyMs,
        outcome: this.feedback.get(event.eventId).outcome,
        reasonCode: this.feedback.get(event.eventId).reasonCode,
        requestPayloadStored: false,
        resultPayloadStored: false,
      }))
  }
}
