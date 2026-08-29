# OCN Design Partner Offers

The first sale is not “buy our trust platform.” It is a bounded experiment that answers a buyer-specific question with measurable evidence.

# Offer A — Agentic Payment Fraud Shadow

**Best for:** card/payment networks, banks, agent-payment infrastructure, marketplaces, procurement/AP systems.

## Buyer question

> Can we prove that every agent-initiated payment still matches the user/company's verified intent before money moves?

## OCN checks

- merchant/counterparty binding;
- beneficiary binding/change;
- exact amount/currency against approved intent;
- mandate/spend scope and expiry;
- explicit authority/human approval;
- duplicate/replay signal;
- post-action receipt where execution evidence is available.

## Pilot mode

Shadow only: OCN observes/proposes `allow | review | block`; it does not execute or stop real payments.

## Success evidence

- useful mismatch/catch rate;
- false-positive adjudication;
- false-negative red-team/golden-set result;
- p95 OCN latency;
- review time saved;
- exact action/intent reconstruction coverage;
- cost per 1,000 checks.

## Expansion

Shadow -> enforce beneficiary/amount/replay hard violations -> protect more payment agents/merchants -> per trusted-event usage.

# Offer B — Agent Action Authority Shadow

**Best for:** enterprise AI platforms, SaaS agent products, cloud/DevOps/security agents.

## Buyer question

> Which tool calls are genuinely authorized, and which are being allowed because the model has too much permission/autonomy?

## OCN checks

- actor/service identity reference;
- capability/action/scope grant;
- human approval requirement;
- evidence/freshness where relevant;
- idempotency/replay;
- post-action receipt.

## First deterministic enforcement candidates

- no matching grant;
- wrong tenant/scope;
- missing required approval;
- replayed execution key;
- action outside explicit allowed tool function.

# Offer C — Government Decision Assurance Shadow

**Best for:** Agentic AI Hub startups, municipalities, DigitalService/BMDS, govdigital/public IT providers.

## Buyer question

> Can an official quickly see which evidence/rule/authority supports an agent recommendation — and when the agent should ask for review instead?

## OCN checks

- evidence coverage/provenance;
- rule/source freshness;
- bounded policy/authority references;
- human-decision boundary;
- recommendation/output evaluation where Judge is connected;
- receipt and traceability.

## Golden starting workflows

- housing/benefit/application preflight;
- document validation;
- inbox/case triage;
- decision evidence packet;
- procurement/compliance workflow.

## Success evidence

- review minutes per case;
- stale/missing evidence caught;
- human override rate;
- unsupported recommendation rate;
- false-block/false-allow adjudication;
- audit packet completeness;
- integration time.

# Offer D — Procurement / Accounts Payable Guard

**Best for:** ERP/AP/procurement platforms and finance teams.

## Buyer question

> Can we stop the agent from paying the wrong supplier, wrong bank account, wrong amount or an invoice outside its purchasing authority?

## OCN stack

`entity.resolve` -> invoice/evidence -> freshness -> `authority.check` -> `payment.intent.preflight` -> approval -> execution receipt.

This may be the best enterprise wedge because it combines direct fraud prevention with labor savings and audit evidence.

# Commercial package

## Fast design partner

- one workflow;
- synthetic + production-adjacent data where necessary;
- Shadow Mode only;
- fixed success criteria;
- Trust Gap Report;
- integration/security notes;
- joint go/no-go review.

**Pricing hypothesis:** EUR 5k–15k.

## Institutional / government pilot

- one bounded real workflow;
- data/authority/deployment boundaries;
- golden/adversarial evaluation set;
- Shadow Mode telemetry;
- evidence report;
- procurement/security/sovereignty package;
- defined path to deterministic enforcement.

**Pricing hypothesis:** EUR 25k–50k.

Pricing is unvalidated until buyer conversations. Pilot fee may be credited toward annual deployment.

# The close

The buyer should not need to believe our pitch.

> Give OCN one existing agent workflow in Shadow Mode. If we cannot find useful assurance gaps, reduce review effort, or materially improve reconstruction/audit evidence, do not expand. If we can, turn on only the deterministic gates you agree with and reuse them across more agents.
