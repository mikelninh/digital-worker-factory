# Agent Commerce RC0

A small machine-facing commerce layer for the Digital Worker Factory.

The goal is deliberately narrow: prove that another AI agent can discover a capability, receive `402 Payment Required`, pay in USDC through x402, call the capability, and receive a bounded result + service receipt.

## First capability

`POST /v1/triage` — **$0.01 USDC**

Input:

```json
{"message":"Heizung ist defekt und verliert Wasser."}
```

Output includes:

- classification / proposed route;
- confidence;
- evidence keywords;
- missing information;
- `humanApprovalRequired: true`;
- `externalActionExecuted: false`;
- request/output hashes in an `agent-commerce.receipt/1` receipt.

The endpoint never sends messages, moves money, signs contracts or performs another consequential action.

## Trust rule

**Payment purchases computation, not trust or authority.**

The caller's role is assigned server-side. A payment cannot turn a self-asserted caller into an administrator, cannot bypass the Factory policy gate, and cannot convert an informational result into permission to act.

Malformed requests fail before the payment middleware whenever possible.

## Free discovery

Agents can inspect:

```text
GET /.well-known/agent-capabilities.json
```

The descriptor exposes capability ID/version, protocols, price, network, asset, risk, human-approval requirement, privacy posture and trust/evaluation metadata.

This is intentionally provider-neutral metadata. x402 is the first payment rail, not the product identity.

## Local contract test

```bash
cd agent-commerce
npm install
npm test
npm run check
```

The test payment mode is an explicit test double. It is refused unless `allowMock: true` is passed by the test harness.

## Base Sepolia x402 seller smoke

Create/control an EVM receiving address, then:

```bash
cd agent-commerce
npm install
PAY_TO=0xYOUR_RECEIVING_ADDRESS \
PAYMENTS_MODE=x402 \
X402_NETWORK=eip155:84532 \
node server.mjs
```

The server uses the public x402 test facilitator by default:

```text
https://x402.org/facilitator
```

An unpaid valid request should return the real x402 `402 Payment Required` response.

Do **not** put a private key in this repository or in browser code. The seller only needs a receiving address for this RC0 server.

## Autonomous buyer smoke

The buyer harness performs the full `request → 402 → sign → retry → settlement → result` flow using the official x402 fetch client.

Safety defaults:

- Base Sepolia only;
- Circle Base Sepolia USDC only (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`);
- `exact` payment scheme only;
- default spend ceiling **20,000 atomic USDC = $0.02**;
- remote seller must use HTTPS;
- the $0.01 RC0 endpoint therefore has 2× headroom but an unexpected larger charge is rejected before signing;
- no mainnet buyer scheme is registered.

Fund a dedicated **testnet-only** buyer wallet with Base Sepolia USDC, then keep its key outside Git:

```bash
cd agent-commerce
npm install
BUYER_EVM_KEY=0xYOUR_TESTNET_PRIVATE_KEY \
AGENT_COMMERCE_URL=https://YOUR_HOSTED_RC0 \
npm run smoke:buyer
```

For a local seller:

```bash
BUYER_EVM_KEY=0xYOUR_TESTNET_PRIVATE_KEY \
AGENT_COMMERCE_URL=http://127.0.0.1:4021 \
npm run smoke:buyer
```

Optional tighter/larger testnet ceiling, expressed in 6-decimal USDC atomic units:

```bash
MAX_PAYMENT_USDC_ATOMIC=15000 npm run smoke:buyer
```

RC0 refuses a buyer ceiling above `1000000` ($1) even if configured. That is a test-harness guard, not a future product limit.

A successful smoke prints:

- buyer address;
- paid endpoint;
- HTTP status;
- end-to-end latency;
- decoded `PAYMENT-RESPONSE` settlement data when present;
- our service receipt;
- bounded triage result.

## Portable container

Build the exact production server artifact from the repository root:

```bash
docker build -f agent-commerce/Dockerfile -t agent-commerce-rc0 .
```

The image contains the seller runtime only. Buyer-only signing dependencies are dev dependencies and are omitted from the production image.

## Mainnet lock

Base mainnet (`eip155:8453`) fails closed unless:

```bash
ALLOW_MAINNET=true
```

That flag is intentionally insufficient on its own for launch. Before real revenue, also require:

- controlled/recoverable merchant wallet;
- bookkeeping + tax workflow;
- refund/support policy;
- cost caps and abuse controls;
- server-side payment verification/replay assurance through the selected facilitator;
- one real external buyer/agent.

## Why this shape

The same envelope can wrap future portfolio capabilities without coupling their domain logic to payments:

1. `judge.output.v1` — independent rubric/evaluation call;
2. `openproof.verify.v1` — proof / permission / binding verification;
3. `rights.eu261.v1` — grounded deterministic rights check;
4. `entity.resolve.org.v1` — organisation entity resolution with evidence;
5. `document.preflight.v1` — document/rule/evidence completeness check.

The shared economic metric is **revenue per useful agent request**, alongside correctness, latency, cost, repeat use and real-world outcome.
