import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const MAX_BODY_CHARS = 20_000;

function reply(status: number, body: unknown) {
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

function getSecretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed?.default) return String(parsed.default);
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return reply(413, { error: "payload_too_large" });

  let body: any;
  try { body = JSON.parse(raw || "{}"); }
  catch { return reply(400, { error: "invalid_json" }); }

  const token = clean(body.token, 80);
  const workflowName = clean(body.workflowName, 160);
  const humanOwner = clean(body.humanOwner, 120);
  const desiredOutput = clean(body.desiredOutput, 2000);
  const systemsTouched = Array.isArray(body.systemsTouched) ? body.systemsTouched.slice(0, 12).map((x: unknown) => clean(x, 120)).filter(Boolean) : [];
  const safeExamples = Array.isArray(body.safeExamples) ? body.safeExamples.slice(0, 5).map((x: unknown) => clean(x, 2500)).filter(Boolean) : [];

  if (!/^[a-f0-9]{48}$/i.test(token)) return reply(400, { error: "invalid_onboarding_token" });
  if (workflowName.length < 3 || humanOwner.length < 2 || desiredOutput.length < 3) return reply(400, { error: "required_fields_missing" });
  if (safeExamples.length < 1 || safeExamples.length > 5) return reply(400, { error: "safe_examples_required" });
  if (body.safeDataAttestation !== true) return reply(400, { error: "safe_data_attestation_required" });

  const url = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = getSecretKey();
  if (!url || !secretKey) return reply(503, { error: "onboarding_unconfigured" });

  const tokenHash = await sha256(token);
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/company01_submit_safe_onboarding`, {
    method: "POST",
    headers: { apikey: secretKey, "content-type": "application/json" },
    body: JSON.stringify({
      p_token_hash: tokenHash,
      p_workflow_name: workflowName,
      p_human_owner: humanOwner,
      p_systems_touched: systemsTouched,
      p_desired_output: desiredOutput,
      p_safe_examples: safeExamples,
      p_safety_attestation: true,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("onboarding_submit_failed", response.status, text.slice(0, 220));
    return reply(response.status >= 400 && response.status < 500 ? response.status : 502, { error: "onboarding_submit_failed" });
  }

  return reply(201, { accepted: true, status: "ready_for_synthetic_pilot" });
});
