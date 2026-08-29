# Open Capability Network — Scale Architecture

**Goal:** design a trust rail that can scale horizontally from pilots to very high request volume without making unmeasured throughput claims.

## Principle

“Ready for billions” is not one large server. It is a stateless, partitionable data plane, a small deterministic control plane, explicit backpressure, independent capability workers, strong observability and measured load evidence.

## Logical architecture

```text
                         +-----------------------------+
                         |       CONTROL PLANE         |
                         | catalog / policy / versions |
                         | tenants / quotas / rollout  |
                         +--------------+--------------+
                                        |
                                        v
Agent / Government UI -> Edge / API Gateway -> Capability Router
          |                  |                   |
          |                  |                   +--> deterministic worker pool
          |                  |                   +--> LLM/eval worker pool
          |                  |                   +--> provider adapters
          |                  |                   +--> async job queue
          |                  |
          |                  +--> auth / rate / spend / request-id / WAF
          |
          +<---------------- Evidence + Receipt + Result

Observability plane: traces / metrics / logs / outcome measurements
Proof plane: request hash / output hash / policy version / approval / execution receipt
```

## 1. Edge layer

Responsibilities:

- TLS termination.
- DDoS/WAF/bot controls.
- request size limits.
- per-tenant and per-agent rate limits.
- optional machine-payment verification.
- request IDs and idempotency-key forwarding.
- cache only public/versioned discovery metadata and explicitly cache-safe deterministic results.

The edge layer must never grant domain authority. It may authenticate, meter and reject traffic; business permission remains in the policy/authority layer.

## 2. Capability router

The router is stateless.

Input:

```json
{
  "capabilityId": "document.preflight.v1",
  "capabilityVersion": "0.1.0",
  "actor": {"id": "...", "tenant": "..."},
  "purpose": "application-preflight",
  "input": {}
}
```

Responsibilities:

- resolve exact capability version.
- reject unknown/disabled versions.
- apply tenant/purpose/risk policy.
- select provider deployment.
- enforce timeout and payload limits.
- attach trace context.
- return stable error envelope.

No sticky session should be required.

## 3. Capability worker classes

### Class A — deterministic / cheap

Examples: rule calculations, schema validation, hashing, known-rights calculations.

Scale profile:

- horizontally scalable.
- aggressive safe caching by source/version/input hash where semantics allow.
- high concurrency.
- target for first 1k RPS synthetic benchmark.

### Class B — retrieval / evidence

Examples: legal/budget/freshness lookup, document evidence retrieval.

Scale profile:

- indexed stores separated from API workers.
- query quotas.
- versioned source snapshots.
- cache by source snapshot + query hash where safe.
- degrade explicitly if freshness/source provider is unavailable.

### Class C — LLM/evaluation

Examples: Judge, complex document preflight, synthesis.

Scale profile:

- queue/backpressure.
- per-tenant token/cost budgets.
- model-provider circuit breakers.
- bounded concurrency.
- timeout and cancellation.
- asynchronous job option for expensive requests.

### Class D — consequential action

Examples: external writes or workflow execution through OpenAction.

Scale profile:

- never fire-and-forget.
- explicit authority proof.
- idempotency key required.
- exactly-once effect attempted through provider-specific dedupe/reconciliation.
- approval token consumed once.
- action receipt mandatory.

## 4. Data and tenancy

Default public capability posture:

- do not accept sensitive data unless explicitly declared.
- no hidden retention.
- request bodies are not used as analytics/training data by default.
- receipts contain hashes/metadata rather than raw sensitive content where possible.

Institutional deployment:

- tenant-isolated configuration and secrets.
- tenant-level encryption/material where warranted.
- explicit regional deployment profile.
- customer VPC / sovereign-compatible deployment for sensitive domains.
- artifact/object storage separated from stateless workers.

## 5. Idempotency and replay

Every paid or consequential request should support an `Idempotency-Key`.

The server stores a bounded record keyed by:

```text
tenant + capability + version + idempotency-key
```

The record binds:

- request hash.
- status.
- output/receipt reference.
- expiration.

If the same key arrives with a different request hash, fail closed.

