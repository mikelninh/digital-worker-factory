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

The important distinction is that human approval is **not** inserted into every step. A low-risk internal document-routing action can execute automatically; account/permission changes remain gated.

## Proof status

| Capability | Status | Evidence |
| --- | --- | --- |
| Deterministic workflow | **Executed in CI** | 30-case routing/urgency/exact-policy/trace regression |
| Safe routine execution | **Executed in tests** | all 3/3 eligible internal-routing cases invoke the safe-action executor |
| HTTP end-to-end | **Executed in CI** | real loopback `POST /support`, safe execution, duplicate replay, 400 validation and audit assertions |
| PostgreSQL | **Executed in CI** | real PostgreSQL service, 20,000 synthetic rows, `EXPLAIN (ANALYZE, BUFFERS)` and index-use assertion |
| AWS Lambda | **Deployable** | Lambda-compatible `handler(event)` + AWS SAM manifest |
| Zapier / low-code | **Adapter-ready** | concrete webhook contract + sample payload; no live Zapier account connection claimed |
| Public UI | **Live** | portfolio presentation layer with four synthetic scenarios |

## What this proves

| Job signal | Evidence in this pack |
| --- | --- |
| End-to-end automation | webhook → idempotency → classification → context → policy → safe action/prepared action → audit |
| JavaScript / Node.js | Lambda-compatible handler, HTTP wrapper and regression tests |
| APIs / webhooks | executable HTTP contract + replay-safe handler |
| AWS Lambda | handler + `aws/template.yaml` SAM deployment manifest |
| Zapier / low-code | adapter guide + sample webhook payload |
| SQL / PostgreSQL | executable schema, 20k-row synthetic benchmark, composite index and real query-plan assertion |
| AI-use discipline | interpretation is separated from deterministic policy/approval rules |
| Support automation | synthetic integration, document-routing, access and billing cases |
| Reliability | exact policy assertions + safe-action execution + duplicate-event replay + HTTP validation |
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
safe internal action OR prepared reviewable action
    ↓
human approval for consequential changes
    ↓
audit + eval
```

## Run the proof

```bash
bash packs/caya-one-less-click/run-all-proofs.sh
```

Without `DATABASE_URL`, the local runner executes the deterministic and HTTP suites and explains that PostgreSQL is exercised in CI. CI supplies a real PostgreSQL service automatically.

The deterministic suite expects:

```json
{
  "cases": 30,
  "intent_accuracy": "30/30",
  "urgency_accuracy": "30/30",
  "policy_mode": "30/30",
  "approval_boundary": "30/30",
  "observable_trace": "30/30",
  "safe_auto_execution": "3/3",
  "duplicate_webhook_recovery": "30/30",
  "audit_rows": 30,
  "safe_actions": 3
}
```

These are synthetic regression checks, **not real-world model-accuracy claims**.

## HTTP proof

`run-http-e2e.mjs` opens a real loopback HTTP socket and verifies:

1. a DATEV-style integration incident returns `200`, high urgency and `draft_only`,
2. replaying the same event returns `duplicate_ignored`,
3. a consequential account-setting request requires `human_approval` and does not execute,
4. a low-risk internal document-routing request gets `auto_execute` and invokes the safe-action executor,
5. an invalid payload returns `400`,
6. only unique successful requests are audited.

## PostgreSQL proof

`sql/schema.sql` is executable DDL. CI starts PostgreSQL, loads **20,000 synthetic delivery rows**, runs `ANALYZE`, executes `EXPLAIN (ANALYZE, BUFFERS)` for the latest-delivery access pattern and fails unless PostgreSQL uses `idx_integration_deliveries_customer_type_latest`.

The actual plan is emitted to CI logs. No fixed latency number is claimed because hosted-runner timing is not representative of a production workload.

## AWS and Zapier boundary

`aws/template.yaml` maps `POST /support` to the Lambda-compatible handler using AWS SAM. The Zapier folder documents the concrete webhook adapter and payload.

Those are **deployment/integration proofs, not claims of connected vendor accounts**. A live AWS account deployment and live Zapier connection are intentionally not claimed until authorized credentials/accounts are available.

## Four realistic demo scenarios

The interactive UI focuses on public-domain workflow shapes rather than pretending to know Caya internals:

1. a DATEV-style integration stops forwarding documents
2. an invoice/document is routed to the wrong internal destination and can be safely re-routed
3. an access/permission change requires approval
4. a duplicate webhook must not trigger duplicate work

## Design direction

The role-proof page deliberately follows the **qualities** visible in Caya's public brand rather than copying proprietary assets: warm off-white surfaces, deep navy, optimistic green, large friendly typography, generous whitespace and workflow-first storytelling.

It does **not** use Caya's logo, mascot or proprietary product UI.

## Why the policy boundary matters

AI interpretation is useful for messy operational context, but model confidence is not permission. The runtime keeps authority deterministic:

```text
interpret → deterministic policy → execute explicitly safe internal action
                               ↘ prepare/review or human approval otherwise
```

That keeps the product goal intact: **fewer manual steps where automation is safe, explicit control where it matters**.
