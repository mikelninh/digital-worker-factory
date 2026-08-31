# TrustReady

**Paste an AI product. Find what could block an enterprise buyer. Close the evidence gaps. Re-scan until the buyer pack is ready.**

TrustReady is an evidence-first procurement-readiness product for AI companies. It is deliberately narrower than a full GRC platform: the job is to make an AI product easier to buy.

## The loop

```text
URL / repo / docs / questionnaire
        ↓
collect claims + evidence
        ↓
TrustReady scan
        ↓
weighted buyer-readiness gaps
        ↓
auto-prepare safe remediations
        ↓
human / legal / security review where required
        ↓
implement + attach evidence
        ↓
re-scan
        ↓
100/100 configured readiness
        ↓
Enterprise Buyer Pack + Trust Centre
        ↓
continuous monitor
```

## What 100/100 means

**100 means every configured TrustReady control is backed by observable evidence or an explicitly authorised human attestation.**

It does **not** mean:

- a regulator has certified the product;
- every law or contract is satisfied;
- the product is secure against every threat;
- a buyer must approve procurement;
- generated legal starter text can be relied on without review.

TrustReady fails closed: a buyer pack does not become `ready` below 100.

## Current control families

- product identity and intended purpose
- AI Act role/risk assessment
- AI interaction disclosure
- human oversight / authority boundary
- model and AI vendor inventory
- subprocessor inventory
- data flow
- retention/deletion
- DPA/TOM starter package
- security contact
- AI/security incident response
- authentication/authorization/tenant isolation
- auditability
- evaluations and limitations
- buyer-facing trust centre
- reusable questionnaire answer library

The control pack is versioned in [`controls.json`](controls.json).

## Regulatory grounding

TrustReady is buyer-readiness software, not legal advice. Its AI-transparency prompts are grounded in the EU AI Act and current Commission guidance. As of this control-pack version:

- Article 50 transparency obligations apply from **2 August 2026** for relevant systems;
- providers of systems that directly interact with people may need to ensure users are informed they are interacting with AI, subject to the Article 50 scope/exceptions;
- other AI Act duties depend heavily on the organisation's role, system category and deployment context.

Primary sources:

- EU AI Act, Regulation (EU) 2024/1689: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng
- European Commission Article 50 guidelines: https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems
- Commission Article 50 Q&A: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act

A named human owner must confirm legal-role/risk classification before it earns full readiness credit.

## Remediation philosophy

A scanner without remediation is a fear generator. TrustReady therefore turns every gap into one of three lanes:

### Auto-prepare

The system can draft the next useful artifact, for example:

- AI disclosure
- human-oversight statement
- model/vendor inventory
- subprocessor table
- data-flow description
- retention/deletion policy starter
- incident-response playbook
- trust centre
- questionnaire answer library

**Drafting is not completion.** If the artifact must be deployed or operationally true, the control stays partial until evidence is attached.

### Human review

Used where the real answer depends on company/legal authority, for example:

- AI Act role/risk assessment
- contractual DPA/TOM wording

### Manual evidence

Used where TrustReady cannot responsibly manufacture the missing control, for example:

- actual tenant isolation
- authentication/authorization
- real audit traces
- production encryption or other technical controls

The product tells the customer exactly what evidence would close the gap.

## Self-serve commands

```bash
# Scan one product
node scripts/trustready.mjs scan product.json

# Generate safe starter remediations + the exact remaining queue
node scripts/trustready.mjs remediate product.json ./trustready-output/my-product

# Buyer pack fails with exit code 2 until score reaches 100
node scripts/trustready.mjs buyer-pack product.json buyer-pack.json

# Rank a portfolio
node scripts/trustready.mjs portfolio trustready/fixtures/our-products.json
```

## Dogfood baseline

`trustready/fixtures/our-products.json` scans public-repository evidence for:

- Digital Worker Factory
- PruefPilot
- GitLaw
- HausPilot
- Opportunity Radar

Missing evidence in this mode means **not evidenced by the scanned public material**, not necessarily absent in the real system.

Run:

```bash
node evals/trustready-our-products.mjs
```

The goal is to use our own gaps as the first golden cases, close them, and preserve before/after evidence as TrustReady proof.

## Commercial offers

Current catalogue hypothesis:

- **Starter — €149**: scan + remediation plan + starter artifacts
- **Enterprise Buyer Pack — €499**: evidence-complete pack / trust centre workflow
- **Monitor — €149/month**: re-scan evidence and surface regressions/changes
- **Deal Rescue — €999**: one active buyer questionnaire / procurement package

CommercialOS can handle sale → payment evidence → delivery → proof → renewal. The remaining scale work is to add URL/GitHub/document ingestion and payment/outbound adapters for a genuinely self-serve live service.
