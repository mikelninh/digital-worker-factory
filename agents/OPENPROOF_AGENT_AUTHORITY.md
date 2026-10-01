# Digital Worker Factory × OpenProof — Agent Authority Proof MVP

## Goal

Before a consequential tool call, prove that the requested action sits inside the agent's current authority envelope **without exposing the full internal policy, unrelated capabilities, approval notes or private transaction context**.

OpenProof does not execute the action. It only produces/verifies the authority condition used by the existing policy/tool gate.

## Golden proof

Synthetic HausPilot action:

```text
Mara proposes invoice.payment.prepare for action #1842
        ↓
private authority envelope
  capabilities
  amount limit
  scope
  approval state
  expiry
        ↓
OpenProof predicates
  capability present            ✓
  amount within limit           ✓
  human approval present        ✓
  credential current            ✓
  action scope matches          ✓
        ↓
AUTHORIZED proof
        ↓
existing runtime/tool gate
        ↓
execution may proceed
```

A proof never becomes an execution instruction by itself.

## Current implementation

`core/openproof-agent-authority.js` creates a versioned public proof projection with:

- action/purpose binding;
- SHA-256 commitment to the full private authority + action witness;
- named predicate results;
- minimum disclosures (action ID/kind/capability only);
- explicit `proof_never_executes_action` boundary;
- fail-closed verifier.

`evals/openproof-agent-authority.mjs` covers:

- valid €742 synthetic invoice-preparation authority;
- no leakage of bank account, private policy note, requested amount or total limit;
- amount > limit -> BLOCK;
- missing human approval -> BLOCK;
- missing capability -> BLOCK;
- expired authority -> BLOCK.

## Security truth

`agent-authority-local-v0` is **not a ZK backend**. It makes the authority protocol testable today and proves our product does not require raw authority data in the public projection.

The Midnight backend should move these predicates into Compact and bind the private witness to a trusted issuer / authority credential. The shared OpenAction branch includes the first `proveAgentAuthority` Compact predicate scaffold.

## Why Midnight is useful here

The interesting trust problem is cross-boundary execution:

- the model should not be trusted because it says it is authorised;
- the target tool should not need the model's entire internal policy document;
- an auditor should be able to verify why the action crossed the boundary;
- unrelated limits and permissions should remain private.

A ZK authority proof gives the tool a narrow answer:

> **This exact action satisfies the current authority conditions.**

not:

> Here is the agent's entire permission model and all the sensitive context behind it.

## Production gates

- cryptographically bind subject/agent identity;
- issuer-bound capability credential verified in-circuit;
- action hash + purpose + policy version bound to proof;
- replay/nullifier protection;
- expiry/revocation fail closed;
- human approval receipt cryptographically bound to the exact action;
- Midnight proof verified before tool execution;
- audit stores proof reference/result, not private witness.
