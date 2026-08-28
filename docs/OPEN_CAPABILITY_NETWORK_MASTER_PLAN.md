# Open Capability Network — Master Plan

**Status:** execution plan  
**Sprint:** 7 days to a public, inspectable, integration-ready trust rail  
**North star:** become the standard trust rail that agents call automatically before consequential decisions or actions.

> **Proof before trust. Authority outside the model. Evidence with every action.**

## 1. What we are building

The Open Capability Network (OCN) is not another general-purpose agent framework. It is the missing trust and capability layer between increasingly capable models and real-world systems.

Models may reason. Agent runtimes may orchestrate. Existing government and enterprise systems remain authoritative. OCN supplies the specialist capabilities that agents must not invent: verified rules, current evidence, bounded domain computation, output evaluation, identity/permission checks, human approval, and auditable receipts.

The target flow is:

```text
agent
  -> discover capability
  -> inspect readiness / risk / privacy / evidence contract
  -> authenticate / prove authority where required
  -> call bounded capability
  -> receive evidence + confidence + receipt
  -> policy / human approval gate for consequential work
  -> execute through existing authoritative system
  -> record outcome / audit / eval
```

The economic invariant remains:

> **Payment purchases computation, not trust or authority.**

## 2. Why now — government wedge

Germany is already operationalizing agentic AI in public administration. The BMDS Agentic AI Hub is running municipal pilots, starts its second implementation phase on 7 September 2026, and is explicitly working on scaling successful solutions through reusable infrastructure and a dynamic purchasing system. BMDS also describes the state as an anchor customer for domestic AI companies.

At the same time, Germany is building sovereign AI/cloud infrastructure and the Deutschland-Stack, while govdigital coordinates shared platforms and an AI ecosystem across public IT providers. The opportunity is therefore not to replace the sovereign cloud, the government LLM, the Fachverfahren, or the public IT provider. The opportunity is to provide a reusable trust/capability layer that plugs into all of them.

Current public references:

- BMDS Agentic AI Hub: https://bmds.bund.de/en/themen/kuenstliche-intelligenz/ki-in-der-verwaltung/agentic-ai-hub
- DigitalService Agentic AI Hub: https://digitalservice.bund.de/en/projects/agentic-ai-hub
- BMDS second pilot round / scaling mechanisms: https://bmds.bund.de/aktuelles/pressemitteilungen/detail/agentic-ai-hub-start-der-2-bewerbungsrunde
- BMDS sovereign AI cloud: https://bmds.bund.de/aktuelles/pressemitteilungen/detail/bmds-erteilt-zuschlag-fuer-souveraene-ki-cloud
- govdigital: https://govdigital.de/

## 3. Strategic position

Do not compete for the smartest agent.

Own what smart agents cannot safely invent:

1. **Truth** — grounded, current, source-bound facts and rules.
2. **Proof** — provenance, verification, identity, credentials, consent, purpose.
3. **Evaluation** — independent checks against rubrics, policy and golden cases.
4. **Authority** — explicit role, scope, policy and human approval outside the model.
5. **Safe execution** — bounded actions through existing authenticated systems.
6. **Receipts** — request/output hashes, approval state, execution status and settlement evidence.
7. **Freshness** — continuous detection of legal, policy, budget and institutional change.

Long-term product family:

- **OpenCapabilities** — discovery + specialist APIs.
- **OpenProof** — identity, evidence, policy, permission and provenance.
- **OpenJudge** — independent evaluation, testing and certification evidence.
- **OpenAction** — safe consequential execution with deterministic authority gates.
- **OpenReceipts** — neutral audit/receipt layer tying request -> proof -> decision -> approval -> execution -> outcome.

## 4. Portfolio becomes capability packs

We stop treating the portfolio as isolated products. Existing projects become providers/adapters into one capability network.

### Tier A — callable / proved rail

- `hauspilot.triage.v1` — bounded operations triage; x402 testnet settlement proven.
- shared Agent Gateway — role/policy/human-approval/audit architecture.

### Tier B — adapter-ready specialist providers

