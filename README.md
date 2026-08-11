# Digital Worker Factory — V0

A small foundation for building **trustworthy, human-supervised digital workers** without cloning a new agent codebase for every vertical.

## Core idea

Each worker is a **versioned manifest** declaring:

- goals;
- allow-listed tools;
- forbidden tools;
- actions that may auto-execute;
- actions that require approval;
- critical actions;
- eval suites.

The runtime owns the invariants: policy, approvals, evidence, audit, tenant boundaries, execution state and observability. The model is an interchangeable reasoning component, not the authority.

```text
Channels / events
      ↓
Normalizer + entity resolution
      ↓
Context / evidence
      ↓
Worker runtime  ← worker manifest
      ↓
Structured action proposal
      ↓
Policy engine
   ↙      ↘
auto     approval queue
   ↘      ↙
Tool execution
      ↓
Audit + outcome + eval
```

## Included worker manifests

- `KanzleiPilot` — legal research and case workflow
- `CarePilot` — care/family administration
- `PraxisPilot` — medical-practice administration
- `HandwerkPilot` — jobs, quotes and scheduling
- `HausPilot` — property-management operations
- `Money Finder` — revenue recovery / spend leakage

## Why KanzleiPilot should reuse GitLaw

Do **not** copy GitLaw into this repository. Treat it as a specialised capability provider.

Suggested adapter:

```text
Digital Worker Factory
      │
      └── KanzleiPilot
              │
              ├── GitLaw MCP: search_laws
              ├── GitLaw MCP: hybrid_search
              ├── GitLaw MCP: verify_citation
              ├── GitLaw MCP: lookup_paragraph
              ├── GitLaw MCP: find_related_paragraphs
              └── GitLaw MCP: list_laws
```

GitLaw remains the legal evidence engine. The Factory owns worker lifecycle, permissions, approvals, tenant isolation, audit and deployment.

## Run

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

### Example

```bash
curl -X POST http://127.0.0.1:8000/workers/kanzleipilot/events \
  -H 'content-type: application/json' \
  -d '{
    "tenant_id":"bao-demo",
    "kind":"legal_question",
    "source":"client-email",
    "payload":{"question":"Welche Normen sind für diesen Fall relevant?"}
  }'
```

The API returns a structured `ActionProposal` with evidence, confidence, risk and approval requirements.

## V0 → V1

1. **Persistent state:** PostgreSQL for events, cases, proposals, approvals and audit.
2. **Durable workflows:** Temporal for long-running jobs, retries and waiting on humans/external systems.
3. **Model adapter:** structured-output reasoning provider behind a stable interface.
4. **Tool layer:** MCP-first capability registry plus ordinary internal tools where MCP is unnecessary.
5. **Policy:** move increasingly complex organisation policies to OPA/Rego; keep a hard-deny layer in code.
6. **Observability:** OpenTelemetry traces tying model calls, tool calls, approvals and outcomes to one run ID.
7. **Evals:** every worker ships with golden cases and policy-violation tests. A worker cannot be promoted if eval gates fail.
8. **Deployment:** dev → shadow → approval-only → constrained autonomy. Never jump directly to full autonomy.

## Worker lifecycle

```text
DRAFT
  ↓
EVAL
  ↓
SHADOW        observes real work, acts on nothing
  ↓
COPILOT       proposes, human approves everything
  ↓
LIMITED AUTO  only pre-approved low-risk actions
  ↓
PRODUCTION
```

Promotion is based on evidence, not vibes: task success, false-action rate, policy violations, human override rate, cost, latency and business outcome.

## The moat

The valuable asset is not prompts. It is the accumulated **Worker Specification + Tool Graph + Policy Library + Eval Corpus + Execution History** that lets a new vertical worker become safe and useful quickly.

## Factory website

The portfolio/product UI lives in [`site/`](site/). It is intentionally dependency-free: plain HTML, CSS and JavaScript, with clean Vercel rewrites for company-specific routes.

### Local preview

```bash
cd site
python -m http.server 4173
```

Open `http://localhost:4173`.

### Application entry URLs

- `/proof/aconium` — PrüfPilot → reusable document/case worker architecture
- `/proof/interloom` — CasePilot reliability → observable agent work
- `/proof/conny` — KanzleiPilot + GitLaw → human-reviewed legal workflows
- `/proof/digitalservice` — public-service worker / proactive administration thesis
- `/proof/overfly` — Factory itself → repeatable applied-AI delivery

### Design thesis

The site is built to explain the project in under 30 seconds:

1. **LEGO for digital labour** — reusable worker capabilities.
2. **Build workers that earn autonomy** — trust is promoted through evidence.
3. **What good digital work looks like** — grounded, bounded, observable, recoverable, improving.
4. **One flagship project, multiple entry doors** — tailored proof without creating five unrelated demos.

## Publish as its own GitHub repo

Recommended repository name: **`digital-worker-factory`**.

Then import the repository into Vercel and set the **Root Directory** to `site`.
No build command is required; the site is dependency-free.

Suggested production URL: `digital-worker-factory.vercel.app` (or your own domain).
