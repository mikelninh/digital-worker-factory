# Operations Assistant — Pilot Delivery Playbook

## Mission

> Nimm die Daten vom Kunden, arbeite unsere Checkliste ab und stelle sicher, dass der Pilot sauber durchläuft.

The Operations Assistant owns **delivery flow**, not sales, legal decisions, model design, or autonomous external actions.

## The job in one line

Customer package → preflight → shadow run → review queue → measured report → founder handoff.

## Inputs required from the customer

1. One scoped workflow: `repair_intake`, `tenant_inbox`, or `invoice_review`.
2. 20–50 historical cases.
3. Relevant master data such as property list.
4. One named reviewer.
5. Required data/privacy approvals for the selected data mode.

Do not improvise around missing inputs. Missing required gate = STOP and request what is missing.

## Operator checklist

### A. Create workspace

- [ ] Create customer workspace with `new-pilot.mjs`.
- [ ] Confirm company name and customer slug.
- [ ] Confirm exactly one workflow.

### B. Intake

- [ ] Cases are historical and in scope.
- [ ] 20–50 cases supplied.
- [ ] Property/master data supplied.
- [ ] Reviewer named.
- [ ] Data mode selected: synthetic / anonymised / personal or pseudonymised.

### C. Privacy / safety

- [ ] Data authorised.
- [ ] Retention decision documented.
- [ ] Shadow-only confirmed.
- [ ] If anonymised: anonymisation confirmation + direct-identifier scan passes.
- [ ] If personal/pseudonymised: privacy, processor, legal-basis, subprocessor and residency decisions documented as required.

Never override a failed preflight.

### D. Run

Run the standard pipeline only after preflight passes:

```bash
node packs/hauspilot/run-pilot.mjs deployments/<customer-slug>
```

Expected outputs include batch results, privacy proof, review inputs and pilot report artifacts.

### E. QA / escalation

Operations checks:

- runtime completed;
- unsafe executions = 0;
- all cases remain shadow-only;
- obvious unresolved/ambiguous property matches are routed to review;
- prompt-injection or bank-detail flags remain blocked from execution;
- report is based on measured/customer-reviewed values, not synthetic demo claims.

Escalate instead of improvising:

| Situation | Escalate to |
| --- | --- |
| privacy/preflight cannot pass | Founder/customer privacy contact |
| runtime/schema/API failure | Engineering |
| classification/property/urgency looks wrong | Human reviewer + engineering feedback |
| customer asks for production writes/autonomy | Founder |
| payment, bank detail, legal or contractor commitment | Human authority only |

## Reviewer handoff

Reviewer only needs to decide:

- `ACCEPT` — result is usable as-is;
- `EDIT` — useful but requires correction + error class;
- `REJECT` — wrong/unusable + error class.

Operations ensures review decisions are captured; Operations does not substitute its judgment for the customer's domain reviewer.

## Founder handoff

Founder receives only:

- scope/workflow;
- cases reviewed;
- accuracy / acceptance;
- unsafe executions;
- time before / after;
- monthly hours and € lever;
- error clusters;
- `KEEP / FIX / STOP` recommendation;
- next commercial step.

## Success condition for this role

A new Operations Assistant should be able to deliver a normal pilot without reading application code or editing JSON manually, except when explicitly using an advanced/debugging path.

## Interfaces

- `site/pilot-command-center.html` — role-based end-to-end walkthrough.
- `site/hauspilot-setup.html` — advanced pilot setup/config generation.
- `site/hauspilot-review.html` — full review queue.
- `site/hauspilot-results.html` — technical batch results.

## What the role does NOT own

- sales negotiation;
- legal advice or GDPR legal determination;
- changing safety policy to make a pilot pass;
- payments or bank-detail changes;
- contractor commitments;
- legal/tenancy decisions;
- production write access;
- promoting a workflow beyond shadow mode.
