# Harness handoff

## Status
Ready for independent verification.

## Current step
Run `node scripts/harness-check.mjs` through CI and inspect the pull request.

## Evidence
- `AGENTS.md` defines the small project map and operating boundaries.
- `.harness/project.json` defines sources, sensors, action classes and retry policy.
- `scripts/harness-check.mjs` mechanically enforces the minimum contract.
- `.github/workflows/harness.yml` makes the check part of CI.

## Decisions
- Keep the harness small and repository-native.
- Treat GitHub/CI as durable state, not chat history.
- Use five roles only: chief, scout, builder, verifier, operator.
- Classify autonomy by action reversibility rather than agent identity.

## Failures / uncertainties
CI has not yet produced evidence for this branch.

## Open risks
The first version validates structure and policy invariants; it does not yet prove runtime behaviour or visual quality.

## Next owner
Verifier — run CI, inspect failures, and convert any failure into a stronger checker/test rather than weakening the gate.
