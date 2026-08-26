# One Less Click — Business Automation Proof

A small, **synthetic** portfolio proof for a Business Automation Engineer role: turn one repetitive support workflow into an observable, testable automation without giving the model unchecked authority.

> Not affiliated with Caya. No Caya systems, customer data, private APIs or production schemas are used.

## Why this maps unusually well to Caya

Caya's public product model is a clean end-to-end document flow: **capture → classify → organise/extract → distribute → integrate**. Its Automations product emphasises rule-based workflows, low-code setup, existing-system integrations and minimal manual work.

This proof applies the same engineering principles to an internal support workflow:

```text
support signal
    ↓
capture + classify
    ↓
load operational context
    ↓
apply deterministic rules
    ↓
automate safe routine steps
    ↓
require approval only for consequential changes
    ↓
audit + regression test
```

The important distinction is that human approval is **not** inserted into every step. Routine processing can remain automatic; privileged actions such as changing account permissions stay gated.

## What this proves

| Job signal | Evidence in this pack |
| --- | --- |
| End-to-end automation | webhook → idempotency → classification → context → policy → prepared action → audit |
| JavaScript / Node.js | AWS Lambda-compatible handler and routing logic |
| APIs / webhooks | webhook payload contract + handler |
| AWS Lambda | `lambda.mjs` exports a Lambda-compatible `handler(event)` |
| Zapier / low-code | adapter guide + sample webhook payload |
| SQL / PostgreSQL | schema, uniqueness constraint, index and `EXPLAIN (ANALYZE, BUFFERS)` exercise |
| AI-use discipline | interpretation is separated from deterministic policy/approval rules |
| Support automation | synthetic integration, document-routing, access and billing cases |
| Reliability | 30-case regression suite + duplicate-event replay |
| Observability | explicit trace + audit callback |
| Product communication | interactive role-proof UI at `site/caya-one-less-click.html` |

## Architecture

```text
support event
    ↓
Zapier / webhook
    ↓
Lambda-compatible handler
    ↓
idempotency gate
    ↓
classification
    ↓
customer + incident context
    ↓
deterministic policy
    ↓
safe routine action OR prepared consequential action
    ↓
human approval only when required
    ↓
audit + eval
```

## Run the proof

```bash
node packs/caya-one-less-click/run-evals.mjs
```

Expected deterministic result:

```json
{
  "cases": 30,
  "intent_accuracy": "30/30",
  "urgency_accuracy": "30/30",
  "approval_boundary": "30/30",
  "observable_trace": "30/30",
  "duplicate_webhook_recovery": "30/30",
  "audit_rows": 30
}
```

These are synthetic regression checks, **not real-world model-accuracy claims**.

## Four realistic demo scenarios

The interactive UI focuses on public-domain workflow shapes rather than pretending to know Caya internals:

1. a DATEV-style integration stops forwarding documents
2. an invoice is routed to the wrong folder
3. an access/permission change requires approval
4. a duplicate webhook must not trigger duplicate work

These cover integration operations, document routing, permission boundaries and reliability in one tiny surface.

## SQL proof

`sql/schema.sql` demonstrates a Postgres-oriented event schema, duplicate protection with `UNIQUE(ticket_id, event_id)`, a composite index for the “latest delivery for customer/integration” access pattern, and the exact `EXPLAIN (ANALYZE, BUFFERS)` query to inspect a plan.

No latency numbers are claimed because no production-scale Postgres benchmark was run here.

## Design direction

The role-proof page deliberately follows the **qualities** visible in Caya's public brand rather than copying proprietary assets:

- warm off-white canvas rather than developer-dark-mode
- deep navy for trust and technical depth
- optimistic green for healthy automation states
- large, friendly typography and generous whitespace
- rounded product cards and simple document/workflow illustration
- workflow-first storytelling before implementation detail

It does **not** use Caya's logo, mascot or proprietary product UI.

## Why the policy boundary matters

AI interpretation is useful for messy operational context, but model confidence is not permission. The runtime therefore keeps authority deterministic:

```text
interpret → deterministic policy → automate safe routine work
                               ↘ human approval for consequential action
```

That keeps the product goal intact: **fewer manual steps where automation is safe, explicit control where it matters**.
