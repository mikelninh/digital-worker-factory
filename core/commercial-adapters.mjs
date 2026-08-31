function required(value, field) {
  if (value === null || value === undefined || String(value).trim() === '') throw new TypeError(`${field} is required`)
  return value
}

export function buildOutboundCommand(record, { channel = 'email', message, approvedBy } = {}) {
  required(record?.id, 'record.id')
  required(record?.contact, 'record.contact')
  required(message, 'message')
  required(approvedBy, 'approvedBy')
  return {
    kind: 'outbound_message',
    idempotencyKey: `outbound:${record.id}:${record.history?.length ?? 0}`,
    recordId: record.id,
    channel,
    recipient: record.contact,
    message,
    approvedBy,
  }
}

export async function sendApprovedOutbound(command, adapter) {
  required(command?.approvedBy, 'command.approvedBy')
  if (!adapter || typeof adapter.send !== 'function') throw new Error('outbound adapter is not configured')
  const result = await adapter.send(command)
  if (!result?.reference) throw new Error('outbound adapter must return a provider reference')
  return { provider: result.provider || 'unknown', reference: result.reference, sentAt: result.sentAt || new Date().toISOString() }
}

export function buildPaymentRequestCommand(record, product, { approvedBy } = {}) {
  required(record?.id, 'record.id')
  required(approvedBy, 'approvedBy')
  if (!Number.isFinite(record?.kickoffRequiredEur) || record.kickoffRequiredEur <= 0) {
    throw new Error('approved kickoff amount is required')
  }
  return {
    kind: 'payment_request',
    idempotencyKey: `payment-request:${record.id}:${record.kickoffRequiredEur}`,
    recordId: record.id,
    productId: product?.id || record.productId,
    account: record.account,
    amountEur: record.kickoffRequiredEur,
    currency: product?.currency || 'EUR',
    approvedBy,
  }
}

export async function createApprovedPaymentRequest(command, adapter) {
  required(command?.approvedBy, 'command.approvedBy')
  if (!adapter || typeof adapter.createRequest !== 'function') throw new Error('payment adapter is not configured')
  const result = await adapter.createRequest(command)
  if (!result?.reference) throw new Error('payment adapter must return a provider reference')
  return {
    provider: result.provider || 'unknown',
    reference: result.reference,
    checkoutUrl: result.checkoutUrl || null,
    createdAt: result.createdAt || new Date().toISOString(),
  }
}

export function verifyPaymentEvent(event, record) {
  if (!event || typeof event !== 'object') throw new TypeError('payment event is required')
  required(event.provider, 'event.provider')
  required(event.reference, 'event.reference')
  if (!Number.isFinite(event.amountEur) || event.amountEur <= 0) throw new TypeError('event.amountEur must be positive')
  if (event.recordId && event.recordId !== record.id) throw new Error('payment event record mismatch')
  return {
    provider: event.provider,
    reference: event.reference,
    amountEur: event.amountEur,
    occurredAt: event.occurredAt || new Date().toISOString(),
  }
}
