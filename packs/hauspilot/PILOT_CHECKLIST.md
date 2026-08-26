# HausPilot post-sale checklist

Use this immediately after a customer says yes.

## 1. Freeze scope

- one workflow template only
- named operator / reviewer
- baseline sample: 20–50 historical cases
- agreed success metrics
- no production writes during initial test

## 2. Collect minimum inputs

- historical cases or messages
- `properties.csv`
- optional contacts/vendors/FAQ rules
- 3–5 examples of a good completed outcome
- client-specific escalation rules

## 3. Generate client pack

- copy `client.example.json`
- set company id + template
- map sources
- set policy boundaries
- compile with `compile.mjs`

## 4. Run preflight

- required files present
- property IDs resolvable
- no real credentials committed to git
- approval and never-auto actions present
- DPA/authorisation status recorded before personal production data

## 5. Historical shadow test

For every case, capture:

- human historical outcome
- HausPilot structured proposal
- classification/routing correctness
- evidence used
- missing facts identified
- unsafe action attempts (must be zero)
- estimated operator minutes with vs without proposal

## 6. Review with customer

Show only five numbers first:

1. cases tested
2. routing/classification accuracy
3. unsafe actions
4. median minutes before
5. median minutes with copilot

Then show failures and corrections. Do not hide them.

## 7. Decision gate

### KEEP

Move to live read-only shadow ingestion if the workflow clearly saves time and safety gates hold.

### FIX

Adjust mapping/rules and replay the same gold cases.

### STOP

If the economics or reliability are weak, stop the pilot instead of forcing automation.

## 8. Promotion

```text
historical replay
  → live shadow
  → human-reviewed copilot
  → optional limited automation for explicitly safe actions only
```

Never promote based on model confidence alone.
