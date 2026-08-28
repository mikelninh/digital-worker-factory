# Mara Managed Operations — Operator Playbook

## Mission

After a Proof Week reaches **KEEP** and the customer explicitly opts in, turn the proven workflow into a repeatable monthly service without giving the AI unearned authority.

> Receive recurring customer input, work the checklist, surface exceptions, coordinate review, produce monthly proof, and escalate anything outside the approved boundary.

## Commercial contract

Standard launch offer for one proven workflow:

- **€1,500 net/month**
- only after explicit customer opt-in
- when the customer continues directly after the €990 Proof Week, the **€990 is credited in full against month 1**
- no automatic continuation after the Proof Week
- additional workflows / unusual scope go to Sales/Owner

## Retainer state

A customer may enter `ACTIVE_MANAGED_OPS` only when:

- Proof Week verdict is `KEEP`
- customer explicitly accepted the monthly service
- commercial scope is agreed
- one workflow is explicitly named
- data source / delivery cadence is agreed
- customer reviewer is named
- Operations owner is named
- privacy / processor / retention decisions still cover the recurring workflow
- any material data-source or permission change passes a new review

## Default monthly cycle

1. **Receive** — collect the agreed new cases/data export.
2. **Preflight** — confirm scope, source, privacy and files still match the approved contract.
3. **Run** — execute the existing shadow/copilot workflow. Do not silently introduce new write authority.
4. **Exceptions** — sort cases by risk, ambiguity and confidence.
5. **Human review** — reviewer decides Richtig / Ändern / Falsch for required review cases.
6. **Proof** — generate monthly quality, safety, time and value report.
7. **Improve** — cluster corrections/rejections and add them to evals before changing prompts/rules.
8. **Decide** — `KEEP`, `FIX`, `ESCALATE`, or propose an additional workflow.

## Operator checklist

### Before each cycle
- [ ] customer and workflow match monthly scope
- [ ] expected data source received
- [ ] no new integration or permission appeared silently
- [ ] privacy/retention conditions are still valid
- [ ] preflight passes

### After the run
- [ ] runtime errors = 0 or escalated
- [ ] unsafe executions = 0
- [ ] policy violations reviewed
- [ ] exception queue sent to named reviewer
- [ ] required review completed
- [ ] corrections/rejections captured
- [ ] monthly report generated
- [ ] customer-facing summary prepared

## STOP / escalation rules

Operations must stop or escalate when any of these occur:

- privacy/preflight is red
- personal-data scope changes materially
- new production write access is requested
- payment or bank-detail change is involved
- legal/tenancy decision is requested
- autonomous external communication is requested outside earned authority
- contractor/spend commitment is requested outside customer-defined authority
- policy boundary would need to be weakened
- unsafe execution > 0
- repeated material quality regression
- customer asks for a workflow not covered by current scope

Never solve a red gate by changing the gate.

## Ownership

### Operations owns
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

### Sales / Owner owns
- non-standard pricing or commercial scope
- additional workflow sales
- major customer relationship issues
- policy/scope expansion decisions

### Engineering owns
- runtime defects
- schema/integration bugs
- recurring technical failures

## Product progression

The managed monthly service is the bridge toward Mara as a durable digital employee. Production authority still expands in this order:

**Microsoft 365 read-only → Live Shadow → Copilot approvals → earned low-risk automation → bounded workflow ownership**

A monthly subscription does not itself grant autonomy.

## Operating target

The system is successful when a reliable non-engineer can run a stable customer cycle without terminal, JSON editing, prompt engineering or OpenAI expertise.

After stabilization, most human effort should be exception handling and coordination rather than case-by-case processing.
