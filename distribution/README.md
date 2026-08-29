# Open Capability Network — Distribution Pack

The goal is one trust rail, many distribution surfaces. OCN semantics, capability IDs, authority boundaries and receipts stay stable across channels.

## Distribution sequence

| Surface | What OCN publishes | Unlock | Status |
| --- | --- | --- | --- |
| x402 Bazaar / Agentic.Market | paid HTTP trusted-event endpoints with Bazaar discovery extension | public HTTPS endpoint + successful x402 calls | code-ready; hosting pending |
| AWS AgentCore | OCN resources discoverable through Coinbase x402 Bazaar / AgentCore Gateway | Bazaar indexing | integration recipe ready |
| MCP Registry | public remote MCP server metadata | public `/mcp` endpoint | manifest template ready; MCP bridge next |
| Cloudflare | edge payment enforcement / MCP paid tools / origin protection | Cloudflare account + deployed origin | deployment recipe ready |
| Direct HTTP | `/.well-known/open-capabilities.json`, trusted-event catalog, OpenAPI later | public HTTPS | code-ready; hosting pending |

## Core trusted events

- `trust.preflight.v1` — $0.005
- `evidence.verify.v1` — $0.003
- `freshness.verify.v1` — $0.001
- `authority.check.v1` — $0.002
- `entity.resolve.org.v1` — $0.01

Prices are launch hypotheses, not promises. We optimize for repeat usage and measurable value, not maximum per-call price.

## Launch gate

Do not claim a surface is live until all applicable gates pass:

1. public HTTPS endpoint reachable;
2. contract/eval CI green on exact deployed commit;
3. 402 challenge visible on paid route;
4. successful external settlement or invoiced usage event;
5. request ID + receipt returned;
6. authority boundary remains false for payment-granted authority;
7. aggregate telemetry records the event without raw request/result payloads;
8. discovery entry can be found from the target surface;
9. rollback / rate limit / spend controls documented;
10. status page or health endpoint available.

## Why multiple rails

Government and large enterprises may prefer invoice, annual license or sovereign deployment. Open internet agents can use x402/MPP. Payment rail must never change capability semantics or grant authority.
