# Digital Worker Factory 🤖

**One trusted runtime. Different professions. Different capabilities. Same proof of control.**

Digital Worker Factory is a reusable runtime for AI-assisted operational work. A case comes in, the system uses only the tools allowed for that role, keeps evidence attached, prepares the work and leaves consequential decisions with a qualified human.

**[Try the live synthetic demo →](https://mikelninh.github.io/agents/)** · [Portfolio](https://mikelninh.github.io/product-architect/)

## The product model

The profession changes the domain pack. The trust boundary does not.

```text
case / documents / message
        ↓
allowed capabilities
        ↓
evidence + checks
        ↓
reviewable output
        ↓
human approval for consequential actions
        ↓
audit + eval / replay
```

### Public administration

Funding application + invoice + proof of payment → completeness and consistency checks → review memo + targeted follow-up → case officer decides.

### Law firm

Case file + legal sources → grounded research + uncertainty → cited draft → qualified lawyer decides whether anything is sent.

### Healthcare

Clinical documents + medication list + labs → discrepancy-focused summary → physician review. The synthetic public demo does not diagnose, prescribe or change treatment.

## What is actually implemented

- reusable `AgentGateway` instead of unrestricted tool execution
- explicit capability registry and role/policy gates
- evidence requirements before actions advance
- human approval for consequential writes and external actions
- provider adapters behind the shared gateway
- visible execution traces and durable state
- replayable synthetic failure cases
- reliability checks for missing tools, evidence, loops and unsafe autonomy
- declarative worker/domain specifications rather than cloned one-off agents

The model can interpret and propose. **The system authorizes.**

## Real-model proof

HausPilot, one worker pack built on the runtime, has a real-model release gate that sends synthetic operational cases through the OpenAI Responses API and validates structured outputs against deterministic safety and policy checks.

A full 100-case run completed with:

- 100 / 100 cases completed
- 0 runtime errors
- 0 unsafe executions
- 0 unsafe model proposals
- 0 false execution claims
- 100% on classification, property resolution, repair urgency and shadow-boundary checks in that synthetic release set

These are **synthetic engineering evals**, not claims of real-world production accuracy.

## Real domain engines

### PrüfPilot

A document-review engine with real PDF intake, structured extraction, rules/retrieval, evidence checks, review memos, production-oriented persistence and CI coverage.

### GitLaw

A source-grounded legal system. The Factory includes a dedicated GitLaw provider adapter so legal case capabilities can sit behind the same runtime boundary.

### Healthcare

The public medical example is intentionally a **synthetic domain illustration** of the same runtime pattern. It should not be read as a production clinical system or validated medical decision support.

## Commercial wedge — HausPilot

HausPilot is the first productised operational worker pack: property-management workflows such as repair intake, tenant inbox handling and invoice review. The underlying runtime separates model reasoning from execution authority and keeps external actions behind deterministic policy and human approval.

## Reliability loop

```text
DRAFT → EVAL → SHADOW → COPILOT → LIMITED AUTO → TRUSTED
```

**Autonomy is earned from evidence, not enabled by confidence.**

## Stack

**JavaScript · Node.js · APIs · AI agents · tool contracts · policy gates · evals · human-in-the-loop**

---

Built by [Michael Ninh](https://mikelninh.github.io/) in Berlin.
