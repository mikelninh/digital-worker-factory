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
 public rate-limited lead intake
                 ↓
 transactional lead + audit event
                 ↓
 deterministic qualification autopilot
           ↙ qualified     nurture ↘
 synthetic onboarding       read-only guidance
         ↓
 consented acknowledgement queue
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

The prospect maps whether their agents can send externally, write systems, spend money, access sensitive data and affect people, plus whether explicit purpose, action allowlists, approvals, revocation, replay safety, receipts, external policy enforcement and bounded data scope already exist.

They receive immediately:

- Authority Readiness Score
- consequence surface
- authority risk score
- urgency
- sector-specific pilot recommendation
- first `ALLOW / APPROVAL / BLOCK` map
- top missing controls

No contact details are required to receive the result. Score calculation stays in-browser.

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

`core/company-future/growth-live.mjs` and the persisted queue model encode the operating lifecycle.

A qualified, explicitly consented, synthetic/non-sensitive lead can automatically receive:

1. lead score,
2. personalised authority report,
3. CRM/lead record,
4. requested-inbound acknowledgement,
5. sandbox onboarding request.

Each planned consequence receives an authority decision, canonical context digest and idempotency key. Production/sensitive onboarding becomes `APPROVAL`; autonomous contract commitment stays `BLOCK`.

## Production datastore

Dedicated Supabase project:

- name: `company-01`
- ref: `htffcvdopavknnylbowl`
- region: `eu-central-1`

Persisted state:

- `company01_growth_leads`
- `company01_growth_events`
- `company01_growth_onboarding`
- `company01_growth_approvals`
- `company01_growth_action_queue`
- private hashed-IP rate-limit state

Security:

- RLS enabled on all public growth tables
- no browser database access
- `anon` / `authenticated` table access revoked
- server `service_role` explicitly granted only what the backend needs
- public function execution revoked
- database mutation RPCs are `SECURITY INVOKER`
- modern Supabase secret keys are server-only and sent via the `apikey` header

A real permission test confirms `anon` receives `42501 permission denied`, while the service role can execute the atomic inbound RPC.

## Public intake

Deployed Supabase Edge Function:

`company01-lead-intake`

It is public by design (`verify_jwt=false`) but has no direct table authority. It validates payload size, organisation, work-email shape and explicit consent; uses a honeypot; hashes the caller IP; and invokes only the service-role RPC through a server-side Supabase secret.

Rate limit:

- 10 accepted submissions per hashed IP per 10 minutes
- the 11th returns HTTP 429
- raw IPs are not persisted

The site keeps the stable browser contract `/api/leads`; `site/api/leads.js` is only a secretless proxy to the public Supabase intake function.

### Verified E2E

Using Supabase `pg_net`, the real public HTTP path was exercised:

```text
HTTP POST
  → deployed Edge Function
  → input + consent validation
  → hashed-IP rate limit
  → server-secret RPC
  → transactional lead + audit event
  → HTTP 201 { accepted: true, status: "new" }
```

The created row and audit event were verified and then removed. Synthetic test data count returned to zero.

## Deterministic qualification autopilot

`company01-growth-autopilot` runs every minute via `pg_cron` and processes up to 25 new consented leads with `FOR UPDATE SKIP LOCKED`.

Reference qualification rule:

```text
consequence_signals >= 1
AND
(readiness < 90 OR agent_stage = production)
```

Qualified leads:

- become `qualified`
- receive a synthetic onboarding record
- get audit events for qualification, report preparation, pilot recommendation and sandbox onboarding
- queue exactly one consented `growth.inbound.acknowledge` action with a SHA-256 context digest and unique idempotency key

Low-consequence / mature-control leads:

- become `nurture`
- receive read-only guidance as the next action
- do not create a synthetic onboarding workspace
- do not queue a provider/sales action

Live verification produced exactly one qualified and one nurture outcome from two synthetic public-intake leads. The qualified lead had one queued `ALLOW` acknowledgement; the nurture lead had zero queued actions. Both synthetic leads were deleted afterwards.

## Automatic onboarding packet

A qualified inbound lead is asked for only:

1. one recurring workflow they want to delegate,
2. 3–5 synthetic/redacted/non-sensitive examples,
3. desired output,
4. accountable human owner,
5. systems/actions the agent would eventually touch.

No production credentials are required for P0/P1.

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

## Current state

Live and verified:

- governed Growth Agent policy + tests
- browser Authority Scorecard
- instant personalised Authority Map
- dedicated Company 01 Supabase project
- production datastore + RLS/grants
- public rate-limited Edge Function intake
- real HTTP `201` E2E lead-ingestion proof
- deterministic every-minute qualification autopilot
- safe synthetic onboarding state
- action queue / approvals / events
- rate-limit proof: 10 accepted, 11th rejected with 429
- database cleaned back to zero synthetic leads after tests
- email/calendar authority executor seams and zero-provider-call tests

Still not live:

- actual Gmail acknowledgement provider behind the queued action
- actual Google Calendar booking provider behind the governed executor
- public website/domain (connected Vercel account currently has no project)
- cold-traffic acquisition metrics and real customer conversion evidence

These are now integration and market-evidence gaps, not missing funnel architecture.
