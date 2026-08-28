# Digital Worker Factory 🤖

**Trustworthy AI workers for repeatable operational work.**

Digital Worker Factory is a reusable architecture for AI workers that can interpret context, use tools and prepare actions — while deterministic runtime rules control permissions, evidence requirements, approval gates and audit.

**[Open the live demo →](https://digital-worker-factory-hallochupi-7378s-projects.vercel.app/)** · [Portfolio](https://mikelninh.github.io/)

## Commercial wedge — HausPilot

The first productised commercial offer is **HausPilot: a €1,900 net, 7-day AI Operations Sprint for property managers**.

The sprint deliberately starts with one repeated workflow — for example maintenance-request triage, contractor coordination or document/invoice review — and measures the before/after result. AI prepares work; consequential actions remain behind a human approval gate.

- Landing page: [`site/hauspilot.html`](site/hauspilot.html)
- Sales + delivery playbook: [`sales/PLAYBOOK.md`](sales/PLAYBOOK.md)
- First Berlin target accounts: [`sales/TARGETS_BERLIN_2026-08-26.md`](sales/TARGETS_BERLIN_2026-08-26.md)
- Human-supervised FCF agent system: [`agents/FCF_ENGINE.md`](agents/FCF_ENGINE.md)

**Commercial north star: collected cash and measured client value, not agent count or demo complexity.**

## Focused role proof — One Less Click

[`packs/caya-one-less-click/`](packs/caya-one-less-click/) is a synthetic Business Automation Engineer proof built around one support workflow:

**webhook → Lambda-compatible handler → idempotency → classification → Postgres-oriented context query → policy gate → prepared action → audit.**

It includes a Zapier webhook adapter example, a SQL/index optimisation exercise, a 30-case regression suite and a small interactive trace UI at [`site/caya-one-less-click.html`](site/caya-one-less-click.html).

The proof is not affiliated with Caya and uses no Caya systems, customer data, private APIs or production schemas.

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
