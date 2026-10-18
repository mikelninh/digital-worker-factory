# Evidence → Action · FDE application proof

A real, narrow **FastAPI + SQLite** demo: API intake → synthetic GitLaw-shaped source → deterministic proposal → reviewer boundary → idempotent local write → stored trace.

## Run

```bash
pip install fastapi uvicorn pytest httpx
cd examples/clera_fde
pytest -q test_app.py
uvicorn app:app --reload
# open http://127.0.0.1:8000
```

The app creates its SQLite DB locally. Override with `FDE_DB_PATH`. Do not expose this demo publicly without real auth and deployment hardening.

## Interview walkthrough (60 seconds)

1. Choose **CASE-002**. Without verified evidence, the draft is blocked (`BLOCKED_MISSING_EVIDENCE`).
2. Choose **CASE-001**. A proposal is created as `PENDING_REVIEW`.
3. Call **Execute** first: HTTP 409; no action.
4. **Human approve**, then **Execute**: a simulated local database effect is written, with an audit event.
5. Execute a second time: `replayed=true`, no duplicate side effect.

## Real vs simulated — no production claims

| Component | Status |
|---|---|
| FastAPI routes + typed approval input | Implemented |
| SQLite records, human-gate state, audit, idempotent local write | Implemented/testable |
| Evidence presence rule and deterministic planner | Implemented, minimal example |
| GitLaw source verification | Synthetic adapter shape, NOT live GitLaw |
| LLM agent | Not connected; rule-based proposal |
| Reviewer identity and tenant authentication | Not implemented; JSON role is trivially spoofable |
| External customer API writeback | Not implemented; action only written to local SQLite |
| Deployment security, real users, production SLAs | Not implemented |

## Next engineering steps

- Source adapter calling a trusted GitLaw resolver and independent claim verification.
- Typed agent planner under deterministic policy, not self-authorised execution.
- OAuth/tenant-scoped reviewer identity, granular RBAC.
- Transactional outbox, customer API adapters, retry/dead-letter mechanism.
- Observability and shadow-mode evaluations with real user feedback.

**Application story:** I can turn a customer need into a working end-to-end slice, show exact failure/authority boundaries, and explain what remains before production.
