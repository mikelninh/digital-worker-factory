# Company 01 — First Cohort Account Briefs

These are Revenue Worker drafts. External contact remains human-approved.

## 1. Warm law firm — legal design partner

### Hypothesis

A practising lawyer loses useful time to intake, document review, missing-information checks, research and repetitive drafting. AI can help, but confidentiality, matter isolation, source quality and external legal consequences make unbounded automation unacceptable.

### Smallest useful pilot

Use 3–5 synthetic/redacted representative matters.

Agent does:

- intake structure
- fact/evidence timeline
- missing-information list
- source-backed research
- draft client update / letter

Authority:

- permitted matter read/research/draft: ALLOW
- client send / case-record mutation / filing: APPROVAL
- cross-matter read / client-fund instruction / payment-detail change: BLOCK

### Smallest ask from operator

1. Pick one recurring task you genuinely dislike.
2. Show the normal input and desired output using synthetic/redacted information.
3. Review 3–5 outputs and mark: accept / correct / reject.
4. Tell us whether the authority boundaries are reassuring or annoying.

### Proof

- lawyer minutes saved per matter
- output acceptance rate
- factual/source correction rate
- cross-matter leakage = 0
- unauthorized external action = 0

### First-contact draft

> I built a control layer for AI agents and I’d love to test it on one boring but real Kanzlei workflow with you. We would start only with synthetic or redacted matters: intake, evidence summary, source-backed research and draft preparation. Anything consequential like sending to a client, changing the case record or filing externally stays human-approved. The question is simple: does it actually save you time without creating new risk? If you’re up for it, pick one recurring task you hate and we’ll judge the result brutally after a few examples.

---

## 2. THE BRETTINGHAMS — commercial design partner

### Public signal

THE BRETTINGHAMS describes itself as an owner-led Berlin digital agency with 37 people, interdisciplinary Scrum teams, digital-product work and an emphasis on autonomous teams, UX and user testing.

Evidence:
- https://www.brettingham.de/digitalagentur/
- https://www.brettingham.de/digitalagentur/unsere-scrum-teams/team-atlas/

### Hypothesis

The best first value is not replacing creative work. It is removing coordination/research/preparation load around projects and business development while preventing agents from making client commitments on their own.

### Smallest useful pilot

Pick one of:

- prospect/account research -> brief
- client/project meeting -> prep + follow-up draft
- new request -> structured project brief
- proposal/RFP input -> first draft + evidence/questions

Authority:

- public/internal research and preparation: ALLOW
- external send, scope/timeline/customer commitment: APPROVAL
- unrelated-client data, unapproved spend, payment detail change: BLOCK

### Smallest ask from operator

Give us one real but non-sensitive recent brief/request plus the output a strong team member would normally produce. Compare side by side.

### Proof

- founder/team minutes saved
- accepted briefs/proposals
- corrections per output
- useful opportunities created
- unauthorized outbound = 0
- cross-client access = 0

### First-contact draft

> I’m building a small company where AI workers can do real work, but every consequential action sits behind an explicit authority boundary. I think THE BRETTINGHAMS would be a great reality check because your work is fast, collaborative and client-facing. I’d start with one low-risk workflow like account research, project briefs or proposal preparation. The agent can prepare; client commitments and external sends stay with you. The goal isn’t another AI demo — it’s to measure whether this removes real coordination work without becoming governance bureaucracy. I’d love your harsh UX feedback on one tiny experiment.

---

## 3. DigitalService / BMDS Agentic AI Hub — government design partner

### Public signal

The Agentic AI Hub has already piloted agentic AI across 19 municipalities and nine startups, including social-benefit applications, naturalisation, document processing and a technology-agnostic orchestration layer. Its published aim includes building legal, organisational and technological conditions for scalable deployment.

Evidence:
- https://digitalservice.bund.de/projekte/agentic-ai-hub
- https://bmds.bund.de/aktuelles/pressemitteilungen/detail/agentic-ai-hub-start-der-2-bewerbungsrunde

### Hypothesis

As municipal agents move from analysing/preparing toward real administrative consequences, a reusable organisation-controlled authority boundary becomes necessary across vendors and workflows.

