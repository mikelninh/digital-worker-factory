# Digital Worker Factory

**Trustworthy AI workers for repeatable operational work.**

Digital Worker Factory is a reusable architecture for AI workers that can interpret context, use tools and prepare actions — while deterministic runtime rules control permissions, evidence requirements, approval gates and audit.

**[Open the live demo](https://digital-worker-factory-hallochupi-7378s-projects.vercel.app/)**

## The contract

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

**Autonomy is earned from evidence, not enabled by confidence.**

## What the demo proves

The same runtime pattern is applied across several kinds of work:

- **Document AI** — intake → rules → evidence → next action
- **Agent reliability** — trace replay → failure diagnosis → regression pass
- **Legal workflows** — grounded retrieval → citation verification → human review
- **Public services** — life event → service plan → explicit authority boundary
- **Worker builder** — workflow mapping → capabilities → policy/eval contract

Public examples use synthetic data unless explicitly stated otherwise.

## Reliability layer

The repository includes a deterministic synthetic evaluation suite across five worker families. It checks failure modes such as:

- missing required tool calls
- missing required artifacts
- weak evidence coverage
- policy violations
- loop-budget violations
- unsafe autonomy across a human boundary

GitHub Actions runs the suite on pushes and pull requests.

## Worker lifecycle

```text
DRAFT
  ↓
EVAL
  ↓
SHADOW
  ↓
COPILOT
  ↓
LIMITED AUTO
  ↓
TRUSTED
```

A worker should gain authority only after measured reliability at the previous stage.

## Design principles

1. **Grounded** — claims connect to evidence.
2. **Bounded** — permissions live outside the model.
3. **Observable** — actions leave a trace.
4. **Recoverable** — failures become replayable cases.
5. **Improving** — evaluations decide when autonomy can increase.

## Related systems

- [GitLaw](https://github.com/mikelninh/gitlaw) — legal retrieval and citation verification
- [PrüfPilot](https://github.com/mikelninh/pruefpilot-document-ai) — evidence-first case workflows
- [Council](https://github.com/mikelninh/council) — evidence-gated multi-agent decision making

## Stack

`JavaScript · APIs · AI agents · tool contracts · policy gates · evals · human-in-the-loop`

---

Built by [Michael Ninh](https://github.com/mikelninh) in Berlin.
