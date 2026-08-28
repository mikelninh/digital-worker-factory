import crypto from 'node:crypto'

const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

export function normalizeRequestId(value) {
  const candidate = String(value ?? '').trim()
  if (!candidate) return crypto.randomUUID()
  if (!REQUEST_ID_RE.test(candidate)) throw new Error('request_id_invalid')
  return candidate
}

export function requestContextMiddleware(req, res, next) {
  try {
    const requestId = normalizeRequestId(req.get('x-request-id'))
    req.requestId = requestId
    res.locals.requestId = requestId
    res.set('x-request-id', requestId)
    return next()
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) })
  }
}
