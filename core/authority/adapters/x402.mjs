export function createX402Executor({ requestPaidResource } = {}) {
  if (typeof requestPaidResource !== 'function') throw new Error('x402_request_function_required')

  return async ({ action, actor, principal, traceId }) => {
    if (!action?.resourceUrl) throw new Error('x402_resource_url_required')
    if (!action?.amount?.currency || !Number.isFinite(Number(action?.amount?.value))) throw new Error('x402_amount_required')

    const response = await requestPaidResource({
      resourceUrl: action.resourceUrl,
      method: action.method || 'GET',
      body: action.body ?? null,
      amount: { currency: String(action.amount.currency), value: Number(action.amount.value) },
      idempotencyKey: action.idempotencyKey ?? null,
      authority: {
        traceId,
        actorId: actor?.id ?? null,
        principalId: principal?.id ?? null,
      },
    })

    if (response?.ok === false) {
      const reason = response.detail || response.error || response.errorReason || 'x402_settlement_failed'
      throw new Error(String(reason))
    }

    return {
      transport: 'x402',
      settlement: response?.settlement ?? null,
      data: response?.data ?? response ?? null,
    }
  }
}
