# Digital Worker Factory 🤖

**Trustworthy AI workers for repeatable operational work.**

Digital Worker Factory is a reusable architecture for AI workers that can interpret context, use tools and prepare actions — while deterministic runtime rules control permissions, evidence requirements, approval gates and audit.

**[Open the live demo →](https://digital-worker-factory-hallochupi-7378s-projects.vercel.app/)** · [Portfolio](https://mikelninh.github.io/)

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

The model can interpret and propose. **Authority lives outside the model.**

## What the demo proves

- explicit worker capabilities instead of unrestricted tool access
- evidence requirements before actions advance
- visible tool traces and state transitions
- human approval for consequential steps
- replayable failure cases
- reliability checks for missing tools, artifacts, evidence and unsafe autonomy
- declarative worker specifications rather than cloned one-off agents

## Reliability loop

```text
DRAFT → EVAL → SHADOW → COPILOT → LIMITED AUTO → TRUSTED
```

**Autonomy is earned from evidence, not enabled by confidence.**

## Synthetic evaluation suite

The repository includes a deterministic synthetic suite across multiple worker families. It checks failure modes such as:

- required tool not called
- required artifact missing
- weak evidence coverage
- policy violation
- loop-budget violation
- action crossing a human boundary

Synthetic evals demonstrate testability and regression discipline; they do **not** claim real-world task accuracy.

## Architecture

```text
shared runtime
   ├─ capabilities
   ├─ evidence contract
   ├─ policy gate
   ├─ approval state
   ├─ audit trace
   └─ eval harness
        ↓
 specialised worker specs
```

Related proofs feed into the same architecture:

- **GitLaw** → grounded legal retrieval + citation verification
- **PrüfPilot** → evidence-first document review
- **Council** → evidence-gated multi-agent decisions

## Stack

**JavaScript · Node.js · APIs · AI agents · tool contracts · policy gates · evals · human-in-the-loop**

---

Built by [Michael Ninh](https://mikelninh.github.io/) in Berlin.