### Smallest useful pilot

Synthetic Wohngeld-style cases first.

Agent does:

- completeness check
- missing-document identification
- permitted evidence retrieval simulation
- pinned-rule calculation
- decision preparation

Authority:

- bounded case work: ALLOW
- adverse consequential decision: APPROVAL
- unrelated registry access: BLOCK
- missing legal basis/jurisdiction/contestability/reversibility: BLOCK

Then run P1 shadow mode against human-labelled cases where permitted.

### Smallest ask from operator

Provide or validate 10–20 synthetic/gold cases and the real authority/governance conditions that must exist before one consequential action is lawful and operationally acceptable.

### Proof

- agreement with human gold outcome
- processing minutes saved
- missing-evidence detection
- unnecessary approval rate
- 100% authority receipt coverage
- unauthorized state action = 0

### First-contact draft

> The Agentic AI Hub has already shown that municipal agents can reduce administrative workload. We’re working on the next boundary: a provider-neutral authority layer that decides and proves what an agent may do, for whom, for which purpose and under which legal/operational constraints before a consequential action executes. We’d like to test this with a deliberately small synthetic/shadow Wohngeld-style workflow rather than a large procurement project. Routine case preparation can run automatically; adverse decisions, unrelated registry access or incomplete legal/contestability context fail closed. Every attempted consequence produces an inspectable receipt. Would this be useful as a cross-vendor governance proof for the Hub?

---

## 4. Charité IMI / CMIO — healthcare design partner

### Public signal

Charité’s EVIDOC project studies how AI-supported documentation can be integrated effectively, safely and sustainably into clinical routine. IMI/CMIO explicitly works on bringing digital innovation into routine clinical care, and Charité has current work around agentic AI / clinical intelligence.

Evidence:
- https://medinfo.charite.de/forschung/ag_clinical_implementation_science_in_digital_health_cidh/evidoc
- https://medinfo.charite.de/
- https://ikim.charite.de/klinische_und_operative_anwendung/clinical_intelligence

### Hypothesis

Documentation is a strong first hospital workflow because it has real burden and measurable value while we can deliberately keep diagnosis/treatment/medication authority outside the agent.

### Smallest useful pilot

Synthetic clinical records first; then read-only/shadow workflow if institutionally permitted.

Agent does:

- encounter summary
- structured documentation extraction
- missing-documentation detection
- discharge-summary preparation
- coding suggestion

Authority:

- permitted summarisation/structuring/preparation: ALLOW
- authoritative record write or sensitive external transfer: APPROVAL where required
- unrelated patient access: BLOCK
- medication/treatment/order changes: BLOCK

### Smallest ask from operator

Validate a synthetic workflow and identify the exact point at which helpful documentation assistance becomes a consequential clinical/record action in their environment.

### Proof

- clinician minutes saved
- documentation acceptance rate
- correction rate
- missing-information detection
- unrelated-patient access = 0
- unauthorized clinical execution = 0

### First-contact draft

> Your work on AI-supported clinical documentation is exactly the kind of environment where useful automation and accountable boundaries need to coexist. We’re building an organisation-controlled authority layer for autonomous systems. A first hospital proof would stay deliberately narrow: synthetic records first, then read-only/shadow documentation. Summarisation, structuring and missing-documentation detection can be allowed; unrelated-patient access and autonomous treatment or medication changes are blocked; consequential record writes or external transfers can require exact approval. We’d measure clinician time saved and correction rate alongside zero unauthorised clinical execution. I’d be interested in testing whether this boundary is actually useful in practice rather than adding process overhead.

---

## Cohort experiment rule

The first conversations are not sales theatre. They answer five questions:

1. Is the workflow genuinely painful?
2. Does the proposed agent output create measurable value?
3. Which consequences will the operator refuse to delegate?
4. Which controls feel useful vs bureaucratic?
5. Will they give us the next step: more cases, shadow mode, bounded execution, or a paid pilot?

Research Buyer updates prospect score from evidence. Revenue Worker prepares follow-up. Human owner approves every external message and any commercial commitment.