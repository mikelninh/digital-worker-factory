# Trust Stack v1 — Production Contract

> No consequential finding or effect without a complete, inspectable trust chain.

The Digital Worker Factory treats provenance as runtime data, not UI decoration.

**Canonical machine-readable contract:** [`trust-chain-v1.schema.json`](./trust-chain-v1.schema.json)  
**Canonical runtime validator:** [`../core/trust-chain.mjs`](../core/trust-chain.mjs)

## The chain

1. **Authenticity** — what can we prove about the source identity?
   - `unverified`: origin is not established.
   - `original_as_received`: the system can prove this is the exact source version received at intake.
   - `verified_issuer`: issuer identity has been independently verified, for example by a valid signature or authenticated first-party integration.
2. **Integrity** — SHA-256, version and capture timestamp bind later findings to the exact source version.
3. **Provenance** — source system, source URI and acquisition time show where the evidence came from.
4. **Authority** — rules carry an authority id, title, version and independently openable source URL. Case-specific authorities are explicitly distinguished from public authoritative rules.
5. **Exact evidence** — every material finding points to a stable locator (page, paragraph, section, row, field or record) plus an evidence hash.
6. **Derivation** — store a concise, reviewable derivation summary: which evidence + which rule produced which finding. Do not store or depend on hidden model chain-of-thought.
7. **Human decision** — consequential execution requires a recorded qualified approver; approval identity must match the runtime approval.
8. **Audit** — trace id, timestamp and trust-chain digest travel with the decision/execution history.

## Core invariant

**Traceable is not executable.**

A demo, synthetic or shadow workflow may display a pending or incomplete finding when that state is explicit. A production execution boundary must fail closed unless both the common trust-chain contract and the domain-specific policy are satisfied.

A domain adapter must not accept client-supplied evidence text, authority text or approval identity as trusted truth. Those values must be resolved from server-controlled stores, authenticated principals or verified source adapters.

## Domain adapter obligations

Every real domain adapter must:

1. bind the finding to the original document, resource or record;
2. hash/version the exact source snapshot and revalidate it before consequential use;
3. expose an exact source locator plus an evidence hash;
4. resolve a versioned rule/law/policy/guideline or case-specific authority from a controlled source;
5. record a short evidence-to-finding derivation summary;
6. bind approval to an authenticated, domain-qualified human;
7. preserve later approvals/rejections as append-only decision history;
8. re-check source integrity, authority version and latest human decision at the last responsible moment;
9. fail closed on drift, missing evidence, stale approval, unqualified reviewer or actor mismatch;
10. audit the full path sufficiently to reconstruct what happened.

## Fail-closed invariants

- `ProductionAgentGateway` blocks `execute` when the configured minimum trust level is not met.
- Production effect jobs cannot enter the generic queue without a valid trust chain and recorded matching approval.
- A missing locator, source hash, authority version, provenance record or audit anchor is a blocker, not a warning.
- `original_as_received` never masquerades as `verified_issuer`.
- Synthetic fixtures may exercise the contract but must never be represented as production evidence.
- Approval in policy and approval in the trust chain must agree on actor and state.
- Alternate provider/write/effect paths must not bypass the trust gate.

## Assurance levels

### `none`
The chain is structurally incomplete or authenticity is unverified. Useful for experiments/shadow mode only.

### `traceable`
Original-as-received source + verified integrity + provenance + authority + exact evidence + derivation + decision state + audit anchor. Suitable for controlled reviewer workflows, subject to domain validation.

### `verified`
Traceable plus independently verified issuer identity and authoritative rule source. This is the target for the highest-assurance workflows.

## Domain semantics may only get stricter

The common contract is a floor, never permission to act.

- **PrüfPilot / administration:** real PDF → original bytes/hash → page-level evidence → versioned rule → finding → append-only reviewer decision → revalidated production gate.
- **GitLaw / legal:** concrete law paragraph + corpus/version binding + Legal Trust Gate + authenticated lawyer approval. The lawyer recorded by GitLaw must match the Factory runtime approver before a trusted case write.
- **CareOS / healthcare:** exact clinical source locator + source snapshot + clinical-review policy + qualified clinician decision. A complete chain can make a synthetic/deidentified finding review-complete, but **cannot authorize clinical production write-back** while CareOS clinical/regulatory/privacy/security/hospital release gates remain blocked.

No domain pack may weaken the common fields or silently reinterpret `approved` as sufficient when its own release gates require more.

## Required regression attacks

Every real domain should permanently test at least:

- missing source or exact locator;
- modified source after finding creation;
- missing/changed authority or version;
- evidence hash mismatch;
- derivation referencing unknown evidence;
- pending/rejected decision;
- unqualified reviewer;
- reviewer/approver mismatch;
- later rejection after earlier approval;
- bypass through an alternate write/effect path.

## Production user experience

Every material finding should support this path:

`Finding → Show original → exact location → authority/version → derivation → human decision → decision history → audit`

Users should be able to verify important work without trusting the model's confidence or prose alone.

## Current implementation

- `architecture/trust-chain-v1.schema.json` — language-neutral contract for domain adapters.
- `core/trust-chain.mjs` — canonical validator + digest.
- `core/production-boundary.mjs` — fail-closed production execution gate.
- `production/platform-v1.mjs` — fail-closed effect-queue gate.
- PrüfPilot — first full real-PDF reference path.
- GitLaw — corpus-grounded legal trust path and lawyer-bound write gate.
- CareOS — source-bound clinical review path; clinical production writes remain blocked by release policy.

## Truth boundary

This architecture can prove what source version was used, where a finding came from, how it was derived, and who approved an action. It cannot by itself prove that an unsigned third-party document or clinical record contains truthful real-world facts. That requires domain-specific authenticity mechanisms, trusted integrations and external assurance.
