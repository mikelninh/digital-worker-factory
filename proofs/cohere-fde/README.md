# Cohere FDE runtime proof

A small executable proof for the Forward Deployed Engineer application.

## What it proves

The public North Mission Control demo does not decide outcomes in front-end JavaScript. It calls a serverless endpoint that executes this runtime on top of the Factory's real `AgentGateway`, `CapabilityRegistry`, policy gate and security boundary.

The synthetic flow is deliberately narrow:

`policy.read → crm.lookup → contract.read → case.update.prepare → case.update.release`

The final capability is `consequential` + `external`, so it cannot execute without explicit human approval.

## Expected states

- Complete evidence, no approval → `REVIEW_REQUIRED`
- Missing contract → `BLOCKED` before prepare/release
- Complete evidence + explicit approval → `APPROVED`, but the executor is synthetic-only

No customer data, payment, message or other external side effect exists in this proof.

## Run locally

```bash
node --test proofs/cohere-fde/runtime.test.mjs
```

## Public surface

- Demo: https://mikelninh.github.io/cohere-fde/
- Runtime code: `runtime.mjs`
- Tests: `runtime.test.mjs`

The deployed endpoint imports a pinned commit of this runtime so the public run receipt is tied to inspectable source rather than an unversioned demo implementation.
