import type { Context, Config } from "@netlify/functions";

export default async (_req: Request, _context: Context) => {
  const token = Netlify.env.get("OPENAI_APPS_CHALLENGE");
  if (!token) {
    return new Response("challenge-not-configured", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return new Response(token, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};

export const config: Config = {
  path: "/.well-known/openai-apps-challenge",
};