For machine payment, payment replay protection and application idempotency are separate controls; both are required.

## 6. Policy and authority

Policy evaluation must remain deterministic and external to the model.

Inputs include:

- authenticated actor / agent identity.
- tenant.
- purpose.
- capability/version.
- risk.
- requested operation.
- proof/credential state.
- approval state for consequential action.

Output:

```json
{
  "allowed": true,
  "executionAllowed": false,
  "humanApprovalRequired": true,
  "policyVersion": "...",
  "reason": "..."
}
```

No payment, prompt content or model-generated role may mutate these inputs.

## 7. Receipts

Receipts are lightweight trust artifacts, not a database dump.

Minimum receipt fields:

- schema/version.
- capability ID/version.
- trace ID.
- request hash.
- output hash.
- policy version / decision where applicable.
- evidence/source snapshot identifiers where applicable.
- payment verification/settlement reference where applicable.
- approval/action reference where applicable.
- explicit statement that payment did not grant authority.

Long term, OpenReceipts should support detached signatures so an institution can verify receipt integrity independently of the serving API.

## 8. Observability

OpenTelemetry-compatible traces should connect:

```text
edge request
 -> policy
 -> provider/retrieval/model
 -> result
 -> receipt
 -> optional action
```

Metrics per capability/version:

- requests/s.
- success/error/timeout rate.
- p50/p95/p99 latency.
- queue depth.
- downstream-provider health.
- cost per call.
- evidence coverage.
- human override/escalation rate.
- outcome metric where defined.

Do not combine all capabilities into one misleading latency/SLA number.

## 9. Failure strategy

Fail closed when:

- authority/proof is missing for consequential action.
- capability/version is unknown.
- policy service cannot determine permission.
- idempotency key conflicts.
- evidence freshness requirement cannot be met.

Degrade gracefully when safe:

- one optional evidence source is unavailable.
- a non-authoritative enrichment provider fails.

The returned result must disclose degraded evidence/freshness rather than silently acting normal.

## 10. Deployment profiles

### Managed EU

Fastest developer/pilot path for non-sensitive workloads.

### Customer VPC

OCN containers/services run in buyer-controlled cloud account/network.

### Sovereign-compatible

Provider-neutral containerized runtime, open protocols and separable model/provider layer intended to integrate with institution/public-IT-operated infrastructure. This label does not itself claim a government certification.

## 11. Throughput validation ladder

Do not publish a scale claim before each stage is measured.

1. contract tests on every commit.
2. concurrency smoke in CI.
3. hosted deterministic capability at 100 RPS for 10 minutes.
4. hosted deterministic capability at 1k RPS burst + sustained test.
5. failure injection: provider timeout, queue saturation, duplicate idempotency keys.
6. autoscaling/cold-start observation.
7. multi-region/edge evaluation if demand requires it.
8. sustained production telemetry before higher SLO claims.

For expensive LLM capabilities, throughput is constrained intentionally by cost/queue budgets; billion-call architecture does not mean allowing unbounded model calls.

## 12. Cost architecture

The unit economics must be observable per call.

```text
revenue / allocated contract value
- payment fees
- model cost
- retrieval/storage cost
- compute
- provider/API cost
- support/SLA allocation
= contribution margin
```

High-volume deterministic capabilities should have very high gross margin. Expensive LLM capabilities need model routing, caching where semantically safe, batch/asynchronous modes and minimum pricing.

## 13. First scale implementation checklist

- [x] stateless Node gateway reference implementation.
- [x] machine-readable discovery catalog.
- [x] explicit payment/authority separation.
- [x] bounded request body.
- [x] health endpoint.
- [ ] idempotency middleware.
- [ ] request-ID middleware / trace propagation.
- [ ] per-tenant rate/usage abstraction.
- [ ] provider adapter timeout/circuit breaker.
- [ ] queue interface for expensive jobs.
- [ ] OpenTelemetry exporter.
- [ ] detached receipt signatures.
- [ ] synthetic load test harness.
- [ ] measured hosted throughput baseline.

The next hardening PR should implement the unchecked items in this order: idempotency -> request IDs -> rate/usage budgets -> provider timeouts -> load harness -> tracing.
