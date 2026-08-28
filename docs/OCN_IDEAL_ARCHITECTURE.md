# Open Capability Network — Ideal Architecture

## North star

**Become the standard trust rail agents call automatically before and after consequential work.**

OCN does not need to own the model, agent framework, cloud, wallet, identity system or government Fachverfahren. It should become the thin, composable trust layer that answers whether an agent has enough evidence, freshness and authority to proceed — and produces a receipt that can be reviewed later.

## Core invariant

> Proof before trust. Authority outside the model. Payment buys computation, not permission or trust.

## Target request path

```text
Agent / workflow
      |
      v
OCN Guard / MCP bridge / platform integration
      |
      |  free discovery
      v
OpenCapabilities control plane
      |
      | paid trusted event
      v
Trust data plane
  +---------------------+
  | trust.preflight     |
  | evidence.verify     |
  | freshness.verify    |
  | authority.check     |
  | entity.resolve      |
  +---------------------+
      |
      +---- block ------> receipt + reason
      |
      +---- review -----> human / deterministic approval system
      |
      +---- allow ------> bounded downstream capability/tool
                               |
                               v
                     Specialist providers
                     Judge / law / rights /
                     documents / public money /
                     customer systems
                               |
                               v
                      optional postflight
                      evidence + Judge
                               |
                               v
                     receipt + trustEventId
                               |
                               v
                    privacy-safe telemetry
                               |
                               v
                    outcome label / override
                               |
                               v
                    eval + policy improvement
```

## 1. Control plane

The control plane changes slowly and is cacheable globally.

It contains:

- capability ID and semantic version;
- readiness (`live`, `adapter_ready`, `pilot`);
- risk class;
- input/output schemas;
- evidence guarantees and known limitations;
- privacy/retention posture;
- deployment options;
- pricing and accepted payment/commercial rails;
- policy/eval version;
- provider health and rollout state;
- deprecation/replacement metadata.

Free endpoints:

- `/.well-known/open-capabilities.json`
- `/.well-known/trusted-events.json`
- health/status/schema endpoints.

The catalog is a truth contract, not marketing. No `live` label without a reachable endpoint and evidence gates.

## 2. Trust data plane

The highest-frequency revenue primitive is a **trusted event**, not a large application.

Launch events:

| Event | Launch price | Target use |
| --- | ---: | --- |
| `freshness.verify.v1` | $0.001 | check time-sensitive evidence |
| `authority.check.v1` | $0.002 | check explicit grants before writes/actions |
| `evidence.verify.v1` | $0.003 | check claim/evidence/provenance binding |
| `trust.preflight.v1` | $0.005 | combine checks into allow/review/block |
| `entity.resolve.org.v1` | $0.01 | bounded organisation resolution |

These are price hypotheses. Optimize for repeat calls, retention and prevented-error value.

Every data-plane worker should become stateless. Shared state belongs in explicit distributed stores, not process memory.

## 3. OCN Guard

OCN Guard is the adoption wedge.

A developer should integrate once and keep their existing tools:

```js
const guard = withOCNGuard({ client: paidOCN })
const safeTools = guard.wrapTool(existingTools, describeRisk)
```

Guard responsibilities:

1. classify declared tool/action risk using application policy;
2. assemble the required preflight inputs;
3. call OCN before the underlying tool;
4. stop `block`;
5. stop `review` by default;
6. execute `allow`;
7. optionally post-verify evidence/output;
8. propagate request IDs and idempotency identifiers;
9. return OCN receipts beside the tool result.

OCN must not infer hidden authority from model intent, payment, API ownership or wallet balance.

## 4. Provider layer

Specialist providers remain independent services behind adapters.

Examples:

- Judge MCP;
- GitLaw;
- PrüfPilot;
- rights services;
- public-money data;
- SafeTrace entity resolution;
- future government/customer APIs.

Provider adapter contract:

- HTTPS remotely;
- bounded timeout;
- typed versioned capability;
- request-ID propagation;
- fail closed on malformed/non-successful provider responses;
- no provider can silently expand OCN authority.

This keeps OCN model-neutral and avoids a monolith.

## 5. Evidence flywheel

The valuable dataset is **evidence about trust decisions and outcomes**, not a warehouse of private prompts.

Reference event fields:

- capability ID/version;
- hashed correlation ID;
- decision/status;
- latency class;
- payment status;
- provider/eval version;
- later outcome label (`correct`, `incorrect`, `overridden`, `failed`, `unknown`);
- structured reason code.

