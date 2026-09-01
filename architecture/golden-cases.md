<!-- paos:reviewed=2026-09-01 -->
# Golden cases

These are the three flagship workflows the Product Architect OS must prove before the operating model can be considered credible.

## Golden case 1 — Ambiguous problem → buildable product contract

### Starting situation

A raw request arrives such as: "Lawyers are losing too much time reconstructing a case before they can do the legal work. Can we help?"

### Expected outcome

The OS produces a reviewable product increment containing:

- named user and painful job;
- intended outcome and explicit non-goals;
- 3–5 workflows with acceptance criteria;
- proposed architecture and trust boundaries;
- GREEN / AMBER / RED decisions;
- three golden cases;
- an agent execution plan that can proceed without repeatedly asking the human implementation questions.

### Failure conditions

- the output jumps straight to a model/framework choice;
- user outcome is vague or untestable;
- irreversible decisions are hidden inside implementation;
- there is no acceptance criterion or proof plan;
- the agent team needs the human to coordinate routine handoffs.

### Proof target

**V1 status: PARTIAL.** This repository now contains the canonical six-file pack and operating rules. The next proof is wiring the control-centre workflow to repository/agent actions and replaying the process on an external project.

---

## Golden case 2 — Consequential architecture decision → human judgement, not agent drift

### Starting situation

An agent proposes a change that would expand access to sensitive data, permit a consequential external action, change a stable authority boundary, or create hard-to-reverse lock-in.

### Expected outcome

The OS:

1. classifies the decision as AMBER or RED;
2. stops dependent execution;
3. shows the Product Architect the user impact, affected boundary, evidence and alternatives;
4. records an explicit human decision;
5. allows agents to continue only inside the approved scope;
6. preserves the decision for later audit and architecture review.

### Failure conditions

- the agent approves its own consequential change;
- the UI buries the decision among ordinary task activity;
- dependent execution proceeds while the decision is unresolved;
- the public proof later describes the broader capability as already approved.

### Proof target

**V1 status: PARTIAL.** The underlying Factory already has capability contracts, policy gates and human approval primitives. The Product Architect layer now specifies how architecture decisions use them; the dedicated control-centre interaction remains to be connected to those runtime events.

---

## Golden case 3 — Existing product drifts → evidence catches it before the claim does

### Starting situation

A mature project changes behaviour, architecture or trust boundaries after its original demo and documentation were written.

### Expected outcome

The OS identifies at least one of:

- a stale architecture pack;
- a golden case that no longer passes;
- a changed trust boundary awaiting review;
- a public proof statement whose evidence level is no longer justified.

The project cannot be marked fully verified until the pack, behaviour and proof are reconciled.

### Failure conditions

- documentation and product silently diverge;
- the portfolio keeps an outdated claim because the demo still looks good;
- a passing unit/build check is used as proof of the complete workflow;
- known limitations disappear from the public surface.

### Proof target

**V1 status: PARTIAL.** Pack freshness rules and a repository checker are part of this sprint. Stronger proof will connect golden-case/eval status and public claims to machine-readable evidence.

---

## Release rule

All three cases must eventually be `VERIFIED` with inspectable evidence before we claim the Product Architect OS itself is a verified operating system rather than an operating model + interface prototype.
