import type { Context, Config } from "@netlify/functions";

const UPSTREAM = "https://htffcvdopavknnylbowl.supabase.co/functions/v1/launchcheck-mcp";

export default async (req: Request, _context: Context) => {
  const headers = new Headers();
  for (const name of ["accept", "content-type", "mcp-protocol-version", "mcp-session-id", "last-event-id"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(UPSTREAM, init);
  const outHeaders = new Headers();
  for (const [name, value] of upstream.headers.entries()) {
    if (["content-type", "cache-control", "mcp-session-id"].includes(name.toLowerCase())) {
      outHeaders.set(name, value);
    }
  }
  outHeaders.set("x-launchcheck-frontdoor", "netlify-v1");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
};

export const config: Config = { path: "/mcp" };
