# Authority Kernel

**Working category:** authority infrastructure for autonomous systems.

The kernel answers one narrow question before an agent, workflow or robot crosses a consequential boundary:

> **May this actor perform this action, for this principal, for this purpose, under this delegation and these limits, right now?**

It is intentionally **not** an identity provider, wallet, payment rail, agent framework, MCP implementation or observability product. Those systems plug in around it.

## Why this layer exists

Authentication proves who an actor is. A tool protocol describes how to call something. A wallet proves it can pay. None of those facts alone answer whether a particular real-world action is authorised.

The kernel therefore separates:

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

The conformance suite proves:

- unknown or out-of-scope actions fail closed;
- revoked and expired delegations cannot execute;
- purpose and role boundaries are enforced outside the model;
- hard escalation flags override model intent and human convenience;
- payment success never grants authority;
- spend and counterparty limits block before provider execution;
- approvals are bound to the exact action and delegation;
- preflight performs zero external calls;
- approved actions still require an idempotency key;
- duplicate idempotency keys make at most one provider call;
- failed providers do not alter authority;
- facilitator settlement failures are attributed outside the authority kernel;
- raw signed payment material and secrets are redacted from receipts.

Run:

```bash
node --test core/authority/conformance.test.mjs
```

## Sector profiles already exercised

The same kernel is tested against:

- **company:** an autonomous research agent purchasing approved data inside a budget;
- **government:** a casework agent that may read under legal basis but cannot issue a consequential denial without bound human approval;
- **regulated/legal:** a legal agent whose approved write is still blocked when instruction-injection evidence is present.

The point is not that these policies are production-complete. The point is that **the authority primitive is sector-independent**.

## Relationship to the existing Factory gateway

The existing `core/agent-gateway.mjs` remains useful for capability registration, provider routing and current product integrations. The Authority Kernel is the next lower-level trust primitive: it adds principal/delegation semantics, progressive autonomy, spend/purpose limits, idempotency and proof receipts.

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

## What we deliberately do not build

To stay out of commodity fights, this layer should integrate with rather than replace:

- OAuth/OIDC and enterprise IAM;
- MCP and other tool protocols;
- x402, MPP and conventional payments;
- wallets and custody;
- model and agent runtimes;
- generic logs/traces/APM.

The product opportunity is the cross-vendor **decision + delegation + proof semantics** between them.
