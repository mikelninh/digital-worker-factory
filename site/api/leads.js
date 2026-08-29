const MAX_BODY_CHARS = 20000

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(JSON.stringify(body))
}

function cleanString(value, max = 200) {
  return String(value || '').trim().slice(0, max)
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
  if (raw.length > MAX_BODY_CHARS) return json(res, 413, { error: 'payload_too_large' })

  let body
  try { body = typeof req.body === 'object' ? req.body : JSON.parse(raw) } catch {
    return json(res, 400, { error: 'invalid_json' })
  }

  // Honeypot: silently accept bot submissions without storing them.
  if (cleanString(body.website, 200)) return json(res, 202, { accepted: true })

  const organisation = cleanString(body.organisation, 120)
  const email = cleanString(body.email, 160).toLowerCase()
  if (!organisation || !validEmail(email) || body.explicitFollowupConsent !== true) {
    return json(res, 400, { error: 'organisation_email_and_explicit_consent_required' })
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return json(res, 503, { error: 'lead_sink_unconfigured' })
  }

  const score = body?.result?.score || {}
  const payload = {
    organisation,
    email,
    explicit_followup_consent: true,
    source: cleanString(body.source || 'authority_scorecard', 80),
    sector: cleanString(body?.input?.sector, 40),
    agent_stage: cleanString(body?.input?.agentStage, 40),
    readiness_score: Number.isFinite(Number(score.readiness)) ? Number(score.readiness) : null,
    authority_risk_score: Number.isFinite(Number(score.risk)) ? Number(score.risk) : null,
    consequence_signals: Number.isFinite(Number(score.consequenceSignals)) ? Number(score.consequenceSignals) : null,
    urgency: cleanString(score.urgency, 20),
    recommended_pilot: cleanString(score.recommendedPilot, 120),
    answers: body.input || {},
    result: body.result || {},
    status: 'new',
  }

  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/company01_growth_leads`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    console.error('lead_sink_failed', response.status, detail)
    return json(res, 502, { error: 'lead_sink_failed' })
  }

  return json(res, 201, { accepted: true, status: 'new' })
}
