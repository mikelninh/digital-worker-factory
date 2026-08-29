# OCN Trust Assurance Specification

**Status:** working architecture contract  
**Purpose:** define exactly what OCN means by trust, what can be proven, what cannot be proven, and how assurance is communicated without marketing overclaim.

## 1. Core definition

OCN does not claim to prove that an AI system is globally "trustworthy".

OCN provides **verifiable assurance for specific claims in a specific context at a specific time**.

The product promise is:

> **Before an agent acts, OCN checks the evidence, authority, freshness and policy. After it acts, OCN leaves a verifiable receipt.**

This preserves the existing invariants:

- Proof before trust.
- Authority outside the model.
- Payment buys computation, not permission or trust.
- Unknown stays unknown; missing evidence cannot be converted into confidence.
- A model, payment, prompt or tool result cannot elevate its own authority.

## 2. What OCN can and cannot prove

### OCN can prove or strongly verify

- which capability/version was called;
- which request/output hashes were processed;
- which evidence references were supplied;
- whether evidence satisfies a declared structural/provenance contract;
- whether a source/rule was within an explicit freshness window;
- whether an explicit credential/grant/policy authorizes the requested action;
- which policy/version was evaluated;
- which checks ran and their deterministic results;
- whether a human approval was present where required;
- whether a bounded external action was executed;
- settlement/payment evidence where a payment rail provides it;
- latency, error state and runtime outcome;
- later human override / confirmed outcome when feedback is supplied.

### OCN cannot honestly prove by itself

- absolute truth about the external world;
- that a source is substantively correct merely because it is authentic;
- that an LLM answer is universally correct;
- future outcomes that have not occurred;
- legal/clinical correctness beyond the scope of the validated capability and authoritative sources;
- identity, authority or consent that has not been backed by a trusted credential/system;
- safety in every possible context;
- certification by an independent body unless that body actually performed it.

The correct response for unsupported claims is `unknown`, `insufficient_evidence` or `review`, never fabricated certainty.

## 3. The Trust Envelope

Every consequential OCN interaction should converge on a common machine-readable envelope.

```json
{
  "schema": "ocn.trust-envelope/1",
  "traceId": "...",
  "subject": {
    "actor": "...",
    "agent": "...",
    "capability": "authority.check.v1",
    "action": "..."
  },
  "decision": "allow | review | block | unknown",
  "claims": [
    {
      "type": "authority",
      "status": "verified",
      "assurance": "A2",
      "evidence": ["credential-or-policy-ref"],
      "expiresAt": "..."
    }
  ],
  "checks": [
    {
      "id": "authority.explicit-grant",
      "version": "1.0.0",
      "result": "pass"
    }
  ],
  "gaps": [],
  "policy": {
    "id": "...",
    "version": "..."
  },
  "authority": {
    "paymentGrantedAuthority": false,
    "humanApprovalRequired": true,
    "humanApprovalPresent": false
  },
  "receipt": {
    "requestHash": "...",
    "outputHash": "...",
    "executed": false
  },
  "observedAt": "...",
  "validUntil": "..."
}
```

No single scalar "trust score" should replace this envelope. Trust is multi-dimensional and contextual.

## 4. Claim families

OCN should standardize the following claim families first.

### Identity

**Question:** Who/what is acting?

Proof inputs can include authenticated session identity, service identity, EUDI/enterprise credentials, API principal or customer-controlled identity provider evidence.

### Authority

**Question:** May this actor perform this action for this purpose and scope?

Proof requires explicit grants, roles, policy rules or human approval. Inference from model text is not authority.

### Evidence / provenance

**Question:** What supports the claim or recommendation, and is that support bound to the output?

Proof covers provenance, evidence coverage, references/hashes and declared source contracts. Substantive truth may still remain uncertain.

### Freshness

**Question:** Is the evidence/rule/current state recent enough for this use?

Proof requires observation/effective timestamps and an explicit maximum-age or validity policy.

### Policy / applicability

**Question:** Which current rule/policy applies to this actor, jurisdiction, purpose and action?

Proof should record policy identity, version, effective dates and evaluated conditions.

### Evaluation

**Question:** Does the output satisfy a bounded rubric/golden-case expectation?

Proof includes evaluator/version, rubric, score/check results, known limitations and calibration evidence.

### Execution

**Question:** What actually happened?

Proof includes idempotency key, target system, action result, timestamps and failure state. A proposed action is not an executed action.

### Outcome

**Question:** Was the recommendation/action later confirmed, overridden, harmful, useful or unknown?

Outcome labels power the evidence flywheel and must be separated from initial model confidence.

