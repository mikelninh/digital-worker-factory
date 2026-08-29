# Company 01 — Design Partner Lab

## Why this exists

Company 01 should eventually support organisations across industries, but universality must be earned through evidence rather than claimed from one workflow.

The Design Partner Lab is the closed feedback loop for proving that the same Authority Control Plane can govern materially different organisations without creating a new trust architecture for each one.

We do **not** create a separate Company 02 for every partner. Company 01 remains the product company. Each partner gets an isolated tenant/profile, its own delegation and policy envelope, and a staged pilot.

## Pilot ladder

Every partner starts with the safest useful mode and earns broader execution only from evidence.

### P0 — Synthetic

- synthetic or redacted data
- no external side effects
- authority policy and gold cases
- adversarial gauntlet

### P1 — Shadow / read-only

- real workflow inputs where permitted
- read-only tools
- agent recommends what it would do
- no external writes
- compare with human decisions

### P2 — Prepare

- agent prepares drafts, calculations, proposed updates, research and next actions
- human performs or approves consequential execution

### P3 — Bounded execute

- routine real actions may execute inside explicit limits
- exact approval for higher-consequence actions
- idempotency, revocation, receipts and reconciliation required

### P4 — Earned autonomy

- broader authority only when observed evidence satisfies promotion gates
- degradation or unsafe execution can trigger demotion

## Design Partner #1 — Friendly law firm

Why it is valuable:

- high-consequence environment
- confidentiality and purpose limitation matter
- clear distinction between research/drafting and legal commitments
- direct access to a practising lawyer gives short feedback loops
- existing GitLaw-style capabilities give Company 01 a head start

Good first workflows:

1. matter/case intake triage
2. document and evidence summary
3. deadline / missing-information extraction
4. source-backed legal research
5. draft client update or letter
6. prepare a case-record update

Initial authority profile:

- read permitted matter data: ALLOW
- research and summarize: ALLOW
- prepare draft: ALLOW
- send client communication: APPROVAL
- mutate official case record: APPROVAL
- file/submit externally: APPROVAL
- change deadlines, bank/payment details or client-fund instructions: BLOCK by default
- cross-matter or unrelated data access: BLOCK

Initial success measure:

- useful lawyer-reviewed work produced
- human minutes saved per matter
- factual/source correction rate
- percentage of prepared work accepted
- zero cross-matter data leakage
- zero unauthorized external execution

The first pilot should use synthetic/redacted matters before any live confidential client data.

## Design Partner #2 — Friendly service/company operator

Why it is valuable:

- tests a less-regulated commercial environment
- exposes sales, research, project and customer-operation workflows
- lets us see whether the control plane is useful when the hard problem is speed and delegation rather than regulation
- direct founder/operator feedback keeps iteration fast

Good first workflows:

1. prospect / market research
2. account brief preparation
3. proposal or project brief drafting
4. meeting preparation and follow-up preparation
5. customer request triage
6. internal task and project updates

Initial authority profile:

- public/internal research within purpose: ALLOW
- summarize and draft: ALLOW
- update low-risk internal project state: bounded ALLOW once proven
- send external outreach: APPROVAL initially
- make commercial commitments: APPROVAL
- spend money or change payment details: BLOCK/APPROVAL by explicit threshold
- access unrelated customer/project data: BLOCK

Initial success measure:

- useful work units completed
- operator minutes saved
- accepted drafts / briefs
- qualified opportunities created
- zero unauthorized external communication
- zero unauthorized spend or data access

## Why these two partners are complementary

The law-firm pilot asks:

> Can the Authority Control Plane preserve confidentiality, purpose, evidence and accountable approval in a high-consequence workflow?

The commercial-company pilot asks:

> Can the same primitive increase speed and delegation in ordinary business operations without creating unnecessary approval drag?

If both work with the same kernel, that is stronger evidence of generality than two similar SaaS customers.

## Anti-bias rule

Friendly design partners are excellent for iteration but weak proof of willingness to pay.

After the first two partner loops, Company 01 must recruit at least one cold external design partner who has no friendship obligation and evaluate:

- does the problem hurt without us?
- will they connect a real workflow?
- will they tolerate the integration cost?
- will they pay for the pilot or commit to a paid production path?

## Tenant isolation rule

Every design partner receives a separate:

- principal / organisation identity
- delegation namespace
- policy profile
- action and idempotency namespace
- budget envelope
- receipt/audit scope
- data-access scope

A valid authority grant for one tenant must never be reusable in another tenant.

## Design Partner proof report

Every pilot ends with the same scorecard:

### Value

- useful work units
- human minutes saved
- accepted/rejected agent outputs
- economic value or qualified opportunities
- agent operating cost

### Authority

- proposed actions
- autonomous actions
- approvals
- blocks
- reconciliation cases
- unauthorized provider executions
- duplicate consequences
- post-revocation executions
- approval bypasses
- missing receipts

### Learning

- top friction points
- policies that created unnecessary approval load
- actions customers refused to delegate
- actions customers wanted to delegate more quickly
- evidence required before broader autonomy

## Company 01 experiment sequence

1. Company 01 internal live work
2. Friendly law firm — P0/P1/P2
3. Friendly commercial company — P0/P1/P2
4. Promote only specific proven actions to P3
5. Recruit one cold external design partner
6. Compare cross-company policy reuse, operator burden and willingness to pay

The goal is not to make every organisation identical. The goal is to prove that **the same authority primitive can express different institutional boundaries without surrendering control to the agent.**