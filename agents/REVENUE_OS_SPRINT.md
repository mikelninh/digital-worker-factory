# RevenueOS — Ultimate End-to-End Sprint

## Objective

Turn the Digital Worker Factory into a supervised closed-loop commercial system that can discover evidence-backed opportunities, choose the highest-value next action, prepare work automatically, stop at consequential boundaries, record real outcomes, learn from wins/losses, and reprioritise the portfolio.

**North star:** verified customer value created and collected recurring cash per scarce founder hour.

The sprint is not complete because agents generated activity. It is complete only when the loop can prove all seven readiness gates and operate in live shadow mode without inventing evidence, bypassing approval, or promoting estimates into real outcomes.

---

## The loop

```text
SIGNALS
  ↓
EVIDENCE GATE + DEDUPE
  ↓
ECONOMIC SCORING
  ↓
PORTFOLIO RANKING
  ↓
SMALLEST USEFUL NEXT ACTION
  ↓
PREPARE AUTOMATICALLY
  ↓
HUMAN APPROVAL IF EXTERNAL / FINANCIAL / CONSEQUENTIAL
  ↓
EXECUTE
  ↓
DELIVER CUSTOMER OUTCOME
  ↓
MEASURE CASH + VALUE + FOUNDER HOURS
  ↓
PROOF + EXPANSION
  ↓
LEARN BY SIGNAL / OFFER / VERTICAL
  ↓
REPRIORITISE
  ↺
```

---

## Seven production-readiness gates

RevenueOS must fail closed unless every gate passes.

1. **Evidence gate** — unsupported signals never become qualified opportunities.
2. **Dedupe gate** — repeated sources do not create duplicate work or fake pipeline.
3. **Economic ranking** — the portfolio prioritises expected cash/value per founder hour rather than activity volume.
4. **Approval gate** — external messages, prices, proposal sends, spend, terms and consequential writes cannot execute without explicit authority.
5. **Lifecycle-to-proof gate** — one opportunity can traverse signal → qualification → action → sale → delivery → measured proof → expansion.
6. **Real-outcome accounting gate** — scenario estimates remain separate from collected cash and measured customer value.
7. **Learning-loop gate** — wins/losses create descriptive evidence by signal/offer; low-sample observations are not silently promoted into policy.

---

# Sprint sequence

## Sprint A — Control plane

**Goal:** make the loop deterministic and testable before connecting live systems.

Ship:

- shared opportunity schema
- evidence validation
- duplicate suppression
- economic scoring and portfolio ranking
- deterministic next-action queue
- opportunity lifecycle state machine
- approval checks outside the model
- immutable-style history/audit events
- collected-cash and measured-value ledger
- win/loss learning statistics
- end-to-end readiness evaluator

**Exit:** all seven gates pass in an adversarial synthetic shadow run.

## Sprint B — Customer Zero live shadow

**Goal:** use our own portfolio before selling RevenueOS as a product.

Connect read-only sources first:

- public company/job/pain signals for HausPilot
- grants/tenders/partnerships for Opportunity Radar
- current project/offer catalogue
- existing pipeline/CRM-style state if available

Daily output must be tiny:

```text
TOP OPPORTUNITY
Evidence
Expected cash/value
Why now
Smallest next action
What needs human approval
```

No live outbound execution in this phase.

**Exit:** the system repeatedly surfaces decisions we would genuinely act on and stays quiet when nothing clears the bar.

## Sprint C — Supervised action

**Goal:** remove founder preparation work without removing founder authority.

Connect:

- message/proposal drafting
- approval queue
- approved outbound adapter
- discovery notes → proposal
- price approval
- delivery workspace creation
- outcome capture

Default policy:

```text
research      → automatic
score         → automatic
prepare       → automatic
external send → human approval
price/terms   → human approval
delivery risk → capability/policy gate
```

**Exit:** a real opportunity can go from observed signal to paid pilot with every consequential action explicitly approved and audited.

## Sprint D — Delivery → recurring revenue

**Goal:** stop treating the first payment as the finish line.

For every won pilot:

- start from the signed success metric
- measure baseline vs after
- calculate customer value with visible assumptions
- preserve failures/corrections
- generate proof package
- detect bounded adjacent workflow
- prepare recurring managed-operations offer

HausPilot path:

