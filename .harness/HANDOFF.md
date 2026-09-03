# Harness handoff

## Status
Verified and accepted for merge.

## Current step
Merge PR #38. The harness check and the existing Factory eval workflow both passed on the implementation commit.

## Evidence
- Harness workflow `33744184065`: success.
- Factory eval workflow `33744184028`: success.
- `AGENTS.md` defines the small project map and operating boundaries.
- `.harness/project.json` defines sources, sensors, action classes and retry policy.
- `scripts/harness-check.mjs` mechanically enforces the minimum contract.
- Acceptance receipt: `.harness/receipts/harness-v0.1-adoption.json`.

## Decisions
- Keep the harness small and repository-native.
- Treat GitHub/CI as durable state, not chat history.
- Use five roles only: chief, scout, builder, verifier, operator.
- Classify autonomy by action reversibility rather than agent identity.

## Failures / uncertainties
None observed in the harness or existing Factory CI for this change.

## Open risks
Harness v0.1 validates structure and policy invariants; product-specific runtime, security and visual quality still require their own sensors/evals.

## Next owner
Operator — merge the verified PR, then create a fresh task contract for the next substantial change.
