# Production Readiness Layer

`working proof != production ready`.

This layer turns that statement into executable gates for the Digital Worker Factory runtime.

## Production Platform v1

`production/platform-v1.mjs` is the reusable operating contract that products bind to real infrastructure.

```text
Authenticated tenant + actor
        ↓
tenant-scoped persistence + object storage
        ↓
idempotency reservation
        ↓
durable queue → bounded retry → dead letter
        ↓
redacted audit
        ↓
retention / tenant deletion
        ↓
health + readiness
```

The reference adapters are intentionally in-memory and therefore fail readiness. The same end-to-end suite also proves tenant isolation, duplicate-effect prevention, retry/dead-letter behavior, secret redaction, tenant deletion and backup/restore semantics.

**Reference product:** PrüfPilot now binds the contract to an actual Postgres backend in its own repository. Its CI boots Postgres 17, persists tenant-scoped metadata + original PDF bytes, verifies idempotency and deletion, and proves that `/api/ready` can reach `ENGINEERING_PRODUCTION_READY` only when the full configured engineering gate set is present.

## What this closes now

The reusable `core/production-boundary.mjs` adds a fail-closed boundary around an existing Agent Gateway:

- tenant context is mandatory;
- actor identity + role are mandatory;
- an actor cannot silently cross tenants;
- effectful execution requires an idempotency key;
- repeated execution with the same tenant/capability/key is blocked;
- production audit events are structured and secret-redacted;
- a release cannot call itself engineering-ready until every production gate is explicitly true.

Production Platform v1 additionally standardises:

- tenant-scoped record and object storage contracts;
- durable-health capability reporting;
- effect queue semantics;
- bounded retries and dead-letter state;
- tenant-level deletion;
- backup/restore test semantics;
- a single cross-product readiness surface.

## Production engineering gates

A deployment must provide evidence for all of these before it can report engineering production readiness:

1. identity and access;
2. tenant isolation;
3. durable persistence;
4. durable object storage;
5. durable audit sink;
6. durable idempotency store;
7. durable queue + bounded retry/dead-letter;
8. secret management;
9. observability + SLOs;
10. retention + deletion;
11. backup/restore drill;
12. deployment + rollback.

In-memory implementations remain **test/pilot adapters only**. A real deployment must bind the same interfaces to durable infrastructure.

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
