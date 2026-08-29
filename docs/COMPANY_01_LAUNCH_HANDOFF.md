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
- database cleaned to zero synthetic test leads after testing

### Public build-in-public ledger backend

Also live and verified:

- aggregate-only `company01_public_growth_metrics()` RPC
- public Edge Function: `company01-public-ledger`
- real external HTTP GET returned 200
- no organisation names, emails, scorecard answers or customer artifacts exposed
- current live metrics correctly return zero because all synthetic test rows were removed

### Public acquisition product

Prepared in the `site/` bundle:

- `/` — Company 01 acquisition homepage
- `/scorecard` — free Agent Authority Scorecard
- `/pilot` — universal Trusted Agent Pilot
- `/pilot/legal` — law-firm pilot
- `/pilot/brettinghams` — commercial pilot
- `/pilot/government` — public-sector pilot
- `/pilot/healthcare` — healthcare pilot
- `/authority` — Authority Control Centre
- `/company` — Company of the Future proof
- `/ledger` — self-updating privacy-safe public operating ledger
- `/factory` — preserved Digital Worker Factory V1

The root homepage now explains:

1. the problem,
2. the Authority Control Plane,
3. ALLOW / APPROVAL / BLOCK,
4. current proof,
5. four sector examples,
6. the free Scorecard,
7. the Trusted Agent Pilot,
8. the live ledger,
9. what Company 01 has and has not proven yet.

Baseline security headers are configured in `site/vercel.json`.

### Governed customer lifecycle

Already encoded and tested:

- requested inbound acknowledgement: `ALLOW` only after explicit consent
- unsolicited outbound: `APPROVAL`
- synthetic/non-sensitive onboarding: `ALLOW`
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
4. No Supabase database secret is needed in Vercel for lead intake.
5. Deploy.
6. Verify `/`, `/scorecard`, `/pilot`, `/authority`, `/company`, `/ledger`.

The `/api/leads` function is a secretless proxy to the already-live Supabase intake function.

After a Vercel project exists, future deployments can be automated from Git.

Optional later:

- connect a custom domain,
- set canonical/OG URL metadata once the final domain is known.

### 2. Connect the real sender mailbox

The authority and executor seams are ready, but a production Gmail/OAuth provider is not yet attached to the queue worker.

Desired sender identity:

- a Company 01 business mailbox rather than a personal address, if available.

The first automatic email should only be the **explicitly requested inbound acknowledgement / pilot packet**. Unsolicited outbound remains human-approved.

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
synthetic onboarding started                > 0
useful operator/customer output             > 0
economic value / paid pilot                 > 0
unauthorised executions                      0
duplicate consequences                       0
post-revocation executions                   0
approval bypasses                            0
missing authority receipts                   0
```

Do not substitute synthetic stress metrics for these longitudinal real-company metrics.

## Recommended return sequence

When you come back:

1. Check CI on PR #31.
2. Open the prefilled Vercel deploy/import link above.
3. Test `/scorecard` once from the public URL using a disposable test lead, then delete that lead.
4. Check `/ledger` updates without exposing the test lead identity.
5. Connect Company 01 email.
6. Connect Calendar.
7. Send the live Scorecard to Bao + Christopher.
8. Start real traffic and let the public ledger move from zero.

Everything before step 2 should be code/infrastructure rather than manual sales administration.
