# HausPilot First Customer Playbook

**One paid pilot, one workflow, shadow-only, measurable proof.**

# Runbook

This is the operational source of truth for the first paid €1,900 AI Operations Sprint.

## Commercial boundary

- One workflow only.
- Seven calendar days target delivery window after usable pilot data is received.
- €1,900 net pilot price.
- 70% (€1,330) due before kickoff; 30% (€570) at handover.
- V1 is shadow-only. It prepares work; it does not execute external or consequential actions.
- Deep ERP integration, autonomous sending, payments and production write-access are out of scope.

## Fastest safe customer path

### Gate 0 — Signed + paid
Before technical work:
1. Scope/SOW accepted.
2. Deposit received.
3. Named customer operator and named HausPilot operator.
4. One workflow selected: `repair_intake`, `tenant_inbox`, or `invoice_review`.

### Gate 1 — Create pilot workspace

```bash
node packs/hauspilot/new-pilot.mjs \
  --id CUSTOMER-SLUG \
  --company "Customer GmbH" \
  --template repair_intake
```

The generated workspace lives under `deployments/` and is git-ignored.

### Gate 2 — Customer data pack
Collect:
- 20–50 completed historical cases.
- Basic property master data (`property_id,address,unit`).
- Contractor/vendor data only if needed by the chosen workflow.
- The customer's known/actual handling outcome when available for later operator comparison.
- Baseline handling time from sample, estimate or time study.

Prefer synthetic or genuinely anonymised data for the first technical proof. If personal data is used, stop until the privacy/processor gate is completed.

### Gate 3 — Operational approvals
Complete `pilot-approval.json`.

Required true:
- `scope_confirmed`
- `data_authorised`
- `shadow_only_confirmed`
- `operator_named`
- `retention_confirmed`

For authorised personal data also require:
- `privacy_review_confirmed`
- `processor_terms_reviewed`

### Gate 4 — Preflight

```bash
node packs/hauspilot/runtime/preflight.mjs deployments/CUSTOMER-SLUG
```

**Must be green before any model call.**

### Gate 5 — Runtime secret
Configure `OPENAI_API_KEY` in the execution environment, never in source files.

For personal-data production work, separately verify that the selected OpenAI project/data controls match the customer's privacy requirements. `store:false` is a request-level control, not a substitute for a DPA, role analysis, or region/retention decision.

### Gate 6 — Run pilot

```bash
node packs/hauspilot/run-pilot.mjs deployments/CUSTOMER-SLUG
```

This executes:
1. preflight
2. client config compile
3. 20–50 case shadow batch
4. technical report

### Gate 7 — Human review
A human reviews every pilot case and records:
- accept without edit
- accept after edit
- reject
- failure class
- minutes to handle with HausPilot

Update `measurement.json`, then regenerate the report:

```bash
node packs/hauspilot/runtime/report.mjs \
  deployments/CUSTOMER-SLUG/batch-results.local.json \
  deployments/CUSTOMER-SLUG/measurement.json \
  deployments/CUSTOMER-SLUG/pilot-report.local.html
```

### Gate 8 — KEEP / FIX / STOP
**STOP** if:
- any unsafe execution occurs
- runtime errors are unresolved
- high-risk failure is discovered

**FIX** if:
- quality is below the agreed threshold
- property matching/routing is unreliable
- operator rejection/edit rate is too high

**KEEP** only if:
- unsafe executions = 0
- agreed quality threshold passes
- operators find the preparation useful
- measured handling time improves

## Day-by-day default

**Day 0** — scope, payment, data pack request  
**Day 1** — preflight + baseline + 10-case dry run  
**Day 2** — fix taxonomy/context mapping  
**Day 3** — 20–50 case full replay  
**Day 4** — human review + failure clustering  
**Day 5** — one controlled iteration + replay  
**Day 6** — final measurement  
**Day 7** — report + KEEP/FIX/STOP + handover

## Definition of first-customer ready

We can truthfully say "ready" when:
- CI is green.
- preflight demo is green.
- runtime contract tests are green.
- adversarial policy suite has 0 unsafe executions.
- a live synthetic OpenAI batch passes the release gate.
- customer-specific data/privacy approvals are complete before customer data is processed.

The final two bullets cannot be faked: the live model test needs a real runtime key, and customer privacy/data authority needs the actual customer.

---

# Scope of Work Template

> Operational template, not legal advice. Adapt to the actual customer and have contract/privacy terms reviewed where needed.

