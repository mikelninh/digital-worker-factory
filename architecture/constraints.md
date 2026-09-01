<!-- paos:reviewed=2026-09-01 -->
# Constraints

## Product truth

1. **No fake telemetry.** A UI may show a labelled registry snapshot or demo state, but must not imply live CI/runtime connectivity until adapters exist.
2. **No proof inflation.** Synthetic, automated, shadow-mode and real-pilot evidence remain visibly different.
3. **Known gaps stay visible.** A limitation is part of the product state, not embarrassing copy to remove.
4. **The public story is downstream of evidence.** Marketing copy may simplify; it may not upgrade the underlying claim.

## Human authority

- Agents may not approve their own AMBER/RED architecture decisions.
- Consequential external actions require the authority boundary defined by the provider product.
- High-stakes products retain the relevant professional or human decision-maker as final authority.
- A successful test suite is never treated as permission to expand scope automatically.

## Security and privacy

- No secrets, credentials, private case data or personal pilot feedback in public project projections.
- Product summaries should reveal architectural principles without publishing operational details that materially weaken security.
- Access controls belong outside model discretion.
- Audit logs must avoid unnecessary sensitive content and follow provider retention rules.
- Any cross-project aggregation must preserve tenant/project boundaries.

## Architecture freshness

- Behaviour, trust-boundary and hard-to-reverse changes update the pack in the same PR.
- Every required pack file contains a `paos:reviewed=YYYY-MM-DD` marker.
- Golden-case claims link to evidence or are explicitly marked unproven/partial.
- A stale pack is surfaced as work; it is not silently treated as authoritative.

## Interface

- The first screen prioritises decisions and failing proof, not activity volume.
- A project must be understandable without knowing the technology stack.
- Every status needs an evidence path or an explicit `snapshot / declared` label.
- Mobile layouts must preserve the decision queue and golden-case status without horizontal overflow.
- Colour cannot be the only signal for risk or status.

## Cost / complexity

- Prefer repository-native state and simple adapters before introducing a new central database.
- Add infrastructure only when it removes a demonstrated coordination or evidence problem.
- Reversible choices should be tested quickly rather than debated into permanence.

## Product Architecture Pack discipline

The pack is intentionally short. If a document becomes a dumping ground, split supporting detail into linked ADRs, diagrams or eval reports while keeping the six canonical files readable.

The target is **decision-grade clarity**, not documentation volume.
