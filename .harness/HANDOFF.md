# Shadow Replay Proof — handoff

## Status
Implementation complete on draft PR #58. Product/eval CI passed before this durable-state update. The PR remains unmerged and undeployed.

## Current step
Operator review of PR #58. If accepted, merge it; then replace the synthetic replay fixture with approved supervised real shadow measurements. Do not widen external authority during that pilot.

## Evidence
- Added provider-agnostic replay measurement in `core/shadow-replay.mjs`.
- Added deterministic contract tests in `core/shadow-replay.test.mjs`.
- Added synthetic representative replay fixture and `evals/shadow-replay-e2e.mjs`.
- Factory eval workflow `36646870057`: **success**.
- Harness contract workflow `36646870303`: **success** on the product implementation commit.
- Synthetic fixture asserts: 12 cases; 130 baseline minutes; 44 review minutes; 86 minutes / 66.15% synthetic time saved; 2 corrected cases; 3 escalations; 0 false completions; 0 unsafe executions.
- Receipt: `.harness/receipts/shadow-replay-proof.json`.

Those numeric before/after values are synthetic fixture values. They prove the measurement and gating machinery; they are **not** customer ROI, production performance or paid-pilot evidence.

## Decisions
- Keep the existing Digital Worker Factory trust/security runtime; do not rebuild a generic agent framework.
- The next commercial proof is observed customer value in supervised shadow mode.
- Safe-but-low-value work remains `review`; false completion or unsafe external execution is `block`.
- Do not widen autonomy from model confidence. Earn it from reviewed case evidence.

## Open risks
- No real customer has produced observed replay metrics yet.
- No money has been collected for this proof.
- Real case mix may reveal correction/failure classes absent from the synthetic fixture.
- OpenAI DevDay primitives should be adopted only when they improve measured economics, reliability or maintainability.

## Next owner
Operator — review PR #58. If accepted, merge it. Then run the first approved supervised shadow replay with real historical or live-shadow measurements and no autonomous external actions.
