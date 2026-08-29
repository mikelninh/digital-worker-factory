# Company 01 — Governed Growth Engine

## Goal

Build an inbound growth loop that creates useful value before asking for a sales call, qualifies the right organisations, and onboards safe pilots with minimal human attention.

The Growth Agent is not authorised to manufacture demand through spam or make commercial/legal commitments on behalf of Company 01.

## Funnel

```text
useful content / referrals / search / partner shares
                 ↓
        Agent Authority Scorecard
                 ↓
 instant readiness + risk + Authority Map
                 ↓
     recommended Trusted Agent Pilot
                 ↓
 explicit prospect follow-up consent
                 ↓
      transactional lead + event record
                 ↓
 Growth Agent qualification + account brief
                 ↓
 automatic acknowledgement + safe onboarding queue
                 ↓
 automated synthetic/non-sensitive onboarding
                 ↓
      sandbox / shadow authority proof
                 ↓
 human approval only for real commitments,
 sensitive/production access, exceptions or contract
```

## Lead magnet

Route: `/scorecard`

Promise:

> How much power does your AI actually have?

The prospect maps whether their agents can:

- send externally
- write systems
- spend money
- access sensitive data
- affect people

and whether they already have:

- explicit purpose
- tool/action allowlists
- approval rules
- immediate revocation
- replay/idempotency protection
- proof receipts
- authority outside the model
- bounded data scope

They receive immediately:

- Authority Readiness Score
- consequence surface
- authority risk score
- urgency
- sector-specific pilot recommendation
- first `ALLOW / APPROVAL / BLOCK` map
- top missing controls

No contact details are required to receive the result.

## Growth Agent authority

### ALLOW

- content / account research
- draft educational content
- score inbound leads
- generate personalised authority report
- create CRM/lead-queue record
- recommend pilot

### Conditional ALLOW

- acknowledge inbound prospect only when they explicitly requested follow-up
- onboard synthetic or non-sensitive pilot materials
- confirm a meeting only when the prospect selected an actually available slot

### APPROVAL

- unsolicited external outreach
- public content publication initially
- production/sensitive system access
- price/discount exception

### BLOCK

- autonomous contract/legal commitment

## Live lead lifecycle

`core/company-future/growth-live.mjs` plans the operational queue after a lead opts in.

A qualified, explicitly consented, synthetic/non-sensitive lead can automatically receive:

1. lead score,
2. personalised authority report,
3. CRM/lead record,
4. requested-inbound acknowledgement,
5. sandbox onboarding request.

Each planned action receives:

- an authority decision,
- a canonical context digest,
- an idempotency key.

Production/sensitive onboarding becomes `APPROVAL`; autonomous contract commitment stays `BLOCK`.

Lead state transitions are also explicit:

`new -> qualified -> contacted/onboarding -> pilot -> won/lost`

Skipping directly from `new` to `pilot` is rejected.

## Automatic onboarding packet

A qualified inbound lead should be asked for only:

1. one recurring workflow they want to delegate,
2. 3–5 synthetic/redacted/non-sensitive examples,
3. desired output,
4. accountable human owner,
5. systems/actions the agent would eventually touch.

Company 01 does not need production credentials for P0/P1.

The Growth Agent can then prepare:

- proposed authority envelope
- gold cases
- synthetic/shadow runner
- success metrics
- pilot timeline
- operator review form

## Conversion events

Track separately:

- scorecard started
- scorecard completed
- qualified
- follow-up consented
- onboarding packet submitted
- synthetic pilot started
- shadow pilot started
- design-partner conversation
- paid pilot
- production conversion

## North-star funnel metrics

Value:

- scorecards completed
- useful reports generated
- qualified inbound leads
- pilot starts
- paid pilot conversion
- revenue attributed to Growth Agent

Efficiency:

- human minutes / qualified lead
- human minutes / pilot start
- cost per qualified lead
- agent operating cost

Authority:

- unsolicited sends without approval = 0
- commercial commitments by Growth Agent = 0
- production access without approval = 0
- follow-up without explicit consent = 0
- cross-tenant data leakage = 0

## Data minimisation

The public scorecard calculates locally in the browser. A lead record is only created after explicit follow-up consent.

Initial lead storage should contain only business contact/context, scorecard answers/results and funnel state. It should not collect confidential case/patient/customer records.

## Datastore deployment

The lead API expects server-side environment variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` — preferred modern `sb_secret_...` server key

`SUPABASE_SERVICE_ROLE_KEY` remains a temporary compatibility fallback only.

The secret key must never enter public client code.

The datastore reference:

- enables RLS on every growth table,
- revokes `anon` and `authenticated`,
- explicitly grants only `service_role`,
- uses a `SECURITY INVOKER` RPC,
- revokes public function execution,
- atomically creates the lead and first audit event.

A dedicated Company 01 Supabase project is required rather than reusing an unrelated project. Before public launch add rate limiting / bot protection, test grants/RLS, and run Supabase security + performance advisors.

## Current state

Implemented:

- governed Growth Agent policy + tests
- browser Authority Scorecard
- instant personalised Authority Map
- explicit-consent lead submission
- fail-closed lead endpoint
- transactional lead/event datastore schema
- action queue / approvals / onboarding persistence schema
- live lifecycle planner + state machine
- operator-attention brief

Account wiring still required:

- dedicated Company 01 Supabase project
- production rate limiting / bot protection
- automated Gmail acknowledgement executor
- Google Calendar slot-confirmation executor
- public deployment + domain

These are production wiring tasks, not reasons to weaken the authority boundaries.