## Parties
**Provider:** Michael Ninh / [legal business entity]  
**Customer:** [Customer legal name]  
**Pilot owner:** [name]  
**Customer operator:** [name]

## Objective
Test whether HausPilot can reduce manual handling time for **one recurring property-management workflow** while keeping consequential decisions with the customer's team.

## Selected workflow
Choose exactly one:
- [ ] Repair / defect intake
- [ ] Tenant / owner inbox triage
- [ ] Invoice review preparation

## Deliverables
1. workflow map and baseline
2. configured HausPilot shadow template
3. 20–50 historical-case replay
4. human-review queue/results
5. failure analysis
6. before/after measurement
7. final KEEP / FIX / STOP recommendation
8. handover of configuration/report

## Safety boundary
The pilot is **shadow-only**:
- no autonomous external email
- no contractor order
- no appointment commitment
- no payment/payment release
- no legal commitment
- no production write-access
- every model result is human-reviewed

## Customer inputs
Customer supplies:
- 20–50 authorised historical cases
- required master data/exports
- one operator for review
- baseline handling-time information
- confirmation that supplied data may be used for the agreed pilot purpose

## Data boundary
Pilot should begin with synthetic or genuinely anonymised data where practical. If personal data is processed, parties must first establish the applicable privacy roles, processing terms, access/retention controls and any required DPA/AVV.

## Timeline
Target: 7 calendar days from receipt of usable inputs and completion of required approvals.

## Price
**€1,900 net**, plus applicable taxes where required.

Payment schedule:
- **€1,330 (70%)** before kickoff
- **€570 (30%)** at handover

Third-party/API usage above an agreed pilot allowance: [included / capped / billed separately].

## Success criteria
Set at kickoff:
- unsafe executions: **0**
- minimum [classification/routing] accuracy: ____%
- minimum property-resolution accuracy: ____%
- operator acceptance target: ____%
- target handling-time reduction: ____%

Success is measured on the agreed pilot sample. No workforce reduction, cost saving or production outcome is guaranteed.

## Out of scope
- migration of the customer's core property-management system
- unrestricted agent autonomy
- production write integration
- custom mobile app
- broad data cleansing
- legal/accounting decisions
- more than one workflow unless added in writing

## Acceptance
Customer accepts the handover when the agreed report, results and configuration are delivered and the handover session is completed.

---

# Kickoff Email

**Subject:** HausPilot Pilot — 4 Dinge für den Start

Hallo [Name],

super — für den HausPilot-Pilot brauchen wir zum Start nur vier Dinge:

1. **einen Workflow**: [Reparaturmeldungen / Postfach / Rechnungen]  
2. **20–50 abgeschlossene Fälle** aus diesem Workflow  
3. eine kleine **Objektliste als CSV/Excel** (Objekt-ID, Adresse, Einheit)  
4. eine Person aus Ihrem Team, die die Ergebnisse später kurz mit uns bewertet

Für den ersten Test brauchen wir **keinen Schreibzugriff auf Ihr System und keinen Live-Postfachzugang**. HausPilot läuft zunächst nur im Shadow-Modus: Es bereitet vor, führt aber nichts extern aus.

Am besten verwenden wir für den technischen Proof synthetische oder wirklich anonymisierte Fälle. Wenn personenbezogene Daten nötig sind, klären wir vorher gemeinsam die Datenschutz-/Verarbeitungsfreigabe.

Sobald das Datenpaket da ist, messen wir denselben Workflow vorher/nachher und zeigen am Ende transparent: **KEEP, FIX oder STOP**.

Viele Grüße  
Michael

---

# Operator Review

For every replayed case, the human reviewer records exactly one outcome:

- **ACCEPT** — proposal usable without material edit
- **EDIT** — useful, but material edit required
- **REJECT** — not useful / wrong / unsafe

Also tag one primary failure class when EDIT or REJECT:
- wrong classification
- wrong property match
- missing evidence
- invented fact
- missed missing information
- wrong urgency
- poor draft
- policy concern
- other

## Review rules

1. Do not reward confident wording.
2. Check evidence before conclusion.
3. Any invented date, price, person, legal conclusion or completed action is a failure.
4. Any unsafe execution would be an immediate STOP condition.
5. Track time spent reviewing the HausPilot-prepared case.
6. Do not change the gold/expected label after seeing the model answer unless the original label was genuinely wrong; record that correction separately.

## Minimal acceptance threshold for first pilot

A sensible starting release gate:
- 0 unsafe executions
- ≥90% agreed gold checks
- ≥80% operator ACCEPT + EDIT
- measurable handling-time reduction

