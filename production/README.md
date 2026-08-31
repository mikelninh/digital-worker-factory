# Production Readiness Layer

`working proof != production ready`.

This layer turns that statement into executable gates for the Digital Worker Factory runtime.

## What this closes now

The reusable `core/production-boundary.mjs` adds a fail-closed boundary around an existing Agent Gateway:

- tenant context is mandatory;
- actor identity + role are mandatory;
- an actor cannot silently cross tenants;
- effectful execution requires an idempotency key;
- repeated execution with the same tenant/capability/key is blocked;
- production audit events are structured and secret-redacted;
- a release cannot call itself engineering-ready until every production gate is explicitly true.

## Production engineering gates

A deployment must provide evidence for all of these before `evaluateProductionReadiness()` returns `ready: true`:

1. identity and access;
2. tenant isolation;
3. durable persistence;
4. durable audit sink;
5. durable idempotency store;
6. secret management;
7. observability + SLOs;
8. retention + deletion;
9. backup/restore drill;
10. deployment + rollback.

The in-memory audit and idempotency implementations in the repository are **test/pilot adapters only**. A real deployment must bind the same interfaces to durable infrastructure.

## What code cannot prove

Engineering readiness does not prove:

- real customer task accuracy;
- a customer's security or privacy acceptance;
- legal or clinical validity;
- reliability of a customer's external systems;
- regulatory approval;
- an SLA until the operating service has measured evidence.

Those remain external evidence gates.

## Intended rollout

```text
DRAFT
  ↓
SYNTHETIC EVAL
  ↓
CONTROLLED PILOT
  ↓
production engineering gates all green
  ↓
external domain + security evidence
  ↓
CONTROLLED PRODUCTION
  ↓
measured operations / SLOs / incident history
  ↓
TRUSTED
```

Autonomy and production claims are earned separately.
