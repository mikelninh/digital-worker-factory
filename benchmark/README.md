# TrustReady Benchmark v1

**3 real repositories · 3 architecture families · 3 assurance modes · no repository-name shortcuts in the assessor.**

TrustReady Benchmark v1 is a reproducible compatibility and assurance benchmark for the repository security engine in this repo. It asks the same question across structurally different systems:

> Who has authority, what can execute, what effect can happen, and what evidence proves the boundary?

## Real targets

| Target | Runtime shape | Why it is different |
| --- | --- | --- |
| `mikelninh/safevoice` | Python single scoped LLM agent | request authority, reachable tool graph, deterministic boundary, external effect sink, repository-native adversarial evidence |
| `mikelninh/gitlaw` | TypeScript multi-entrypoint agent system | multiple independent agent entrypoints, shared framework, deterministic non-agent registries, declarative authority contracts |
| `mikelninh/proofworker` | Python bounded CLI/operator | CLI opt-in authority, process execution, fixed and dynamic network writes, human release gates |

Targets track `main` on purpose. Every benchmark run records the exact commit that was scanned. If a target evolves beyond what TrustReady can resolve, the benchmark should go red instead of silently preserving an old green claim.

## What one run does

1. checks out the TrustReady engine;
2. independently checks out all three target repositories;
3. records exact engine and target commit SHAs;
4. runs the same `enterprise/repo-security-cli.mjs` scanner against every untouched target;
5. runs the generic negative/control suites for single-agent, multi-entrypoint and bounded-operator assurance;
6. normalises the three architecture-specific reports into `trustready-benchmark-result/v1`;
7. asserts the expected authority/effect/evidence invariants;
8. verifies every target checkout remains clean;
9. exports a machine-readable benchmark, raw evidence and a human-facing static site as one CI artifact.

## Outputs

The generated artifact contains:

```text
index.html
benchmark.json
summary.md
evidence/
  safevoice.json
  gitlaw.json
  proofworker.json
```

`benchmark.json` is the durable interface. The HTML is only a presentation layer over the same generated evidence.

## Failure semantics

The benchmark fails when, for example:

- a target changes to an unsupported architecture;
- a release decision becomes `TECHNICAL_NO_GO`;
- SafeVoice loses its reachable deterministic boundary or native runtime proof;
- GitLaw gains an unresolved tool/capability surface;
- ProofWorker loses a CLI gate, per-action confirmation, or deny-by-default process boundary;
- a control suite fails;
- the scanner mutates a target checkout.

A red benchmark is useful evidence. Do not weaken assertions just to recover a green badge.

## Truth boundary

A benchmark `PASS` means the **named scoped surfaces at the recorded commits** satisfy the benchmark assertions. It is not a whole-repository security certification, does not prove static analysis is dynamically complete, and does not certify business correctness, model output quality, infrastructure security, or enforcement by remote services.
