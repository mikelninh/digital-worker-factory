<!-- paos:reviewed=2026-09-01 -->
# Product specification

## Core experience

The Product Architect OS is organised around **projects, decisions and proof**, not around chat threads.

### 1. Now

The default screen answers: **What is the most useful thing to do next?**

It shows:

- decisions waiting for human judgement;
- failing or unproven golden cases;
- agent runs that are blocked or need review;
- projects whose architecture pack is stale;
- the next shippable proof increment.

Anything that can proceed safely without a human should not sit in this queue.

### 2. Projects

Every serious product gets a compact card with:

- user + problem;
- current stage;
- Product Architecture Pack freshness;
- golden cases passed / 3;
- current proof level;
- known blocker;
- live demo, repository and public proof links where available.

A project detail view exposes the same seven tabs everywhere:

`Intent · Spec · Architecture · Constraints · Golden cases · Decisions · Proof`

### 3. Decision queue

The interface groups unresolved decisions by reversibility:

- GREEN: visible for traceability, no human approval required.
- AMBER: recommendation + alternatives + consequences; human approval required before adoption.
- RED: blocked until explicit human decision.

A decision card must show the user impact, affected system boundary, evidence, options and what becomes harder to reverse after the choice.

### 4. Agent team

Default responsibilities:

- **Product Spec Agent** — turns raw intent and feedback into testable requirements.
- **Architecture Agent** — proposes boundaries, data flows and trade-offs.
- **Builder Agent** — implements changes within approved constraints.
- **Test / Eval Agent** — attacks acceptance criteria and golden cases.
- **Trust Agent** — checks security, privacy, permissions and authority boundaries.
- **UX Review Agent** — reviews the complete user workflow, not merely component correctness.
- **Deployment Agent** — packages, ships and verifies the deployed increment.

Agents should hand work directly to one another when the next step is within the existing contract. Escalation happens when a decision changes product intent, architecture, trust boundaries, cost envelope or an AMBER/RED decision.

### 5. Golden cases

Every major project has exactly three flagship end-to-end cases on its main proof surface.

Each golden case has:

- a realistic starting situation;
- expected user outcome;
- source/evidence requirements;
- failure conditions;
- authority / approval rule;
- executable or inspectable proof;
- current status: `unproven`, `partial`, `verified`, or `verified-in-pilot`.

The status must describe the evidence honestly. A synthetic browser E2E is not labelled a real-world pilot.

### 6. Proof view

A public proof page should answer, in order:

1. What painful problem is this solving?
2. What outcome did we choose?
3. What architecture / trust constraints matter?
4. Can I try the three golden cases?
5. What evidence says they work?
6. What is not proven yet?

Stack details are secondary.

## Primary interaction

A persistent command bar accepts product-architecture work such as:

- "Turn this user complaint into a product change."
- "What is blocking GitLaw's next proof level?"
- "Run the three golden cases before release."
- "Show me only decisions that genuinely need me."
- "Create a proof increment for this job application."

The command bar is an entrypoint into structured workflows; it does not replace the project state model.

## Acceptance criteria for v1

- A first-time visitor can explain the OS in one sentence after viewing the hero and system loop.
- The control centre exposes projects, decision queue, agent roles and three golden cases without hidden navigation.
- No status is presented as live telemetry unless it is actually connected to a source.
- DWF itself has a complete six-file architecture pack.
- At least one external product (GitLaw) uses the same pack standard.
- The public portfolio can link to a dedicated Product Architecture Proof rather than asking visitors to infer the pattern across unrelated repos.
