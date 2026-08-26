# AI Operations Sprint — Customer Start

This is the **customer-facing source of truth** for starting the first paid AI Operations Sprint.

## Before we ask the customer for data

We already agree internally with the customer on:

- **one workflow** to test
- scope / SOW
- price: **€1,900 net**
- **€1,330 paid before kickoff**
- named contact on both sides

The workflow choice is therefore **not another onboarding task**.

## The customer gives exactly 3 things

1. **20–50 completed examples** from the agreed workflow
2. **one simple master-data list**, e.g. properties / units or vendors
3. **one reviewing person** who can say whether the prepared result is correct

That is the customer onboarding for V1.

## Data transfer

The public demo **never collects customer data**.

For the delegated standard pilot:

- use synthetic or genuinely anonymised historical data
- use a customer-approved secure file-transfer channel
- do not ask for mailbox, ERP or production write access
- pseudonymised or personal data leaves the standard path and is escalated to Privacy/Owner before processing

The Operations Assistant handles the standard pilot in the internal Operations Console. The customer never needs the console.

## What happens next

**Customer gives → we test → reviewer decides → customer gets the result.**

The customer does not need to understand:

- prompts
- JSON
- model configuration
- APIs
- policy state machines
- internal evaluation tooling

## What the reviewer sees

For each prepared case, one question:

> **Ist das richtig?**

Then exactly one choice:

- **Richtig**
- **Ändern**
- **Falsch**

## What the customer gets at the end

Three answers:

- **Funktioniert es?**
- **Spart es Zeit?**
- **Ist es sicher?**

And one recommendation:

- **Weiter**
- **Verbessern**
- **Stoppen**

Technical evidence remains available in an audit section, but is not the main customer experience.

## Commercial closeout

At handover:

- deliver the measured result
- send/collect the remaining **€570**
- execute the agreed pilot-data deletion and retain the minimal deletion proof
- if the result is `Weiter`, offer the standard continuation for the same proven workflow

Payment collection and secure file transfer remain human-operated V1 steps, but they are Operations tasks — not Founder-only tasks. Do not describe them as automated until they actually are.
