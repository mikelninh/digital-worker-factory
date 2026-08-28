# HausPilot Digital Employee V0.1

This slice turns the current supervised HausPilot runtime into the foundation for a durable, self-service digital employee without weakening the existing fail-closed safety model.

## Target worker

**Mara — Digital Maintenance Coordinator**

Mission: own routine maintenance coordination from intake to resolution, while escalating ambiguity, safety emergencies, legal/tenant-rights questions, privacy violations and work outside the configured authority envelope.

## What exists in this slice

- `contract.json` — job description, autonomy ladder, authority envelope, promotion gates and permanent hard blocks.
- `onboarding.mjs` — deterministic self-service configuration gate. New customers always start at Copilot (level 2) or below.
- `case-state.mjs` — serialisable durable case state with waiting, scheduled wake-up, blocked, resolved and closed states.
- `autonomy.mjs` — deterministic `AUTO | APPROVAL | BLOCK` routing. Autonomy is earned per action from measured performance.
- `executor.mjs` — the only execution boundary. Missing adapter or idempotency key fails closed; blocked/approval decisions make zero provider calls.
- `digital-employee.test.mjs` — contract tests for onboarding, promotion, hard blocks, spend/vendor envelopes, timers and exact provider-call behaviour.

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
node --test packs/hauspilot/digital-employee/digital-employee.test.mjs
```

## Next slices

1. Persist case state in a real database and add a scheduler/event queue.
2. Add Microsoft 365 read-only ingestion first.
3. Connect the current reviewer UI to approval decisions and performance metrics.
4. Add a low-risk outbound communication adapter in sandbox mode.
5. Promote only capabilities whose real measured evidence clears the contract gates.
6. Add approved-contractor booking after a real customer proves the workflow and configures budget/vendor authority.

This module is an **authority and durability foundation**, not a claim that unrestricted autonomous production execution exists today.
