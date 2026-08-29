# OCN Formal Verification

OCN uses formal methods only where the claim is precise enough to verify.

## What is formally checked

`ocn-kernel-model.mjs` performs bounded exhaustive model checking over the **production deterministic trust kernel** (`checkAuthority` and `trustPreflight`). It enumerates all states in the defined finite model and asserts the safety invariants for every state.

Current verified invariants:

1. Authority derives only from an explicit active grant matching actor, capability, action and scope.
2. Payment never grants authority.
3. A trust preflight never executes a consequential action.
4. Stale evidence cannot be allowed.
5. Insufficient evidence cannot be allowed.
6. Missing explicit authority cannot be allowed.
7. In the v1 kernel, write/consequential work cannot be allowed without observed human approval.
8. `review` and `block` decisions cannot execute in the mediator model.
9. A previously executed idempotency key cannot execute twice in the mediator model.

CI runs the model checker on every change to the trust rail or formal model.

## What this does NOT prove

Formal verification is not a magic `trust = true` button. This model does not prove:

- that an external source is substantively true;
- that an LLM will never hallucinate;
- that an external identity provider or registry is uncompromised;
- that every downstream adapter implements the abstract mediator correctly;
- that the system is secure against every implementation or infrastructure bug;
- that OCN is legally compliant or independently certified.

Those claims require separate evidence: source assurance, evals, adversarial testing, security review, operational outcomes and independent attestation.

## Next formal milestones

- Formalize `payment.intent.preflight.v1`: beneficiary, amount, currency, counterparty, mandate, approval and replay binding.
- Move the execution mediator from an abstract model into a shared production kernel and model-check the same implementation.
- Add temporal/state-machine verification for `requested -> verified -> approved -> executing -> executed` with idempotency.
- Verify policy-version monotonicity and expiry/freshness invariants.
- Add independent formal/security review before claiming A5 assurance.
