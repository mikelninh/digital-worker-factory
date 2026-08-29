# Company 01 — Launch Handoff

This is the single handoff checklist for returning to the project after the August 29, 2026 productionisation pass.

## What is already live

### Company 01 growth backend

Dedicated Supabase project:

- name: `company-01`
- ref: `htffcvdopavknnylbowl`
- region: `eu-central-1`

Live and verified:

- production growth datastore
- RLS on all public growth tables
- `anon` / `authenticated` table access revoked
- server-only service role access
- transactional lead + first audit-event creation
- public Edge Function: `company01-lead-intake`
- explicit-consent validation
- honeypot bot trap
- hashed-IP rate limiting
- 10 accepted submissions / hashed IP / 10 minutes
- 11th submission rejected with HTTP 429
- real HTTP E2E proof returned `201 { accepted: true, status: "new" }`
- deterministic qualification autopilot runs every minute
- qualified leads receive synthetic onboarding state
- nurture leads receive no sales/provider action
- action queue uses context digests + unique idempotency keys
- recurring cron runs verified successful

### Safe tokenized onboarding — live and E2E proven

The onboarding transport no longer depends on manually collecting workflow details in email.

Live:

- private hashed onboarding-token store
- raw invitation token is never persisted; only SHA-256 hash is stored
- invitation lifetime: 14 days
- token can be revoked/reissued
- public Edge Function: `company01-onboarding-intake`
- prepared website route: `/onboard?t=<token>`
- explicit safe-data attestation required
- accepts only the bounded P0 packet:
  - one recurring workflow
  - accountable human owner
  - systems the eventual workflow may touch
  - desired output
  - 1–5 synthetic/redacted/non-sensitive examples
- no production credentials required
- successful submission moves lead to `onboarding`
- onboarding state becomes `ready`
- queues exactly one idempotent `pilot.synthetic.prepare` ALLOW action

Real E2E proof returned:

`201 { accepted: true, status: "ready_for_synthetic_pilot" }`

The database was then verified for the expected state/action/event and the entire synthetic trail, including its invitation token, was deleted.

### Public build-in-public ledger backend

Also live and verified:

- aggregate-only `company01_public_growth_metrics()` RPC
- public Edge Function: `company01-public-ledger`
- real external HTTP GET returned 200
- no organisation names, emails, scorecard answers or customer artifacts exposed
- current real funnel counts are zero because all synthetic test rows were removed
- unmeasured invariants are reported as `not_wired`, not fake zeros

### Public acquisition product

Prepared in the `site/` bundle:

- `/` — Company 01 acquisition homepage
- `/scorecard` — free Agent Authority Scorecard
- `/pilot` — universal Trusted Agent Pilot
- `/pilot/legal` — law-firm pilot
- `/pilot/brettinghams` — commercial pilot
- `/pilot/government` — public-sector pilot
- `/pilot/healthcare` — healthcare pilot
- `/onboard?t=...` — tokenized safe pilot onboarding
- `/authority` — Authority Control Centre
- `/company` — Company of the Future proof
- `/ledger` — self-updating privacy-safe public operating ledger
- `/factory` — preserved Digital Worker Factory V1

The `/onboard` route has stricter privacy controls because its URL contains a short-lived invitation token:

- `Referrer-Policy: no-referrer`
- `X-Robots-Tag: noindex, nofollow, noarchive`
- `Cache-Control: no-store`

Baseline site security headers are also configured globally in `site/vercel.json`.

### Governed customer lifecycle

Already encoded and tested:

- requested inbound acknowledgement: `ALLOW` only after explicit consent
- unsolicited outbound: `APPROVAL`
- synthetic/non-sensitive onboarding: `ALLOW`
- tokenized safe onboarding intake: `ALLOW` for an eligible qualified lead
- sensitive/production onboarding: `APPROVAL`
- prospect-selected available meeting: `ALLOW`
- unavailable/unselected meeting: `APPROVAL`
- commercial contract commitment: `BLOCK`

Provider-boundary tests prove non-ALLOW actions make zero email/calendar provider calls.

## What Michael still needs to do

Only account-level or explicitly human-authority work should remain.

### 1. Deploy the public website

Preferred path: Vercel.

Prefilled deploy/import link for the current launch branch:

https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmikelninh%2Fdigital-worker-factory%2Ftree%2Ffeat%2Fcompany01-growth-live%2Fsite&project-name=company-01&repository-name=company-01

If Vercel does not infer the subdirectory from the link, use this one-time setup:

1. Import GitHub repository `mikelninh/digital-worker-factory` into Vercel.
2. Set **Root Directory** to `site`.
3. Framework preset: **Other / static**.
4. No Supabase database secret is needed in Vercel for lead intake/onboarding/ledger.
5. Deploy.
6. Verify `/`, `/scorecard`, `/pilot`, `/authority`, `/company`, `/ledger`, `/onboard`.

The public form backends are already hosted by Supabase. After a Vercel project exists, future website deployments can be automated from Git.

Optional later:

- connect a custom domain,
- set canonical/OG URL metadata once the final domain is known.

### 2. Connect the real sender mailbox

The authority and executor seams are ready, but a production Gmail/OAuth provider is not yet attached to the queue worker.

Desired sender identity:

- a Company 01 business mailbox rather than a personal address, if available.

The first automatic email should only be the **explicitly requested inbound acknowledgement / pilot packet**, containing the qualified lead's short-lived `/onboard?t=...` invitation. Unsolicited outbound remains human-approved.

### 3. Connect Google Calendar

The executor contract is ready.

Calendar automation should only confirm a meeting when:

- the prospect selected the slot,
- the slot is still available,
- the relevant authority decision is `ALLOW`.

### 4. Approve the PR stack when ready

Do not merge blindly. The current work is intentionally kept in draft PRs.

Review/merge the stacked chain in dependency order, then deploy the merged site.

### 5. Start real traffic

Once the website is public:

- send the Scorecard to warm design partners,
- publish the first proof-driven posts,
- route every content CTA to `/scorecard` or the relevant sector pilot,
- share `/ledger` as the continuously updating operating proof.

## What should stay human

Do not automate these away merely to improve the automation percentage:

- contract signature / legal commitment
- unusual pricing or discounts
- production or sensitive-system access
- material authority expansion
- strategic customer relationships
- emergency revocation / pause

A human assistant can own routine customer coordination inside a bounded role, but these decisions should remain explicitly delegated rather than silently inherited.

## First live success condition

Company 01 has passed the next milestone only when all of these are true:

```text
real public website                         live
real scorecard completion                   > 0
qualified inbound lead                      > 0
safe onboarding packet submitted            > 0
synthetic pilot preparation                 > 0
useful operator/customer output             > 0
economic value / paid pilot                 > 0
unauthorised executions                      measured = 0
duplicate consequences                       measured = 0
post-revocation executions                   measured = 0
approval bypasses                            measured = 0
missing authority receipts                   measured = 0
```

If a production evidence path is not wired yet, publish **not measured / not wired**, never an invented zero.

## Recommended return sequence

When you come back:

1. Check CI on PR #31.
2. Open the prefilled Vercel deploy/import link above.
3. Test `/scorecard` once from the public URL using a disposable test lead.
4. Issue that lead a disposable onboarding invitation and test `/onboard?t=...`.
5. Check `/ledger` shows only aggregate counts and never exposes the test identity.
6. Delete the disposable lead (its onboarding/token state cascades away).
7. Connect Company 01 email.
8. Connect Calendar.
9. Send the live Scorecard to the first warm design partners.
10. Start real traffic and let the public ledger move from zero.

Everything before step 2 is already code/infrastructure rather than manual sales administration.
