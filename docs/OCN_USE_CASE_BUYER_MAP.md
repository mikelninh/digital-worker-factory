# OCN Use-Case & Buyer Map

**Decision rule:** prioritize workflows where agents are already useful, mistakes are costly, assurance can be checked cheaply/often, and one integration can protect many actions.

## Tier 1 — highest-frequency / strongest willingness to pay

| Use case | Trusted events | Why buyer pays | Primary buyers |
|---|---|---|---|
| Agentic payment preflight | intent, authority, counterparty, beneficiary, amount, replay | direct fraud/loss prevention | card networks, banks, wallets, agent-payment infrastructure, marketplaces |
| B2B invoice & supplier payment guard | entity, invoice, beneficiary, PO, authority | business-email-compromise / invoice fraud | ERP/AP platforms, enterprises, banks, procurement platforms |
| Agent tool/action preflight | authority, policy, evidence, human gate | prevents excessive agency / prompt-injection damage | agent platforms, enterprise AI teams, SaaS vendors |
| Post-action receipt / audit | execution, authority, evidence, payment | incident reconstruction / audit | regulated enterprises, government, agent platforms |
| Evidence + citation verification | evidence, provenance, freshness | reduces unsupported decisions / hallucination risk | research agents, legal/compliance, government, finance |
| Policy/rule freshness | freshness, policy version/effective date | outdated rules create direct operational/legal errors | government, legal, insurance, banking, healthcare |
| Counterparty / organization resolution | entity, domain, registration, beneficiary | wrong vendor/merchant/entity causes fraud and data mistakes | payments, procurement, KYB, marketplaces, public administration |

## Tier 2 — institutional workflow wedges

| Workflow | Failure OCN can expose | Best buyer |
|---|---|---|
| Government application preflight | missing/stale/contradictory evidence | municipalities, public IT providers |
| Government decision evidence packet | unsupported recommendation, wrong/current rule | public IT providers, ministries/agencies |
| Procurement agent | unauthorized supplier/order, stale framework, price/beneficiary mismatch | government procurement, enterprise procurement |
| Grant/subsidy administration | missing eligibility evidence / wrong version | ministries, funding agencies, public IT |
| Claims agent | evidence gaps, authority, unsupported payout/action | insurers |
| Banking operations agent | account/payment action outside mandate | banks/fintechs |
| KYC/KYB onboarding | entity mismatch, stale/insufficient verification | fintech, banks, marketplaces |
| Customer-support action agent | unauthorized refund, account change, data disclosure | SaaS/ecommerce/telco |
| Travel-booking agent | merchant/price/beneficiary/intent mismatch | travel platforms, card/payment networks |
| Marketplace buying agent | fake merchant, counterfeit/identity mismatch, price drift | marketplaces/commerce platforms |
| ERP/AP agent | invoice/PO/vendor/bank-detail mismatch | ERP/AP vendors, large enterprises |
| Legal filing/research agent | wrong source/version, unsupported conclusion, authority | legal tech, law firms, public legal bodies |
| Healthcare operations agent | insufficient evidence / missing human authority for consequential step | hospitals, health IT, insurers |
| HR/payroll agent | unauthorized salary/account/employee-data changes | HRIS/payroll platforms |
| Cloud/DevOps agent | destructive command outside approved change | cloud platforms, DevOps/security teams |
| Security-response agent | excessive privileges, wrong target, insufficient approval | SOC/SIEM/SOAR vendors |
| Email/comms agent | prompt-injected send/exfiltration | enterprise productivity/agent vendors |
| Finance close/accounting agent | unsupported journal/payment/reconciliation | accounting/ERP/finance teams |
| Ad-spend agent | spend/merchant/campaign outside mandate | adtech, brands, agencies |
| Data-access agent | purpose/scope/permission mismatch | data platforms, regulated enterprises |
| Credential issuance/revocation | actor/authority/policy mismatch | identity providers, government, enterprises |

## Tier 3 — large-scale public/critical infrastructure

- benefits/entitlements preflight and evidence packets;
- building/permit workflows;
- tax case support;
- public-money disbursement and grant controls;
- licensing and registration;
- sanctions/embargo/current-rule verification;
- utilities customer/account operations;
- transportation/logistics operations;
- energy/critical-infrastructure agent actions;
- sovereign/public-sector agent platform assurance.

These should begin in Shadow Mode and keep final authority in existing systems/humans.

# Current named buyer targets / market signals

These are targets because they are publicly active in agentic systems or agentic payments, **not claims that they have agreed to buy OCN**.

## A. Agentic payments / commerce — fastest proof of fraud value

### Mastercard / Agent Pay ecosystem

Why now: Mastercard is actively running authenticated agentic transactions and explicitly frames verifiable intent, consumer permission and traceability as foundations of trusted agentic commerce. German participants have included Deutsche Bank, DZ Bank and N26.

