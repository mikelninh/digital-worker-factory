import http from "node:http";
import { createHandler } from "./lambda.mjs";

export function createHttpServer({ handler = createHandler(), port = 8787 } = {}) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/support") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    let body = "";
    for await (const chunk of req) body += chunk;

    try {
      const result = await handler({ body });
      res.writeHead(result.statusCode || 200, { "content-type": "application/json" });
      res.end(result.body);
    } catch (error) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  });

  return {
    server,
    listen: () => new Promise((resolve) => server.listen(port, "127.0.0.1", resolve)),
    close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
    url: `http://127.0.0.1:${port}/support`
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createHttpServer({ port: Number(process.env.PORT || 8787) });
  await app.listen();
  console.log(`One Less Click HTTP proof listening on ${app.url}`);
}
