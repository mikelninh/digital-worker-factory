# AGENTS.md — Digital Worker Factory

## Mission
Build bounded AI-assisted operational workflows that remain inspectable, evidence-backed, reversible where possible, and human-controlled at consequential boundaries.

## Start here
1. Read `README.md`.
2. Read `.harness/project.json`.
3. Read `.harness/active-task.json` and `.harness/HANDOFF.md`.
4. Load only the domain docs needed for the task.

## Source-of-truth map
- Product/runtime overview: `README.md`
- Shared agent runtime and policy gates: `core/`
- Domain packs and operator flows: `packs/`
- Architecture decisions: `architecture/`
- Production boundaries: `production/`
- Evals and release evidence: `evals/`
- Commercial workflows: `commercial/`, `agents/COMMERCIAL_OS.md`
- Current work state: `.harness/`
- CI truth: `.github/workflows/`

## Contract before work
Every substantial task must define:
- goal
- authoritative sources
- outputs
- constraints
- done criteria
- forbidden actions
- risk class
- retry budget
- next owner

Do not silently redefine the task to something easier.

## Roles
- Chief: triage, decompose, route, collect. Does not do production work.
- Scout: research and source collection. Read-only by default.
- Builder: creates the artifact in an isolated branch/workspace.
- Verifier: independently tests claims and artifacts. Must not rubber-stamp Builder.
- Operator: performs approved external actions only after policy checks.

## Action classes
- A0 Observe — read/search/analyse. Automatic.
- A1 Local reversible — draft/test/edit isolated work. Automatic.
- A2 Shared reversible — branch, PR, preview, issue. Logged; normally automatic.
- A3 Consequential — deploy, send, publish, spend, write to external systems. Human approval required.
- A4 High-impact — sensitive data egress, destructive production changes, legal/financial commitments. Explicit approval plus stronger verification.

Trust the action class, not the personality of the agent.

## Verification
Minimum harness check:
`node scripts/harness-check.mjs`

Useful runtime/eval checks are listed in `.harness/project.json` and `.github/workflows/evals.yml`.

Never claim a test passed unless the command was actually run and the result is captured.

## Durable state
The conversation is not the system of record.
Keep current work in `.harness/active-task.json`.
Keep handoff context in `.harness/HANDOFF.md`.
Keep accepted run receipts in `.harness/receipts/`.

Memory may preserve preferences; current repository state, CI, deployments, prices, permissions and case state must be re-opened from authoritative sources.

## Handoffs
A handoff must state:
- status
- current step
- evidence
- decisions
- failures/uncertainties
- open risks
- next owner and exact next action

Do not pass substantial work as chat-only context.

## Retries
Use bounded local repair loops.
Default maximum: 3 attempts.
If the same failure repeats twice, stop and upgrade the harness or escalate rather than blindly retrying.

## Failure upgrades
Turn recurring failure classes into infrastructure:
- missing context -> map/retrieval rule
- wrong tool -> routing/tool-contract fix
- bad output -> validator/eval
- repeated loop -> retry cap/escalation
- unsafe action -> permission gate
- lost decision -> durable state
- unknown failure -> tracing/evidence capture

A fix that only repairs one run is incomplete when the failure class is likely to recur.

## Hard boundaries
- The model proposes; policy authorises.
- Required evidence may not be invented or substituted with memory.
- Missing authoritative sources must fail closed or be marked unknown.
- External side effects must be idempotent where possible.
- Builder and Verifier should be separate for consequential work.
- Production secrets and customer data never belong in repository state.
- Synthetic evidence must never be presented as production evidence.

## Definition of done
Work is done only when the contract's done criteria are evidenced, remaining uncertainty is explicit, rollback/next step is known, and any required approval has been recorded.
