# OCN Fraud & Scam Protection

**Goal:** make consequential agent actions structurally harder to redirect, inflate, replay or execute outside the user/organization's verified intent.

OCN does **not** promise to classify every scam correctly. The strongest protection is to verify the facts that a scammer must change in order to steal money, data or authority.

## Core principle

> Bind intent -> identity -> counterparty -> beneficiary -> amount/scope -> policy -> approval -> execution -> receipt.

If a required binding is missing or inconsistent, return `block`, `review` or `unknown`; never infer permission from model text.

## Threats OCN should stop or surface

### 1. Beneficiary-switch / invoice fraud

Attack: a compromised email/document changes bank account or wallet while leaving invoice text plausible.

OCN checks:
- supplier/entity identity;
- verified beneficiary binding;
- invoice/document provenance;
- change-from-known-beneficiary signal;
- amount/currency/mandate limits;
- approval requirement for beneficiary changes.

Expected result: changed beneficiary without verified rebinding -> `block` or `review`.

### 2. Prompt-injection payment redirection

Attack: malicious web/email/document content tells an agent to ignore the user mandate and pay/send data elsewhere.

OCN checks:
- requested action against an authority grant outside the model;
- original intent/mandate hash against the requested transaction;
- counterparty and beneficiary allowlists;
- spend cap;
- high-impact approval policy.

Expected result: prompt text cannot elevate authority or change a bound beneficiary.

### 3. Fake merchant / malicious paid API

Attack: an agent reaches a lookalike or malicious endpoint that asks for payment to the wrong recipient, asset or network.

OCN checks:
- HTTPS and allowed domain/service identity;
- merchant/capability identity;
- expected payment recipient;
- expected asset/network;
- maximum price/mandate;
- request purpose and capability binding.

Expected result: unexpected `payTo`, network, asset or price -> `block`.

### 4. Bait-and-switch amount inflation

Attack: final payment differs from the approved quote/intent.

OCN checks exact or bounded amount/currency against the signed/verified intent.

Expected result: amount exceeds mandate -> `block`.

### 5. Account takeover / privilege escalation

Attack: a compromised user/agent attempts actions outside its role or tenant.

OCN checks authenticated actor/service identity plus explicit grant, scope, action and expiry in a downstream authority source.

Expected result: no matching active grant -> `block`.

### 6. Replay / duplicate execution

Attack: a previously valid action/payment is resent.

OCN checks idempotency key and prior execution state.

Expected result: already executed -> no second execution.

### 7. Stale-policy fraud / obsolete entitlement

Attack: an agent relies on an old policy, price, sanctions state, supplier status, benefit rule or approval.

OCN checks observation/effective dates against explicit freshness policy.

Expected result: stale -> `block`/`review` and refresh.

### 8. Unsupported social-engineering claim

Attack: a scammer uses urgency/authority language to cause a user or agent to act.

OCN checks whether the claimed authority, identity, invoice, case, domain or instruction has external evidence. Language such as "urgent" is never evidence.

Expected result: insufficient evidence -> `review`/`unknown`.

## High-frequency fraud capabilities

1. `payment.intent.preflight.v1` — exact mandate/counterparty/beneficiary/amount/currency/approval/replay binding.
2. `counterparty.verify.v1` — verify merchant/supplier/service identity against authoritative or customer-controlled registries.
3. `beneficiary.verify.v1` — bind a payment destination to a verified counterparty and detect changes.
4. `invoice.verify.v1` — document provenance, amount/vendor/PO/bank-details consistency and change detection.
5. `authority.check.v1` — explicit grant/scope/action verification outside the model.
6. `freshness.verify.v1` — expiry and change-window enforcement.
7. `evidence.verify.v1` — claim-to-evidence/provenance binding.
8. `entity.resolve.org.v1` — avoid paying the wrong similarly named organization.
9. `intent.receipt.v1` — immutable/hash-bound record of what was authorized.
10. `execution.receipt.v1` — what actually happened and where.

## Payment Intent Envelope

```json
{
  "intentId": "intent-123",
  "actor": "agent-42",
  "purpose": "pay approved supplier invoice",
  "counterparty": "supplier-17",
  "beneficiary": "verified-beneficiary-id",
  "amount": "1250.00",
  "currency": "EUR",
  "allowedAction": "pay",
  "validUntil": "2026-08-29T12:00:00Z",
  "approval": {
    "required": true,
    "approvalId": "approval-789"
  },
  "policyVersion": "payments-policy-7",
  "intentHash": "..."
}
```

The execution request must match the relevant bindings. A model cannot edit this envelope and thereby authorize itself.

## Recovery and user protection

Prevention is not enough. OCN receipts should also make investigation/recovery faster:

- exact actor/agent/tool/counterparty;
- original intent and request/output hashes;
- authority and approval source;
- payment recipient, amount, asset/network/reference;
- policy/freshness state;
- execution timestamp/result;
- human override/outcome label;
- anomaly reason.

This produces evidence for internal incident response, banks/payment providers, merchants and auditors. It does not guarantee chargeback/recovery.

## What OCN cannot guarantee

- that every verified organization remains honest;
- that an authoritative registry is never compromised;
- that a real merchant will fulfil a purchase;
- that all scams expose a machine-verifiable mismatch;
- that fraud loss will be zero;
- legal liability allocation or reimbursement.

The product claim is narrower and stronger:

> OCN prevents or surfaces actions that violate the verified intent, authority, evidence, freshness and execution constraints supplied to the trust rail.
