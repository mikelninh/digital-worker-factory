# HausPilot connector contract

The worker templates must not know whether data came from Outlook, Gmail, CSV, SharePoint, a property ERP or a manual upload. Connectors normalize external systems into a small internal contract.

## Read contract

Every connector may expose one or more of:

```json
{
  "message": {"id":"...","from":"...","subject":"...","body":"...","received_at":"...","attachments":[]},
  "property": {"property_id":"...","address":"...","unit":"...","external_reference":"..."},
  "contact": {"contact_id":"...","name":"...","email":"...","property_id":"...","role":"..."},
  "vendor": {"vendor_id":"...","name":"...","trade":"...","external_reference":"..."},
  "document": {"document_id":"...","type":"...","text":"...","source":"..."}
}
```

## Proposed write contract

Workers do not write directly. They may only return proposals:

```json
{
  "proposal_id": "...",
  "action": "draft_reply | create_task | assign_case | accounting_note",
  "target": "...",
  "payload": {},
  "evidence_refs": [],
  "approval_state": "awaiting_human"
}
```

A separate executor checks policy and human approval before any write connector can execute.

## Connector levels

### L0 — files

- manual message/case upload
- CSV master data
- PDF/document upload

This is enough for historical replay and should be the default first-day pilot path.

### L1 — read-only live source

- Microsoft 365 / Google Workspace inbox read
- SharePoint / Drive folder read
- webhook/forwarding ingestion where authorised

No external writes.

### L2 — human-approved write

- create draft reply
- create internal task
- append internal note

Execution requires policy + explicit human approval.

### L3 — deep ERP actions

- property-management ERP/API actions
- accounting system actions
- contractor workflow actions

Only add these after the pilot proves ROI. Each write capability gets its own policy and eval cases.

## Design rule

Do not create `casaviRepairWorker`, `domusRepairWorker`, `outlookRepairWorker`, etc.

Create one `repair_intake` template and adapters:

```text
Outlook ─┐
Gmail   ─┼→ canonical message ─→ repair_intake
Upload  ─┘

CSV/ERP/SharePoint → canonical property/context
```

That separation is what makes the commercial model scalable.
