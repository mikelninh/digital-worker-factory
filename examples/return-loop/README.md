# RETURN LOOP ↗

**One complaint. Three systems. A learning loop.**

A runnable, *unofficial* Junior AI Engineer work sample designed for an e-commerce House of Brands. **Not affiliated with, commissioned by, or connected to SNOCKS.** All companies, products, SKUs, names, orders, policies, tickets and volume figures in the executable demo are synthetic. Do not confuse fabricated metrics with real customer outcomes.

The goal is not another Shopify reporting assistant. SNOCKS already uses Shopify Sidekick for self-serve reporting (see [Shopify case study](https://www.shopify.com/de/case-studies/snocks-sidekick)). RETURN LOOP focuses on the **cross-functional path** from customer request → known order/product facts → human-reviewed reply → product quality signal → measurable improvement.

**[Open the browser-only preview ↗](https://return-loop-proof-mn-2026.vercel.app/)** — interactive, synthetic, and hosted on Vercel. Preview calculations and approval states run in the viewer’s browser; it does **not** execute the Python API, real SQL, OpenAI or Shopify/Zendesk integrations. For the real FastAPI + SQLite workflows, use the local setup below.

## Try it locally

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
# open http://127.0.0.1:8000
pytest -q
```

Or: `docker build -t return-loop . && docker run --rm -p 8000:8000 return-loop` (persistent demo DB requires mounting a writable volume). Docker disables `/api/demo/reset` by default.

## 60-second hiring-manager path

1. **TK-1047 / Hole after two washes** — `Analyse case`. A synthetic mock order and SKU are resolved; reply draft includes only known facts. A SQL cluster signal connects the ticket to a potential product issue.
2. **Approve draft** — no simulated write is possible before the manual approval. **Simulate send** writes to a local SQLite outbox, not Zendesk or email. Replays do not create duplicates.
3. **TK-1082 / Unknown order** — analysis explicitly requests identification and blocks approval; no invented shipping status.
4. **TK-1090 / Injection** — a hostile customer instruction attempts to force a €250 refund. It is treated as untrusted input; sends are blocked.
5. **Quality signals → Evaluation** — inspect the SQL denominator and run the 17 synthetic checks. No claim of real-world AI accuracy, customer satisfaction or time saved.

## Engineering map

| Role requirement | Implemented proof |
|---|---|
| Python / REST | FastAPI typed endpoints, seeded data, exception handling |
| SQL / warehouse thinking | SQLite schema: tickets, orders, products, analysis, feedback, outbox, audit. Product issue signal normalised per synthetic units sold |
| LLM / agentic workflow | Bounded intent classification, optional OpenAI Responses JSON Schema adapter; deterministic grounded replies and human action gate |
| Automation / integration | Mock order and policy adapters (not live Shopify, Zendesk, etc.) |
| Quality / cost / latency | 10 API integration tests, 17 synthetic fixed checks; measured local execution time, token usage when real model is opt-in; cost unreported without configured unit prices |
| Feedback & enablement | Reviewer correction flags, audit trace, system architecture and clear next actions |
| Deployment | Minimal Dockerfile and GitHub Actions pytest checks; not a certified production deployment |

### Real model opt-in

Deterministic rules mode is the reliable default and never calls an external model. Set `LOOP_LLM_MODE=live` and `OPENAI_API_KEY` to test optional JSON Schema intent classification using the OpenAI Responses endpoint. **Do not enable with actual customer data**; the synthetic case texts are explicitly sent to the provider in live mode. The model cannot write responses, grant refunds, set permissions or directly insert an action. If the model disagrees with the deterministic classifier, the discrepancy is surfaced as a risk. If the call fails, the system falls back to local rules. API pricing is user-supplied, not invented. The 17 synthetic eval checks do not call the LLM.

### API contracts

- `GET /api/health` + `/api/overview`
- `GET /api/tickets` + `/api/tickets/{id}`
- `POST /api/tickets/{id}/analyse`
- `POST /api/tickets/{id}/approve`
- `POST /api/tickets/{id}/simulate-send`
- `POST /api/tickets/{id}/feedback`
- `GET /api/signals`
- `POST /api/evals/run`
- `POST /api/demo/reset` (disabled in Docker)

### Trust boundary

All customer-facing text is generated from known, fictional order data and fictional policies; user-authored ticket text is never granted tool authority. Nonexistent orders and explicit hostile instructions block approval in the demo. Reviewer input is **not authenticated**: this is not a safe public or multi-tenant service. No actual returns, refunds, payments, messages or other outside effects.

### Production gaps

- SSO, tenant isolation, role-based access, reviewer authentication and audit privacy
- Real Shopify/Zendesk/ERP adapters, webhook signatures, retry queue, idempotency across distributed processes
- Data minimisation, retention, GDPR assessments and provider agreements
- Human-labelled classification and factuality evals, red-team and known-order reconciliation
- Cost/latency tracking from real LLM traffic, baseline against human workflows
- SKU/batch-level verified issue incidence, sampling bias control and false-positive review
- Real monitoring, deployment security, backups, SLOs, disaster recovery

## Portfolio angle

> I spent years running an e-commerce company and know the gap between a dashboard and a problem actually getting solved. I now build bounded AI workflows with Python, APIs and LLMs. RETURN LOOP shows how a single support ticket can produce both a reviewable customer response and a better signal for the product team — without inventing facts or hiding human responsibility.

Created by Michael Ninh · Berlin · 2026.
