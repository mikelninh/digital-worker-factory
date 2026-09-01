<!-- paos:reviewed=2026-09-01 -->
# Verification

## Evidence ladder

We use explicit proof levels so the interface and portfolio do not collapse different kinds of evidence into one green badge.

1. **DECLARED** — intent/spec exists; behaviour not yet proven.
2. **STATIC** — architecture/constraints can be checked mechanically.
3. **AUTOMATED** — tests/evals prove a bounded behaviour in a controlled environment.
4. **E2E** — complete user workflow is exercised through the product surface.
5. **SHADOW** — real workflow runs without consequential autonomous authority; human result remains canonical.
6. **PILOT** — real intended user uses the workflow under explicit pilot boundaries.
7. **PRODUCTION** — operational evidence exists under the claimed production scope.

A product can have different levels for different claims.

## V1 verification checklist

### Architecture Pack

- [x] six canonical files exist;
- [x] every file has a freshness marker;
- [x] three golden cases exist;
- [x] authority and reversibility rules are explicit;
- [x] public-proof boundary is explicit;
- [ ] PR/CI check runs automatically on relevant changes.

### Control Centre

- [ ] first screen explains the OS in under 10 seconds;
- [ ] decision queue is visually more prominent than agent activity;
- [ ] project cards expose pack freshness, golden-case status and proof level;
- [ ] each status says whether it is live, evidence-backed or a registry snapshot;
- [ ] agent team responsibilities and escalation boundary are legible;
- [ ] mobile layout has no horizontal overflow at 390 px;
- [ ] keyboard focus and semantic headings are usable.

### Behaviour

- [ ] Golden case 1 replayed on at least one external product;
- [ ] Golden case 2 demonstrates an AMBER/RED halt + explicit human resolution;
- [ ] Golden case 3 demonstrates stale/drift detection rather than relying on memory;
- [ ] public proof cannot claim a higher evidence level than the registry supplies.

## Release bar

### Interface prototype

May ship when the UI is honest about snapshot state and links to real evidence.

### Operational v1

Requires:

- repository/CI/deployment adapters for at least the flagship projects;
- machine-readable decision + golden-case status;
- automated pack freshness checks;
- one external project completing all three OS golden cases.

### Strong public proof

Requires at minimum:

- a complete Product Architecture Pack;
- three product-level golden cases;
- at least one E2E or stronger proof;
- known limitations displayed beside claims;
- traceable evidence links.

## Known gaps — 2026-09-01

- The Product Architect OS UI is being introduced before live evidence adapters; snapshot state must be labelled accordingly.
- Agent handoffs exist in Factory primitives but are not yet governed by a single machine-readable Product Architecture Pack schema.
- Cross-repository pack freshness is not yet centrally enforced.
- Public portfolio projection is curated rather than generated from a proof API.

These are the next integration targets, not reasons to hide the operating model until everything is automated.
