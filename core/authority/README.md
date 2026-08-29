# Authority Kernel

**Working category:** authority infrastructure for autonomous systems.

The kernel answers one narrow question before an agent, workflow or robot crosses a consequential boundary:

> **May this actor perform this action, for this principal, for this purpose, under this delegation and these limits, right now?**

It is intentionally **not** an identity provider, wallet, payment rail, agent framework, MCP implementation or observability product. Those systems plug in around it.

## Why this layer exists

Authentication proves who an actor is. A tool protocol describes how to call something. A wallet proves it can pay. None of those facts alone answer whether a particular real-world action is authorised.

The kernel separates:

1. **identity** — who is acting;
2. **principal** — on whose behalf;
3. **delegation** — what authority has been granted and for how long;
4. **action policy** — which action is allowed under which evidence, role, purpose, risk and budget;
5. **approval** — a human approval bound to the exact action and delegation when required;
6. **execution** — provider call only after ALLOW;
7. **proof receipt** — privacy-safe evidence of what was decided and what happened.

## Universal API

```js
import { AuthorityGateway } from './core/authority/index.mjs'

const gateway = new AuthorityGateway({ policy, executors })

const result = await gateway.invoke({
  actor: { id: 'research-agent-7', role: 'research_agent', autonomyLevel: 3 },
  principal: { id: 'acme', type: 'company' },
  delegation: {
    id: 'delegation-42',
    delegateId: 'research-agent-7',
    principalId: 'acme',
    scopes: ['research.purchase_data'],
    purposes: ['market_research'],
    validUntil: '2026-09-01T00:00:00Z',
  },
  action: {
    type: 'research.purchase_data',
    purpose: 'market_research',
    amount: { currency: 'EUR', value: 2 },
    counterpartyApproved: true,
    idempotencyKey: 'research-2026-08-29-dataset-1',
  },
  evidence: { claims: ['vendor_terms_checked'] },
  budget: { currency: 'EUR', spent: 3, limit: 10 },
  metrics: { cases: 100, acceptanceRate: 0.99, correctionRate: 0.01, unsafeExecutions: 0 },
})
```

The result is one of:

- `ALLOW` → execution may occur;
- `APPROVAL` → no provider call, exact human approval required;
- `BLOCK` → no provider call.

## Current hard guarantees

The executable suites prove:

- unknown or out-of-scope actions fail closed;
- revoked and expired delegations cannot execute;
- purpose and role boundaries are enforced outside the model;
- hard escalation flags override model intent and convenience;
- payment success never grants authority;
- spend and counterparty limits block before provider execution;
- approvals are bound to the exact action and delegation;
- preflight performs zero external calls;
- approved actions still require an idempotency key;
- the idempotency key is atomically claimed before provider execution in the reference runtime;
- two simultaneous identical requests make at most one provider call;
- successful replay is suppressed;
- uncertain/failed execution with the same key requires reconciliation rather than blind re-execution;
- replay suppression survives a gateway restart with the durable reference store;
- failed providers do not alter authority;
- facilitator settlement failures are attributed outside the authority kernel;
- raw signed payment material and secrets are redacted from receipts.

## End-to-end proof slice

`core/authority/demo/mission.mjs` runs a deterministic €10 autonomous research mission through the real authority kernel:

- read a free source;
- buy two approved datasets for **€5.70 total**;
- block an unapproved vendor;
- block delegated-budget overspend;
- block prompt-injected purchasing instructions;
- isolate a facilitator `replacement transaction underpriced` failure;
- suppress a replayed purchase;
- prepare an evidence-backed brief;
- require human approval for external publication;
- execute only after exact-bound approval.

The mission uses deterministic provider fixtures so it is repeatable and safe. It does **not** claim these particular demo purchases are live payments. The earlier real Base Sepolia x402 payment run remains separate evidence.

The browser surface at `site/authority-control-center.html` exposes the same ideas interactively. `core/authority/ui-parity.test.mjs` prevents the UI decision simulator from drifting away from the Node policy kernel.

## Authenticated HTTP boundary

`core/authority/service.mjs` exposes the gateway as a small authenticated reference service:

