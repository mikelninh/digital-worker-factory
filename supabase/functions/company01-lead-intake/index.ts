import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAX_BODY_CHARS = 20_000;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function clean(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getSecretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed?.default) return String(parsed.default);
    } catch {
      // Fall through to legacy compatibility.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function urgencyFromBody(body: any, score: any) {
  const direct = clean(score?.urgency, 20);
  if (direct) return direct;
  const opportunity = clean(body?.result?.opportunity, 20).toUpperCase();
  if (opportunity === "HIGH") return "high";
  if (opportunity === "MEDIUM") return "medium";
  if (opportunity === "START_SMALL") return "low";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return reply(413, { error: "payload_too_large" });

  let body: any;
  try { body = JSON.parse(raw || "{}"); }
  catch { return reply(400, { error: "invalid_json" }); }

  // Honeypot submissions are accepted but never stored.
  if (clean(body.website, 200)) return reply(202, { accepted: true });

  const organisation = clean(body.organisation, 120);
  const email = clean(body.email, 160).toLowerCase();
  if (!organisation || !validEmail(email) || body.explicitFollowupConsent !== true) {
    return reply(400, { error: "organisation_email_and_explicit_consent_required" });
  }

  const url = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = getSecretKey();
  if (!url || !secretKey) return reply(503, { error: "lead_sink_unconfigured" });

  const forwarded = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const clientIp = forwarded.split(",")[0].trim();
  const ipHash = await sha256(`company01-growth-v1:${clientIp}`);
  const score = body?.result?.score || {};
  const source = clean(body.source || "authority_scorecard", 80);

  // Authority metrics remain null for workload scans. The growth worker has a
  // separate source-specific qualification rule instead of pretending that a
  // workload score is an authority-readiness score.
  const isAuthorityScorecard = source === "authority_scorecard";
  const recommendedPilot = clean(score.recommendedPilot || body?.result?.recommendedPilot, 120) || null;

  const rpcBody = {
    p_ip_hash: ipHash,
    p_organisation: organisation,
    p_email: email,
    p_source: source,
    p_sector: clean(body?.input?.sector, 40),
    p_agent_stage: clean(body?.input?.agentStage, 40),
    p_readiness_score: isAuthorityScorecard && Number.isFinite(Number(score.readiness)) ? Number(score.readiness) : null,
    p_authority_risk_score: isAuthorityScorecard && Number.isFinite(Number(score.risk)) ? Number(score.risk) : null,
    p_consequence_signals: isAuthorityScorecard && Number.isFinite(Number(score.consequenceSignals)) ? Number(score.consequenceSignals) : null,
    p_urgency: urgencyFromBody(body, score),
    p_recommended_pilot: recommendedPilot,
    p_answers: body.input || {},
    p_result: body.result || {},
  };

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/company01_ingest_inbound_lead`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(rpcBody),
  });

  const text = await response.text();
  if (!response.ok) {
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    if (response.status === 429 || parsed?.code === "rate_limited") {
      return reply(429, { error: "rate_limited" });
    }
    console.error("lead_sink_failed", response.status, text.slice(0, 300));
    return reply(502, { error: "lead_sink_failed" });
  }

  return reply(201, { accepted: true, status: "new" });
});
