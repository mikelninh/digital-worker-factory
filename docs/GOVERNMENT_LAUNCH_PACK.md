# Government Launch Pack — Open Capability Network

## Positioning

**Bring your agents. We provide the verified capabilities they need.**

The Open Capability Network (OCN) is a trust and specialist-capability layer for agentic public administration. It does not replace sovereign cloud infrastructure, government LLMs, Fachverfahren, identity systems or public IT providers. It gives those systems bounded, evidence-first capabilities with explicit authority and audit contracts.

Core promise:

> **Proof before trust. Authority outside the model. Evidence with every action.**

## What a public-sector buyer gets

1. **Machine-readable capability discovery** — readiness, protocol, risk, evidence, privacy, deployment and commercial metadata.
2. **Specialist APIs** — bounded domain functions instead of unconstrained general-agent behavior.
3. **Authority gates** — payment, prompts and model output cannot elevate permissions.
4. **Evidence and receipts** — request/output hashes, capability version, policy state and execution/settlement evidence where applicable.
5. **Human control for consequential work** — final administrative, legal, clinical or financial authority stays outside the model.
6. **Sovereign-compatible deployment path** — managed EU, customer VPC or institution-controlled deployment depending on capability.
7. **Published evals and golden cases** — claims should be inspectable, replayable and regression-tested.

## First three government use cases

### 1. Application Preflight

**Problem:** caseworkers lose time on incomplete applications, missing evidence and contradictions.

**OCN role:**

```text
application + evidence references
  -> document.preflight.v1
  -> completeness + missing evidence + contradictions + uncertainty
  -> human / existing Fachverfahren
```

**OCN does not:** issue the final entitlement, permit or rejection.

**Pilot metrics:**

- incomplete submissions detected before caseworker review.
- false-positive / false-negative rate.
- caseworker review time.
- evidence coverage.
- human override rate.

### 2. Decision Evidence Packet

**Problem:** an agent can produce a recommendation faster than a human can verify it.

**OCN role:**

```text
agent recommendation
  -> legal/rule capability
  -> source/evidence set
  -> judge.output.v1
  -> rubric score + weaknesses + missing support
  -> human decision
```

**Pilot metrics:**

- review time.
- unsupported-claim rate.
- correction rate.
- evidence coverage.
- human confidence / usability score.

### 3. Fresh Rule Check

**Problem:** agentic workflows may rely on stale laws, policies, budgets or local rules.

**OCN role:**

```text
rule assertion + jurisdiction + purpose
  -> freshness / rights / legal provider
  -> current version + effective date + source + confidence
  -> calling agent
```

**Pilot metrics:**

- stale-rule catches.
- source coverage.
- freshness lag.
- false alerts.

## First capability set

The discovery catalog is the source of truth. Initial network records include:

- `hauspilot.triage.v1`
- `judge.output.v1`
- `rights.eu261.v1`
- `rights.elterngeld.de.v1`
- `terms.agb.de.v1`
- `legal.gitlaw.de.v1`
- `document.preflight.v1`
- `entity.resolve.org.v1`
- `publicmoney.de.v1`
- `openproof.verify.v1`
- `careos.review.v1`

Readiness labels are intentionally strict:

- **live** — reachable endpoint + green contract/eval gates.
- **adapter_ready** — provider logic/evals exist; OCN adapter/public hosting remains.
- **pilot** — institution-specific governance, validation or additional eval evidence required.

No capability should be marketed as `live` without a reachable endpoint.

## 30-day paid pilot offer

### Objective

Prove one high-friction administrative workflow can be made faster and safer without delegating final authority to the model.

### Scope

- one bounded workflow.
- one participating authority/team.
- synthetic/de-identified data first unless a data-processing agreement and deployment profile are approved.
- 30-100 golden cases agreed with domain reviewers.
- baseline measurement.
- OCN adapter + evidence contract.
- shadow mode before any operational use.
- weekly error review.
- final proof report.

### Deliverables

- working capability endpoint or institution-hosted adapter.
- machine-readable capability contract.
- threat model and authority matrix.
- golden-case/eval suite.
- audit/receipt examples.
- before/after metrics.
- deployment and scale recommendation.
- procurement-ready next-phase scope.

### Success gate

