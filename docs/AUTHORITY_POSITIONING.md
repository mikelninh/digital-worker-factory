# Positioning: Authority Infrastructure for Autonomous Systems

## Category

**Authority infrastructure for autonomous systems**

## One-line promise

> **Decide and prove what an autonomous system may do, for whom, why, under which limits — before it acts.**

## The wedge

Start where authority is valuable and measurable:

1. agents that spend money or buy machine services;
2. agents that perform consequential enterprise writes;
3. regulated/public-sector workflows where delegated authority, legal basis, review and traceability matter.

Payments are a **proof case**, not the category. The observed x402 settlement anomaly is useful precisely because the authority boundary remained intact while an external payment facilitator failed.

## Position against adjacent platforms

| Adjacent layer | Their job | Our job |
| --- | --- | --- |
| Identity / IAM | Who is this actor? | Given that identity, is this action authorised now? |
| Portable governed contract | What intent/delegation is described? | Does the institution actually authorise execution now? |
| MCP / tool protocol | How can a tool be discovered/called? | Should this invocation cross the consequence boundary? |
| Payment rail / wallet | Can value be transferred? | Was this spend delegated for this purpose and inside its limits? |
| Agent framework | How does the agent reason/orchestrate? | What power may leave the framework? |
| Observability | What happened? | Was it authorised, under which delegation, and can we prove the decision? |

## Product principles

1. **Vendor neutral.** No dependence on one model, cloud, wallet or tool protocol.
2. **Authority outside the model.** Prompt text never becomes permission.
3. **Fail closed.** Missing or ambiguous authority cannot execute.
4. **Progressive autonomy.** Humans define operating envelopes; agents earn wider autonomy with evidence.
5. **Bound approvals.** Approval is scoped to an exact action/delegation, not a global yes.
6. **Idempotent consequences.** Retry cannot become duplicate real-world action.
7. **Proof over trust.** Every consequential attempt yields a receipt without leaking secrets or raw action/evidence payloads.
8. **Composable, not replacement infrastructure.** Consume existing IAM, MCP, payment and provider systems.

## Standards-first strategy

Do **not** create a competing open action/delegation standard by default. Adopt and contribute to emerging neutral contracts where they fit, then concentrate differentiation in the organization-controlled authorization boundary.

```text
portable governed contract / intent conformance
        ↓ conformance ≠ permission
OUR AUTHORITY ENGINE
        ↓ institutional authorization
framework-neutral enforcement seam
        ↓
MCP / API / x402 / database / real-world action
        ↓
proof receipt
```

Reference interop exists for portable Governed Contract-style results and Agent Hooks-style framework enforcement. These are mappings, not formal certification claims.

## Commercial differentiation

The company value should concentrate in:

- institution-specific policy compilation and enforcement;
- enterprise/public-sector delegation lifecycle and revocation;
- evidence-bound approvals and progressive autonomy;
- durable idempotency, retry safety and consequence control;
- provider-neutral receipt registry, replay and incident attribution;
- policy simulation, red-team conformance and promotion gates;
- approval queues, kill switch and control centre;
- regulated/public-sector profiles and deployment support.

## What is built now

### V0.1 — Universal authority kernel ✅
- principal + delegation + purpose semantics;
- ALLOW / APPROVAL / BLOCK;
- progressive autonomy gates;
- action and delegated budget limits;
- exact-bound approval;
- fail-closed unknown/revoked/expired authority;
- privacy-minimised proof receipts;
- company, government, legal and finance conformance cases.

### V0.2 — Integration + consequence control ✅ reference implementation
- OIDC/IAM claims → actor/principal context;
- MCP executor downstream of authority;
- x402 paid-resource executor downstream of spend authority;
- facilitator failure attribution;
- atomic claim-before-provider idempotency in the reference runtime;
- simultaneous duplicate suppression;
- uncertain failure → reconciliation instead of blind retry;
- durable JSON reference idempotency store;
- durable JSONL receipt store;
- durable JSON delegation-revocation store;
- replay suppression proven across gateway restart.

These are reference adapters/stores. Production requires hardened transactional shared infrastructure across replicas.

### V0.3 — Obvious product ✅ first demo slice
- interactive Authority Control Centre at `/authority` in the site bundle;
- live browser policy simulator;
- UI decisions parity-tested against the Node kernel;
- visible budgets, delegation and approval state;
- pause control for the demo surface;
- “why allowed / why blocked” explanations;
- €10 mission + adversarial gauntlet.

The current provider catalogue is deterministic fixture data for safe repeatability. It does **not** pretend the new mission is already making live external payments.

### V0.4 — Public-sector profile 🟢 first reference profile
- legal basis;
- purpose and jurisdiction;
- bounded data scope;
- named accountable official;
- contestability route + owner for adverse actions;
- reversibility mode + owner;
- fail-closed governance-incomplete escalation.

This is an executable reference profile, **not a legal-compliance certification**.

### V0.5 — Authenticated service boundary 🟢 reference implementation
- bearer-protected `/v1/preflight`;
- bearer-protected `/v1/invoke`;
- receipt retrieval;
- durable delegation revocation endpoint;
- malformed/oversized body fail-closed handling;
- runnable local service entry point.

This is a local/reference service, not yet a hardened public deployment.

## Next production milestones

1. **Shared transactional state** — datastore for idempotency claims, budgets, delegation revocation and receipts across processes/replicas.
2. **Live adapters behind the kernel** — connect one real MCP workflow and the already-tested real x402 payment path to the authority service.
3. **Approval lifecycle API** — durable approval requests, expiry, multi-party rules and emergency revocation/kill switch.
4. **Crash/network ambiguity proof** — process termination at every execution phase, provider timeout after submission, reconciliation workflow and recovery tests.
5. **Policy simulation** — replay historical actions against proposed policy changes before rollout.
6. **Public-sector evidence expansion** — provenance freshness, retention, appeal receipt fields and deployment controls.
7. **Portable evidence export** — signed receipts / compatible proof formats without creating another standards silo.
8. **Public deployment** — hosted Control Centre + service with authentication, monitoring and operational runbook. The connected Vercel account currently has no project, so no public deployment is claimed yet.

## North-star demo

> **Give an autonomous agent a €10 operating envelope and a useful job.**

The deterministic end-to-end version now completes a public-building research mission while testing overspend, unknown vendors, prompt injection, replay, external settlement failure and human approval.

Current deterministic mission result:

- useful brief completed;
- **€5.70 / €10** spent;
- **€4.30** remains;
- **0 unauthorised provider calls**;
- **0 duplicate consequential executions**;
- **0 sensitive payment payload leaks**;
- every attempted action receives an authority receipt.

The earlier real x402 repeat run remains separate evidence: 9/10 real Base Sepolia settlements succeeded, with the one failure isolated to facilitator settlement. Do not conflate that real payment evidence with this deterministic mission fixture.

## North-star metrics

- **unauthorised provider calls:** 0;
- **duplicate consequential executions:** 0;
- **blocked-before-provider precision:** 100% on gold/adversarial set;
- **receipt coverage:** 100% of attempted consequential actions;
- **secret leakage in receipts:** 0;
- **policy portability:** same authority semantics across multiple providers/frameworks;
- **time to integrate:** target < 30 minutes for a reference agent;
- **operator burden:** decrease approval frequency as evidence-backed autonomy is earned.
