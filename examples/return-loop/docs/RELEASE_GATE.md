# RETURN LOOP — v0.1 release gate

Last checked: 2026-10-19

## Completed (prototype)

- [x] Four responsive UI views: Overview/workbench, Quality, Evaluation, System
- [x] 14 clearly-labelled synthetic tickets and 13 mock orders
- [x] Order/customer/sku lookup and versioned fictional policies
- [x] Deterministic grounded response proposals with optional live structured LLM intent
- [x] Missing order and suspicious ticket fail closed
- [x] Reviewer-controlled local approval; negative checks for unsupported order ID/refund promise
- [x] Idempotent simulated SQLite outbox; audit and feedback recording
- [x] Query-based SKU quality signals with a disclosed synthetic denominator
- [x] 17 reproducible offline regression checks
- [x] 10 API integration tests passing locally
- [x] Container build instructions and CI config
- [x] Browser viewport visual QA at 1440px and 390px, no horizontal overflow

## Not yet completed (do not claim)

- [x] Publicly hosted *browser-only interactive preview* (fixture replay and localStorage)
- [ ] Publicly hosted **stateful Python/SQL backend** (no serverless SQLite deployment)
- [ ] Persistent multi-user/hosted database, auth, tenant isolation
- [ ] Shopify / Zendesk / Anvyl / Klaviyo real integrations
- [ ] Live model quality, token cost and latency benchmark
- [ ] Real ticket quality and human-review acceptance benchmark
- [ ] Security/privacy/DPIA and production deployment approval

### Decision

**Local demonstration candidate: GO**. **Public/customer production release: NO-GO**.

### 60-second use case

1. Open Overview, select TK-1047, Analyse. See source provenance and quality signal.
2. Attempt Simulate send before approval: blocked; approve and simulate the SQLite outbox.
3. Select TK-1082: no order, no invented shipping.
4. Select TK-1090: prompt-injection compensation request quarantined for review.
5. Open Evaluation; run 17 deterministic synthetic tests.

## Deploy path

For a shareable *stateful* hosted version, use a persistent database (e.g. Postgres), tenant-scoped access, proper reviewer auth, an isolated synthetic dataset, and a container host. Do **not** deploy this SQLite demo as a stateless serverless app; approval/outbox state might disappear or diverge across instances.
