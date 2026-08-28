# AWS AgentCore → OCN

AWS AgentCore Payments can discover x402 services through the Coinbase x402 Bazaar MCP server. The OCN integration therefore does not need a separate AWS-only business logic fork.

## Target flow

```text
AgentCore agent
  → AgentCore Gateway / Payments
  → Coinbase x402 Bazaar discovery
  → OCN paid trusted event
  → OCN receipt + result
  → CloudWatch/X-Ray payment trace + OCN trust-event ID
```

## Launch steps

1. Deploy OCN on public HTTPS with Base Sepolia first.
2. Complete successful x402 calls so Bazaar discovery can index OCN resources.
3. Verify each OCN resource is searchable through the Bazaar MCP server.
4. In AgentCore Gateway, add the discovered OCN resource as a target.
5. Create a PaymentSession with a deliberately small `maxSpendAmount` and expiry.
6. Test `trust.preflight.v1`, then `evidence.verify.v1` and `freshness.verify.v1`.
7. Correlate AgentCore payment traces with OCN `requestId` / `trustEventId`.
8. Only after testnet evidence and spend controls pass, evaluate Base mainnet.

## Recommended defaults

- test network first;
- per-agent and per-user payment budgets;
- no autonomous mainnet spend without explicit customer policy;
- OCN authority decisions remain independent from AgentCore payment success;
- failed/blocked trust preflights do not trigger downstream consequential tools;
- external agent identity is treated as an asserted identifier unless independently authenticated.

## First demo

Ask an AgentCore agent to call OCN before a mock consequential tool. The tool must execute only when OCN returns `allow`; `review` and `block` must prevent the tool call. The demo should preserve AWS payment observability and OCN trust receipts side by side.
