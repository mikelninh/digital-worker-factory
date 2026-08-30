import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=60",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return reply(405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = getSecretKey();
  if (!url || !secretKey) return reply(503, { error: "ledger_unconfigured" });

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/company01_public_growth_metrics`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      "content-type": "application/json",
    },
    body: "{}",
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("public_ledger_failed", response.status, text.slice(0, 200));
    return reply(502, { error: "ledger_unavailable" });
  }

  try {
    return reply(200, JSON.parse(text));
  } catch {
    return reply(502, { error: "ledger_invalid_response" });
  }
});
