# Open Capability Network — Capability Universe 120

**Purpose:** long-term service map for the trust rail agents call automatically.

This is **not** the live catalog. Services graduate into `OpenCapabilities` only after they pass the readiness checklist at the end of this document.

Design rule: integrate with public base infrastructure instead of duplicating it. Germany's emerging D-Stack already covers identity/trust, data exchange, evidence retrieval, payments and notifications. OCN focuses on the bounded verification, decision-support, policy, evaluation, authority and safe-action capabilities agents need around those rails.

## A. Identity, credentials & representation — 12

- [ ] `identity.person.verify.v1` — verify a person identity assertion through approved identity provider evidence.
- [ ] `identity.org.verify.v1` — verify legal organisation identity.
- [ ] `identity.representative.verify.v1` — verify that a person may represent an organisation.
- [ ] `identity.age.prove.v1` — prove age/age-band with minimum disclosure.
- [ ] `identity.residency.prove.v1` — verify residence/jurisdiction claim.
- [ ] `identity.profession.prove.v1` — verify professional credential/registration.
- [ ] `identity.education.prove.v1` — verify diploma/degree/certificate claim.
- [ ] `identity.license.verify.v1` — verify licence/permit credential and status.
- [ ] `identity.signature.verify.v1` — verify electronic signature/seal evidence.
- [ ] `identity.wallet.presentation.verify.v1` — verify EUDI-compatible presentation semantics.
- [ ] `identity.delegation.verify.v1` — verify delegated authority scope and expiry.
- [ ] `identity.credential.revocation.v1` — verify revocation/status of a credential.

## B. Proof, consent, purpose & authority — 12

- [ ] `openproof.verify.v1` — verify claim/proof binding, purpose, expiry and revocation.
- [ ] `proof.source.integrity.v1` — verify source/artifact hash and provenance chain.
- [ ] `proof.document.binding.v1` — bind evidence to a specific document/version.
- [ ] `proof.request.binding.v1` — bind proof to one request/challenge.
- [ ] `consent.scope.verify.v1` — verify consent purpose, data scope and expiry.
- [ ] `consent.withdrawal.check.v1` — check whether consent was withdrawn.
- [ ] `purpose.compatibility.v1` — determine whether requested use matches declared purpose.
- [ ] `authority.role.resolve.v1` — resolve authenticated actor role from authoritative context.
- [ ] `authority.action.check.v1` — determine whether actor may invoke a capability/action.
- [ ] `authority.human-approval.verify.v1` — verify approval token and scope.
- [ ] `authority.delegation.chain.v1` — validate multi-hop delegation.
- [ ] `authority.separation-of-duties.v1` — detect prohibited requester/approver conflicts.

## C. Legal, rights & rule intelligence — 15

- [ ] `legal.gitlaw.de.v1` — source-grounded German legal research.
- [ ] `legal.citation.verify.v1` — verify statute/case citation exists and supports proposition.
- [ ] `legal.rule.current.v1` — verify rule version/effective date/jurisdiction.
- [ ] `legal.rule.diff.v1` — explain what changed between rule versions.
- [ ] `legal.deadline.calculate.v1` — calculate procedural/legal deadline from grounded rule.
- [ ] `rights.eu261.v1` — passenger-rights applicability/compensation precheck.
- [ ] `rights.elterngeld.de.v1` — parental-benefit calculation/authority precheck.
- [ ] `rights.consumer.de.v1` — bounded German consumer-rights precheck.
- [ ] `rights.housing.de.v1` — bounded housing/tenant rights precheck.
- [ ] `rights.employment.de.v1` — bounded employment-rights precheck.
- [ ] `rights.social-support.de.v1` — map likely benefit/support pathways without final entitlement.
- [ ] `terms.agb.de.v1` — German AGB/TOS risk scan.
- [ ] `legal.conflict.detect.v1` — detect conflicting cited rules/authority levels.
- [ ] `legal.jurisdiction.resolve.v1` — determine applicable jurisdiction/authority candidates.
- [ ] `legal.human-review.trigger.v1` — deterministic escalation when legal ambiguity/risk exceeds threshold.