The pilot advances only if measured outcomes improve without unacceptable correctness, privacy or authority failures.

### Commercial hypothesis

Focused 30-day pilot: **EUR 25k-50k** depending on workflow/integration burden.

This is a pricing hypothesis to validate in buyer conversations, not a published framework price or claim of existing public-sector willingness to pay.

## Procurement / security evidence checklist

A serious government evaluation should be able to request and receive:

### Architecture

- system/context diagram.
- data-flow diagram.
- list of external providers/dependencies.
- capability and policy boundary.
- deployment options.

### Security

- threat model.
- authentication/authorization model.
- secrets handling.
- rate/spend limits.
- idempotency/replay controls.
- incident-response ownership.
- dependency/SBOM plan.

### Privacy

- data categories accepted per capability.
- retention per capability.
- data minimisation rules.
- tenant isolation.
- DPA/subprocessor profile when applicable.
- no public anonymous sensitive-data endpoint unless explicitly designed and contracted.

### AI / governance

- intended use and prohibited use.
- model/provider dependencies.
- human oversight point.
- failure/escalation behavior.
- eval set and measured results.
- known limitations.
- version/change policy.

### Reliability

- health/readiness endpoints.
- target SLO/SLA only after measured load testing.
- timeout/retry/circuit-breaker behavior.
- downstream dependency degradation behavior.
- trace/receipt schema.

### Exit / portability

- export format.
- customer-hosted option where applicable.
- no core workflow lock-in to one LLM vendor.
- versioned HTTP/MCP/A2A contracts.

## Integration patterns

### Pattern A — government agent calls OCN managed EU endpoint

Lowest-friction pilot. Use for non-sensitive/synthetic cases first.

### Pattern B — OCN capability deployed in public IT provider / customer VPC

Preferred path for workflows needing stronger sovereignty or data controls.

### Pattern C — OCN contract + customer-owned implementation

For highly sensitive or strategic capabilities, OCN supplies schemas, evals, policy gates and proof contracts while runtime stays fully inside customer infrastructure.

## Public IT provider partnership offer

The highest-leverage partnership is a reusable integration with a public IT provider rather than one-off custom work per municipality.

Partner value:

- one capability contract reused across many authorities.
- common eval/security/procurement evidence.
- model-neutral integration.
- shared adapters around existing Fachverfahren.
- measured outcome dashboard.
- optional managed capability updates/freshness.

OCN value:

- distribution.
- feedback across multiple real workflows.
- stronger golden-case network.
- recurring integration/support/usage revenue.

## Buyer conversation script

Start with the workflow, not AI:

1. Which process currently creates the most repetitive review work?
2. Where do incomplete evidence, stale rules or unverifiable AI output create risk?
3. Which decision must remain human/official?
4. What data may leave the current environment, if any?
5. What measurable outcome would justify a 30-day pilot?
6. Which public IT provider/Fachverfahren owner must be involved for scaling?

Then demo the contract:

> Your agent stays yours. Your infrastructure stays yours. Your authoritative system stays authoritative. OCN gives the agent a bounded capability with evidence, explicit permissions and a receipt you can audit.

## First buyer targets

Prioritize organizations with active agentic/public-AI work and distribution leverage:

1. BMDS / DigitalService Agentic AI Hub.
2. govdigital.
3. Dataport.
4. AKDB.
5. Komm.ONE.
6. ekom21.
7. KDO.
8. DVZ.
9. municipalities / states already running document-intensive AI pilots.
10. regulated enterprises as faster-moving parallel buyers.

## 30-day revenue objective

Primary target: **one paid pilot at EUR 25k+ booked within 30 days.**

Stretch target: **EUR 100k booked** through two pilots or one larger integration/evaluation package.

Government procurement may delay cash collection, so parallel enterprise/public-IT/integrator sales should be used to shorten the first-cash cycle.

## What makes OCN different

We do not ask the institution to trust the model more.

We reduce the amount of trust it must place in the model at all:

- rules and evidence come from bounded providers.
- authority is deterministic and external.
- outputs can be independently judged.
- consequential actions require explicit permission/human review.
- every important transition can produce a receipt.
- readiness claims are tied to test/deployment evidence.

That is the product: **trustworthy capabilities for agents doing real work.**
