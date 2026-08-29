# Open Capability Network — Threat Model v0.1

## Security objective

An agent may request computation. It must not be able to invent truth, elevate its own authority, bypass human approval, replay consequential work, silently use stale evidence or turn payment into permission.

## Assets

- capability and policy definitions.
- provider credentials/secrets.
- authoritative evidence/source references.
- tenant configuration.
- approvals and authority proofs.
- service/action receipts.
- payment verification/settlement metadata.
- golden-case/eval results.

## Trust boundaries

```text
untrusted caller / model
 -> edge/auth/payment
 -> deterministic policy gate
 -> capability adapter
 -> provider
 -> optional human approval
 -> authoritative external system
```

The model/caller is never an authority source merely because it supplied a role, prompt, payment or confident answer.

## Threats and controls

### T1 — Role / authority spoofing

**Attack:** caller sends `x-agent-role: admin`, asks model to call itself authorized or embeds a fake approval in prompt text.

**Controls:** actor role assigned server-side; policy gate uses authenticated context; caller-supplied role ignored; consequential capabilities require explicit human approval.

**Existing proof:** Agent Commerce contract tests cover spoofed admin role and payment-does-not-buy-authority behavior.

### T2 — Prompt injection causes external action

**Attack:** malicious content instructs agent/capability to send money/messages or modify records.

**Controls:** read capabilities have no action executors; policy/action gateway separate; consequential writes require explicit approved capability; tool availability is not prompt-controlled.

### T3 — Payment used as permission escalation

**Attack:** paid caller expects payment to unlock privileged action.

**Controls:** payment middleware only gates computation; `paymentBuysTrust` must be false; receipt records `paymentGrantedAuthority:false`.

### T4 — Replay / duplicate consequential effect

**Attack:** caller retries after timeout and executes the same write/payment twice.

**Controls planned:** application-level idempotency key, request-hash binding, one-time approval token/action receipt, provider reconciliation. x402 payment replay controls do not replace application idempotency.

### T5 — Provider timeout / cascading failure

**Attack/failure:** downstream provider stalls and consumes worker capacity.

**Controls:** adapter timeout; bounded concurrency/queue for expensive providers; circuit breaker planned; explicit degraded/error response.

### T6 — Unencrypted remote provider

**Attack:** remote HTTP adapter uses plaintext network path.

**Controls:** reusable HTTP adapter refuses remote non-HTTPS endpoints; localhost exception only for local development/tests.

### T7 — Stale rule / evidence

**Failure:** agent receives technically well-formed but outdated legal/policy/budget information.

**Controls:** capability contracts must expose source/version/freshness semantics where relevant; freshness failure should degrade/fail explicitly; Citizen Agents/change detection patterns feed future rule providers.

### T8 — Capability marketed beyond evidence

**Failure:** buyer assumes pilot/adapter code is production-ready.

**Controls:** machine-readable readiness enum; `live` requires reachable endpoint; contract test currently enforces that no unhosted capability is labelled live.

### T9 — Sensitive data sent to wrong capability

**Attack/failure:** caller submits PHI/PII to anonymous/public capability not designed for it.

**Controls:** per-capability `acceptsSensitiveData` and retention contract; public defaults false; payload limits; sensitive workflows institution-hosted/contracted; additional content classification/DLP is a future control, not currently claimed.

### T10 — Secret leakage

**Attack/failure:** buyer private key/provider secret enters Git, image or response.

**Controls:** secret patterns in CI; `.env*` excluded from Docker; buyer wallet file gitignored; seller needs only public receiving address; customer/provider secrets remain environment/secret-store concerns.

### T11 — Malformed/oversized input abuse

**Attack:** invalid input triggers payment, expensive computation or memory pressure.

**Controls:** preflight validation before payment where possible; 16kb reference gateway body limit; provider-specific schemas; edge limits planned.

### T12 — Unbounded cost abuse

**Attack:** caller causes excessive model/provider spend.

**Controls:** buyer smoke cap already exists; server-side per-tenant/capability usage budgets and queue limits planned; expensive capabilities require pricing/cost telemetry.

### T13 — Receipt misrepresents settlement

**Failure:** service body claims on-chain settlement before settlement has occurred.

**Controls:** body receipt says `verified` unless it already has a concrete settlement reference; real x402 settlement evidence comes from `PAYMENT-RESPONSE`; regression test added after live smoke exposed this issue.

## Residual risk / not yet solved

- distributed idempotency store.
- production tenant auth/identity integration.
- distributed rate limiting.
- provider circuit breakers.
- detached/signature-verifiable receipts.
- formal source-freshness SLAs.
- production secrets manager integration.
- SBOM/vulnerability governance.
- DPA/subprocessor package.
- independent security assessment.

These must remain visible gaps, not hidden behind “enterprise ready” language.
