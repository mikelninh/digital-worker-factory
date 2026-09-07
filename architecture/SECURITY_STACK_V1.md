# Security Stack v1 — Shared Agent Security Contract

> Assume model output can be manipulated. Keep identity, scope, authority and effects outside the model.

Security Stack v1 extends the existing **Trust Stack v1**. Trust Stack proves *why a consequential finding/effect is grounded and who approved it*. Security Stack proves *whether the requesting agent/context is allowed to reach that effect at all*.

The two gates are complementary:

```text
untrusted user / PDF / RAG / tool / peer agent
                         ↓
                      model
                (assume compromise)
                         ↓
                SECURITY STACK
 identity → tenant → protected scope → provenance
 peer identity → supply chain → egress → budgets
                         ↓
                  allow/review/block
                         ↓
                    TRUST STACK
 source → integrity → authority → exact evidence
 derivation → human decision → audit
                         ↓
                production effect boundary
```

## Canonical contracts

- [`security-context-v1.schema.json`](./security-context-v1.schema.json) — portable runtime context.
- [`security-posture-v1.schema.json`](./security-posture-v1.schema.json) — portable evidence/assurance summary consumed by TrustReady.
- [`../core/security-boundary.mjs`](../core/security-boundary.mjs) — deterministic runtime evaluator.
- [`../security/golden-cases.mjs`](../security/golden-cases.mjs) — cross-domain adversarial regression set.

## Runtime invariants

1. **Authority is external to the model.** Model output cannot grant identity, role, tenant, capability or approval.
2. **Protected scopes are deny-by-default.** Secrets, credentials, system prompts, cross-tenant data, audit mutation and policy mutation are never ordinary agent scopes.
3. **Untrusted content is data, not authority.** Documents/RAG/tool content may influence a draft but cannot self-authorize an effect.
4. **Human approval is intent-bound.** A generic or stale approval does not authorize a changed effect.
5. **Sensitive egress is destination-bound.** Sensitive data cannot be sent to arbitrary or unapproved model/tool destinations.
6. **Peer agents are authenticated and tenant-bound.** A peer agent cannot become an authority merely because it is another agent.
7. **Execution has hard budgets.** Tool-call and subagent depth ceilings are deterministic.
8. **Known-bad supply-chain components are blocked; unverified components remain visible for review.**
9. **Security evaluation is reconstructable in audit.** The verdict and reasons travel with the effect decision.
10. **Domain policy may only get stricter.** A common ALLOW never overrides legal, clinical, administrative or customer-specific release gates.

## OWASP Agentic Top 10 mapping

The shared 40-case gauntlet permanently covers:

- ASI01 Agent Goal Hijack
- ASI02 Tool Misuse & Exploitation
- ASI03 Identity & Privilege Abuse
- ASI04 Agentic Supply Chain Vulnerabilities
- ASI05 Unexpected Code Execution
- ASI06 Memory & Context Poisoning
- ASI07 Insecure Inter-Agent Communication
- ASI08 Cascading Failures
- ASI09 Human-Agent Trust Exploitation
- ASI10 Rogue Agents

The test target is not “the model refuses the attack.” The target is **impact containment at deterministic boundaries**.

Primary invariant:

```text
critical impact escapes = 0
```

## Security Posture contract

Every serious product can publish `security/security-posture.json` using `security-posture/v1`.

It records:

- which controls are implemented / partial / not proven;
- exact repository evidence for each claim;
- adversarial case counts and critical escapes;
- whether live-model attacks were tested;
- explicit non-claims;
- residual risks.

TrustReady can ingest this contract without trusting marketing copy.

## Domain adoption

### GitLaw

Reference implementation for agentic legal security: indirect injection, tool misuse, tenant/privilege abuse, protected scopes and adversarial CI. GitLaw keeps qualified lawyer authority final.

### Digital Worker Factory / HausPilot

Shared runtime owner. New workers should inherit the Security Stack rather than invent their own authorization semantics.

### CareOS

Security Stack is a floor beneath CareOS' stricter delegated clinical-agent envelope. Patient, encounter, tool, data category, PHI egress and clinical release gates remain authoritative. A common ALLOW can never authorize clinical write-back.

### PrüfPilot

Untrusted documents are a primary attack surface. Prompt-injection detection is useful telemetry; deterministic tenant/role/authority/effect gates remain the containment boundary.

### MissionOps / SafeVoice

Safeguarding, privacy and evidence integrity add domain-specific protected scopes and approval requirements on top of the common contract.

### FraudFlow / SignalLab

These projects demonstrate another valid security pattern: keep LLMs out of the critical decision/calculation path where they are not needed. Their posture can mark agent-only controls `not_applicable` rather than adding decorative autonomy.

## Deliberate non-claims

Security Stack v1 does **not** prove:

- prompt injection is solved;
- all model behavior is safe;
- complete production security;
- third-party supply-chain integrity;
- domain correctness or legal/clinical validity;
- regulatory certification;
- operational incident response without production evidence.

A secure agent boundary reduces blast radius. It does not remove the need for normal application security, privacy engineering, external review, monitoring or domain validation.