These already contain useful domain logic/evals and should be exposed through thin, versioned adapters rather than rebuilt:

- `judge.output.v1` — evaluate output/artifact against bounded rubric.
- `rights.eu261.v1` — deterministic flight-rights check.
- `rights.elterngeld.de.v1` — deterministic German parental-benefit calculation/authority lookup.
- `terms.agb.de.v1` — German AGB/TOS risk scan with grounded rule references.
- `legal.gitlaw.de.v1` — source-grounded legal research/rights capability.
- `document.preflight.v1` — document completeness/evidence/uncertainty preflight via PrüfPilot patterns.
- `entity.resolve.org.v1` — organisation entity resolution with merge evidence and precision/recall evals.
- `publicmoney.de.v1` — grounded public budget/funding lookup with freshness metadata.
- `openproof.verify.v1` — proof/claim/binding/revocation/purpose verification.

### Tier C — institution pilot / consequential domains

These must not become anonymous self-serve APIs before governance is appropriate:

- CareOS clinical workflow support.
- SafeVoice institutional evidence workflows.
- Public Service Passport / benefit eligibility-to-authority flow.
- OpenAction write/execution adapters.

For Tier C, patients/citizens are not the payer. Institutions pay for integration, operation, evaluation and support.

## 5. OpenCapabilities discovery contract

Every capability entry must expose enough machine-readable metadata for an agent or procurement team to decide whether it is suitable.

Minimum fields:

```json
{
  "id": "document.preflight.v1",
  "version": "0.1.0",
  "readiness": "live | adapter_ready | pilot",
  "provider": "pruefpilot",
  "domains": ["public-administration", "documents"],
  "protocols": ["http", "mcp", "x402"],
  "risk": "read | write | consequential",
  "authority": {
    "canExecuteConsequentialAction": false,
    "humanApprovalRequired": true
  },
  "trust": {
    "evidenceReturned": true,
    "deterministicCore": false,
    "evalsPublished": true
  },
  "privacy": {
    "acceptsSensitiveData": false,
    "retention": "none"
  },
  "deployment": ["managed-eu", "customer-vpc", "sovereign-compatible"],
  "commercial": {
    "models": ["pilot", "annual-license", "usage"]
  }
}
```

Important: `readiness` is evidence, not marketing. `live` requires a reachable endpoint and green contract/eval gates. `adapter_ready` means existing logic/evals exist but the OCN adapter is not yet published. `pilot` means institution-specific validation/governance is required.

## 6. Government offer

Do not sell “an AI chatbot.” Sell a reusable trust layer that improves the agents government is already deploying.

### Government Capability Gateway

A ministry, municipality or public IT provider can bring its own model/agent and call OCN for bounded tasks:

```text
check_application_completeness()
verify_legal_basis()
verify_document_evidence()
check_rule_freshness()
calculate_entitlement()
resolve_organisation()
judge_agent_output()
verify_credential_or_permission()
prepare_decision_packet()
```

OCN returns evidence and receipts; the existing Fachverfahren and human official remain authoritative.

### Three initial government golden use cases

**1. Application preflight**  
Before a case reaches a caseworker, verify completeness, evidence coverage, contradictions and missing information. Never make the final legal/benefit decision.

**2. Decision evidence packet**  
For an agent-generated recommendation, return the applicable rule/source set, evidence references, uncertainty and a Judge score so a human can review quickly.

**3. Change-aware policy/rule check**  
Before an agent relies on a rule, verify jurisdiction, version, effective date and freshness. Citizen Agents / GitLaw / Public Money provide the pattern for this.

These three are horizontally reusable across permits, benefits, procurement, housing, grants and internal administration.

## 7. Buyers and distribution

Priority is not 10,000 cold municipality sales.

Distribution ladder:

1. **One municipality / authority** — real workflow, measurable outcome, 30-90 day pilot.
2. **One public IT provider** — reusable adapter/deployment that can reach many authorities.
3. **govdigital / shared government platforms** — capability layer integrated into shared infrastructure.
4. **Federal/state ministries and agencies** — domain capability packs + sovereign deployment.
5. **Regulated enterprises** — healthcare, insurance, finance, legal/compliance, utilities.
6. **Other agents** — machine-to-machine usage via API/MCP/A2A and optional x402.

