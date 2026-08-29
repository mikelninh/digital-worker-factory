import crypto from 'node:crypto'
import http from 'node:http'

function json(res, statusCode, body) {
  const payload = JSON.stringify(body)
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

function bearerMatches(header, token) {
  if (!header || !token) return false
  const expected = Buffer.from(`Bearer ${token}`)
  const actual = Buffer.from(String(header))
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

async function readJson(req, maxBodyBytes) {
  let bytes = 0
  const chunks = []
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > maxBodyBytes) throw new Error('request_body_too_large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('invalid_json')
  }
}

function withRevocation(input = {}, revocationStore) {
  if (!input?.delegation?.id || !revocationStore?.isRevoked?.(input.delegation.id)) return input
  return { ...input, delegation: { ...input.delegation, revoked: true } }
}

function resultStatus(result) {
  switch (result?.status) {
    case 'executed':
    case 'duplicate_suppressed': return 200
    case 'approval_required': return 202
    case 'blocked': return 403
    case 'duplicate_in_flight':
    case 'reconciliation_required': return 409
    case 'failed': return 502
    default: return 500
  }
}

export function createAuthorityHttpServer({
  gateway,
  token,
  revocationStore = null,
  maxBodyBytes = 1_000_000,
  clock = () => new Date(),
} = {}) {
  if (!gateway?.preflight || !gateway?.invoke || !gateway?.receipts) throw new Error('authority_gateway_required')
  if (!token) throw new Error('authority_service_token_required')

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://authority.local')

      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, { ok: true, service: 'authority', version: 'v1' })
      }

      if (!bearerMatches(req.headers.authorization, token)) {
        return json(res, 401, { ok: false, error: 'unauthorized' })
      }

      if (req.method === 'POST' && url.pathname === '/v1/preflight') {
        const input = withRevocation(await readJson(req, maxBodyBytes), revocationStore)
        const decision = gateway.preflight(input)
        return json(res, decision.executionAllowed ? 200 : decision.decision === 'APPROVAL' ? 202 : 403, { ok: decision.allowed === true, decision })
      }

      if (req.method === 'POST' && url.pathname === '/v1/invoke') {
        const input = withRevocation(await readJson(req, maxBodyBytes), revocationStore)
        const result = await gateway.invoke(input)
        return json(res, resultStatus(result), result)
      }

      if (req.method === 'GET' && url.pathname === '/v1/receipts') {
        const requested = Number(url.searchParams.get('limit') || 100)
        const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 100, 500))
        const receipts = gateway.receipts()
        return json(res, 200, { ok: true, receipts: receipts.slice(-limit), total: receipts.length })
      }

      const revokeMatch = req.method === 'POST' && url.pathname.match(/^\/v1\/delegations\/([^/]+)\/revoke$/)
      if (revokeMatch) {
        if (!revocationStore?.revoke) return json(res, 501, { ok: false, error: 'revocation_store_not_configured' })
        const body = await readJson(req, maxBodyBytes)
        const delegationId = decodeURIComponent(revokeMatch[1])
        const record = revocationStore.revoke(delegationId, {
          revokedAt: clock().toISOString(),
          revokedBy: body.revokedBy ?? null,
          reason: body.reason ?? null,
        })
        return json(res, 200, { ok: true, revocation: record })
      }

      return json(res, 404, { ok: false, error: 'not_found' })
    } catch (error) {
      const message = String(error?.message || error)
      if (message === 'invalid_json') return json(res, 400, { ok: false, error: message })
      if (message === 'request_body_too_large') return json(res, 413, { ok: false, error: message })
      return json(res, 500, { ok: false, error: 'authority_service_error' })
    }
  })
}

export async function listenAuthorityService(server, { host = '127.0.0.1', port = 0 } = {}) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.off('error', reject)
      resolve()
    })
  })
  const address = server.address()
  return { host, port: typeof address === 'object' && address ? address.port : port }
}
