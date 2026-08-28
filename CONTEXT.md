# Digital Worker Factory — Domain Language

Use these terms consistently across providers, evals, audit and commercial packs.

## Core concepts

- **Capability** — one explicitly registered action/read operation a worker may request. Capabilities are narrower than unrestricted tools.
- **Actor** — the authenticated human/agent principal requesting a capability, including role.
- **Provider** — the bounded product/system adapter that implements a capability.
- **Policy Gate** — deterministic authorization logic that decides whether the requested capability/mode may proceed and whether human approval is required.
- **Human Approval** — an explicit approval input for a consequential/write capability. Model confidence is never approval.
- **Shadow Mode** — run policy/evaluation without executing an external action.
- **Execution** — the provider executor actually ran after policy gates passed.
- **Capability Outcome Receipt** — the non-sensitive, stable record of one invocation's policy state and outcome. It excludes raw input/output by default.
- **Audit Trace** — an ordered collection of Outcome Receipts and other bounded diagnostic events.
- **Billable Outcome** — a successful bounded execution that satisfied policy/approval requirements. Blocked, shadowed and failed invocations are not billable outcomes.
- **Reliability Level** — DRAFT → EVAL → SHADOW → COPILOT → LIMITED AUTO → TRUSTED. Advancement is evidence-based.

## Invariants

1. Registered capability is required before execution.
2. Role permission is required before execution.
3. Consequential/write capability requires human approval when policy says so.
4. Shadow never executes.
5. Failed/blocked/shadowed is not billable.
6. Outcome Receipt excludes raw input/output unless a future explicit schema safely permits a specific field.
7. Billing status never changes an authority or safety decision.
8. Model confidence never upgrades reliability level by itself.

## Architecture vocabulary

Use **module**, **interface**, **implementation**, **seam**, **adapter**, **depth**, **leverage** and **locality** when discussing codebase design.
