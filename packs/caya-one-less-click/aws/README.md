# AWS deployment proof

`template.yaml` is an AWS SAM deployment manifest for the synthetic One Less Click handler.

It maps `POST /support` to `lambda.mjs` using the Node.js 22 Lambda runtime.

This repository proves the deployment shape and runtime contract. It does **not** claim that the function is currently deployed in an AWS account.

A real deployment would additionally configure authentication/webhook verification, secrets, structured logging, alarms, tenant boundaries and persistence outside process memory.