## D. Documents, applications & evidence — 15

- [ ] `document.preflight.v1` — completeness/evidence/contradiction preflight.
- [ ] `document.type.classify.v1` — bounded document-type classification.
- [ ] `document.fields.extract.v1` — structured extraction with provenance spans.
- [ ] `document.required-fields.check.v1` — rule-bound missing-field detection.
- [ ] `document.evidence.coverage.v1` — map claims/requirements to submitted evidence.
- [ ] `document.contradiction.detect.v1` — surface contradictory values/statements.
- [ ] `document.version.compare.v1` — structured diff across submissions/versions.
- [ ] `document.signature.presence.v1` — detect/verify required signature metadata.
- [ ] `document.expiry.check.v1` — check evidence document expiry/freshness.
- [ ] `document.redaction.verify.v1` — check requested redaction categories are removed.
- [ ] `document.translation.quality.v1` — flag uncertain/incomplete translation for review.
- [ ] `application.requirements.resolve.v1` — derive requirement checklist from grounded procedure/rule set.
- [ ] `application.missing-evidence.v1` — return precise missing evidence checklist.
- [ ] `application.duplicate.detect.v1` — detect likely duplicate submission safely.
- [ ] `application.review.packet.v1` — assemble reviewable evidence packet without final decision.

## E. Entity, registry & organisation intelligence — 10

- [ ] `entity.resolve.org.v1` — organisation entity resolution with merge evidence.
- [ ] `entity.canonicalize.org.v1` — canonical organisation name/address identifiers.
- [ ] `entity.relationship.verify.v1` — verify parent/subsidiary/branch relationship from sources.
- [ ] `entity.registry.lookup.v1` — normalized registry lookup through approved source adapters.
- [ ] `entity.identifier.crosswalk.v1` — map identifiers across public registries.
- [ ] `entity.address.normalize.v1` — normalize address with confidence/provenance.
- [ ] `entity.duplicate.record.detect.v1` — duplicate organisation record detection.
- [ ] `entity.sanctions.source-check.v1` — source-bound sanctioned-entity check where legally appropriate.
- [ ] `entity.procurement-supplier.resolve.v1` — supplier identity resolution for procurement data.
- [ ] `entity.public-body.resolve.v1` — resolve competent public body/service endpoint.

## F. Benefits, eligibility & citizen service navigation — 12

- [ ] `benefit.program.discover.v1` — find potentially relevant public support programs from declared facts.
- [ ] `benefit.requirements.explain.v1` — explain grounded eligibility requirements plainly.
- [ ] `benefit.precheck.v1` — deterministic/preliminary eligibility check; never final entitlement.
- [ ] `benefit.amount.estimate.v1` — bounded estimate with assumptions/rule version.
- [ ] `benefit.authority.resolve.v1` — identify responsible authority/service.
- [ ] `benefit.evidence.checklist.v1` — generate evidence checklist from authoritative rules.
- [ ] `benefit.change-impact.v1` — estimate effect of changed income/family/rent facts.
- [ ] `benefit.deadline.alert.v1` — grounded deadlines/reminder metadata.
- [ ] `service.life-event.route.v1` — route common life events to public procedures/services.
- [ ] `service.once-only.evidence-map.v1` — identify which evidence may be reusable/retrievable via approved once-only rails.
- [ ] `service.accessibility.rewrite.v1` — convert administrative text to plain/easy language with fidelity checks.
- [ ] `service.multilingual.explain.v1` — multilingual explanation with source-bound meaning preservation.

## G. Public money, procurement & grants — 12

