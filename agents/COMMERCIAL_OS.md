# CommercialOS — Revenue Execution Layer

CommercialOS is the reusable bridge between RevenueOS and paid customer delivery.

RevenueOS answers: **what is the best opportunity and next move?**

CommercialOS answers: **how does that opportunity safely become a paid, delivered and recurring customer?**

## End-to-end path

```text
RevenueOS qualified opportunity
  ↓
product mapping
  ↓
commercial lead
  ↓
qualification
  ↓
prepare personalised outreach
  ↓
HUMAN APPROVAL → external send adapter
  ↓
discovery
  ↓
proposal preparation
  ↓
HUMAN PRICE APPROVAL
  ↓
HUMAN APPROVAL → proposal send
  ↓
HUMAN APPROVAL → payment request adapter
  ↓
verified payment event
  ↓
automatic customer workspace
  ↓
delivery pack / governed worker
  ↓
measured outcome + proof
  ↓
renewal / recurring offer
  ↓
HUMAN APPROVAL → renewal send
  ↓
recurring payment + expansion
```

## What is already automated

- RevenueOS-to-product handoff
- product catalogue lookup
- commercial lifecycle state machine
- fixed-price enforcement where a real approved catalogue price exists
- manual-quote enforcement where no price exists
- approval queue semantics
- outbound command preparation
- payment-request command preparation
- idempotency keys for external adapters
- payment evidence validation
- payment-threshold gate before onboarding
- durable commercial ledger
- paid-customer workspace generation
- proof/value recording
- recurring revenue and expansion state
- portfolio cash / MRR / customer-value / founder-hour reporting

## Live adapters still required

The control plane deliberately refuses to pretend these providers exist when they are not configured:

1. **Outbound** — Gmail/CRM/other approved sender implementing `adapter.send(command)`.
2. **Payments** — Stripe/invoice/bank-flow provider implementing `adapter.createRequest(command)` and verified payment-event ingestion.
3. **CRM** — optional durable account/contact/conversation sync; CommercialOS ledger can operate without it initially.
4. **Delivery handoff** — product-specific adapter where a pack needs more than the generated customer workspace.

Provider credentials, secrets and customer data must never be committed to the repository.

## Sellable product catalogue

`commercial/products.json` is the source of truth.

- HausPilot 7-day sprint: fixed €1,900 net, 70% kickoff / 30% handover.
- HausPilot managed operations: manual quote after proof.
- Opportunity Radar: beta, manual quote.
- PruefPilot: pilot, manual quote.
- GitLaw governed workflow: pilot, manual quote and sensitive-domain controls.
- OpenProof integration: pilot, manual quote.

Unknown prices stay unknown until a human approves them.

## Operator commands

```bash
node scripts/commercial-os.mjs lead .commercial/ledger.json hauspilot-sprint deal-1 "Example GmbH" --evidence '[{"source":"...","fact":"..."}]'
node scripts/commercial-os.mjs queue .commercial/ledger.json
node scripts/commercial-os.mjs act .commercial/ledger.json deal-1 qualify --outcome '{"qualified":true}'
node scripts/commercial-os.mjs act .commercial/ledger.json deal-1 external_message --approve-by Michael
node scripts/commercial-os.mjs onboard .commercial/ledger.json deal-1 customers
node scripts/commercial-os.mjs report .commercial/ledger.json
```

## Production rule

No external adapter may execute from a model-generated intention alone. It must receive an approved CommercialOS command with an explicit authority record and idempotency key.

No customer counts as paid until verified payment evidence is recorded. No estimate counts as customer value until a measured outcome is recorded.
