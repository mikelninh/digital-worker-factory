# OCN MCP Bridge

One MCP server gives an agent access to Open Capability Network trusted events while preserving OCN's transaction model: discovery is free; paid trusted-event calls use x402 through the caller's own capped Base Sepolia wallet.

## Why this exists

MCP should be a distribution surface, not a free bypass around OCN. The bridge exposes familiar MCP tools and automatically handles the HTTP 402 → signed payment → retry flow against the same OCN endpoints used by direct HTTP agents.

## Tools

- `ocn_list_trusted_events` — free catalog
- `ocn_preflight` — paid `trust.preflight.v1`
- `ocn_verify_evidence` — paid `evidence.verify.v1`
- `ocn_verify_freshness` — paid `freshness.verify.v1`
- `ocn_check_authority` — paid `authority.check.v1`
- `ocn_resolve_organisation` — paid `entity.resolve.org.v1`

## Safety defaults

- Base Sepolia only in v0.1;
- exact USDC payment scheme only;
- Circle Base Sepolia USDC only;
- default max payment 20,000 atomic USDC = $0.02;
- hard bridge cap of 1,000,000 atomic USDC = $1.00;
- remote OCN endpoints must use HTTPS;
- private key stays in the caller environment and is never returned;
- payment never grants authority;
- OCN itself remains fail-closed for consequential actions.

## Local configuration

```bash
export OCN_BASE_URL=https://YOUR_PUBLIC_OCN_HOST
export OCN_BUYER_EVM_KEY=0xYOUR_TESTNET_ONLY_PRIVATE_KEY
export OCN_NETWORK=eip155:84532
export OCN_MAX_PAYMENT_USDC_ATOMIC=20000
```

Never commit or share `OCN_BUYER_EVM_KEY`. Use a dedicated testnet wallet while OCN is pre-production.

## Install / run from this repository

```bash
cd distribution/mcp
npm install
npm test
node index.mjs
```

An MCP-compatible host can launch `node /path/to/distribution/mcp/index.mjs` over stdio.

## Registry publication path

The package declares:

```json
{"mcpName":"io.github.mikelninh/open-capability-network"}
```

Before publishing to the MCP Registry:

1. exact commit has green `ocn-distribution` CI;
2. public OCN HTTPS endpoint exists;
3. at least one external Base Sepolia buyer completes a paid trusted event;
4. package is published to an allowed package registry or a public remote `/mcp` endpoint is deployed;
5. registry metadata resolves back to this GitHub identity;
6. spend cap and testnet/mainnet posture are documented;
7. discovery and a paid call are tested from an independent MCP host.

Do not mark the MCP surface live merely because this bridge exists in source.