- [ ] `publicmoney.de.v1` — grounded German public-budget lookup.
- [ ] `budget.line.resolve.v1` — resolve budget line/fund/program identifiers.
- [ ] `budget.change.detect.v1` — detect material budget revisions.
- [ ] `budget.spend.explain.v1` — explain spending data with cited source and period.
- [ ] `grant.program.discover.v1` — discover relevant grants from authoritative sources.
- [ ] `grant.application.preflight.v1` — completeness/rule/evidence preflight.
- [ ] `grant.eligibility.precheck.v1` — bounded precheck, no final award decision.
- [ ] `procurement.notice.normalize.v1` — normalize tender metadata.
- [ ] `procurement.requirement.extract.v1` — extract requirements with provenance.
- [ ] `procurement.bid.compliance-preflight.v1` — check submission against published requirements.
- [ ] `procurement.conflict.flag.v1` — flag declared-data conflicts for human review without guilt inference.
- [ ] `invoice.public-sector.preflight.v1` — validate invoice completeness/routing before accounting action.

## H. Agent quality, evaluation & reliability — 12

- [ ] `judge.output.v1` — rubric-based independent output evaluation.
- [ ] `judge.source-support.v1` — score whether claims are supported by cited sources.
- [ ] `judge.policy-conformance.v1` — compare output/action plan with explicit policy.
- [ ] `judge.completeness.v1` — evaluate coverage of required elements.
- [ ] `judge.uncertainty.v1` — detect overconfidence vs evidence availability.
- [ ] `judge.safety-boundary.v1` — check whether proposed action exceeds capability authority.
- [ ] `agent.trace.review.v1` — inspect trace for tool/policy/loop failures.
- [ ] `agent.loop.detect.v1` — detect unproductive repeated loops.
- [ ] `agent.tool-compliance.v1` — verify required tools/checks were actually used.
- [ ] `agent.eval.run.v1` — run versioned golden-case evaluation suite.
- [ ] `agent.regression.diff.v1` — compare model/agent versions across evals.
- [ ] `agent.release.gate.v1` — deterministic release decision from agreed eval thresholds.

## I. Freshness, change detection & provenance — 10

- [ ] `freshness.source.check.v1` — determine whether source meets freshness requirement.
- [ ] `freshness.rule.watch.v1` — detect legal/policy rule changes.
- [ ] `freshness.registry.watch.v1` — detect material public registry changes.
- [ ] `freshness.budget.watch.v1` — detect budget/funding changes.
- [ ] `freshness.service.watch.v1` — detect changed public procedure/contact/requirements.
- [ ] `freshness.source.snapshot.v1` — produce immutable source snapshot identifier.
- [ ] `provenance.claim.trace.v1` — trace claim back to evidence/source/version.
- [ ] `provenance.multi-source.compare.v1` — expose disagreements between authoritative sources.
- [ ] `provenance.citation.package.v1` — create machine-readable citation/evidence package.
- [ ] `provenance.staleness.fail.v1` — fail closed when required source freshness cannot be established.

## J. Communications, routing & case operations — 10

- [ ] `inbox.intent.route.v1` — classify inbound administrative communication.
- [ ] `case.priority.suggest.v1` — bounded priority suggestion using explicit policy, not hidden profiling.
- [ ] `case.missing-info.request.v1` — draft precise request for missing information.
- [ ] `case.status.explain.v1` — source-bound status explanation to citizen/user.
- [ ] `case.next-step.prepare.v1` — prepare next review step without executing consequential action.
- [ ] `meeting.transcript.structure.v1` — structure transcript into decisions/actions with uncertainty.
- [ ] `meeting.decision.extract.v1` — extract decisions with speaker/evidence references.
- [ ] `notification.compose.v1` — generate bounded notification from approved structured facts.
- [ ] `language.plainify.v1` — plain-language conversion with fact-preservation checks.
- [ ] `handoff.packet.v1` — create human escalation packet with context/evidence/uncertainty.

## K. Safe action, workflow & receipts — 12

