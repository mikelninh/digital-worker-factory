# Government Capability Network

**Bring your agents. We provide the capabilities they can be trusted to use.**

This package turns the Digital Worker Factory portfolio into a public-sector-ready capability layer for German and European administration. It is deliberately not another chatbot or monolithic agent platform. Authorities and public IT providers can keep their preferred models, orchestration, sovereign cloud and identity stack while calling bounded, evidence-returning capabilities through stable interfaces.

## Why this exists now

Germany is already moving from AI experimentation to agentic implementation. The BMDS/DigitalService Agentic AI Hub has piloted agentic systems with municipalities and is preparing scaling mechanisms, a dynamic purchasing system and follow-on implementation. Public IT providers are also building shared GenAI infrastructure. The opportunity is therefore to make trustworthy specialist capabilities easy to discover, procure, integrate, evaluate and reuse.

Official context (checked 2026-08-28):

- DigitalService Agentic AI Hub: https://digitalservice.bund.de/projekte/agentic-ai-hub
- BMDS second Agentic AI Hub round: https://bmds.bund.de/aktuelles/pressemitteilungen/detail/agentic-ai-hub-start-der-2-bewerbungsrunde
- BMDS sovereign AI cloud: https://bmds.bund.de/aktuelles/pressemitteilungen/detail/bmds-erteilt-zuschlag-fuer-souveraene-ki-cloud
- FITKO Deutschland-Stack: https://www.fitko.de/aktuelles/details/deutliche-fortschritte-in-der-verwaltungsdigitalisierung
- Deutsche Verwaltungscloud: https://www.fitko.de/produktmanagement/deutsche-verwaltungscloud-dvc
- govdigital GenAI platform: https://genai.govdigital.de/

## Product thesis

Government should not have to buy a new end-to-end AI platform for every workflow. It should be able to procure **small, reviewable capabilities** and reuse them across agents and services.

Examples:

- `law.citation.verify.v1` — source-grounded legal citation verification;
- `document.preflight.v1` — completeness, rule and evidence checks;
- `rights.eu261.v1` — deterministic passenger-rights precheck;
- `rights.elterngeld.precheck.v1` — deterministic benefit precheck;
- `agent.output.judge.v1` — independent evaluation against a bounded rubric;
- `publicmoney.budget.query.v1` — grounded public-budget queries;
- `openproof.verify.v1` — proof / permission / action-binding verification;
- `entity.resolve.org.v1` — organisation entity resolution with evidence;
- `hauspilot.triage.v1` — bounded operational triage, already proven through a real x402 Base Sepolia settlement.

The catalog must always distinguish **callable now**, **adapter-ready**, **pilot-only** and **planned**. No capability becomes “production” through marketing copy.

## Government buying model

Do **not** force crypto or per-request micropayments on government. x402 is one machine-payment rail for the open agent economy. Public-sector buyers should be able to choose:

1. fixed-price 30-day pilot;
2. annual subscription / framework contract;
3. metered API usage with monthly invoice;
4. managed sovereign deployment;
5. self-hosted / public-IT-provider operated deployment where appropriate.

Citizens and vulnerable beneficiaries should normally pay **€0**. The institution that saves processing time, reduces error, improves compliance or gains reusable infrastructure is the buyer.

## First buyer groups

### 1. BMDS + DigitalService / Agentic AI Hub

Offer: **Trusted Capability Layer for Agentic Administration**.

The pitch is not “replace the Hub.” It is “let every Hub agent call the same tested specialist capabilities, with explicit evidence, policy and human authority.”

Best initial capabilities: document preflight, rights/rules checks, agent QA, proof/permission verification.

### 2. govdigital + public IT providers

Offer: a portable capability gateway that can sit behind shared public-sector GenAI infrastructure and be operated by public IT providers.

High-leverage integration targets include Dataport, Komm.ONE, AKDB, ekom21, KDO and DVZ because public IT providers can replicate one integration across many authorities.

### 3. FITKO / Deutschland-Stack ecosystem

