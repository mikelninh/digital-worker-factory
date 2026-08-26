# HausPilot Runtime V1

**Goal:** turn a signed Hausverwaltung pilot into a repeatable `config → shadow replay → review → keep/fix/stop` delivery flow without rebuilding an agent per customer.

## V1 contract

HausPilot V1 is deliberately **shadow-only**:

- AI may classify, retrieve supplied context, identify missing information and prepare a next action.
- The model receives no execution tools.
- The deterministic policy layer always sets `execution_allowed: false`.
- External replies, contractor orders, payments, legal commitments and other consequential actions never execute.
- Pilot data should be synthetic, anonymised or otherwise authorised. Production personal data requires the appropriate customer/privacy setup.

## Reusable templates

1. `repair_intake` — repair / defect reports
2. `tenant_inbox` — tenant & owner inbox triage
3. `invoice_review` — invoice review preparation

A customer changes configuration and data sources, not worker code.

## Fastest post-sale path

```text
customer says yes
  ↓
choose one template
  ↓
20–50 historic cases + basic master-data export
  ↓
compile client config
  ↓
run shadow batch
  ↓
inspect results + failures
  ↓
KEEP / FIX / STOP
```

No live mailbox access is required for the first proof.

## Commands

Compile a tenant deployment pack:

```bash
node packs/hauspilot/compile.mjs packs/hauspilot/client.example.json
```

Run deterministic safety checks (no API key needed):

```bash
node packs/hauspilot/runtime/eval.mjs
```

Run the synthetic shadow replay after `OPENAI_API_KEY` is configured in the environment:

```bash
node packs/hauspilot/runtime/batch.mjs \
  packs/hauspilot/sample-cases.json \
  packs/hauspilot/client.example.json \
  hauspilot-batch-results.json
```

Optional model override:

```text
OPENAI_MODEL=gpt-5.6-luna
```

The runtime uses the OpenAI Responses API with strict JSON Schema output and sends `store: false` in the request. The API key is read only from `OPENAI_API_KEY`; secrets do not belong in repository files.

## Review UI

Open `site/hauspilot-results.html` and load `hauspilot-batch-results.json`. The page also contains a clearly labelled synthetic demo for previewing the UI without API calls.

## What becomes one-click later

The canonical workflow stays unchanged. Connector adapters only map external systems to the case/context contract:

```text
Outlook / Gmail / Upload → canonical message ┐
CSV / ERP                → canonical context ├→ template → shadow runtime → human review
Docs / SharePoint        → canonical evidence┘
```

After a replay pilot proves value, the next adapter is Microsoft 365 read-only shadow ingestion. Deep ERP writes are intentionally not part of V1.

## Pilot success metrics

- classification / routing accuracy
- property resolution accuracy
- missing-information detection
- proposal acceptance / edit rate
- unsafe executions (**must remain 0**)
- minutes per case before / after
- projected monthly hours and € value saved

The first real customer case study replaces modelled assumptions only after these metrics are measured on authorised customer cases.
