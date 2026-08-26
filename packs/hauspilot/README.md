# HausPilot reusable pilot pack

Goal: make a new customer pilot mostly configuration, not bespoke engineering.

## Customer experience

```text
Start Pilot
  ↓
Choose workflow template
  ↓
Connect inbox OR upload historical cases
  ↓
Upload object master CSV
  ↓
Run in SHADOW mode
  ↓
Measure accuracy + time saved
  ↓
KEEP AS COPILOT / STOP
```

The important distinction: **one-click onboarding does not mean universal one-click access to every property-management ERP.** The fast path deliberately starts with interfaces almost every customer can provide: messages/files + CSV exports. Deeper API connectors are only built after the pilot proves value.

## Templates available now

1. `repair_intake` — repair / defect message → resolved object context → urgency + missing fields → prepared case + reply/task proposal.
2. `tenant_inbox` — inbound email → classification + routing + context → reply/task proposal.
3. `invoice_review` — invoice → extraction + object/vendor resolution + checks → review note + next-step proposal.

All templates ship with explicit required evidence, approval boundaries, `never_auto` actions and eval names.

## Fastest integration tiers

### Tier 0 — historical test (same day)

No production integration.

Customer provides 20–50 anonymised or authorised historical cases plus a minimal object master CSV. We replay the workflow and compare HausPilot proposals with the historical human outcome.

Use this for the first proof because it removes OAuth, mailbox permissions and production-risk discussions from day one.

### Tier 1 — live shadow inbox

Read-only ingestion of new messages. HausPilot creates a shadow proposal, but sends/writes nothing. Operators compare the proposal with their actual action.

Preferred production connector: customer-authorised Microsoft 365 / Google Workspace OAuth. A forwarding/webhook adapter can be supported where appropriate, but should not be the only production path.

### Tier 2 — copilot

The prepared draft/task appears in the operator workflow. Human must approve consequential external actions.

### Tier 3 — deeper system connector

Only after ROI is proven: property-management ERP, ticketing, accounting or contractor systems through available APIs/export-import interfaces.

## Minimal client data contract

### `properties.csv`

Required columns:

```csv
property_id,address,unit,external_reference
OBJ-001,Weserstr. 18 Berlin,VH-3-02,ERP-9182
```

### `contacts.csv`

```csv
contact_id,name,email,property_id,unit,role
C-001,Max Mustermann,max@example.test,OBJ-001,VH-3-02,tenant
```

### optional `contractors.csv`

```csv
contractor_id,name,trade,service_area,email
V-001,Heiztechnik Beispiel,heating,Berlin,dispatch@example.test
```

The pilot can begin with less. Missing context is surfaced as missing evidence rather than guessed.

## Client configuration

Copy `client.example.json`, change company/template/sources/policy, then compile:

```bash
node packs/hauspilot/compile.mjs path/to/client.json
```

This creates a tenant-specific deployment pack under `deployments/`.

## Default deployment policy

Every new pilot starts in `shadow` mode.

Promotion is:

```text
SHADOW → COPILOT → LIMITED AUTO (only explicitly safe actions)
```

For the initial commercial offer we only promise SHADOW + COPILOT. Payments, legal commitments, contractor orders, bank-detail changes and similar consequential actions remain blocked or human-approved.

## What is reusable vs customer-specific

Reusable:

- workflow state machine
- extraction/classification prompts
- output schema
- evidence contract
- approval gates
- audit events
- eval harness
- baseline/ROI measurement
- onboarding UX

Customer-specific configuration:

- field mapping
- property/contact/vendor data
- mailbox/folder connection
- routing labels
- escalation contacts
- business-specific rules
- response tone/template

The target is roughly **80–90% reusable, 10–20% mapping/configuration** for common workflows. A genuinely unusual workflow can require more.

## Definition of "ready after closing"

A pilot is operationally ready when we can do this without writing a new agent:

1. duplicate client config;
2. select one existing template;
3. map 1–4 data sources;
4. load 20 historical cases;
5. run eval + shadow replay;
6. show the baseline and error report;
7. only then connect live read-only ingestion.

That is the productisation target.
