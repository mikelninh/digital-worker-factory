# Architecture Deepening — Capability Outcome Receipt

## Problem

`AgentGateway` already centralises permission checks and execution, but callers/auditors had to reason about several result shapes plus an internal audit representation. That creates a weak seam for evals, operations and future metering.

## Deep module

`core/outcome-receipt.mjs` defines one non-sensitive result contract for every capability invocation.

The receipt owns:

- actor/capability identity;
- policy outcome;
- approval state;
- execution outcome;
- non-sensitive error state;
- ethical billability classification.

It deliberately does **not** include raw input or executor output.

## Interface

- `createOutcomeReceipt(...)`
- `assertOutcomeReceipt(...)`

`AgentGateway.invoke(...)` continues to return the provider output on successful execution for the immediate caller, but every path also returns and audits the same receipt shape.

## Before

```text
policy → blocked/shadow/executed/failed result shapes
                         ↘ private audit objects
```

## After

```text
capability invocation
        ↓
     policy gate
        ↓
 execution / no execution
        ↓
Capability Outcome Receipt
   ↙ audit   ↓ eval   ↘ metering
```

## Deletion test

Without Outcome Receipt, audit, evaluation, customer reporting and ethical billing would each need to reconstruct policy/outcome semantics from gateway internals. The receipt concentrates that complexity behind one interface.
