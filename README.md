# Digital Worker Factory — V1

> **LEGO for digital labour. Build workers that earn autonomy.**

A portfolio-grade working prototype for **trustworthy, human-supervised digital workers**. One shared contract powers specialised workers for document review, legal workflows, public services, reliability evaluation and applied-AI delivery.

## Live product thesis

A worker does not control its own authority. It may interpret context and propose an action, while deterministic runtime rules own permissions, evidence requirements, approval gates and audit.

```text
input / event
    ↓
worker capabilities
    ↓
observable tool trace
    ↓
evidence contract
    ↓
policy gate
    ↓
proposed action
    ↓
human approval
    ↓
audit + eval
```

## V1: five working application demos

The website exposes company-specific entry routes, but every route calls the same V1 API contract.

| Route | Worker | Demonstrates |
| --- | --- | --- |
| `/proof/aconium` | **PrüfPilot** | document intake → versioned rules → evidence → missing-proof escalation |
| `/proof/interloom` | **CasePilot Reliability** | premature-completion failure → trace replay → pass |
| `/proof/conny` | **KanzleiPilot** | GitLaw-backed legal workflow → citation verification → qualified human review |
| `/proof/digitalservice` | **BürgerPilot** | life-event orchestration → minimal-data service plan → explicit authority boundary |
| `/proof/overfly` | **Worker Builder** | workflow mapping → capability composition → policy/eval contract → shadow plan |

All examples use **synthetic data**. The demo never pretends to execute legal, governmental, financial or other external actions.

## Working API gates

### `POST /api/run`

Executes a deterministic demo worker contract and returns:

- worker + scenario;
- observable execution trace;
- evidence items and states;
- finding;
- proposed next action;
- human/policy gate;
- reliability dimensions;
- run ID.

Example:

```json
{
  "demo": "conny"
}
```

For Interloom, pass `"replay": true` to replay the corrected procedure after the intentional first-run completion failure.

### `POST /api/approve`

Records a human approve/reject decision against a run ID. The portfolio sandbox records the audit event but deliberately executes no external side effect.

```json
{
  "runId": "conny-abc123",
  "demo": "conny",
  "decision": "approve"
}
```

## Worker specifications

[`workers/catalog.json`](workers/catalog.json) contains the first reusable worker contracts: capabilities, approval boundaries and evaluation suites.

The key design choice is **declarative specialisation**. A new worker should increasingly be a versioned specification using shared runtime primitives rather than another cloned agent application.

## Existing systems reused

### GitLaw → legal intelligence capability

KanzleiPilot does not copy GitLaw. GitLaw remains a specialised capability for legal retrieval and deterministic citation verification.

- `search_laws`
- `hybrid_search`
- `verify_citation`
- `lookup_paragraph`
- `find_related_paragraphs`

### PrüfPilot → evidence-first case engine

PrüfPilot V5.1 already demonstrates a reusable case-engine pattern across synthetic administrative domains: document intake, versioned rules, evidence states, bounded actions and human review.

### CasePilot → reliability engine

CasePilot becomes the Factory reliability layer:

- completion integrity;
- required-tool checks;
- required-artifact checks;
- loop detection;
- escalation quality;
- failure replay;
- regression gates.

## Worker lifecycle

```text
DRAFT
  ↓
EVAL
  ↓
SHADOW        observe; no external action
  ↓
COPILOT       propose; human approves
  ↓
LIMITED AUTO  only proven low-risk actions
  ↓
TRUSTED       bounded autonomy with continuous evals
```

**Autonomy is earned from evidence, not enabled by confidence.**

## What good digital work looks like

1. **Grounded** — claims connect to evidence.
2. **Bounded** — permissions live outside the model.
3. **Observable** — actions leave a trace.
4. **Recoverable** — failures become replayable cases.
5. **Improving** — autonomy follows measured reliability.

## Repository

```text
site/
  index.html       portfolio / product UI
  app.js           V1 interactive proof experiences
  styles.css       warm-futurist responsive design
  api/
    run.js         shared demo worker runtime
    approve.js     explicit human approval gate
  vercel.json      proof-route SPA rewrites

workers/
  catalog.json     first declarative worker specs
```

## Run locally

The homepage itself is static. Vercel serverless endpoints power the V1 proof interactions in deployment.

```bash
cd site
python -m http.server 4173
```

For the complete API experience, deploy `site/` to Vercel.

## Related proof projects

- **PrüfPilot V5.1:** https://github.com/mikelninh/pruefpilot-document-ai
- **GitLaw:** https://github.com/mikelninh/gitlaw

## Author

Michael Ninh · AI Engineer · Berlin

This is an independent proof-of-work project. Company-specific routes are tailored technical demonstrations and do not imply affiliation with those organisations.
