# RevenueOS — Closed-Loop Outcome Engine

RevenueOS turns the Digital Worker Factory from a collection of capable workers into a reusable system that continuously discovers, executes and learns from economic opportunities.

The north star is **collected cash + measured customer value per scarce founder hour**.

It does not reward agent count, message volume, demos shipped or speculative pipeline.

## First-principles loop

```text
OBSERVE
  ↓
FIND ECONOMIC OPPORTUNITY
  ↓
QUANTIFY EXPECTED CASH + CUSTOMER VALUE
  ↓
CHOOSE THE HIGHEST-LEVERAGE NEXT ACTION
  ↓
PREPARE ACTION
  ↓
HUMAN APPROVAL WHEN EXTERNAL / FINANCIAL / CONSEQUENTIAL
  ↓
EXECUTE
  ↓
MEASURE REAL OUTCOME
  ↓
UPDATE PLAYBOOK + PRIORITIES
  ↺
```

This is the same underlying pattern whether the vertical is HausPilot, GitLaw, Citizen Agents, CareOS or a future worker family.

## What is reusable across every vertical

Each revenue team has six seats maximum:

1. **Revenue PM** — owns the economic goal, portfolio and handoffs. Does not do specialist work.
2. **Signal Scout** — continuously observes public/customer signals and creates evidence-backed opportunities.
3. **Account / Opportunity Analyst** — qualifies, researches and estimates expected cash, customer value, urgency, effort and risk.
4. **Action Builder** — prepares the smallest useful next action: outreach, audit, proposal, application package, experiment or expansion offer.
5. **Delivery Worker** — fulfils the purchased outcome using the Factory's governed capability system.
6. **Proof + Expansion Worker** — measures before/after value, records failures, produces reusable proof and detects expansion opportunities.

Reuse existing workers before creating a new specialist.

## Machine behaviour contract

Every long-lived worker must define:

```yaml
job: what the worker owns and refuses
connections: systems and data it may access
routines: standing work that runs without prompting
skills: repeatable playbooks it can execute
handoffs: which worker receives which output
approval_boundary: actions requiring explicit human authority
success_metric: the economic or customer outcome it is responsible for
```

A worker without a measurable success metric is not a production seat.

## Shared opportunity record

```json
{
  "id": "opp_...",
  "vertical": "hauspilot",
  "account": "",
  "stage": "signal",
  "evidence": [],
  "hypothesis": "",
  "economics": {
    "closeProbability": 0.0,
    "upfrontCashEur": 0,
    "expansionProbability": 0.0,
    "expansionCashEur": 0,
    "customerValueEur": 0,
    "founderHours": 1,
    "urgency": 1,
    "proofReuse": 1,
    "riskPenalty": 1
  },
  "nextAction": "",
  "approvalRequired": false,
  "collectedCashEur": 0,
  "measuredCustomerValueEur": 0,
  "lossReason": null,
  "learning": null
}
```

Unknown values stay unknown. Scenario assumptions must be labelled.

## Economic prioritisation

RevenueOS computes:

```text
expected cash =
(close probability × upfront cash)
+
(expansion probability × expansion cash)

cash / founder hour = expected cash ÷ founder hours

priority =
(cash / founder hour × urgency × proof reuse)
÷ risk penalty
```

Customer value is tracked separately so the portfolio cannot optimise revenue by quietly degrading client outcomes.

## Approval boundary

Explicit human approval remains mandatory for:

- sending external messages
- committing prices
- spending money
- signing or accepting terms
- submitting applications on behalf of a customer
- production writes with material consequences

Research, scoring, drafting, internal analysis and non-consequential preparation may run automatically within their capability contracts.

## Routines

### Daily — opportunity discovery

- scan configured signal sources
- deduplicate against existing state
- create only evidence-backed new opportunities
- rank portfolio by economic priority
- research the top candidates
- prepare a maximum of five review-ready actions
- stay quiet if nothing clears the qualification threshold

### Daily — active revenue portfolio

- detect blocked opportunities
- detect approval queues
- detect stale deals
- prepare the next useful action
- never manufacture activity merely to appear busy

### Weekly — learning loop

- collected cash
- measured customer value
- win rate by signal type
- response / conversion rate by offer
- time to cash
- founder hours per win
- expansion rate
- recurring failure / loss reasons
- playbooks worth promoting into reusable skills
- routines that should be deleted because they create noise

Only real recorded outcomes count as proof.

## Vertical adapters

### HausPilot

**Signal:** property managers hiring repetitive operations roles, fragmented maintenance/invoice workflows, public growth signals.

**Action:** a bounded workflow audit or 7-day governed automation sprint.

**Revenue:** implementation sprint → recurring operations subscription → expansion into additional workflows/portfolios.

**Value metric:** hours saved, response time, correction rate, unsafe actions blocked, monthly economic value.

### Citizen Agents / Opportunity Radar

**Signal:** grants, tenders, procurement, partnerships, regulatory deadlines, public consultations, programmes and other time-sensitive opportunities.

**Action:** organisation-specific evidence-backed opportunity brief, eligibility check, deadline plan and application/preparation package.

**Revenue:** monitoring subscription + premium action packages + enterprise/API access.

**Value metric:** qualified opportunities surfaced before deadline, staff time saved, applications progressed, value won/secured where attributable.

This vertical should dogfood itself: our own organisation is simply account zero.

### GitLaw

**Signal:** repeated legal intake/research/document workflows that are expensive but bounded and auditable.

**Action:** paid workflow diagnostic → governed implementation.

**Revenue:** implementation + recurring per-seat/per-workflow software/service fee.

**Value metric:** lawyer/staff time saved, citation/grounding quality, turnaround time, escalation quality.

### CareOS

Do not optimise for aggressive automated sales into sensitive care workflows. Use RevenueOS mainly for B2B pilot discovery, procurement readiness and proof packaging while keeping clinical authority outside the agent system.

### OpenProof / Trust Layer

This is a horizontal trust product and a differentiator for every RevenueOS vertical. Every valuable action can carry an evidence trace, approval proof and outcome record. Commercially, it can later become paid infrastructure for third-party agents.

## Highest-leverage commercial wedge

Do **not** launch five verticals at once.

Use RevenueOS to choose the wedge based on evidence. Current default:

1. keep HausPilot as the fastest high-ticket service-to-software wedge;
2. build Citizen Agents / Opportunity Radar as the scalable recurring discovery product;
3. reuse OpenProof/Factory governance underneath both;
4. only add another vertical when the portfolio data shows a superior path to collected cash or strategic proof.

## The self-dogfooding rule

Before selling any revenue or opportunity worker externally, run it on this portfolio.

Every day it should answer:

> Given everything observable right now, what is the highest-value action we can take next to create real customer value and collect cash — and what evidence supports that choice?

If RevenueOS cannot make our own portfolio materially better, it is not ready to sell.
