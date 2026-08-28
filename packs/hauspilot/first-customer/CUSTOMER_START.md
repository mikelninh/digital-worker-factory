# HausPilot — Customer Start

This is the **customer-facing source of truth** for the launch offer.

## Commercial path

### Free Mara demo

- price: **€0**
- synthetic/browser-only examples
- no credit card required
- no customer data required
- no live mailbox or production action

### 7-day Proof Week

Before customer data is requested, we agree on:

- **one workflow**: standard launch workflow is maintenance / repair intake
- price: **€990 net, one-time**
- **€990 paid before kickoff**
- one contact on each side
- one reviewing person at the customer

The Proof Week never creates an automatic subscription.

If the customer continues directly into the monthly Mara service, the **€990 Proof Week fee is credited in full against the first €1,500 monthly charge**.

### Mara monthly

- standard price: **€1,500 net/month** for the same proven workflow
- activated only after a successful/accepted proof and **explicit customer opt-in**
- monthly cancellation as stated in the commercial agreement
- no hidden subscription

## The customer gives exactly 3 things

1. **20–50 completed historical examples** from the agreed workflow
2. **one simple master-data list** such as properties / units
3. **one reviewing person** who can judge whether the prepared result is correct

That is the customer onboarding for the standard Proof Week.

The customer does not choose model settings, prompts, runtime flags or internal autonomy levels.

## Data transfer and privacy

The public free demo **never collects customer data** and must remain clearly labelled synthetic.

For the Proof Week:

- prefer synthetic or genuinely de-identified/anonymised historical data
- use the agreed secure transfer channel
- do not request productive mailbox, ERP or write access
- direct identifiers such as name, email, phone and IBAN are blocked in anonymised mode
- if real property/unit references still make a person identifiable to the customer, do **not** assume the data is anonymous; Operations stops and Privacy/Owner reviews the case
- pseudonymised or personal data leaves the standard Operations path before processing

The Proof Week workspace uses a **14-day retention window from data receipt**. Local raw data is deleted on closeout or when the retention deadline is reached. Operations also confirms deletion of temporary upload/transfer copies. A minimal deletion proof is retained; this is not a forensic secure-wipe claim.

## What happens after payment

**Customer gets start link → provides 3 things → Operations runs preflight + proof → reviewer decides → customer gets report.**

The customer does not need to understand prompts, JSON, model configuration, APIs, policy state machines or internal evaluation tooling.

In V1, payment confirmation and the secure transfer channel are still human-operated HausPilot Operations tasks. The public `/start` page is the customer UX contract, not a false claim that production uploads are already fully self-service.

## What the reviewer sees

For each prepared case:

> **Ist das fachlich richtig?**

Then exactly one choice:

- **Richtig**
- **Ändern**
- **Falsch**

For Ändern/Falsch, the reviewer chooses one short reason. No external action is executed automatically during the Proof Week.

## What the customer gets at the end

Three answers:

- **Funktioniert es?**
- **Spart es Zeit?**
- **Ist es sicher?**

And one recommendation:

- **Weiter**
- **Verbessern**
- **Stoppen**
- **Weiter messen** if the evidence is not yet sufficient

Time/ROI is shown as measured only when the baseline/source was customer-confirmed or jointly measured. Otherwise the report says **Noch messen** rather than inventing a saving.

## Commercial closeout

At handover:

- deliver the measured result
- confirm Proof Week payment is complete
- execute the agreed data closeout
- if the result is `Weiter`, offer **Mara at €1,500/month** for the same proven workflow
- if the customer continues directly, account for the **€990 Proof Week credit against month 1**
- activate continuation only after the customer **explicitly accepts** it

No customer opt-in → no monthly service.

## Production progression after proof

The intended order is:

**Microsoft 365 read-only → Live Shadow → Copilot approvals → earned low-risk automation → bounded workflow ownership**

Payment collection, secure file transfer and the first live connector activation are still V1 Operations tasks until the corresponding production rails are implemented and tested.
