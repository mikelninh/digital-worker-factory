# What "one click" means

The customer-facing goal is:

```text
START PILOT
  → select template
  → connect/read data
  → run shadow replay
  → view proof
  → KEEP AS COPILOT
```

It does not mean one universal API connection to every customer system.

Behind the button, HausPilot still performs explicit, auditable steps: tenant config, connector authorization, data mapping, preflight, evals and policy gates. The UI should compress those steps without hiding them.
