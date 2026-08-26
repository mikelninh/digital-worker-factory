# AI Operations Sprint — Customer Start

This is the **customer-facing source of truth** for a standard paid pilot.

## Before data is requested

We already agree on:

- **one workflow**
- scope / SOW
- price: **€1,900 net**
- **€1,330 paid before kickoff**
- one contact on each side

The customer does not need to choose or configure the workflow again.

## The customer gives exactly 3 things

1. **20–50 completed historical examples** from the agreed workflow
2. **one simple master-data list** such as properties / units or vendors
3. **one reviewing person** who can judge whether the prepared result is correct

That is the customer onboarding for the standard pilot.

## Data transfer and privacy

The public demo **never collects customer data**.

For the delegated standard path:

- prefer synthetic or genuinely de-identified/anonymised historical data
- use the agreed secure transfer channel
- do not request productive mailbox, ERP or write access
- direct identifiers such as name, email, phone and IBAN are blocked in anonymised mode
- if real property/unit references still make a person identifiable to the customer, do **not** assume the data is anonymous; Operations stops and Privacy/Owner reviews the case
- pseudonymised or personal data leaves the standard Operations path before processing

The pilot workspace uses a **14-day retention window from data receipt**. Local pilot raw data is deleted on closeout or when the retention deadline is reached. Operations also confirms deletion of temporary upload/transfer copies. A minimal deletion proof is retained; this is not a forensic secure-wipe claim.

## What happens next

**Customer uploads → Operations tests → reviewer decides → customer gets the result.**

The customer does not need to understand prompts, JSON, model configuration, APIs, policy state machines or internal evaluation tooling.

## What the reviewer sees

For each prepared case:

> **Ist das fachlich richtig?**

Then exactly one choice:

- **Richtig**
- **Ändern**
- **Falsch**

For Ändern/Falsch, the reviewer chooses one short reason. No action is executed automatically.

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
- send/collect the remaining **€570**
- execute the agreed data closeout
- if the result is `Weiter`, the standard continuation for the same proven workflow can be offered at **€750/month**
- continuation is activated only after the customer **explicitly accepts** it; there is no hidden subscription

Payment collection and secure file transfer remain human-operated V1 Operations tasks — not Founder-only tasks and not falsely described as automated.
