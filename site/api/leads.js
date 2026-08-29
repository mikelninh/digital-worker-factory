const MAX_BODY_CHARS = 20000
const DEFAULT_INTAKE_URL = 'https://htffcvdopavknnylbowl.supabase.co/functions/v1/company01-lead-intake'

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
  if (raw.length > MAX_BODY_CHARS) return json(res, 413, { error: 'payload_too_large' })

  const intakeUrl = process.env.COMPANY01_LEAD_INTAKE_URL || DEFAULT_INTAKE_URL

  let response
  try {
    response = await fetch(intakeUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
    })
  } catch (error) {
    console.error('lead_intake_unreachable', error?.message || String(error))
    return json(res, 502, { error: 'lead_intake_unreachable' })
  }

  const text = await response.text()
  let body = {}
  try { body = JSON.parse(text || '{}') } catch {}

  if (!response.ok) {
    const safeError = ['rate_limited', 'organisation_email_and_explicit_consent_required', 'payload_too_large', 'invalid_json'].includes(body?.error)
      ? body.error
      : 'lead_sink_failed'
    return json(res, response.status >= 400 && response.status < 500 ? response.status : 502, { error: safeError })
  }

  return json(res, response.status || 201, {
    accepted: body?.accepted === true,
    status: body?.status || 'new',
  })
}
