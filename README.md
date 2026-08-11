# Digital Worker Factory — V1

> **LEGO for digital labour. Build workers that earn autonomy.**

A working prototype for **trustworthy, human-supervised digital workers**. One shared contract powers specialised workers for document review, legal workflows, public services, reliability evaluation and applied-AI delivery.

## Product thesis

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

## V1 proof surfaces

The public portfolio demonstrates the same architecture across several kinds of work:

- **Document AI** — intake → versioned rules → evidence → targeted next action
- **Agent reliability** — premature-completion failure → trace replay → pass
- **Legal workflow** — grounded retrieval → citation verification → qualified human review
- **Public service** — life-event orchestration → minimal-data service plan → explicit authority boundary
- **Worker builder** — workflow mapping → capability composition → policy/eval contract → shadow deployment

Some application flows use unlisted tailored entry routes. They are intentionally excluded from the public portfolio navigation and search indexing.

All examples use **synthetic data** unless explicitly stated otherwise. The demo never pretends to execute legal, governmental, financial or other external actions.

## Working API gates

### `POST /api/run`

Executes a deterministic demo worker contract and returns:

- worker + scenario
- observable execution trace
- evidence items and states
- finding
- proposed next action
- human/policy gate
- reliability dimensions
- run ID

### `POST /api/approve`

Records a human approve/reject decision against a run ID. The portfolio sandbox records the audit event but deliberately executes no external side effect.

## Worker specifications

[`workers/catalog.json`](workers/catalog.json) contains the first reusable worker contracts: capabilities, approval boundaries and evaluation suites.

The key design choice is **declarative specialisation**. A new worker should increasingly be a versioned specification using shared runtime primitives rather than another cloned agent application.

## Synthetic reliability suite

[`evals/run.mjs`](evals/run.mjs) generates and evaluates **50 deterministic synthetic cases** across five worker families.

The suite checks failure modes including:

- missing required tool calls
- missing required artifacts
- weak evidence coverage
- policy violations
- loop-budget violations
- unsafe autonomy across a human boundary

The suite is deliberately labelled **synthetic**. It demonstrates testability and regression discipline; it does not claim real-world task accuracy.

GitHub Actions runs the suite on pushes and pull requests via [`.github/workflows/evals.yml`](.github/workflows/evals.yml).

## Existing systems reused

### GitLaw → legal intelligence capability

GitLaw remains a specialised capability for legal retrieval and deterministic citation verification rather than being copied into the Factory.

### PrüfPilot → evidence-first case engine

PrüfPilot V5.1 demonstrates a reusable case-engine pattern across synthetic administrative domains: document intake, versioned rules, evidence states, bounded actions and human review.

### CasePilot → reliability engine

CasePilot contributes the reliability pattern:

- completion integrity
- required-tool checks
- required-artifact checks
- loop detection
- escalation quality
- failure replay
- regression gates

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
  identity.js      public portfolio / personal layer
  styles.css       core responsive design
  identity.css     public portfolio styling
  api/
    run.js         shared demo worker runtime
    approve.js     explicit human approval gate

workers/
  catalog.json     declarative worker specs

evals/
  run.mjs          50-case synthetic reliability suite
```

## Related proof projects

- **PrüfPilot V5.1:** https://github.com/mikelninh/pruefpilot-document-ai
- **GitLaw:** https://github.com/mikelninh/gitlaw

## Author

Michael Ninh · AI Engineer · Berlin

I like turning complicated systems into things humans can understand and use — especially where AI needs to be reliable enough to do real work.
