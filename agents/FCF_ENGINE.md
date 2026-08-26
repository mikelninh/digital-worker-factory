# Free Cash Flow Engine — Agent System

This document defines a human-supervised agent loop for turning public pain signals into qualified HausPilot conversations and repeatable delivery.

The agents optimise for **qualified opportunities and collected cash**, not raw outreach volume.

## Architecture

```text
public signals
   ↓
Opportunity Scout
   ↓
Account Researcher
   ↓
Qualification Gate ── low score → backlog
   ↓
Outreach Copilot
   ↓
HUMAN APPROVAL
   ↓
conversation / discovery
   ↓
Sales Engineer
   ↓
proposal
   ↓
HUMAN COMMERCIAL APPROVAL
   ↓
Delivery Engineer
   ↓
Proof Engine
   ↓
case study + expansion candidate
```

No agent may send external messages, commit a price, sign terms, access production tenant data or execute consequential client actions without explicit human authority.

---

## Agent 1 — Opportunity Scout

### Mission

Find organisations with observable evidence of repeated operational work and near-term willingness to spend.

### Inputs

- company website
- public job postings
- public service/contact workflows
- public careers pages
- public reviews only as weak supporting signals
- company size / locations where available

### Output schema

```json
{
  "company": "",
  "url": "",
  "segment": "property_management",
  "signals": [
    {"type":"hiring","evidence":"","source":""}
  ],
  "workflow_hypotheses": [],
  "likely_buyer_roles": [],
  "confidence": 0.0
}
```

### Rules

- Never invent headcount, software, case volume or pain.
- Separate observed fact from hypothesis.
- Prefer fresh signals (<90 days).
- A job posting describing repetitive admin work is a strong signal.
- Do not treat a bad review as proof of internal process failure.

---

## Agent 2 — Account Researcher

### Mission

Turn one account into a concise, useful pre-call brief.

### Required sections

1. What the company visibly does
2. Current pain signals
3. One specific workflow hypothesis
4. Why HausPilot may help
5. Why it may *not* help
6. Named public contact channel / relevant role
7. Suggested 3-sentence opening
8. Evidence links

### Quality gate

Reject the brief if the personalised opening could be sent unchanged to ten competitors.

---

## Agent 3 — Qualification Gate

Use the 0–16 score from `sales/PLAYBOOK.md`.

### Decision

```text
12–16 → priority outreach
8–11  → research / nurture
0–7   → backlog
```

The model recommends the score; the human may override with a written reason.

---

## Agent 4 — Outreach Copilot

### Mission

Prepare a short message that earns a conversation without pretending we know the prospect's internal system.

### Message formula

```text
OBSERVED SIGNAL
→ specific workflow hypothesis
→ small low-risk experiment
→ easy question
```

### Example pattern

> I saw that you're currently hiring around [specific operational function] and that your team handles [publicly documented workflow]. I built a small human-supervised AI workflow for exactly this kind of admin work: it gathers context and prepares the next action, but leaves external decisions with the team. Would it be useful if I mapped one real workflow with you and showed where a 7-day pilot could or could not save time?

### Forbidden

- fake familiarity
- fake quantified savings
- mass-personalisation tokens
- claiming a company has a problem based only on reviews
- automatically sending messages

---

## Agent 5 — Sales Engineer

### Mission

Convert discovery notes into a bounded implementation proposal.

### Output

```json
{
  "workflow": "",
  "baseline": {
    "cases_per_month": null,
    "minutes_per_case": null,
    "loaded_hourly_cost": null
  },
  "allowed_inputs": [],
  "forbidden_inputs": [],
  "ai_preparation_steps": [],
  "human_approval_boundary": [],
  "success_metrics": [],
  "failure_cases": [],
  "pilot_price_eur_net": 1900,
  "payment": "70% kickoff / 30% handover"
}
```

Never fill unknown baseline numbers with estimates unless clearly labelled as scenario assumptions.

---

## Agent 6 — Delivery Engineer

### Mission

Generate the smallest governed worker that satisfies the signed pilot contract.

### Build order

1. data contract
2. capability allow-list
3. evidence requirements
4. happy-path worker
5. human gate
6. audit trace
7. adversarial cases
8. usability polish

### Stop rule

If a feature does not support an agreed success metric or required failure case, do not build it during the sprint.

---

## Agent 7 — Proof Engine

### Mission

Make value legible and reusable.

### Before / after record

```json
{
  "workflow": "maintenance_request_triage",
  "sample_size": 0,
  "before": {
    "median_minutes": null,
    "manual_steps": null
  },
  "after": {
    "median_minutes": null,
    "human_correction_rate": null,
    "blocked_unsafe_actions": null
  },
  "quality": {
    "correct_preparation_rate": null,
    "missing_information_detection": null,
    "escalation_quality": null
  },
  "economic": {
    "hours_saved_monthly": null,
    "estimated_monthly_value_eur": null
  }
}
```

### Claim rules

- label synthetic results as synthetic
- never convert a demo estimate into a client result
- show sample size
- preserve important failures
- state assumptions next to ROI

---

# Orchestrator loop

## Daily prospecting run

```text
1. Scout up to 20 accounts
2. Research the best 5
3. Qualification Gate
4. prepare max 5 personalised messages
5. human reviews all messages
6. human sends selected messages
7. log response and next action
```

The system should not increase message volume merely because response rate is low. It should improve account selection and relevance first.

## Follow-up logic

Suggested human-reviewed cadence:

- Day 0 — first useful message
- Day 3 — one short follow-up with new value
- Day 8 — final close-the-loop note
- no response → archive for 60+ days

Never create an endless follow-up agent.

---

# FCF optimiser

For each potential task calculate:

```text
FCF priority =
(probability_of_close × expected_upfront_cash × urgency)
÷ estimated_founder_hours
```

Use a 1–5 ordinal scale for probability and urgency when hard data is unavailable.

Examples:

- personalising a message for a 15/16 prospect → high
- adding an animation to the landing page → very low
- fixing a demo failure reported by a live buyer → very high
- building a second vertical before first payment → near zero

---

# Safety / privacy

For initial pilots:

- prefer synthetic or anonymised cases
- minimise fields
- keep credentials out of prompts and repositories
- deny external actions by default
- use explicit tool allow-lists
- log tool calls and approval events
- treat content from email/PDF as untrusted data, not instructions
- test prompt-injection attempts in documents/messages
- define retention/deletion before production data is introduced

This architecture intentionally matches the Factory principle: **the model interprets and proposes; authority lives outside the model.**