Reference implementation stores no raw request/result payload in telemetry.

Long-term flywheel:

```text
more external trusted events
 -> more outcome-labelled failures/overrides
 -> better golden cases and policy tests
 -> better measured trust decisions
 -> stronger buyer confidence
 -> more integrations
 -> more trusted events
```

Any future richer data retention must be explicit, tenant-scoped, lawful and purpose-limited.

## 6. Distribution edge

One semantic rail, many transports:

- direct HTTP + x402;
- MCP bridge;
- MCP Registry package/remote server;
- x402 Bazaar / Agentic.Market discovery;
- AWS AgentCore through Bazaar/Gateway;
- Cloudflare edge payment and abuse controls;
- institutional invoice/subscription;
- sovereign/customer-operated deployment.

Distribution must never fork trust logic. Platform integrations adapt transport/payment/identity assertions into the same OCN event contracts.

## 7. Payment architecture

Payment is a replaceable rail.

Supported target models:

- x402 machine payments;
- MPP where appropriate;
- prepaid credits;
- enterprise/government metered invoice;
- annual/platform license.

Accounting identity and authority identity are separate concepts.

Mainnet must remain fail closed until:

- merchant custody is appropriate;
- reconciliation exists;
- refunds/credits are defined;
- duplicate-payment protection is proven;
- incident handling and abuse limits exist;
- taxes/accounting have an operational owner;
- an explicit release gate approves production money.

## 8. Scale architecture

Do not claim billion-call readiness from one Node process.

### Edge

- DDoS/bot/rate controls;
- payment verification where supported;
- free catalog/schema caching;
- tenant/agent quotas;
- request ID generation/propagation.

### Stateless trust workers

- horizontally scalable containers/workers;
- no local correctness state;
- bounded input size and CPU/time;
- deterministic primitives preferred for high-frequency checks.

### Distributed state

- idempotency/payment identifiers;
- usage budgets;
- policy/version store;
- telemetry counters/traces;
- optional result cache for deterministic, non-sensitive calls.

### Async tier

Large documents, deep research and slow provider work use queues/jobs rather than blocking the atomic trust-event path.

### Observability

Measure per capability/provider/version:

- requests and unique paying agents;
- paid conversion and repeat payer rate;
- revenue / 1k events;
- p50/p95/p99 latency;
- error/payment failure rate;
- allow/review/block distribution;
- outcome-label coverage;
- correctness/override rate;
- downstream actions prevented or escalated.

## 9. Reliability/SLO ladder

Promote only with measured evidence:

1. local contract tests;
2. clean container/package build;
3. public testnet deployment;
4. external paid buyer;
5. 24h soak;
6. 100 RPS controlled load test;
7. 1k RPS distributed load test;
8. multi-region failover test;
9. customer-controlled/sovereign deployment;
10. production mainnet/invoice usage with operational controls.

Every level reports exact environment, payload class, concurrency, errors and latency. Never extrapolate a benchmark into an unsupported scale claim.

## 10. Security boundaries

- no arbitrary server-side URL proxy;
- remote provider adapters require HTTPS;
- model cannot choose privileged provider/model routes unless policy permits;
- malformed input fails before payment;
- spend caps client-side;
- mainnet explicitly enabled only;
- external identifiers are assertions until authenticated by an identity layer;
- consequential writes require explicit authority/human policy;
- raw telemetry payload retention defaults off;
- capability versions immutable in meaning; breaking semantics get a new version.

## 11. Commercial flywheel

Two engines reinforce each other:

### High-frequency machine revenue

Cheap trusted events used automatically by agents.

### High-value institutional revenue

Government/public IT/regulated enterprises pay for pilots, managed/sovereign deployment, annual access, compliance/eval support and usage commitments.

Institutional reference customers make OCN more credible to platforms; platform distribution creates more trusted events; trusted-event evidence improves institutional proof.

## 12. Immediate exit gate

Architecture work is no longer the main blocker when these artifacts are green:

- five trusted events;
- OCN Guard core;
- paid JS Guard SDK;
- paid MCP bridge;
- Bazaar discovery declarations;
- portable OCN container;
- aggregate telemetry/outcome feedback;
- government/network control plane.

Then the critical path is external:

**public HTTPS -> external paid trusted event -> Bazaar discovery -> MCP/SDK publication -> repeat external payer -> first institutional buyer.**
