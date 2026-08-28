# Cloudflare → OCN

Cloudflare can be the high-throughput edge in front of OCN rather than forcing the origin Node service to absorb global payment verification, bot traffic and burst load.

## Target architecture

```text
Agent
  → Cloudflare edge
      → rate/bot/abuse controls
      → x402 or MPP payment enforcement
      → cache safe deterministic metadata
  → OCN stateless trust worker
  → provider adapters / evidence sources
  → receipt + trustEventId
```

## Two supported deployment patterns

### A. Monetization Gateway / x402 proxy in front of OCN HTTP

Protect `/v1/trust/*`, `/v1/evidence/*`, `/v1/freshness/*`, `/v1/authority/*`, `/v1/entity/*` while leaving health/discovery public. Use Base Sepolia until external test settlement and rollback evidence are complete.

### B. Paid MCP tools

Expose OCN trusted events as MCP tools and use Cloudflare Agents SDK `withX402` + `paidTool` at the edge. The handler should call the same OCN core semantics; do not fork trust rules into Worker-only logic.

## Scale controls

- cache catalogs and schemas, never cache tenant-sensitive results by default;
- rate-limit before origin;
- use idempotency/payment identifiers for logical retries;
- propagate `x-request-id` end to end;
- preserve `PAYMENT-RESPONSE` settlement proof;
- export edge and origin telemetry via OpenTelemetry-compatible tracing;
- separate control plane (catalog, pricing, policy versions) from data plane (trusted event execution);
- use durable/distributed stores for rate limits, idempotency and telemetry before claiming multi-region guarantees.

## Mainnet gate

Mainnet remains fail-closed until merchant custody/accounting, refunds, reconciliation, abuse budgets, incident response and explicit deployment approval are in place.
