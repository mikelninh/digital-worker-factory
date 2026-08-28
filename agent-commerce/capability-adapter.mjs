const ADAPTER_PROTOCOLS = new Set(['local', 'http', 'mcp', 'a2a'])

export function assertCapabilityAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') throw new Error('adapter_required')
  if (!/^[a-z0-9][a-z0-9._-]{2,100}$/.test(adapter.capabilityId ?? '')) throw new Error('adapter_invalid_capability_id')
  if (!/^\d+\.\d+\.\d+$/.test(adapter.version ?? '')) throw new Error('adapter_invalid_version')
  if (!ADAPTER_PROTOCOLS.has(adapter.protocol)) throw new Error('adapter_invalid_protocol')
  if (typeof adapter.validate !== 'function') throw new Error('adapter_validate_required')
  if (typeof adapter.execute !== 'function') throw new Error('adapter_execute_required')
  if (adapter.protocol !== 'local' && !adapter.provider) throw new Error('adapter_provider_required')
  return true
}

export function createCapabilityAdapter({
  capabilityId,
  version,
  protocol,
  provider = null,
  timeoutMs = 10_000,
  validate,
  execute,
}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 120_000) throw new Error('adapter_timeout_invalid')

  const adapter = Object.freeze({
    capabilityId,
    version,
    protocol,
    provider,
    timeoutMs,
    validate,
    execute,
  })
  assertCapabilityAdapter(adapter)
  return adapter
}

export async function invokeCapabilityAdapter(adapter, { input, context = {} } = {}) {
  assertCapabilityAdapter(adapter)
  const validated = await adapter.validate(input)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('provider_timeout')), adapter.timeoutMs)

  try {
    const output = await adapter.execute({
      input: validated ?? input,
      context,
      signal: controller.signal,
    })
    if (output === undefined) throw new Error('adapter_empty_output')
    return output
  } catch (error) {
    if (controller.signal.aborted) throw new Error('provider_timeout')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function createHttpJsonAdapter({
  capabilityId,
  version,
  provider,
  endpoint,
  timeoutMs = 10_000,
  validate = async (input) => input,
  fetchImpl = fetch,
  headers = {},
}) {
  const url = new URL(endpoint)
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('remote_adapter_requires_https')
  }

  return createCapabilityAdapter({
    capabilityId,
    version,
    protocol: 'http',
    provider,
    timeoutMs,
    validate,
    execute: async ({ input, context, signal }) => {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(context.requestId ? { 'x-request-id': context.requestId } : {}),
          ...headers,
        },
        body: JSON.stringify(input),
        signal,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const error = new Error(`provider_http_${response.status}`)
        error.status = response.status
        error.details = body
        throw error
      }
      return body
    },
  })
}