These thresholds are pilot defaults, not universal production guarantees.

---

# Security & Privacy

This is an operational gate, not legal advice.

## V1 design controls already enforced

- Shadow-only lifecycle.
- Model receives no action tools.
- Deterministic runtime sets `execution_allowed=false`.
- Human review required for every result.
- Repository ignores `.env*`, deployment packs and local result files.
- OpenAI request uses strict structured output and `store:false`.
- Evaluation labels (`gold`) and operator-review fields are stripped before model input.
- Prompt/document content is explicitly treated as untrusted data.

## Before synthetic/anonymised pilot data

Confirm:
- [ ] scope is documented
- [ ] retention period is documented
- [ ] named operator exists
- [ ] customer has authorised the provided data
- [ ] dataset contains no secrets/credentials
- [ ] preflight is green

## Before personal data

Do **not** treat `store:false` as a complete GDPR solution.

Confirm with the customer/privacy owner:
- [ ] controller/processor roles are determined
- [ ] legal basis/purpose is documented by the responsible party
- [ ] if HausPilot acts as processor, appropriate Article 28 processing terms / AVV are in place
- [ ] OpenAI/subprocessor terms are reviewed
- [ ] retention/deletion process is agreed
- [ ] access is least-privilege and named
- [ ] data minimisation is applied
- [ ] incident/contact process is known
- [ ] regional/data-residency requirements are checked for the exact OpenAI project before use

## OpenAI project note

OpenAI documents data-residency and retention controls for eligible API customers. Region/data-residency choices may depend on the project and eligibility. For a customer that requires European processing/residency, verify the exact project configuration **before** sending customer personal data.

Official references:
- OpenAI business data controls: https://openai.com/business-data/
- OpenAI API data residency information: https://help.openai.com/en/articles/10503543-data-residency-for-the-openai-api
- GDPR official text: https://eur-lex.europa.eu/eli/reg/2016/679/oj

## Deletion / closeout

At handover or agreed retention expiry:
1. delete local pilot inputs/results not required to retain
2. confirm any customer copy/handover
3. revoke temporary access
4. record deletion date
5. keep only aggregated/non-personal proof metrics when contractually permitted

---

# Handover

## Customer receives
- [ ] workflow map / selected template
- [ ] pilot configuration (without secrets)
- [ ] case-level result report
- [ ] failure summary
- [ ] before/after handling-time measurement
- [ ] estimated monthly time/€ lever based on customer inputs
- [ ] KEEP / FIX / STOP recommendation
- [ ] list of unresolved risks
- [ ] retention/deletion confirmation or next deletion date

## If STOP
Explain the concrete failure mode. Do not sell around it.

## If FIX
Agree one narrow remediation and one replay. Do not expand scope.

## If KEEP
Offer the next lowest-risk step:
1. continue file-based copilot, or
2. read-only Microsoft 365 shadow ingestion

Do **not** jump directly to autonomous execution or ERP writes.

## Case-study rule
No public "customer result" unless the customer approves the wording and the metric was actually measured. Until then, use "illustrative scenario" or aggregated/anonymised proof as contractually permitted.

---

# Release Gate

## Product
- [ ] 3 templates present and safety-checked
- [ ] classification taxonomy defined
- [ ] shadow runtime uses strict schema
- [ ] no model tools configured
- [ ] policy forces `execution_allowed=false`
- [ ] prompt-injection content treated as untrusted data

## Automated tests
- [ ] Factory 50-case suite green
- [ ] HausPilot template/policy suite green
- [ ] Runtime contract tests green
- [ ] 30-scenario adversarial policy suite green
- [ ] 20-case demo preflight green
- [ ] report generation green

## Live model gate
- [ ] dedicated HausPilot API key configured outside repo
- [ ] live 20-case synthetic replay completed
- [ ] live replay errors = 0
- [ ] unsafe executions = 0
- [ ] agreed quality threshold reached
- [ ] prompt-injection cases remain shadow-only

## First customer
- [ ] SOW accepted
- [ ] €1,330 deposit received
- [ ] one workflow selected
- [ ] 20–50 cases received
- [ ] data authority confirmed
- [ ] privacy/processor gate complete if personal data
- [ ] named operator
- [ ] preflight green
- [ ] customer replay complete
- [ ] human review complete
- [ ] final report issued
- [ ] €570 handover balance collected
- [ ] retention/deletion action recorded

**No-go means no-go.** Missing live-model or customer-data gates must not be disguised as "basically production ready".
