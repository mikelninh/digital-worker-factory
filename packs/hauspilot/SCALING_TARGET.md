# HausPilot delivery scaling target

## Commercial target

A common pilot should require **configuration, not bespoke agent engineering**.

Target effort after the template pack is mature:

- 10 minutes: create tenant config
- 20 minutes: map/export master data
- 20 minutes: load historical cases
- automated: compile + preflight + regression evals
- human: review results and client-specific policy

The first customers will take longer because they are teaching us the mappings and edge cases. Those learnings should improve the shared template, not create permanent forks.

## Reuse target

For the three standard workflows:

- 80–90% shared template/runtime/evals/UI
- 10–20% client mapping, rules and integrations

This is a target, not a current measured result. Track actual delivery hours per customer and update it.

## Fork rule

Do not create a customer-specific worker unless at least one of these is true:

1. the workflow state machine is materially different;
2. the authority/policy boundary is materially different;
3. the output contract is materially different.

Different field names, software vendors, response tone, property IDs and routing labels are configuration/connector concerns, not new workers.
