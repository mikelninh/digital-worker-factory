# Company 01 — Legal / Privacy Launch Gate

This file is an operational launch gate, not legal advice. It exists so the acquisition site is not pushed into real public traffic while required provider/privacy details are still unknown.

## Why this cannot be fully auto-filled

Company 01 does not yet have a confirmed public legal identity/address/contact record in this repo. Do **not** guess or publish a private address.

For a business-facing German digital service, § 5 DDG requires provider information such as the provider's name/address and an email/contact route to be readily recognisable, directly accessible and permanently available. If applicable, legal-form, representative, register, supervisory-authority and VAT/business-identification details also belong there.

Official source:

https://www.gesetze-im-internet.de/ddg/__5.html

When Company 01 collects lead/contact data directly from a prospect, GDPR Article 13 requires information at collection including controller identity/contact, purposes/legal bases, recipients/categories, retention, data-subject rights and supervisory-complaint information, plus other items where applicable.

Official source:

https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679

## Michael-only fields to decide once

Before sending public traffic, fill:

- [ ] legal provider/controller name
- [ ] legal service address
- [ ] business contact email
- [ ] legal form, if applicable
- [ ] authorised representative, if applicable
- [ ] commercial/company register + number, if applicable
- [ ] VAT ID / business ID, if applicable
- [ ] competent supervisory authority, only if applicable
- [ ] privacy contact / DPO contact, if applicable
- [ ] final lawful-basis choices for follow-up and pilot onboarding
- [ ] verify processor/DPA setup for Supabase and Vercel
- [ ] verify any international-transfer disclosures/safeguards that apply
- [ ] select the competent data-protection supervisory authority for the controller

## Prepared but intentionally not routed

Templates live at:

- `site/legal-notice.template.html`
- `site/privacy.template.html`

They are `.template.html` files and are **not** in `site/vercel.json`. This prevents placeholder controller/address values from accidentally becoming a public legal notice.

After the fields above are confirmed:

1. replace all `{{...}}` placeholders,
2. have the final text reviewed for the actual legal setup,
3. rename/copy to `legal-notice.html` and `privacy.html`,
4. add `/legal` and `/privacy` routes,
5. add links from the global footer and next to the Scorecard/onboarding consent text,
6. add CI that fails if `{{` remains in either public file,
7. only then start real public traffic.

## Data-processing facts already known from the implementation

These are implementation facts, not final legal conclusions:

### Scorecard without follow-up

- scoring happens in the browser,
- no contact details are required to see the score/result,
- no Scorecard submission is sent to Company 01 merely to calculate the result.

### Explicit follow-up submission

Persisted fields include:

- organisation name
- work email
- explicit follow-up consent + timestamp
- source
- sector / agent stage
- readiness / authority-risk / consequence scores
- recommended pilot
- Scorecard answers/result
- funnel status / next action

Reference retention in the current schema:

- lead `expires_at`: 180 days after creation unless lifecycle/legal needs lead to an earlier deletion/change

### Abuse prevention

- caller IP is processed transiently at intake,
- only a SHA-256 IP hash is persisted for rate limiting,
- raw IP is not written into the Company 01 growth tables,
- rate-limit rows older than one day are cleaned during intake.

### Safe onboarding

- invitation token is random and short-lived,
- only its SHA-256 hash is stored,
- token expires after 14 days and can be revoked/reissued,
- onboarding UI forbids production credentials and asks for synthetic/redacted/non-sensitive examples only,
- onboarding packet includes workflow, accountable human owner, systems names, desired output and 1–5 safe examples.

### Infrastructure currently handling prospect data

- Supabase project `company-01`, region `eu-central-1`
- future public website hosting intended on Vercel

Before launch, verify the controller's DPA/processor and international-transfer disclosures for the actual accounts/configuration in use.

## Suggested processing-basis review

Have the final setup reviewed rather than blindly copying these labels, but the implementation was designed around:

- prospect-requested follow-up: explicit opt-in/consent and/or pre-contractual request as appropriate to the exact interaction,
- security/rate limiting: controller security/abuse-prevention interest,
- requested pilot preparation: steps requested by the prospect before/around a commercial pilot,
- no marketing-list subscription is implied by the current Scorecard checkbox.

Unsolicited outbound remains separately authority-gated and is not justified by the inbound consent flag.