- [ ] `openaction.prepare.v1` — prepare bounded external action payload.
- [ ] `openaction.authorize.v1` — validate policy/approval before execution.
- [ ] `openaction.execute.v1` — execute approved action through authenticated provider.
- [ ] `openaction.idempotency.check.v1` — prevent duplicate effects.
- [ ] `openaction.reconcile.v1` — reconcile uncertain provider execution state.
- [ ] `receipt.service.issue.v1` — issue service computation receipt.
- [ ] `receipt.action.issue.v1` — issue consequential action receipt.
- [ ] `receipt.verify.v1` — independently verify signed receipt integrity.
- [ ] `receipt.chain.verify.v1` — verify request->proof->approval->action receipt chain.
- [ ] `workflow.policy.evaluate.v1` — deterministic capability/purpose/risk policy decision.
- [ ] `workflow.approval.route.v1` — route to correct human authority based on explicit policy.
- [ ] `workflow.audit.export.v1` — export audit trail in portable machine-readable format.

## L. Healthcare & social-care institution capabilities — 8

These are institution-controlled pilot capabilities, never anonymous high-risk decision APIs.

- [ ] `careos.review.v1` — evidence-first clinical workflow review.
- [ ] `careos.medication-conflict.v1` — surface medication/allergy/diagnosis conflicts with provenance.
- [ ] `careos.discharge-completeness.v1` — discharge/follow-up completeness support.
- [ ] `careos.evidence.coverage.v1` — map clinical assertions to source record evidence.
- [ ] `care.application.preflight.v1` — care-support application evidence preflight.
- [ ] `care.handoff.packet.v1` — structured human handoff with uncertainties.
- [ ] `health.credential.verify.v1` — professional/organizational credential verification through approved rails.
- [ ] `health.human-review.trigger.v1` — deterministic escalation for high-risk/low-evidence cases.

## M. Infrastructure, environment & civic operations — 10

- [ ] `permit.application.preflight.v1` — generic permit submission preflight.
- [ ] `building.rule.check.v1` — bounded building-rule requirement lookup with jurisdiction/version.
- [ ] `utility.incident.route.v1` — route reported infrastructure incident to responsible operator.
- [ ] `infrastructure.asset.resolve.v1` — resolve public asset/location identifiers from approved data.
- [ ] `environment.permit.requirements.v1` — derive grounded evidence/requirement checklist.
- [ ] `environment.report.validate.v1` — completeness/provenance validation for submitted environmental report.
- [ ] `mobility.rule.current.v1` — grounded current transport/mobility rule check.
- [ ] `emergency.info.verify.v1` — verify official public emergency guidance/source/freshness.
- [ ] `civic.issue.route.v1` — route citizen issue to responsible public body without hidden profiling.
- [ ] `public-service.availability.v1` — verify service endpoint/channel/current availability metadata.

## N. Transparency, accountability & democratic infrastructure — 10

- [ ] `policy.source.package.v1` — source package for a policy proposal/claim.
- [ ] `policy.fiscal-impact.check.v1` — structured fiscal-impact model with assumptions/provenance.
- [ ] `policy.distributional-impact.v1` — transparent scenario analysis across declared population groups using approved aggregate data.
- [ ] `policy.rule-simulation.v1` — simulate deterministic rule changes under explicit assumptions.
- [ ] `policy.promise.track.v1` — track public commitment against cited official milestones.
- [ ] `public-decision.evidence-index.v1` — index evidence used for a public decision where publishable.
- [ ] `public-spend.anomaly.review.v1` — flag unusual patterns for audit review without fraud/guilt determination.
- [ ] `transparency.response.preflight.v1` — completeness/redaction/legal-basis preflight for public-information responses.
- [ ] `consultation.comment.cluster.v1` — aggregate consultation themes without identifying political profiles of individuals.
- [ ] `audit.finding.trace.v1` — link audit finding to evidence, remediation and closure proof.

# Total: 160 potential capabilities

The goal is **not** to implement 160 endpoints blindly. The goal is to own the reusable contracts, proof/eval patterns and distribution rail so the highest-demand capabilities can graduate quickly and safely.

# Essential 20 — first network backbone

These are the first capabilities most likely to be horizontally useful across government agents and regulated enterprises:

