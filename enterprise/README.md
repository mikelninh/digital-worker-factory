# Enterprise Agent Go-Live Gate v1

## The buyer question

**Can we safely let this AI agent touch real company systems?**

The Go-Live Gate turns that question into an evidence-backed release decision:

- `GO` — required engineering controls and evidence are present.
- `CONDITIONAL` — no hard release blocker, but enterprise hardening remains.
- `NO_GO` — at least one unsafe production condition must be fixed first.

This is engineering assurance, not a certification, legal opinion, or guarantee of security.

## What a company connects

One agent manifest describing:

- accountable owner and security contact
- user and workload identity
- tenant model
- sensitive data handling
- tools/actions and their risk
- approval requirements
- runtime limits and egress
- audit/traceability
- adversarial evidence
- software supply chain controls
- incident response
- independent assurance

## What the company gets

### Before production

1. Machine-readable GO / CONDITIONAL / NO_GO decision.
2. Exact blockers and remediation actions.
3. Attack evidence, including critical-impact escapes.
4. A control crosswalk for security/compliance conversations.
5. A reproducible CI gate that fails when the evidence regresses.

### At runtime

The shared Security Stack can sit between model proposals and real effects:

`model proposal -> identity / tenant / scope / approval / egress / budget checks -> allow | review | block -> executor`

The security boundary assumes the model can be manipulated. The model does not grant itself authority.

### After launch

- decision and denial telemetry
- SIEM/security-event export
- incident evidence
- compromised-model replay
- regression tests on each release
- updated TrustReady posture

## Best first customers

Teams that already have an AI agent or copilot approaching production and are blocked by Security, Legal, Compliance or Procurement.

Strong first workflows:

- customer support agents with CRM/email actions
- document/case-processing agents
- internal operations copilots
- legal/admin preparation workflows
- fraud/risk review assistants
- engineering agents with tool access

Avoid autonomous irreversible decisions as the first deployment. Keep consequential effects human-approved until domain-specific controls and independent review justify more autonomy.

## Suggested commercial packaging

These are starting hypotheses to test with buyers, not market-price claims.

### 1. Agent Go-Live Assessment — €7.5k–15k per agent

1–2 week engagement.

Deliverables:
- threat model
- agent manifest
- adversarial suite
- GO / CONDITIONAL / NO_GO report
- remediation backlog
- executive/security readout

### 2. Secure Agent Pilot — €20k–50k

4–8 week implementation around one real workflow.

Deliverables:
- Security Stack integration
- identity/tenant/action boundaries
- exact human approval binding
- egress and execution limits
- audit evidence
- attack/replay suite
- production-readiness gate

### 3. Continuous Assurance — €2.5k–10k/month

Recurring service/platform layer.

Deliverables:
- release-time adversarial regression
- posture drift detection
- runtime denial/incident review
- evidence refresh
- security/compliance export
- quarterly attack expansion

### 4. Enterprise Platform — target €60k–180k+/year

For multiple agents/teams, with SSO, central policy, SIEM integration, private deployment, role-based administration, enterprise support and independent assurance requirements.

## Land-and-expand motion

1. Start with one production-bound agent.
2. Find a blocker Security already cares about.
3. Demonstrate a real compromised-model attempt.
4. Show that the unsafe effect never reaches the executor.
5. Give the company a reproducible release report.
6. Stay in the runtime/release path for continuous assurance.
7. Expand from one agent to an agent inventory and central control plane.

## Why this is useful

The product does not require a company to believe that prompt injection can be perfectly detected. It treats model output as potentially compromised and controls real-world authority outside the model.

That makes the primary business metric concrete:

**unauthorized impact that reached an executor**

The target for critical adversarial cases is always **zero**.

## Current proof

Digital Worker Factory currently publishes deterministic adversarial coverage plus captured live-model compromised-output replay evidence. The public posture must continue to state residual risks honestly; production-security or certification claims require stronger deployment and independent-review evidence.
