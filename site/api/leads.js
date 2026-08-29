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

function boundedInt(value, min, max) {
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : null
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
  // Prefer Supabase's modern sb_secret_... key. Legacy service-role is compatibility only.
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secretKey) {
    return json(res, 503, { error: 'lead_sink_unconfigured' })
  }

  const score = body?.result?.score || {}
  const rpcPayload = {
    p_organisation: organisation,
    p_email: email,
    p_source: cleanString(body.source || 'authority_scorecard', 80),
    p_sector: cleanString(body?.input?.sector, 40),
    p_agent_stage: cleanString(body?.input?.agentStage, 40),
    p_readiness_score: boundedInt(score.readiness, 0, 100),
    p_authority_risk_score: boundedInt(score.risk, 0, 100),
    p_consequence_signals: boundedInt(score.consequenceSignals, 0, 5),
    p_urgency: ['low', 'medium', 'high'].includes(score.urgency) ? score.urgency : null,
    p_recommended_pilot: cleanString(score.recommendedPilot, 120),
    p_answers: body.input || {},
    p_result: body.result || {},
  }

  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/company01_create_inbound_lead`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(rpcPayload),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    console.error('lead_sink_failed', response.status, detail)
    return json(res, 502, { error: 'lead_sink_failed' })
  }

  let leadId = null
  try { leadId = await response.json() } catch {}

  return json(res, 201, {
    accepted: true,
    status: 'new',
    leadId: typeof leadId === 'string' ? leadId : null,
    next: 'qualify_and_prepare_inbound',
  })
}