- [ ] `openproof.verify.v1`
- [ ] `authority.action.check.v1`
- [ ] `authority.human-approval.verify.v1`
- [ ] `legal.rule.current.v1`
- [ ] `legal.citation.verify.v1`
- [ ] `document.preflight.v1`
- [ ] `document.evidence.coverage.v1`
- [ ] `application.requirements.resolve.v1`
- [ ] `application.review.packet.v1`
- [ ] `entity.resolve.org.v1`
- [ ] `benefit.precheck.v1`
- [ ] `publicmoney.de.v1`
- [ ] `judge.output.v1`
- [ ] `judge.source-support.v1`
- [ ] `judge.policy-conformance.v1`
- [ ] `agent.release.gate.v1`
- [ ] `freshness.rule.watch.v1`
- [ ] `provenance.claim.trace.v1`
- [ ] `openaction.authorize.v1`
- [ ] `receipt.chain.verify.v1`

# Capability graduation checklist

A service may move **idea -> planned -> adapter_ready -> live -> production_evidence** only through explicit gates.

## 1. Useful

- [ ] named real user/agent workflow.
- [ ] clear caller and beneficiary.
- [ ] repeated/high-value need rather than demo novelty.
- [ ] defined non-goals.
- [ ] measurable success metric.

## 2. Bounded

- [ ] narrow input/output contract.
- [ ] explicit jurisdiction/domain/version.
- [ ] known authority boundary.
- [ ] no hidden tool/action surface.
- [ ] maximum payload/cost/time bounds.

## 3. Grounded

- [ ] authoritative source/evidence strategy.
- [ ] source version/freshness semantics.
- [ ] provenance returned where applicable.
- [ ] uncertainty/degraded-mode semantics.
- [ ] stale/unavailable source behavior defined.

## 4. Safe

- [ ] threat model.
- [ ] input validation.
- [ ] prompt-injection/adversarial tests where relevant.
- [ ] payment cannot grant authority.
- [ ] caller cannot self-assign role/permission.
- [ ] consequential actions require explicit authority/human approval.
- [ ] idempotency/replay controls for effects.
- [ ] privacy/retention declared.

## 5. Proven

- [ ] golden cases.
- [ ] negative/adversarial cases.
- [ ] precision/recall or other appropriate quality metrics.
- [ ] baseline comparison.
- [ ] regression gates in CI.
- [ ] known limitations published.

## 6. Operable

- [ ] health/readiness endpoint.
- [ ] request/trace IDs.
- [ ] timeouts/circuit breakers.
- [ ] rate/usage budgets.
- [ ] observability.
- [ ] rollback/version policy.
- [ ] error envelope.

## 7. Portable

- [ ] model/provider-neutral contract where possible.
- [ ] HTTP and/or MCP/A2A adapter.
- [ ] customer-VPC/sovereign-compatible path where required.
- [ ] exportable receipts/evals/config excluding secrets.
- [ ] no unnecessary proprietary lock-in.

## 8. Buyable

- [ ] clear buyer and budget owner.
- [ ] pilot scope.
- [ ] procurement/security evidence pack.
- [ ] price hypothesis and unit economics.
- [ ] invoice/annual-license rail for institutions.
- [ ] optional machine-payment rail for autonomous callers.

## 9. Scalable

- [ ] stateless/horizontally scalable execution where possible.
- [ ] safe caching semantics.
- [ ] async/backpressure path for expensive work.
- [ ] load baseline measured.
- [ ] cost per successful call measured.
- [ ] SLO based on evidence, not aspiration.

## 10. Trusted in reality

- [ ] external user/agent calls it.
- [ ] real domain expert reviews failures.
- [ ] human override/escalation rate measured.
- [ ] real outcome improvement measured.
- [ ] second buyer/reuse proves portability.
- [ ] incidents/limitations feed back into golden cases.

# Prioritization score

Score each planned capability 0–5 on:

1. frequency of need.
2. consequence/risk of getting it wrong.
3. cross-domain reuse.
4. current buyer pain.
5. authoritative data/source access.
6. existing portfolio leverage.
7. deterministic/verifiable potential.
8. distribution potential through public IT/platforms.
9. unit economics.
10. time to first credible proof.

Build highest total first, with one veto: **a capability that cannot be bounded or responsibly proven does not ship merely because revenue looks attractive.**
