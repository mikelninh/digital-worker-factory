# Trust Stack v1 — Production Contract

> No consequential finding or effect without a complete, inspectable trust chain.

The Digital Worker Factory treats provenance as runtime data, not UI decoration.

## The chain

1. **Authenticity** — what can we prove about the source identity?
   - `unverified`: origin is not established.
   - `original_as_received`: the system can prove these are the exact bytes/record received at intake.
   - `verified_issuer`: issuer identity has been independently verified (for example a valid signature or authenticated first-party integration).
2. **Integrity** — SHA-256, version and capture timestamp bind later findings to the exact source version.
3. **Provenance** — source system, source URI and acquisition time show where the evidence came from.
4. **Authority** — rules must carry an authority id, title, version and independently openable source URL. Case-specific authorities (for example a grant notice or contract) are explicitly distinguished from public authoritative rules.
5. **Exact evidence** — every material finding points to a stable locator (page, paragraph, row, field or record) plus an excerpt hash.
6. **Derivation** — store a concise, reviewable derivation summary: which evidence + which rule produced which finding. Do not store or depend on hidden model chain-of-thought.
7. **Human decision** — consequential execution requires a recorded qualified approver; the approval identity must match the runtime approval.
8. **Audit** — trace id, timestamp and a digest of the trust chain travel with the execution/audit event.

## Fail-closed invariants

- `ProductionAgentGateway` blocks `execute` when the configured minimum trust level is not met.
- Production effect jobs cannot enter the generic queue without a valid trust chain and recorded matching approval.
- A missing locator, source hash, authority version, provenance record or audit anchor is a blocker, not a warning.
- `original_as_received` never masquerades as `verified_issuer`.
- Synthetic fixtures may exercise the contract but must never be represented as production evidence.
- Approval in policy and approval in the trust chain must agree on actor and state.

## Assurance levels

### `none`
The chain is structurally incomplete or authenticity is unverified. Useful for experiments/shadow mode only.

### `traceable`
Original-as-received source + verified integrity + provenance + authority + exact evidence + derivation + decision state + audit anchor. Suitable for controlled real reviewer workflows, subject to domain validation.

### `verified`
Traceable plus independently verified issuer identity and authoritative rule source. This is the target for the highest-assurance workflows.

## Production user experience

Every material finding should support this path:

`Finding → Show source → exact location → open original → open authority/version → derivation summary → decision history → audit event`

Users should be able to verify the work of the system without trusting the model.

## Current implementation

- `core/trust-chain.mjs` — canonical validator + digest.
- `core/production-boundary.mjs` — fail-closed production execution gate.
- `production/platform-v1.mjs` — fail-closed effect-queue gate.
- PrüfPilot — first domain reference implementation for real PDF source capture, SHA-256 integrity, provenance and page-level evidence locators.

## Truth boundary

This architecture can prove what source version was used, where a finding came from, how it was derived, and who approved an action. It cannot by itself prove that an unsigned third-party document contains truthful real-world facts. That requires domain-specific authenticity mechanisms and trusted integrations.