Offer: capabilities that use rather than replace federal base components. Identity, evidence retrieval, notifications, payments and data exchange remain authoritative public infrastructure; our layer performs bounded interpretation, verification and preparation around them.

### 4. Municipalities / specialist authorities

Offer concrete outcome pilots rather than “AI transformation”:

- reduce time spent checking application completeness;
- surface missing evidence before a case enters manual processing;
- verify rule/citation provenance;
- classify inbound work without taking final decisions;
- detect contradictions and route exceptions;
- produce reviewable decision preparation with human approval.

### 5. BSI / public-sector AI assurance

Offer `agent.output.judge.v1`, adversarial evals, policy conformance and replayable traces as an independent QA layer. This complements security/evaluation work; it does not claim certification authority.

## Public-sector invariant

> **The model may propose. Deterministic systems decide what is allowed. Humans retain authority for consequential decisions.**

For benefits, healthcare, legal outcomes, enforcement, payments and other consequential workflows:

- no model-generated final authority;
- no payment or procurement status upgrades trust;
- no silent external writes;
- evidence and provenance travel with the result;
- human review boundaries are machine-enforced;
- every call is traceable and replayable where policy permits;
- retention and sensitive-data posture are explicit per capability.

## 30-day Government Pilot

A default pilot should be small enough to buy and serious enough to measure:

**Week 1 — workflow + gold set**

- choose one existing administrative process;
- define 30–100 representative cases;
- establish ground truth, current handling time and error/escalation baseline;
- agree data boundaries and human authority.

**Week 2 — integration**

- connect one bounded capability through HTTP/MCP/A2A as appropriate;
- run in shadow mode first;
- integrate audit/eval output;
- no autonomous consequential writes.

**Week 3 — supervised use**

- 3–10 real users;
- measure time saved, correctness, escalation quality and usability;
- record every failure mode.

**Week 4 — decision**

- before/after evidence pack;
- security/privacy/procurement deltas;
- portability assessment;
- scale or stop.

Suggested commercial shape: fixed pilot fee with a clearly bounded scope; no percentage of citizen benefits and no sale of citizen profiles.

## Scale target

“Millions or billions of calls” is an architecture requirement, not a claim about current throughput. The target design is:

- stateless capability workers;
- horizontally scalable containers / serverless workers;
- edge authentication, rate limiting and catalog caching;
- separate control plane and data plane;
- asynchronous queues for long-running jobs;
- idempotency / replay protection;
- deterministic caching where legally and semantically safe;
- tenant budgets and quotas;
- OpenTelemetry-compatible metrics/traces;
- EU/Germany deployment profiles;
- provider-neutral model layer;
- invoice, subscription and machine-payment rails separated from authority;
- load tests and SLOs before any production-scale claim.

See `SCALE_ARCHITECTURE.md`.

## Proof already achieved

Agent Commerce RC0 completed a real Base Sepolia x402 settlement on 2026-08-28:

- capability: `hauspilot.triage.v1`;
- price: $0.01 test USDC;
- buyer: `0x2b36b350701f82bd25fa34Dc32fC52a2737eF523`;
- transaction: `0xb28f1b80c766f02ad1fb3d53ae718b51a734ad41814ef8acd75bfcaa5272f385`;
- HTTP 200 after settlement;
- 1143 ms observed end-to-end latency;
- `paymentGrantedAuthority: false`;
- `externalActionExecuted: false`.

This proves the payment/capability plumbing on testnet. It is **not** production revenue, a throughput benchmark or government approval.

## Next evidence gates

1. public HTTPS deployment;
2. one government/public-IT discovery conversation;
3. one signed 30-day pilot;
4. one capability integrated into an external agent stack;
5. one paid external transaction or invoiced pilot;
6. measured before/after outcome;
7. sovereign deployment validation;
8. repeat purchase / second authority.

The goal is not “government uses our AI.” The goal is **government can safely reuse our capabilities across many agents, authorities and providers.**
