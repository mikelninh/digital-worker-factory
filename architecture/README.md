# Product Architecture Pack

This directory is the human-owned contract for what the Digital Worker Factory should become, what agents may decide, and how we prove the result.

The pack deliberately sits between a product brief and implementation. It is small enough to stay alive, but concrete enough for agents, reviewers and future contributors to work from the same intent.

## Required files

Every serious product uses the same six-file pack:

1. `intent.md` — user, problem, outcome, non-goals.
2. `product-spec.md` — workflows, behaviour, failure states, acceptance criteria.
3. `architecture.md` — system boundaries, data, capabilities, trust boundaries and irreversible choices.
4. `constraints.md` — security, privacy, compliance, cost, performance and human-authority rules.
5. `golden-cases.md` — three end-to-end workflows the product must prove.
6. `verification.md` — executable evidence, manual checks, known gaps and release bar.

## The update contract

The pack is a living contract, not a wiki that someone remembers to update occasionally.

A change must update the relevant pack file when it changes any of the following:

- user-visible behaviour or intended outcome;
- a golden workflow or acceptance criterion;
- data ownership, APIs, system boundaries or permissions;
- a security, privacy, legal or human-approval constraint;
- an architectural decision marked hard to reverse;
- the evidence used to claim that a workflow works.

Pure implementation details do not require documentation churn when they stay inside the existing contract.

## Decision reversibility

Every meaningful architecture decision is tagged:

- **GREEN — reversible:** agents may choose, test and replace it autonomously inside the stated constraints.
- **AMBER — expensive:** agents may recommend and prototype; the Product Architect approves before adoption.
- **RED — hard to reverse / consequential:** human decision required before implementation. Examples include data ownership, identity, authority, security boundaries, retention, compliance posture and stable external contracts.

## Truth hierarchy

1. **Intent + constraints:** this pack.
2. **Implementation:** code and configuration.
3. **Behavioural proof:** golden-case tests, evals, traces and human workflow checks.
4. **Public claims:** generated or manually projected only from evidence above.

A public page must never imply a stronger proof level than the underlying evidence supports.

## Freshness ritual

Each file carries a `paos:reviewed` marker. Review the touched documents in the same PR as the change. The repository checker validates required files and markers. Golden-case status should increasingly come from executable tests/evals rather than prose.

## Day-to-day loop

```text
INBOX / PROBLEM
      ↓
INTENT + SPEC
      ↓
ARCHITECTURE + CONSTRAINTS
      ↓
DECISION QUEUE (only AMBER / RED)
      ↓
AGENT EXECUTION
      ↓
3 GOLDEN CASES
      ↓
VERIFY / TRUST / SHIP
      ↓
PUBLIC PROOF + LEARNING
```

The Product Architect should spend time on judgement, trade-offs and functional verification — not manually coordinating every reversible implementation handoff.