## 5. Assurance levels

Assurance levels describe the strength of evidence for an individual claim, not a global rating of an agent.

| Level | Meaning | Minimum evidence |
|---|---|---|
| A0 | Unknown | no usable evidence |
| A1 | Declared | supplied assertion/schema-valid data, not independently verified |
| A2 | Verified | deterministic or cryptographic/authoritative-source verification passed |
| A3 | Evaluated | A2 plus tested against published eval/golden-case/adversarial criteria |
| A4 | Operationally proven | A3 plus measured real-world outcomes, override/error rates and production reliability |
| A5 | Independently attested | A4 plus a relevant external audit/certification/authority attestation |

OCN must never self-promote a capability to A5.

## 6. Trust Proof Registry

Every live capability should publish a proof card containing:

- capability ID/version;
- intended use and prohibited use;
- claim families supported;
- assurance level per claim family;
- deterministic vs model-based components;
- evidence/source contract;
- eval dataset and results;
- adversarial tests;
- human override policy;
- privacy/retention policy;
- p50/p95/p99 latency once measured;
- uptime/error rates once measured;
- known failure modes;
- last evaluation date;
- policy/source freshness state;
- real-world outcome evidence once available;
- external attestations, if any.

If a field has not been measured, publish `not_measured` rather than a projection.

## 7. What makes OCN worth buying

The trust layer is valuable only if it improves at least one measurable buyer outcome:

1. prevents an unsafe/unauthorized/stale/unsupported action;
2. reduces human review time while preserving or improving quality;
3. creates audit/compliance evidence automatically;
4. reduces integration work across many agents/providers;
5. reduces incident investigation time through replayable receipts;
6. lowers the cost of changing models because trust controls remain model-neutral;
7. enables an organization to safely increase agent autonomy.

If OCN cannot demonstrate one of these in a pilot, the buyer should not expand usage.

## 8. The no-brainer adoption path: Shadow -> Enforce -> Scale

### Phase 1 — Shadow Mode

OCN observes an existing agent workflow and emits trust envelopes without blocking production actions.

Measure:

- missing evidence rate;
- stale evidence/rule rate;
- authority mismatch rate;
- unsupported output rate;
- human override rate;
- review time;
- p95 added latency;
- cost per trusted event;
- false-block / false-allow estimates using human adjudication.

This makes adoption low-risk.

### Phase 2 — Guarded Enforcement

After thresholds are agreed, OCN may automatically block only deterministic high-confidence violations. `review` remains fail-closed for consequential actions and routes to authorized humans.

### Phase 3 — Scale

Roll the same policy/evidence contracts across more agents, departments and providers. Retain customer-controlled identity/authority systems and authoritative Fachverfahren.

## 9. Buyer proof package

A buyer should be able to inspect OCN without trusting a sales presentation.

The package should include:

- public capability catalog;
- Trust Proof Registry;
- threat model;
- architecture/invariants;
- current CI/eval evidence;
- live test endpoint;
- example trust envelopes;
- settlement receipt example;
- privacy/data-flow summary;
- sovereign/customer-VPC deployment path;
- pilot success criteria;
- known limitations and not-yet-proven claims.

## 10. Standards alignment

OCN should map its assurance evidence to external frameworks rather than inventing a competing compliance vocabulary.

Priority mappings:

- EU AI Act: logging/record keeping, transparency, human oversight, accuracy/robustness/cybersecurity and relevant deployer/provider duties;
- NIST AI RMF: Govern, Map, Measure, Manage and context-specific trustworthiness characteristics;
- BSI / public-sector security requirements where applicable;
- customer-specific governance/policy controls;
- EUDI/OOTS/NOOTS/FIT-Connect and other public base rails where they provide identity/evidence/data exchange rather than duplicating them.

OCN evidence can support compliance work; OCN must not claim that using OCN alone makes a system compliant.

## 11. Success criteria for the trust thesis

The thesis is validated when external customers repeatedly pay because OCN measurably improves safe autonomy.

Required evidence gates:

- external agent uses OCN repeatedly;
- at least one trust event catches a real issue judged useful by the customer;
- customer confirms lower review/investigation/integration cost or higher safe automation;
- false-block/false-allow rates are measured;
- outcome-labelled events improve a policy/evaluator without degrading a protected regression set;
- one customer expands from shadow to enforcement;
- one integration is reused across multiple agents/workflows;
- one independent security/compliance review finds the evidence useful.

The long-term moat is not the word "trust". It is the accumulated, outcome-labelled evidence showing **when agents can act, when they need review, and why**.
