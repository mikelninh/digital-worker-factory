# Digital Worker Factory 🤖

**One trusted runtime. Different professions. Different capabilities. Same proof of control.**

Digital Worker Factory is a reusable runtime for AI-assisted operational work. A case comes in, the system uses only the tools allowed for that role, keeps evidence attached, prepares the work and leaves consequential decisions with a qualified human.

**[Try the focused HausPilot proof →](https://mikelninh.github.io/agents/)** · [Portfolio](https://mikelninh.github.io/)

## Start with the workflow

The public proof follows one realistic synthetic tenant-operations case end to end:

1. inspect the incoming tenant message;
2. open the supporting property, contractor and policy records if useful;
3. run the bounded worker;
4. review the prepared repair case;
5. remove a required source and verify that the workflow stops instead of guessing or sending anything.

The case is **synthetic by design**. It demonstrates the runtime, evidence path and human boundary; it is not presented as customer production data or measured production performance.

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

## Engineering evidence

HausPilot has a real-model release gate that sends synthetic operational cases through the OpenAI Responses API and validates structured outputs against deterministic safety and policy checks.

A published 100-case synthetic run completed with no runtime errors, unsafe executions or false execution claims in that release set. The repository also contains deterministic contract tests, adversarial policy cases, privacy fail-closed tests, human-review tests, first-customer preflight tooling and replayable regression suites.

[Inspect the published 100-case run →](https://github.com/mikelninh/digital-worker-factory/actions/runs/32991903663) · [Inspect current CI →](https://github.com/mikelninh/digital-worker-factory/actions)

These are **synthetic engineering evals**, not claims of real-world production accuracy or customer outcomes.

## Pilot readiness

The intended next validation step is a controlled shadow pilot on historical cases:

- no automatic external writes;
- human reviewer checks every prepared case;
- measure handling time, corrections, escalations and false-completion rate;
- turn every material failure into a regression case before autonomy increases.

That makes the current system a **pilot-ready engineering candidate**, not a production-validated autonomous worker.

See [`PILOT_READINESS.md`](PILOT_READINESS.md) and [`CUSTOMER_PILOT_RUNBOOK.md`](CUSTOMER_PILOT_RUNBOOK.md) for the operational path.

## Domain engines

### PrüfPilot

A document-review engine with real PDF intake, structured extraction, rules/retrieval, evidence checks, review memos, production-oriented persistence and CI coverage.

### GitLaw

A source-grounded legal system. The Factory includes a dedicated GitLaw provider adapter so legal case capabilities can sit behind the same runtime boundary.

### Healthcare

Healthcare examples remain synthetic domain illustrations of the runtime pattern. They are not presented as production clinical systems or validated medical decision support.

## Reliability loop

```text
DRAFT → EVAL → SHADOW → COPILOT → LIMITED AUTO → TRUSTED
```

**Autonomy is earned from evidence, not enabled by confidence.**

## Stack

**JavaScript · Node.js · APIs · AI agents · tool contracts · policy gates · evals · human-in-the-loop**

---

Built by [Michael Ninh](https://mikelninh.github.io/) in Berlin.
