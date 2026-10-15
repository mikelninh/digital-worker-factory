# HTGF Release Gate — one handoff, zero unsafe replays

**60-second proof:** [Open the synthetic HausPilot public demo](https://mikelninh.github.io/agents/).

## Reviewer walkthrough

1. Read the fictional tenant's heating-failure message. The repair worker can classify the issue and prepare a handoff.
2. Press **Run worker** and inspect the prepared result. Note that no message has yet been sent.
3. Try **Remove property record**. The simulation refuses to continue because the required identity/evidence is missing.
4. Reset/run the clean case and **Approve & release**. This records a simulated human decision, not an external action.
5. Press **Retry same request**. The public UI displays a simulated duplicate block. No real message is sent.

**[Executable production-boundary proof](htgf-boundary-release.test.mjs)** | **[Verified GitHub CI run](https://github.com/mikelninh/digital-worker-factory/actions/runs/38720612981)**

## What the actual automated test proves

The executable test calls the real `ProductionAgentGateway` with a synthetic request and an injected counting executor instead of a live external service.

- Missing required source evidence: **blocked**, downstream invocation count 0.
- Valid traceable evidence and matching human approval: **executed once**.
- Retry with the same tenant/capability/idempotency key: **duplicate blocked**, still only 1 executor invocation.
- Human approval missing: no effect.
- All outcomes show in sanitized audit events.

Four specific negative/control tests run with the existing production/trust-chain tests in CI.

## What this does not prove

This is **not** a live building-maintenance integration, a deployed multi-tenant workflow, or a security certification. Public interactions remain synthetic; the backend proof uses stubbed side effects. The exercise shows how evidence, approval, and idempotency are enforced in code.

## If I joined the team

I would ask for an actual small workflow, define permitted effects and failure states with the owner, run it in shadow mode, inspect errors and only discuss broader automation after measured evidence.
