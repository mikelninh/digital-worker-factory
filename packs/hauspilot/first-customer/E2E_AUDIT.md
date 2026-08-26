# HausPilot — Stakeholder End-to-End Audit

## Decision

**Ready for a human-operated first paid pilot after the live-model release gate passes.**

**Not yet self-service.** The visible `Starten` experience is a UX demo; an internal technical operator still starts the real runtime and handles the file handoffs.

## Canonical journey

`Zusage → SOW + €1,330 → 3 Inputs → Preflight → Test → Reviewer → Ergebnis → €570 → Weiter / Verbessern / Stoppen`

No stakeholder should need to understand the internal safety architecture unless that is their role.

## Stakeholder check

| Stakeholder | What they need to do | Current state | Readiness |
| --- | --- | --- | --- |
| Prospect / decision maker | Understand offer, price and risk boundary | Four-step sales page + simple one-pager | GO |
| Customer coordinator | Send examples, master-data list, reviewer | Canonical 3-input start | GO |
| Privacy / security owner | Approve personal-data path when needed | Detailed privacy page + fail-closed preflight | GO with customer-specific review |
| Finance / buyer | Approve SOW and pay 70/30 | Clear commercial sequence; payment still manual | GO, manual |
| Operations assistant | Know next action | STARTEN / ANFORDERN / WARTEN / STOPP contract + deterministic translator | GO for supervised V1 |
| Technical operator | Run real model workflow | `run-pilot.mjs`, privacy manifest, preflight, batch, report | GO after live gate |
| Domain reviewer | Judge prepared cases | One question: Richtig / Ändern / Falsch | GO |
| Customer / founder at handover | Understand outcome | Three answers + one recommendation; audit collapsed | GO |
| Ongoing operations | Repeat successful workflow | Same conceptual loop; automation remains supervised | GO conceptually, manual runner remains |
| Maintainer / engineer | Prevent UX/safety regressions | Runtime suites + stakeholder E2E CI guard | GO once PR CI passes |

## What is deliberately hidden from normal users

- JSON
- prompt configuration
- internal ACCEPT / EDIT / REJECT codes
- internal KEEP / FIX / STOP codes
- taxonomy IDs
- state-machine names
- risk scores
- model/API configuration

They remain available to engineering/audit where needed.

## Hard no-go conditions

Do not start a customer run when:

- the live-model release gate has not passed
- required data/privacy approvals are missing
- secrets are detected in the input pack
- personal/pseudonymised data is used without the required customer-specific gates
- the preflight is red

Do not claim:

- a live-model test passed without a logged live run
- demo metrics are customer results
- the workflow is fully automated/self-service today
- ZDR, EU-only or legal compliance without the exact customer configuration being verified

## Remaining manual V1 steps

1. SOW / invoice / payment collection
2. approved file-transfer handoff
3. internal technical runtime start
4. loading the result pack for reviewer
5. exporting reviewer decisions back into measurement/report
6. final €570 collection

These are acceptable for customer #1 because they stay on the provider side and do not make the customer's experience materially harder.

## Next productization threshold

After the first paid proof, automate only the repeated provider-side friction:

1. wire preflight + `next-action` to the Operations screen
2. wire `Starten` to the real runtime
3. persist reviewer decisions without JSON export/import
4. generate the customer report automatically
5. automate payment/file handoff only where it reduces real repeated work

Do not build deeper ERP writes or autonomous external actions before measured customer proof.
