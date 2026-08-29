# Positioning: Authority Infrastructure for Autonomous Systems

## Category

**Authority infrastructure for autonomous systems**

## One-line promise

> **Decide and prove what an autonomous system may do, for whom, why, under which limits — before it acts.**

## The wedge

Start where authority is both valuable and measurable:

1. agents that spend money or buy machine services;
2. agents that perform consequential enterprise writes;
3. regulated/public-sector workflows where delegated authority, legal basis, review and traceability matter.

Payments are a **proof case**, not the category. The current x402 settlement anomaly is useful precisely because the authority boundary remained intact while an external payment facilitator failed.

## Position against adjacent platforms

| Adjacent layer | Their job | Our job |
| --- | --- | --- |
| Identity / IAM | Who is this actor? | Given that identity, is this action authorised now? |
| MCP / tool protocol | How can a tool be discovered/called? | Should this invocation be permitted in this context? |
| Payment rail / wallet | Can value be transferred? | Was this spend delegated for this purpose and inside its limits? |
| Agent framework | How does the agent reason/orchestrate? | What power may cross the execution boundary? |
| Observability | What happened? | Was it authorised, under which delegation, and can we prove the decision? |

## Product principles

1. **Vendor neutral.** No dependence on one model, cloud, wallet or tool protocol.
2. **Authority outside the model.** Prompt text never becomes permission.
3. **Fail closed.** Missing or ambiguous authority cannot execute.
4. **Progressive autonomy.** Humans define operating envelopes; agents earn wider autonomy with evidence.
5. **Bound approvals.** Approval is scoped to an exact action/delegation, not a magic global yes.
6. **Idempotent consequences.** Retry cannot become duplicate real-world action.
7. **Proof over trust.** Every consequential attempt yields a receipt without leaking secrets.
8. **Composable, not replacement infrastructure.** Consume existing IAM, MCP, payment and provider systems.

## Standards-first strategy

Do **not** create a competing open action/delegation standard by default. Adopt and contribute to emerging neutral contracts where they fit, then concentrate differentiation in the organization-controlled authorization boundary.

Reference architecture:

```text
Open/portable governed contract
(intent, delegation, purpose, constraints)
        ↓ conformance ≠ permission
OUR AUTHORITY ENGINE
(local policy, institutional rules, budget, risk, approval, revocation)
        ↓ allow / deny / approval
framework-neutral enforcement seam
        ↓
MCP / API / x402 / database / real-world action
        ↓
proof + operational evidence
```

This makes the company complementary to standards rather than dependent on winning a standards war.

### Open ecosystem we should interoperate with
- portable governed-contract formats for delegation/intent exchange;
- framework-neutral enforcement contracts such as Agent Hooks;
- OAuth/OIDC/IAM for identity;
- MCP/A2A for tool and agent transport;
- x402/MPP/conventional rails for payment execution.

### Commercial differentiation
- institution-specific policy compilation and enforcement;
- enterprise/public-sector delegation lifecycle and revocation;
- evidence-bound approvals and progressive autonomy;
- durable idempotency, retry safety and consequence control;
- provider-neutral receipt registry, replay and incident attribution;
- policy simulation, red-team conformance and promotion gates;
- approval queues, kill switch and control centre;
- regulated/public-sector profiles and deployment support.

## Roadmap

### V0.1 — Universal kernel (now)
- principal + delegation + purpose semantics;
- ALLOW / APPROVAL / BLOCK;
- progressive autonomy gates;
- per-action and delegated budget limits;
- exact-bound approval;
- idempotent execution;
- privacy-safe authority receipt;
- company, government and legal conformance cases.

### V0.2 — Real adapters
- wrap the existing Factory Agent Gateway;
- MCP tool-call adapter;
- x402/MPP payment decision adapter;
- identity context adapter (OIDC/IAM claims);
- durable idempotency + receipt store;
- controlled concurrency and retry tests.

### V0.3 — Obvious product
- Agent Authority Control Centre;
- policy authoring and simulation;
- live "why allowed / why blocked" trace;
- pause/revoke delegation;
- budget and approval queue;
- downloadable proof packet.

### V0.4 — Regulated/public-sector profile
- legal basis / purpose limitation;
- data-minimisation claims;
- named accountable official;
- contestability / appeal route;
- reversibility / rollback metadata;
- retention and evidence policy;
- deployment profile for EU public administration.

### V1 — Interoperable trust layer
- consume signed delegation credentials from compatible standards;
- portable proof export mapped to compatible receipt formats;
- cross-vendor runtime conformance evidence;
- Trust Passport built from independently verifiable evidence, not self-attestation.

## North-star demo

> **Give an autonomous agent a real €10 operating envelope and a useful job.**

It may discover and purchase useful machine services, call tools and complete work. Then attack it with overspend, prompt injection, wrong-purpose requests, stale approvals, revoked delegation, retries and payment-provider failures.

Success is not "nothing fails". Success is:

- useful work completes;
- unauthorised actions make zero provider calls;
- duplicate consequences are zero;
- external failures stay outside the authority boundary;
- every decision is explainable from a safe receipt.

## North-star metrics

- **unauthorised provider calls:** 0;
- **duplicate consequential executions:** 0;
- **blocked-before-provider precision:** 100% on gold/adversarial set;
- **receipt coverage:** 100% of attempted consequential actions;
- **secret leakage in receipts:** 0;
- **policy portability:** same authority semantics across 3+ providers/frameworks;
- **time to integrate:** target < 30 minutes for a reference agent;
- **operator burden:** decrease approval frequency as evidence-backed autonomy is earned.
