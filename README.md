# Digital Worker Factory 🤖

**AI workers for repeatable operational work — with authority kept outside the model.**

Digital Worker Factory is a reusable runtime for agents that can understand context, use tools and prepare or execute bounded work. Deterministic rules control capabilities, evidence, permissions, approval gates and audit.

**[Try the 10-second live proof →](https://mikelninh.github.io/agents/)** · [Portfolio](https://mikelninh.github.io/)

## See it in seconds

The public proof lets you run three synthetic workflows:

- **Data brief** — read permitted sources, reconcile fragmented data and prepare a structured internal brief.
- **Document review** — inspect a document pack, identify missing evidence and prepare a bounded case update.
- **External update** — prepare an outbound action and watch the runtime block it until human approval is recorded.

The point is not that an LLM can write text. The proof is that **tool use, authority and failure states are explicit and testable**.

## The runtime contract

```text
input / event
    ↓
named capabilities
    ↓
observable tool trace
    ↓
evidence + policy checks
    ↓
proposed action
    ↓
human approval when required
    ↓
authenticated provider
    ↓
audit + eval / replay
```

The model can interpret and propose. **The system authorizes.**

## What is implemented

- explicit capability registry instead of unrestricted tool access
- role and policy gates that fail closed
- evidence requirements before actions advance
- human approval for consequential writes and external actions
- provider adapters behind the shared gateway
- visible execution traces and durable state
- replayable synthetic failure cases
- reliability checks for missing tools, evidence, loops and unsafe autonomy
- declarative worker specifications rather than cloned one-off agents

## Current layers

### Capability Gateway

The shared agent runtime defines what a worker may request, checks role and risk policy, records approval state and emits an audit trace before provider execution.

### RevenueOS

A closed-loop economic control plane for qualifying opportunities, choosing evidence-backed next actions, deduplicating work and keeping supervised execution state durable.

### CommercialOS

A commercial execution layer that connects qualified opportunities to product mapping, approval-gated outreach, pricing, proposals, payment requests, onboarding, delivery proof and recurring revenue.

No external adapter executes from a model-generated intention alone.

## Commercial wedge — HausPilot

The first productised offer is **HausPilot: a €1,900 net, 7-day AI Operations Sprint for property managers**.

The sprint starts with one repeated workflow — for example maintenance-request triage, contractor coordination or document/invoice review — and measures the before/after result. AI prepares work; consequential actions remain behind a human approval gate.

- Landing page: [`site/hauspilot.html`](site/hauspilot.html)
- Sales + delivery playbook: [`sales/PLAYBOOK.md`](sales/PLAYBOOK.md)
- Human-supervised FCF agent system: [`agents/FCF_ENGINE.md`](agents/FCF_ENGINE.md)

**Commercial north star: collected cash and measured client value, not agent count or demo complexity.**

## Reliability loop

```text
DRAFT → EVAL → SHADOW → COPILOT → LIMITED AUTO → TRUSTED
```

**Autonomy is earned from evidence, not enabled by confidence.**

## Synthetic evaluation suite

The repository includes deterministic synthetic cases across multiple worker families. They check failure modes such as required tools not called, required artifacts or evidence missing, policy violations, loop-budget violations and actions crossing a human boundary.

Synthetic evals demonstrate testability and regression discipline; they do **not** claim real-world task accuracy.

## Related proofs

- **PrüfPilot** → evidence-first document review: https://mikelninh.github.io/pruefpilot/
- **GitLaw** → grounded legal retrieval + citation verification: https://mikelninh.github.io/gitlaw/

## Stack

**JavaScript · Node.js · APIs · AI agents · tool contracts · policy gates · evals · human-in-the-loop**

---

Built by [Michael Ninh](https://mikelninh.github.io/) in Berlin.
