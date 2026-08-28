# Zapier / webhook adapter

This folder documents the no-code/low-code edge of the proof.

## Synthetic flow

1. Trigger: a new support request is received in a ticketing or form system.
2. Zapier action: **Webhooks by Zapier → POST**.
3. Target: the AWS Lambda/API Gateway endpoint that wraps `lambda.mjs`.
4. Payload: use `sample-payload.json`.
5. The handler validates the payload, checks idempotency, loads context, evaluates policy and returns a reviewable result.

Zapier is intentionally only the event adapter. Business rules stay in versioned code where they can be tested, reviewed and observed.

This is a portfolio proof, not a live Caya integration.
