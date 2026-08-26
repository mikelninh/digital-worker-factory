# One Less Click — Business Automation Proof

A small, **synthetic** portfolio proof for a Business Automation Engineer role: turn one repetitive support workflow into an observable, testable automation without giving the model unchecked authority.

> Not affiliated with Caya. No Caya systems, customer data, private APIs or production schemas are used.

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
prepared next step
    ↓
human approval when consequential
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

## SQL proof

`sql/schema.sql` demonstrates a Postgres-oriented event schema, duplicate protection with `UNIQUE(ticket_id, event_id)`, a composite index for the “latest delivery for customer/integration” access pattern, and the exact `EXPLAIN (ANALYZE, BUFFERS)` query to inspect a plan.

No latency numbers are claimed because no production-scale Postgres benchmark was run here.

## Why the policy boundary matters

A support automation may diagnose, retrieve context and prepare a reply. Actions such as deleting data, refunding money, changing an account or resetting credentials cross a human boundary.

The proof therefore keeps authority outside the classifier:

```text
interpret → deterministic policy decides allowed mode → human approves consequential action
```

Useful automation, without pretending LLM confidence is permission.
