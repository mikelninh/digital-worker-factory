# HausPilot Digital Employee V0.1

This slice turns the current supervised HausPilot runtime into the foundation for a durable, self-service digital employee without weakening the existing fail-closed safety model.

## Target worker

**Mara — Digital Maintenance Coordinator**

Mission: own routine maintenance coordination from intake to resolution, while escalating ambiguity, safety emergencies, legal/tenant-rights questions, privacy violations and work outside the configured authority envelope.

## What exists in this slice

- `contract.json` — job description, autonomy ladder, authority envelope, promotion gates and permanent hard blocks.
- `onboarding.mjs` — deterministic self-service configuration gate. New customers always start at Copilot (level 2) or below.
- `case-state.mjs` — serialisable durable case state with waiting, scheduled wake-up, blocked, resolved and closed states.
- `store.mjs` — local persisted case store with atomic writes and optimistic version checks. This proves restart-safe case semantics; it is not the production multi-tenant database.
- `scheduler.mjs` — wakes persisted scheduled cases only when their timer is due.
- `autonomy.mjs` — deterministic `AUTO | APPROVAL | BLOCK` routing. Autonomy is earned per action from measured performance.
- `executor.mjs` — the only execution boundary. Missing adapter or idempotency key fails closed; blocked/approval decisions make zero provider calls.
- `providers/sandbox-outbox.mjs` — idempotent sandbox external-action adapter. It records outbound work without delivering real customer messages.
- `digital-employee.test.mjs` and `durability.test.mjs` — contract tests for onboarding, promotion, hard blocks, spend/vendor envelopes, timers, persistence, exact provider-call behaviour and idempotent outbound work.
- `site/hauspilot-digital-employee.html` — prototype employee dashboard and self-service configuration flow exposed as `/employee` when deployed.

## Autonomy ladder

| Level | Meaning | Default authority |
|---|---|---|
| 0 | Observe | no action |
| 1 | Draft | internal preparation |
| 2 | Copilot | human approves external/consequential action |
| 3 | Limited Auto | earned low-risk communication |
| 4 | Workflow Owner | earned routine coordination |
| 5 | Digital Employee | earned bounded commitments inside explicit budget/vendor policy |

A worker cannot self-promote merely because the model reports confidence. Levels 3–5 require measured case history, acceptance/correction thresholds and **zero unsafe executions**.

## Permanent hard blocks

The default worker can never autonomously perform payment, bank-detail change, new-vendor creation, legal statements or tenant-rights decisions. Hard-escalation evidence also blocks execution even at level 5.

## Execution invariant

```text
model/result
    ↓
evidence + identity
    ↓
authority envelope
    ↓
performance gate
    ↓
AUTO / APPROVAL / BLOCK
    ↓
explicit adapter + idempotency key
    ↓
provider call
    ↓
audit trace
```

If any required layer is missing, the action does not execute.

## Run tests

```bash
node --test \
  packs/hauspilot/digital-employee/digital-employee.test.mjs \
  packs/hauspilot/digital-employee/durability.test.mjs
```

## What is proven vs what is still production work

### Proven in this slice

- authority can be granted per action instead of through one global autonomy switch
- unsafe or unknown actions fail closed
- autonomy can be earned from measured performance gates
- cases persist, wait and wake across process runs
- due timers wake deterministically
- provider execution is explicit and idempotent
- blocked or approval-required actions make zero provider calls
- self-service configuration cannot jump directly to high autonomy

### Still required before calling it a live autonomous employee

1. Replace the local JSON store with tenant-isolated production persistence and authentication.
2. Run the scheduler/event loop as reliable production infrastructure.
3. Add Microsoft 365 read-only ingestion as the first live input connector.
4. Feed reviewer decisions and real outcome metrics into capability promotion evidence.
5. Add a staged real outbound adapter for low-risk status/missing-information messages, with rollback/kill-switch controls.
6. Add approved-contractor integration only after a customer defines the vendor list and budget authority.
7. Add production observability, alerting, retries/dead-letter handling and customer-visible audit history.

This module is now a working **digital-employee kernel**: authority, durable state, timed wake-ups, self-service configuration and a safe execution boundary. It is deliberately not a claim that unrestricted autonomous production execution exists today.
