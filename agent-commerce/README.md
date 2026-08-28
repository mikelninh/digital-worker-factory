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

## Base Sepolia x402 smoke

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

An unpaid valid request should return the real x402 `402 Payment Required` response. A compatible funded Base Sepolia buyer can then settle and retry automatically.

Do **not** put a private key in this repository or in browser code. The seller only needs a receiving address for this RC0 server.

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
