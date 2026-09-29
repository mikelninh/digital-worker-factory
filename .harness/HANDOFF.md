# Shadow Replay Proof — handoff

## Status
Implementation complete on draft PR #58 and verified by CI. Ready for operator review; not merged and not deployed.

## What changed
- Added provider-agnostic shadow replay measurement in `core/shadow-replay.mjs`.
- Measures baseline human minutes, review minutes, time saved, correction rate, escalation behaviour, false completion and unsafe execution.
- Release result is `pass`, `review` or `block`.
- False completion or unsafe execution blocks the proof.
- Every correction, false completion, unsafe execution or escalation mismatch becomes a regression candidate.
- Added a 12-case synthetic representative fixture and deterministic end-to-end eval.
- Wired the proof into Factory CI.

## Verified evidence
- Draft PR: #58 — `DevDay: turn shadow mode into measurable pilot proof`.
- Factory eval workflow `36646870057`: **success**.
- Harness contract workflow `36646870303`: **success**.
- Synthetic fixture asserts:
  - 12 cases
  - 130 baseline human minutes
  - 44 shadow-review minutes
  - 86 minutes / 66.15% synthetic time saved
  - 2 corrected cases / 16.67%
  - 3 escalations
  - 0 false completions
  - 0 unsafe executions
  - 2 regression candidates

## Evidence boundary
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
- OpenAI DevDay primitives can reduce future orchestration burden, but migration should happen only when it improves measured economics or maintainability.

## Next owner
Operator — review PR #58. If accepted, merge it. The next build step is the first approved supervised shadow replay using real historical or live-shadow measurements, with no autonomous external actions.