OCN wedge: independent `payment.intent.preflight` / beneficiary/counterparty proof + interoperable receipt before/alongside network payment controls.

### Deutsche Bank / DZ Bank / N26

Why now: participated in Germany's first live authenticated Mastercard agentic transaction.

OCN wedge: Shadow Mode over an agent-payment flow; prove whether every payment stays bound to original user mandate, merchant, beneficiary and limits.

### Visa / agentic commerce ecosystem

Why now: building secure agentic-commerce capabilities and credentials/security infrastructure.

OCN wedge: neutral assurance envelope across agents, merchants and non-card/x402 actions; post-action evidence and intent-policy checks.

### AWS Bedrock AgentCore Payments

Why now: AgentCore Payments reached GA in August 2026, with x402/MPP, wallets, budgets and observability.

OCN wedge: AgentCore knows the wallet/payment budget; OCN supplies semantic checks the wallet cannot know alone — *is this merchant/beneficiary/action actually inside the verified intent and business policy?*

### Stripe

Why now: actively launching agentic-commerce tooling in Germany and works with a large base of German businesses.

OCN wedge: assurance middleware for merchants/agent developers; invoice/counterparty/intent proof and independent receipts.

### Cloudflare

Why now: Monetization Gateway and paid MCP/x402 tools put high-volume machine transactions at the edge.

OCN wedge: OCN as a paid semantic trust service behind/alongside edge payment enforcement; Cloudflare handles transport/payment scale, OCN handles intent/authority/evidence semantics.

## B. German government / public IT — strongest reference + distribution

### BMDS / DigitalService Agentic AI Hub

Why now: 20 municipal pilots have already tested agents for applications/documents/decision support; the second implementation phase starts September 2026 and scaling/reuse is an explicit goal.

OCN wedge: Shadow Mode around one pilot agent — evidence/current-rule/authority/receipt assurance without replacing the startup solution or Fachverfahren.

### govdigital / public IT providers

Target roles: platform architecture, GenAI platform, security/governance, innovation, procurement.

Target organizations include govdigital and public IT providers such as Dataport, AKDB, Komm.ONE, ekom21, KDO and DVZ.

OCN wedge: one reusable assurance component that can protect multiple municipal agents and preserve sovereign/customer-controlled deployment.

## C. Regulated enterprise AI platforms — faster sales cycle than government

Prioritize organizations with:
- multiple active agents;
- meaningful write/payment/data permissions;
- regulated/audited processes;
- expensive human review;
- multiple model providers;
- security/compliance teams blocking additional autonomy.

Best roles:
- Head/VP of AI Platform;
- Agent Platform Lead;
- CISO / AI Security Lead;
- Head of AI Governance;
- Chief Data/AI Officer;
- Payments/Fraud Product Lead;
- Procurement/AP Automation Lead;
- Internal Audit / Operational Risk;
- Public-sector CIO / platform architect.

# Best first offers

## Offer 1 — Payment Intent Shadow Test

**Buyer:** payment/commerce/bank/agent platform.

Observe 1,000–100,000 synthetic or production-adjacent payment decisions without blocking. Report:
- intent mismatches;
- beneficiary changes;
- over-mandate amount;
- wrong merchant/entity;
- missing/expired authority;
- duplicate/replay candidates;
- approval gaps;
- false-positive adjudication;
- latency/cost per check.

## Offer 2 — Agent Authority Shadow Test

**Buyer:** enterprise AI/platform/SaaS.

Wrap one agent's write/action tool calls. Prove where permissions are too broad, human approval is missing, evidence is weak/stale, and incident reconstruction is incomplete.

## Offer 3 — Government Decision Assurance Pilot

**Buyer:** authority/public IT provider.

Shadow an application/document/decision-support workflow. Produce evidence/freshness/policy/authority envelopes and measure review-time savings and error catches.

# Discovery qualification

A buyer is high priority when at least 4 are true:

1. Agents already run in pilot/production.
2. Agents can write/send/pay/update/approve.
3. Mistakes have material financial/legal/reputational cost.
4. Humans currently review a large share of outputs.
5. Multiple models/tools make governance fragmented.
6. Existing audit trails cannot reconstruct intent -> authority -> action.
7. They want more autonomy but security/compliance blocks it.
8. They operate a platform used by many downstream teams/customers/authorities.
9. Fraud/scam/social-engineering exposure is meaningful.
10. They can supply outcome/override labels for a Shadow test.

# Expansion economics

The high-volume target is **not one API call per customer interaction**. The target is multiple cheap trusted events around every consequential action:

```text
intent check
-> counterparty/entity check
-> evidence/freshness check
-> authority/policy check
-> execution receipt
-> outcome/feedback
```

One active agent may therefore generate many trusted events per action and thousands/millions per day at platform scale.
