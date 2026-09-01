# Product Architecture Pack — Update Protocol

The Product Architecture Pack is not archival documentation. It is part of the product contract.

## The rule

A product-changing change is not done until the relevant architecture-pack file still describes reality.

Every serious project keeps these six files:

1. `intent.md` — user, painful job, measurable outcome, non-goals
2. `product-spec.md` — behaviour, workflows, acceptance criteria, failure conditions
3. `architecture.md` — data, APIs, system boundaries, ownership, trust boundaries
4. `constraints.md` — privacy, security, compliance, cost, latency, irreversible decisions
5. `golden-cases.md` — three end-to-end cases worth proving
6. `verification.md` — evals, thresholds, evidence, known gaps, human sign-off

## When a file must change

| Change | Required pack update |
|---|---|
| User/problem/outcome changes | `intent.md` |
| Product behaviour or workflow changes | `product-spec.md` + affected golden cases |
| API, data model, boundary, provider or permission changes | `architecture.md` |
| Privacy, security, compliance, cost or authority assumption changes | `constraints.md` |
| A critical real-world workflow is added/changed | `golden-cases.md` |
| Test, eval, benchmark, threshold or known limitation changes | `verification.md` |

## Decision reversibility

Classify meaningful decisions before implementation:

- **GREEN — reversible:** cheap experiment; agents may implement and compare alternatives.
- **AMBER — consequential:** material cost or migration; agent proposes, human reviews.
- **RED — hard to reverse:** data ownership, identity, permissions, security boundary, compliance, public contract, core storage or irreversible external action. Human Product Architect decides.

Red decisions belong in the architecture/constraints record with the decision, alternatives considered, rationale and evidence needed to revisit it.

## Golden-case release gate

Every serious project must maintain exactly three primary golden cases:

- **Golden 01 — core happy path:** proves the product creates the intended user outcome.
- **Golden 02 — ambiguity / missing evidence:** proves the system does not bluff or silently skip required work.
- **Golden 03 — dangerous edge / authority boundary:** proves consequential failure or external action is handled safely.

A release that breaks a golden case is blocked unless the Product Architect explicitly changes the product contract and updates the pack.

## Pull-request Definition of Done

For each product-changing PR, the Builder/Review agents should answer:

1. Did user-visible behaviour change?
2. Did architecture, data ownership, permissions or providers change?
3. Did a constraint or risk assumption change?
4. Did any golden case or acceptance threshold change?
5. What evidence proves the change works end to end?

If 1–4 are yes, update the relevant pack files in the same PR. If 5 has no credible answer, the change is not ready to ship.

## Day-to-day operating loop

```text
INTENT
  ↓
SPEC + GOLDEN CASES
  ↓
ARCHITECTURE + CONSTRAINTS
  ↓
AGENT BUILD
  ↓
AGENT EVAL / TRUST REVIEW
  ↓
HUMAN FUNCTIONAL VERIFICATION
  ↓
PROOF
  ↓
SHIP / OBSERVE
  ↓
UPDATE PACK WHEN REALITY CHANGES
```

Agents maintain the documentation mechanically. The human owns product intent, red decisions, acceptance of trade-offs and final functional sign-off.

## Weekly 15-minute architecture review

For each active project:

- Is the stated outcome still the outcome we care about?
- Are the three golden cases still the best proof?
- Did implementation drift from architecture?
- Did we discover a new red constraint?
- What is the weakest verification claim?
- What is the single next experiment that most increases proof readiness?

The goal is not more documentation. The goal is to keep **intent, system, evidence and shipped reality aligned**.