```text
7-day paid sprint
→ measured workflow proof
→ managed operations retainer
→ second workflow
→ portfolio expansion
```

**Exit:** expansion is generated from measured customer value, not generic upsell copy.

## Sprint E — Learning + portfolio allocation

**Goal:** make each cycle improve the next one.

Track by signal type, segment, offer and vertical:

- opportunities
- decisions
- win rate
- collected cash
- measured customer value
- actual founder hours
- cash per founder hour
- time to cash
- recurring revenue conversion
- loss reasons
- approval/rework rate

Rules:

- no strategy change from tiny samples
- preserve source evidence for every promoted learning
- downgrade noisy signals
- promote repeatable winning playbooks
- delete routines that generate activity without value
- allocate more agent/founder effort to the best observed economics

**Exit:** next-cycle priorities can be explained from recorded outcomes.

---

# Commercial sequencing

Do not distribute effort equally across projects.

## 1. HausPilot — cash wedge

Use RevenueOS to find and convert property managers with observable repeated operational work.

Offer path:

```text
specific observed signal
→ bounded 7-day sprint
→ measured proof
→ recurring managed operations
```

Primary metric: collected cash + monthly customer value per founder hour.

## 2. Opportunity Radar / Citizen Agents — scalable SaaS wedge

Use the same loop to discover grants, tenders, procurement, partnerships and deadlines for an organisation.

Product ladder:

```text
one scan
→ continuous monitoring
→ action preparation
→ team/organisation subscription
→ enterprise/API
```

Customer Zero is our own portfolio.

## 3. OpenProof — horizontal trust moat

Every consequential action should be able to expose:

```text
source → evidence → rule → capability → approval → action → outcome
```

This becomes both a differentiator for our products and later a standalone paid trust layer for third-party agents.

## 4. Other verticals

GitLaw, CareOS and future packs inherit the control plane only when the portfolio evidence justifies commercial focus. Sensitive domains keep stronger human authority and domain-specific policy gates.

---

# Automation boundary

Automate aggressively where errors are cheap and reversible:

- public signal collection
- deduplication
- evidence extraction
- account research
- qualification
- economic ranking
- drafting
- follow-up preparation
- delivery workspace preparation
- proof calculations
- learning reports

Keep explicit approval where authority, money, reputation, privacy or safety are involved:

- external messages
- committed prices
- proposal sends
- spend
- terms/signatures
- applications submitted for another party
- production writes with material consequences
- sensitive/regulated-domain decisions

---

# Readiness levels

## R0 — Concept
Architecture only.

## R1 — Deterministic shadow
Seven gates pass on synthetic/adversarial scenarios. No external action.

## R2 — Live shadow
Real read-only signals flow through the same ledger; humans compare recommendations with what they would actually do.

## R3 — Supervised production
Real external actions can execute only after explicit human approval; real cash/value is recorded.

## R4 — Limited autonomy
Only narrow, proven, reversible actions may run automatically after sufficient evidence and policy approval.

## R5 — Trusted economic worker
Repeated real-world evidence demonstrates reliability, value, safe escalation and positive unit economics.

**Never jump levels because the model sounds confident. Autonomy is earned from evidence.**

---

# Current implementation status

Implemented on `feature/revenue-os-loop`:

- RevenueOS economic scorer and portfolio ranker
- explicit consequential-action approval list
- evidence-gated signal ingestion
- duplicate suppression
- deterministic lifecycle state machine
- action queue
- blocked-action audit events
- cash/value outcome ledger
- descriptive learning by signal type
- seven-gate readiness assessment
- unit/contract coverage
- synthetic Customer Zero end-to-end shadow simulation
- CI readiness gate

Still required before **R2 live shadow**:

- one live read-only signal connector
- persistent production ledger/storage
- organisation/account identity resolution across live sources
- operator review surface for the daily top actions
- live-source freshness and provenance checks

Still required before **R3 supervised production**:

- authenticated outbound/CRM adapter
- durable human approval record
- live price/proposal approval flow
- customer delivery handoff integration
- real payment/outcome reconciliation

---

# The stop rule

If an activity does not improve one of these, delete or defer it:

1. probability of collecting cash,
2. speed to cash,
3. verified customer value,
4. recurring revenue,
5. proof reuse,
6. founder-hour leverage,
7. safety/trust needed to keep the revenue durable.

Everything else is secondary.