- `GET /health`
- `POST /v1/preflight`
- `POST /v1/invoke`
- `GET /v1/receipts`
- `POST /v1/delegations/:id/revoke`

All consequential endpoints require a bearer token. Revocation is applied before preflight/invoke. Malformed and oversized request bodies fail closed.

A runnable local service is provided at `core/authority/demo/server.mjs`:

```bash
AUTHORITY_TOKEN=change-me node core/authority/demo/server.mjs
```

Local state is written under `.authority-data/` by default and is ignored by Git. The HTTP service is a reference integration boundary, not a hardened internet-facing production deployment.

## Real integration seams

Reference adapters now show how the boundary composes without replacing adjacent infrastructure:

- `adapters/oidc.mjs` — OIDC/IAM claims → explicit actor/principal context;
- `adapters/mcp.mjs` — MCP tool execution only downstream of ALLOW;
- `adapters/x402.mjs` — paid-resource execution only downstream of spend authority;
- `stores/json-file.mjs` — durable reference idempotency, receipts and delegation revocations.

The local JSON stores are deliberately simple reference implementations. Production needs a transactional shared datastore so claims and budget/revocation state remain correct across replicas and processes.

## Public-sector reference profile

`profiles/public-sector.mjs` compiles institution-supplied governance context into evidence claims for the kernel. An adverse action can require:

- case binding;
- legal basis;
- jurisdiction;
- accountable official;
- declared purpose;
- bounded data scope;
- contestability route + owner;
- reversibility mode + owner.

Incomplete governance becomes a hard fail-closed escalation. This is an executable governance profile, **not a claim of legal or AI Act compliance**.

## Sector profiles exercised

The same kernel is tested against:

- **company:** an autonomous research agent purchasing approved data inside a budget;
- **government:** casework under legal basis with accountable approval for consequential adverse action;
- **regulated/legal:** an approved write still blocked by instruction-injection evidence;
- **finance:** payment success cannot override a hard-prohibited bank-detail change.

The policies differ; the authority primitive stays the same.

## Relationship to existing Factory gateway

The existing `core/agent-gateway.mjs` remains useful for capability registration, provider routing and current product integrations. The Authority Kernel is the lower-level trust primitive adding principal/delegation semantics, progressive autonomy, spend/purpose limits, idempotency and proof receipts.

```text
model / workflow
      ↓ proposes
capability + action
      ↓
identity / principal / delegation
      ↓
AUTHORITY KERNEL
      ↓ ALLOW | APPROVAL | BLOCK
provider / MCP / API / payment rail
      ↓
proof receipt
```

## Standards-first interop

We should not invent another portable governance standard where strong open work already exists.

```text
portable governed contract / intent conformance
        ↓ conformance ≠ permission
ORGANIZATION AUTHORITY ENGINE
        ↓ local authorization
framework-neutral enforcement seam
        ↓
MCP / API / payment rail / database / real-world action
        ↓
proof receipt
```

Reference interop currently models two emerging seams without claiming formal certification:

- portable Governed Contract-style results are upstream eligibility evidence; **conformance never becomes execution permission**;
- local ALLOW / APPROVAL / BLOCK decisions project into Agent Hooks-style `allow` / fail-closed `deny`, with approval liftable only when bound to an exact context identity.

## What we deliberately do not build

To stay out of commodity fights, this layer integrates with rather than replaces:

- OAuth/OIDC and enterprise IAM;
- portable governed-contract formats;
- MCP and other tool protocols;
- x402, MPP and conventional payments;
- wallets and custody;
- model and agent runtimes;
- generic logs/traces/APM.

The product opportunity is the organization-controlled **authorization + enforcement + proof layer** between them.

## Run the proof

```bash
node --test \
  core/authority/conformance.test.mjs \
  core/authority/concurrency.test.mjs \
  core/authority/service.test.mjs \
  core/authority/interop/interop.test.mjs \
  core/authority/adapters/adapters.test.mjs \
  core/authority/stores/json-file.test.mjs \
  core/authority/profiles/public-sector.test.mjs \
  core/authority/demo/mission.test.mjs \
  core/authority/ui-parity.test.mjs

node core/authority/demo/run.mjs
```
