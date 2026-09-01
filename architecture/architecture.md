<!-- paos:reviewed=2026-09-01 -->
# Architecture

## System shape

```text
                    ┌──────────────────────────┐
                    │     PRODUCT ARCHITECT    │
                    │ intent · trade-offs · UX │
                    │ AMBER/RED decisions      │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │ PRODUCT ARCHITECTURE PACK│
                    │ source of intent/limits  │
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│ SPEC / ARCH    │      │ BUILD / DEPLOY  │      │ EVAL / TRUST    │
│ agents         │ ───▶ │ agents          │ ───▶ │ agents          │
└───────┬────────┘      └────────┬────────┘      └────────┬────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │  GOLDEN-CASE EVIDENCE    │
                    │ tests · traces · reviews │
                    └────────────┬─────────────┘
                                 │
                 ┌───────────────┴────────────────┐
                 ▼                                ▼
       ┌──────────────────┐             ┌──────────────────┐
       │  CONTROL CENTRE  │             │   PUBLIC PROOF   │
       │ internal truth   │             │ bounded claims   │
       └──────────────────┘             └──────────────────┘
```

## Canonical state

The OS should not invent a separate project database before one is needed. V1 uses repository-native artefacts as the canonical state:

- Product Architecture Pack markdown for intent and constraints;
- code/config for implementation;
- tests/evals/traces for behavioural proof;
- PRs/commits for changes and review history;
- deployment metadata for shipped state;
- a small project registry for navigation and declared evidence links.

A later adapter may aggregate GitHub, CI, deployment and runtime signals into one API, but the interface must continue to link back to the underlying evidence.

## Existing Factory primitives to reuse

The current Factory already contains reusable foundations for the OS:

- explicit capability contracts;
- policy and role gates;
- human approval for gated actions;
- provider adapters;
- audit traces and replay;
- evals and reliability progression;
- production boundaries for tenant isolation, idempotency, queues, retention and recovery.

The Product Architect OS sits **above** these primitives. It decides what product should exist and what constraints the worker runtime must respect; it does not replace the runtime.

## Project boundary

Each project is treated as a provider of four things:

1. `architecture pack` — why / what / boundaries;
2. `capabilities` — what agents may do;
3. `evidence` — tests, evals, traces and pilot observations;
4. `surfaces` — repository, demo, control interface and public proof.

The OS may summarise these, but it must not silently increase the authority of a project capability.

## Human / agent authority boundary

### Agent-owned by default — GREEN

- implementation details inside an approved architecture;
- test generation and bug fixes that preserve intended behaviour;
- reversible UI experiments;
- refactors with unchanged contracts;
- documentation synchronisation;
- deployment to an already-approved environment when release gates pass.

### Human approval — AMBER

- material cost or latency trade-offs;
- a new dependency that becomes operationally important;
- changes to a stable API or data model;
- product behaviour where several legitimate outcomes exist;
- expansion of a pilot or permission scope.

### Human decision required — RED

- identity and data ownership;
- sensitive-data handling and retention;
- authentication / authorisation boundaries;
- consequential external actions;
- professional or legal authority;
- public claims that exceed current evidence;
- compliance posture;
- destructive migrations or lock-in-heavy infrastructure choices.

## Control Centre data flow

```text
repo + pack + tests + PRs + deploys
                ↓
        evidence adapters
                ↓
       normalized project state
                ↓
  ┌─────────────┼───────────────┐
  ▼             ▼               ▼
NOW          PROJECT         DECISIONS
queue        workspace       + approvals
  └─────────────┼───────────────┘
                ▼
          proof projection
```

V1 may use an explicitly labelled registry snapshot where live adapters do not yet exist. It must say so in the UI.

## Public proof boundary

The public surface receives only:

- non-sensitive intent and architecture summaries;
- selected golden cases;
- links to public demos/repos;
- evidence levels that can be substantiated;
- explicit known limitations.

Private pilot data, secrets, case details, internal feedback and security-sensitive architecture stay outside the public projection.
