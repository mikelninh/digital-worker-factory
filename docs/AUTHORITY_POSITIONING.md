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
7. **Proof over trust.** Every consequential attempt yields a receipt without leaking secrets.
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
- idempotent execution;
- privacy-safe authority receipts;
- company, government and legal conformance cases.

### V0.2 — Integration + durable consequence control ✅ reference implementation
- OIDC/IAM claims → actor/principal context;
- MCP executor downstream of authority;
- x402 paid-resource executor downstream of spend authority;
- facilitator failure attribution;
- durable JSON reference idempotency store;
- durable JSONL receipt store;
- replay suppression proven across gateway restart.

These are reference adapters/stores. Production requires hardened shared infrastructure rather than local JSON files.

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

## Next production milestones

1. **Network service** — expose the authority decision boundary as a versioned authenticated API/service, not only an in-process library.
2. **Shared durable state** — transactional datastore for idempotency, delegation revocation, budgets and receipts across replicas.
3. **Live adapters** — connect one real MCP workflow and the already-tested real x402 payment path behind the kernel.
4. **Revocation + approvals API** — durable delegation lifecycle, approval queue, kill switch and emergency policy changes.
5. **Concurrency proof** — controlled concurrent paid actions, retries, crash/restart and race-condition tests.
6. **Policy simulation** — replay historical actions against proposed policy changes before rollout.
7. **Public-sector evidence profile** — retention, provenance freshness, contestability/appeal receipt fields and deployment controls.
8. **Portable evidence export** — signed receipts / compatible proof formats without creating another standards silo.

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