Target organisations for discovery/outreach:

- BMDS / DigitalService Agentic AI Hub.
- govdigital.
- Dataport.
- AKDB.
- Komm.ONE.
- ekom21.
- KDO.
- DVZ.
- Federal/state/municipal teams with active agentic workflows.

The ask is not “replace your stack.” It is:

> **Bring your agents. We provide the verified capabilities they need.**

## 8. Revenue architecture

Government and enterprise should have procurement-friendly rails first:

- fixed-price pilot.
- annual license / managed service.
- usage contract with invoice.
- sovereign/customer-hosted deployment + support/SLA.

Machine-native x402 remains an additional rail for autonomous external agents and low-friction developer adoption, not the only way government pays.

Illustrative, unvalidated pricing hypotheses:

- focused pilot: EUR 25k-100k.
- single authority deployment: EUR 100k-500k/year.
- public IT provider / multi-authority platform: EUR 500k-5m+/year.
- shared national infrastructure: multi-million annual contract depending on scope/SLA/usage.
- machine calls: fractions of a cent through several euros depending on cost/value/risk.

Do not optimize price before proving buyer value. Optimize measurable administrative outcome first.

## 9. Scale architecture — build for scale without pretending we already have it

“Ready for billions” is an architecture property plus evidence, not a claim we make after one local Node process.

### Stateless hot path

- edge/API gateway handles TLS, WAF, DDoS, rate limits and request IDs.
- capability workers are stateless and horizontally scalable.
- large artifacts use object storage; requests pass references/hashes rather than huge bodies.
- slow work becomes async jobs with idempotency keys.
- caches are permitted only for immutable/versioned data with explicit freshness semantics.

### Trust path

- policy/authority checks are deterministic and fail closed.
- capability version and policy version are included in receipts.
- every consequential action requires explicit authority and idempotent execution.
- no payment, prompt or model output can elevate role/authority.

### Data path

- data minimisation by default.
- no sensitive data for public anonymous capabilities unless explicitly designed and contracted.
- EU/sovereign-compatible deployment option.
- retention declared per capability.
- encryption in transit/at rest; tenant isolation for institutional deployments.

### Reliability path

Initial production targets to prove, not merely state:

- 99.9% gateway availability target before public production SLA.
- p95 latency per capability published separately; no fake global latency number.
- idempotency for paid and consequential requests.
- backpressure/queueing for expensive calls.
- circuit breakers around downstream providers.
- deterministic spend/usage caps.
- replayable traces and golden-case regression suite.

### Scale validation ladder

1. local contract tests.
2. CI concurrency/load smoke.
3. hosted 100 RPS synthetic test.
4. hosted 1k RPS test for cheap deterministic capability.
5. sustained traffic with autoscaling and failure injection.
6. only then publish throughput/SLA claims.

We architect so the gateway can scale horizontally to very high request volume, but we publish only measured numbers.

## 10. Proof moat

The moat is not source code alone.

### Golden-case network

Every capability accumulates:

- input.
- authoritative expected output.
- evidence/source.
- policy/version.
- adversarial cases.
- human judgement where needed.
- real-world outcome.

Over time this becomes the dataset/eval layer that institutions trust.

### Trust graph

OpenProof/OpenAction should converge on a graph of:

```text
agent -> identity -> organisation -> credential -> authority
      -> purpose -> policy -> capability -> approval -> action -> receipt
```

This answers the question an LLM cannot safely answer itself:

> **Who may do what, for whom, for which purpose, under which rule, right now?**

### Outcome evidence

The public proof dashboard must increasingly show outcomes such as:

- incomplete submissions reduced.
- review time reduced.
- human override rate.
- false-positive/false-negative rates.
- evidence coverage.
- latency/reliability.
- cost per useful result.

## 11. Seven-day execution sprint

