# HausPilot productized architecture

```text
                CUSTOMER SETUP
                     │
      ┌──────────────┼──────────────┐
      │              │              │
 historical cases  inbox read    master data
      │              │              │
      └──── connector normalization ┘
                     │
              canonical case
                     │
              workflow template
       repair / inbox / invoice
                     │
              shadow inference
                     │
          structured proposal
                     │
       deterministic policy gate
                     │
        operator review + metrics
                     │
            KEEP / FIX / STOP
                     │
       optional approved executor
```

The model is intentionally not the integration layer, policy layer or executor.

This is what allows the same workflow template to work across customers and systems.
