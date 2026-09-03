# Digital Worker Factory 🤖

**Turn repeated operational work into bounded AI workflows — without hiding evidence, authority or failure.**

Digital Worker Factory is a reusable runtime for AI-assisted operations. A case comes in, the worker can use only the capabilities allowed for that role, required evidence stays attached, the next hand-off is prepared, and consequential actions remain behind explicit authority.

**[Try the HausPilot workflow →](https://mikelninh.github.io/agents/)** · **[Portfolio →](https://mikelninh.github.io/)**

> **Core principle:** the model can interpret and propose. **The system authorizes.**

## The 60-second proof

The public HausPilot case is deliberately simple and inspectable:

```text
tenant request
   ↓
property + contractor + policy records
   ↓
classify + resolve + match capability
   ↓
prepare repair hand-off
   ↓
human review
   ↓
approve & release
```

Then remove a required source.

The worker stops instead of guessing, contacting anyone or claiming completion.

The public case is **synthetic by design**. It demonstrates the runtime and trust boundary; it is not customer production data or measured production performance.

## What is implemented

- shared `AgentGateway` instead of unrestricted tool execution
- explicit capability registry and role/policy gates
- evidence requirements before workflows advance
- human approval for consequential writes and external actions
- provider adapters behind the same gateway
- tenant/request context, trust-chain checks and duplicate-execution blocking at the production boundary
- append-only durable audit + atomic file idempotency reference adapters
- replayable failure cases and regression tests
- checks for missing tools, evidence, loops and unsafe autonomy
- declarative worker/domain specs rather than cloned one-off agents

The included filesystem adapters are deliberately a **single-host reference implementation**, not a claim of distributed production infrastructure. The same contracts are designed to be replaced by a transactional datastore and durable audit service in a multi-host deployment.

## Why this matters

The goal is not “an agent that does everything.” It is to remove repeatable work while keeping the parts that matter inspectable:

`input → permissions → evidence → work → human boundary → result → replay`

That makes it possible to improve autonomy gradually instead of granting it by default.

## Earned autonomy

```text
SHADOW → COPILOT → HUMAN RELEASE → LIMITED AUTO → TRUSTED
```

A workflow should earn broader authority from real evidence: reviewed cases, correction rate, source coverage, false-completion rate, rollback and human override.

High-impact actions can remain human-only indefinitely.

## Engineering proof

HausPilot includes a real-model synthetic release gate through the OpenAI Responses API plus deterministic policy checks. A published 100-case synthetic release run completed that release set without runtime errors, unsafe executions or false execution claims.

The production-boundary suite also verifies fail-closed tenant context, approval/trust-chain mismatches, secret redaction, duplicate execution and persistence of the durable reference adapters.

**[Inspect the published run →](https://github.com/mikelninh/digital-worker-factory/actions/runs/32991903663)** · **[Current CI →](https://github.com/mikelninh/digital-worker-factory/actions)**

These are **synthetic engineering evals**, not claims of real-world customer outcomes.

## Pilot path

The next meaningful validation step is controlled shadow use on representative historical workflows:

1. prepare work, but make no automatic external writes;
2. have a human review every case;
3. measure handling time, corrections, escalations and false completion;
4. convert failures into regression cases;
5. widen authority only for stable, low-risk case classes.

Current status: **pilot-ready engineering candidate**, not production-validated autonomous worker.

See [`PILOT_READINESS.md`](PILOT_READINESS.md) and [`CUSTOMER_PILOT_RUNBOOK.md`](CUSTOMER_PILOT_RUNBOOK.md).

## Stack

**JavaScript · Node.js · APIs · AI agents · tool contracts · policy gates · evals · human-in-the-loop**

---

Built by [Michael Ninh](https://mikelninh.github.io/) in Berlin.