The 12-month ambition is compressed into a one-week evidence sprint. The week does not magically create national-scale procurement or billion-request load; it creates the artifact, interfaces, proof and distribution needed to start those loops immediately.

### Day 1 — CONNECT

- publish this master plan.
- publish `/.well-known/open-capabilities.json`.
- normalize first 10 capability records with readiness/risk/privacy/evidence/deployment metadata.
- keep the proven x402 triage endpoint live in the catalog as the reference implementation.
- define adapter contract so existing repos plug in without rewrites.

**Exit gate:** one machine-readable catalog describes the portfolio truthfully.

### Day 2 — HARDEN

- add schema validation and catalog contract tests.
- add idempotency/request IDs/rate-limit hooks to gateway architecture.
- document tenant, secrets, retention and sensitive-data boundaries.
- define EU/sovereign deployment profile.
- add threat model: prompt injection, authority escalation, replay, overcharge, stale rules, provider compromise.

**Exit gate:** trust boundaries are executable/testable, not prose-only.

### Day 3 — PROVE

- expose proof/eval metadata per capability.
- add first golden-case bundle for government application preflight + Judge.
- publish x402 settlement evidence as reference proof.
- create public proof dashboard showing exactly what is and is not proven.

**Exit gate:** a buyer can audit the claims without trusting a sales deck.

### Day 4 — CONNECT FIRST HIGH-LEVERAGE ADAPTERS

Priority adapters:

1. `judge.output.v1`.
2. `document.preflight.v1`.
3. `legal.gitlaw.de.v1` or bounded rights check.
4. `openproof.verify.v1`.

Do not add more until these four have stable contracts and eval evidence.

**Exit gate:** at least two useful non-HausPilot capabilities are callable behind the common envelope.

### Day 5 — DISTRIBUTE

- public government landing page.
- one-page procurement/security/eval pack.
- 30-day pilot offer with outcome metrics.
- integration guide for public IT providers: HTTP/MCP/A2A + sovereign deployment.
- buyer list and warm/cold outreach queue.

**Exit gate:** there is one link we can send to a CIO, municipal digital lead or govdigital architect.

### Day 6 — SCALE TEST

- deploy public HTTPS preview/testnet gateway.
- synthetic load test cheap deterministic capability.
- measure p50/p95/p99, errors, CPU/memory and autoscaling behaviour.
- add abuse/spend/rate limits.
- publish measured result, including failure modes.

**Exit gate:** first honest hosted throughput baseline.

### Day 7 — REAL BUYER LOOP

- demo with at least one external developer/integrator/public-sector contact.
- get one external agent to discover/call the gateway.
- seek one government/public-IT pilot conversation.
- capture objections into roadmap.
- choose next work strictly from evidence: buyer demand, integration friction, eval failures or scale bottlenecks.

**Exit gate:** external usage or a concrete buyer conversation, not another speculative feature list.

## 12. What we do not do this week

- no new unrelated standalone products.
- no mainnet switch just to claim revenue.
- no production PHI/citizen sensitive data.
- no autonomous benefit/legal/clinical final decisions.
- no fake certification/compliance claims.
- no “billions of transactions ready” claim without measured load evidence.
- no model-specific lock-in.

## 13. Decision rule for every future feature

A feature is allowed into the roadmap only if it strengthens at least one of:

1. **Connect** — brings an existing valuable capability into the network.
2. **Harden** — improves security, authority, privacy, reliability or portability.
3. **Prove** — adds evals, evidence, receipts, golden cases or measured outcomes.
4. **Distribute** — makes adoption/procurement/integration materially easier.

If it does none of these, it waits.

## 14. One-week success definition

At the end of the sprint we want to be able to send a single public link and truthfully say:

> **Bring your agent. Discover our capabilities. Inspect their evidence, risk, privacy and authority contracts. Call the live ones. Verify the receipts. Deploy them in your infrastructure.**

And to a government buyer:

> **We do not replace your sovereign infrastructure or your Fachverfahren. We provide reusable, evidence-first capabilities and authority controls that make the agents you are already adopting safer, more useful and easier to scale.**

That is the company we build toward: **the standard trust rail agents call automatically.**
