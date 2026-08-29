# Company 01 — Governed Growth Engine

## Goal

Build an inbound growth loop that creates useful value before asking for a sales call, qualifies the right organisations, and onboards safe pilots with minimal human attention.

The Growth Agent is not authorised to manufacture demand through spam or make commercial/legal commitments on behalf of Company 01.

## Funnel

```text
useful proof / referrals / search / partner shares
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
 short-lived tokenized /onboard invitation
         ↓
 safe workflow packet
         ↓
 pilot.synthetic.prepare queue
         ↓
 sandbox / shadow authority proof
         ↓
 human approval only for real commitments,
 sensitive/production access, exceptions or contract
```

The public operating ledger reads aggregate counts from the same production state and deliberately keeps synthetic stress proof separate from real traction.

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
- issue a short-lived onboarding invitation to an eligible qualified lead
- accept synthetic/redacted/non-sensitive onboarding inputs with explicit safety attestation
- prepare a synthetic pilot from the accepted safe packet
- confirm a meeting only when the prospect selected an actually available slot

### APPROVAL

- unsolicited external outreach
- public content publication initially
- production/sensitive system access
- price/discount exception

### BLOCK

- autonomous contract/legal commitment

## Production datastore

Dedicated Supabase project:

- name: `company-01`
- ref: `htffcvdopavknnylbowl`
- region: `eu-central-1`

Persisted public-schema state:

- `company01_growth_leads`
- `company01_growth_events`
- `company01_growth_onboarding`
- `company01_growth_approvals`
- `company01_growth_action_queue`

Private state:

- hashed-IP rate-limit records
- hashed onboarding invitation tokens

Security:

- RLS enabled on all public growth tables
- no browser database access
- `anon` / `authenticated` table access revoked
- server `service_role` explicitly granted only what the backend needs
- public function execution revoked
- database mutation RPCs are `SECURITY INVOKER`
- Edge Functions read Supabase's built-in `SUPABASE_SECRET_KEYS` server environment
- modern Supabase secret keys are sent to PostgREST through the `apikey` header and never exposed to the browser

A real permission test confirmed anonymous table/RPC access is denied while the server role can execute the bounded production RPCs.

## Public lead intake — live

Edge Function:

`company01-lead-intake`

It is public by design (`verify_jwt=false`) but has no direct table authority. It validates payload size, organisation, work-email shape and explicit consent; uses a honeypot; hashes the caller IP; and invokes only the service-role RPC through a server-side Supabase secret.

Rate limit:

- 10 accepted submissions per hashed IP per 10 minutes
- 11th returns HTTP 429
- raw IPs are not persisted

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

The created test row and audit event were verified and then deleted.

## Deterministic qualification autopilot — live

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
- receive qualification/report/pilot/sandbox audit events
- queue exactly one consented `growth.inbound.acknowledge` action with a SHA-256 context digest and unique idempotency key

Low-consequence / mature-control leads:

- become `nurture`
- receive read-only guidance as the next action
- do not create a synthetic onboarding workspace
- do not queue a provider/sales action

Live verification produced exactly one qualified and one nurture outcome from two synthetic leads. The recurring cron runs were then verified successful and test rows removed.

## Tokenized safe onboarding — live

Prepared website route:

`/onboard?t=<short-lived-token>`

Public Edge Function:

`company01-onboarding-intake`

Invitation design:

- 24 random bytes encoded as a 48-character token
- database stores only SHA-256 token hash
- 14-day expiry
- token can be revoked/reissued
- only explicit-consent leads in `qualified` / `onboarding` state are eligible

The prospect submits only:

1. one recurring workflow,
2. accountable human owner,
3. systems/actions the eventual workflow may touch,
4. desired output,
5. 1–5 synthetic/redacted/non-sensitive examples,
6. explicit safe-data attestation.

The onboarding page explicitly forbids production credentials, secrets, real legal/client files, patient records and other sensitive production inputs.

Successful safe onboarding:

- lead -> `onboarding`
- onboarding record -> `ready`
- data mode remains `synthetic`
- audit event `onboarding.safe_inputs_received`
- exactly one idempotent `pilot.synthetic.prepare` ALLOW action queued

### Verified E2E

A real test exercised:

```text
qualified synthetic lead
  → issue onboarding token
  → public onboarding HTTP POST
  → token hash + expiry check
  → safe-data validation
  → onboarding state ready
  → pilot.synthetic.prepare queued
  → HTTP 201 { accepted: true, status: "ready_for_synthetic_pilot" }
```

The database state/action/event were verified. The lead and token were then deleted; production returned to zero synthetic test leads/tokens.

## Privacy-safe public ledger — live

Prepared website route:

`/ledger`

Public Edge Function:

`company01-public-ledger`

It exposes aggregate counts only. It does not expose organisation names, emails, scorecard answers, tokens or pilot artifacts.

Real HTTP GET returned 200.

Proof-integrity rule:

> Never publish an invariant as zero unless it is actually measured by the production evidence path.

For example, autonomous contract-commitment monitoring is currently `not_wired`, so the public ledger returns `null / not_wired` instead of an invented zero.

Synthetic Scale-Gauntlet proof is shown separately from longitudinal customer traction.

## Public website — prepared, not yet hosted

The `site/` bundle contains:

- `/` — Company 01 acquisition homepage
- `/scorecard`
- `/pilot`
- `/pilot/legal`
- `/pilot/brettinghams`
- `/pilot/government`
- `/pilot/healthcare`
- `/onboard`
- `/authority`
- `/company`
- `/ledger`
- `/factory`

The connected Vercel account currently has no linked project, so no public Company 01 website/domain is claimed yet. The Supabase intake, onboarding and ledger backends are genuinely live independently of website hosting.

## North-star funnel metrics

Value:

- scorecards completed
- useful reports generated
- qualified inbound leads
- safe onboarding packets submitted
- synthetic/shadow pilot starts
- paid pilot conversion
- attributable economic value

Efficiency:

- human minutes / qualified lead
- human minutes / pilot start
- cost per qualified lead
- agent operating cost

Authority metrics must be published only when a corresponding production evidence path exists. If not wired, say `not_wired`; do not substitute reference-test zeros.

## Current state

### Live and verified

- governed Growth Agent policy + tests
- dedicated Company 01 Supabase project
- production datastore + RLS/grants
- public rate-limited lead intake
- real HTTP `201` lead-ingestion E2E proof
- deterministic every-minute qualification autopilot
- tokenized safe onboarding backend
- real HTTP `201 ready_for_synthetic_pilot` onboarding E2E proof
- action queue / approvals / events
- public aggregate ledger backend
- real HTTP `200` ledger proof
- rate-limit proof: 10 accepted, 11th rejected with 429
- production cleaned back to zero synthetic test leads/tokens
- email/calendar authority executor seams and zero-provider-call tests

### Prepared but not publicly hosted

- Company 01 homepage
- Scorecard
- universal + sector pilot pages
- `/onboard` safe onboarding UI
- `/ledger` live operating-ledger UI
- Authority Control Centre
- Company-of-the-Future proof page

### Still requires account/human integration

- create/link first Vercel project and deploy the `site/` bundle
- attach real Company 01 Gmail/OAuth sender behind the acknowledgement queue
- attach Google Calendar behind the selected-slot executor
- real traffic, customer outcomes and economic value

These are now deployment/provider/market-evidence gaps, not missing funnel architecture.
