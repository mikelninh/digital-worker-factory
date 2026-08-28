# Public IT Provider Integration Pattern

## Objective

Make one Open Capability Network integration reusable across many authorities without forcing a shared LLM vendor or replacing existing Fachverfahren.

## Recommended topology

```text
Authority agent / UI
       |
       v
Public IT provider API / identity / tenant boundary
       |
       v
OCN capability gateway
       |
       +--> local/public-IT-hosted capability
       +--> approved managed capability
       +--> authority-owned provider
       |
       v
Evidence + receipt
       |
       v
Existing Fachverfahren / human review
```

## Provider controls

The public IT provider should be able to control:

- tenant onboarding.
- identity/authentication integration.
- allowed capability/version set.
- quotas and budgets.
- region/deployment choice.
- provider routing.
- log/trace export.
- model provider policy.
- retention profile.
- rollout/rollback.

OCN supplies reusable schemas, provider adapters, eval/golden-case contracts, policy gates and receipts.

## Minimal HTTP consumption

Discovery:

```http
GET /.well-known/open-capabilities.json
```

Inspect:

```http
GET /v1/capabilities/document.preflight.v1
```

The consuming agent should evaluate readiness, risk, evidence and privacy metadata before use rather than hard-coding a marketing assumption.

## Sovereignty

A `sovereign-compatible` capability means its contract/runtime is designed to be deployable through provider/customer-controlled infrastructure and is not intrinsically tied to one LLM vendor. It is not a certification claim.

Recommended production path for sensitive government workloads:

1. provider-hosted gateway/control plane.
2. provider/customer identity.
3. local capability workers where feasible.
4. external provider calls only when explicitly approved.
5. human authority retained in existing system.

## Portability

All providers should be able to export:

- capability definitions.
- eval cases/results.
- receipts/audit metadata.
- source/version metadata.
- deployment configuration excluding secrets.

The institution should not need to surrender its data or authority model in order to change the underlying LLM/provider.
