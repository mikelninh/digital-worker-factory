# Managed Operations Retainer — Operator Playbook

## Mission

After a pilot reaches **KEEP**, turn the proven workflow into a repeatable managed service without giving the AI new authority.

> Receive the recurring customer input, work the checklist, surface exceptions, coordinate review, produce the monthly proof, and escalate anything outside the approved boundary.

## Retainer state

A customer may enter `ACTIVE_MANAGED_OPS` only when:

- pilot verdict is `KEEP`
- commercial retainer scope is agreed
- one workflow is explicitly named
- data source / delivery cadence is agreed
- customer reviewer is named
- Operations Assistant is named
- privacy / processor / retention decisions still cover the recurring workflow
- any material data-source or permission change passes a new review

## Default monthly cycle

1. **Receive** — collect the agreed new cases/data export.
2. **Preflight** — confirm scope, source, privacy and files still match the approved contract.
3. **Run** — execute the existing shadow/copilot workflow. Do not introduce write tools.
4. **Exceptions** — sort cases by risk, ambiguity and confidence.
5. **Human review** — reviewer uses ACCEPT / EDIT / REJECT.
6. **Proof** — generate monthly quality, safety, time and value report.
7. **Improve** — cluster EDIT/REJECT reasons and add them to evals before changing prompts/rules.
8. **Decide** — `KEEP`, `FIX`, `ESCALATE`, or propose an additional workflow.

## Operator checklist

### Before each cycle
- [ ] customer and workflow match retainer scope
- [ ] expected data source received
- [ ] no new integration or permission appeared silently
- [ ] privacy/retention conditions are still valid
- [ ] preflight passes

### After the run
- [ ] runtime errors = 0 or escalated
- [ ] unsafe executions = 0
- [ ] policy violations reviewed
- [ ] exception queue sent to named reviewer
- [ ] review completed
- [ ] EDIT/REJECT reasons captured
- [ ] monthly report generated
- [ ] customer-facing summary prepared

## STOP / escalation rules

The Operations Assistant must stop or escalate when any of these occur:

- privacy/preflight is red
- personal-data scope changes materially
- new production write access is requested
- payment or bank-detail change is involved
- legal/tenancy decision is requested
- autonomous external communication is requested
- contractor/spend commitment is requested
- policy boundary would need to be weakened
- unsafe execution > 0
- repeated material quality regression
- customer asks for a workflow not covered by the current scope

Never solve a red gate by changing the gate.

## Ownership

### Operations Assistant owns
- recurring intake
- checklist / preflight
- starting approved runs
- exception coordination
- report generation
- routine customer status
- structured escalation packets

### Customer Reviewer owns
- factual acceptance/edit/reject
- domain judgment
- consequential approval

### Founder / Sales owns
- pricing and commercial scope
- renewals
- new workflow sales
- major customer relationship issues
- policy/scope expansion decisions

### Engineering owns
- runtime defects
- schema/integration bugs
- recurring technical failures

## Commercial handoff

The retainer offer should be described as **Managed AI Operations**, not as autonomous software.

Initial pricing anchor:
- **from €750/month** for one already-proven workflow
- expansion / additional workflow can be priced higher after evidence

Final price should reflect the real pilot baseline, case volume, review burden and measured value. Do not promise a fixed case capacity before it is measured.

## Operating target

The system is successful when a reliable non-engineer can run a stable customer cycle without terminal, JSON editing, prompt engineering or OpenAI expertise.

Target, not yet proven: after stabilization, most operator effort should be exception handling and coordination rather than case-by-case processing.
