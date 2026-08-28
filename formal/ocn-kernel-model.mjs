import assert from 'node:assert/strict'

import { paymentIntentPreflight } from '../agent-commerce/payment-intent.mjs'
import { checkAuthority, trustPreflight } from '../agent-commerce/trusted-events.mjs'

const NOW = Date.parse('2026-08-29T00:00:00Z')
const BOOL = [false, true]

let explored = 0
let assertions = 0

function prove(condition, message) {
  assertions += 1
  assert.equal(Boolean(condition), true, message)
}

// Exhaustively exercise the production authority checker over a finite model.
for (const grantPresent of BOOL) {
  for (const grantActive of BOOL) {
    for (const actorMatches of BOOL) {
      for (const capabilityMatches of BOOL) {
        for (const actionMatches of BOOL) {
          for (const scopeMatches of BOOL) {
            explored += 1
            const grant = grantPresent ? [{
              id: 'g1',
              actorId: actorMatches ? 'agent-1' : 'agent-other',
              capabilityId: capabilityMatches ? 'payments.send.v1' : 'other.capability',
              actions: actionMatches ? ['execute'] : ['read'],
              scope: scopeMatches ? 'tenant-a' : 'tenant-b',
              active: grantActive,
            }] : []

            const result = checkAuthority({
              actorId: 'agent-1',
              capabilityId: 'payments.send.v1',
              action: 'execute',
              scope: 'tenant-a',
              grants: grant,
            })

            const expected = grantPresent && grantActive && actorMatches && capabilityMatches && actionMatches && scopeMatches
            prove(result.authorized === expected, 'authority must equal the explicit matching active grant predicate')
            prove(result.paymentGrantedAuthority === false, 'payment must never grant authority')
            prove((result.decision === 'allow') === expected, 'allow must be equivalent to verified authority')
          }
        }
      }
    }
  }
}

function evidenceFixture(complete) {
  return complete ? {
    claims: [{ id: 'c1', text: 'bounded claim', evidenceIds: ['e1'] }],
    evidence: [{ id: 'e1', sourceUrl: 'https://example.gov/source', retrievedAt: '2026-08-28T23:59:30Z', locator: 'section 1' }],
  } : {
    claims: [{ id: 'c1', text: 'bounded claim', evidenceIds: ['missing'] }],
    evidence: [{ id: 'e1', sourceUrl: 'https://example.gov/source', retrievedAt: '2026-08-28T23:59:30Z', locator: 'section 1' }],
  }
}

// Exhaustively exercise production trustPreflight across freshness, evidence, authority,
// risk and human-approval dimensions. This is bounded model checking of the real
// deterministic implementation, not a proof about external-world truth or LLM behavior.
for (const risk of ['read', 'write', 'consequential']) {
  for (const useFreshness of BOOL) {
    for (const fresh of BOOL) {
      for (const useEvidence of BOOL) {
        for (const evidenceComplete of BOOL) {
          for (const useAuthority of BOOL) {
            for (const authorityGranted of BOOL) {
              for (const humanApproval of BOOL) {
                explored += 1
                const input = { risk, humanApproval }
                if (useFreshness) {
                  input.freshness = {
                    observedAt: fresh ? '2026-08-28T23:59:30Z' : '2026-08-28T22:00:00Z',
                    maxAgeSeconds: 60,
                  }
                }
                if (useEvidence) input.evidence = evidenceFixture(evidenceComplete)
                if (useAuthority) {
                  input.authority = {
                    actorId: 'agent-1', capabilityId: 'case.update.v1', action: 'execute', scope: 'tenant-a',
                    grants: authorityGranted ? [{
                      id: 'g1', actorId: 'agent-1', capabilityId: 'case.update.v1', actions: ['execute'], scope: 'tenant-a', active: true,
                    }] : [],
                  }
                }

                const result = trustPreflight(input, { now: NOW })

                prove(result.authority.paymentGrantedAuthority === false, 'preflight must never turn payment into authority')
                prove(result.authority.consequentialActionExecuted === false, 'preflight must never execute the consequential action')

                if (useFreshness && !fresh) prove(result.decision === 'block', 'stale evidence must block')
                if (useEvidence && !evidenceComplete) prove(result.decision === 'block', 'insufficient evidence must block')
                if (useAuthority && !authorityGranted) prove(result.decision === 'block', 'missing authority must block')
                if ((risk === 'write' || risk === 'consequential') && !humanApproval && result.decision !== 'block') {
                  prove(result.decision === 'review', 'write/consequential action without human approval must not be allowed')
                }
                if (result.decision === 'allow') {
                  prove(!(useFreshness && !fresh), 'allow cannot contain stale evidence')
                  prove(!(useEvidence && !evidenceComplete), 'allow cannot contain insufficient evidence')
                  prove(!(useAuthority && !authorityGranted), 'allow cannot contain missing authority')
                  prove(risk === 'read' || humanApproval, 'write/consequential allow requires human approval in v1 kernel')
                }
              }
            }
          }
        }
      }
    }
  }
}

// Exhaustively model-check the production payment-intent guard. These dimensions
// represent the core fraud-redirection surface: merchant identity, beneficiary,
// amount, currency, expiry, authorization/mandate, and replay.
for (const merchantVerified of BOOL) {
  for (const merchantMatches of BOOL) {
    for (const beneficiaryMatches of BOOL) {
      for (const amountMatches of BOOL) {
        for (const currencyMatches of BOOL) {
          for (const intentFresh of BOOL) {
            for (const mandateCovered of BOOL) {
              for (const humanApproval of BOOL) {
                for (const replayDetected of BOOL) {
                  explored += 1
                  const input = {
                    intent: {
                      intentId: 'intent-1', merchantId: 'merchant-7', beneficiary: 'wallet-approved', amount: '10.00', currency: 'USD',
                      validUntil: intentFresh ? '2026-08-29T01:00:00Z' : '2026-08-28T23:00:00Z',
                    },
                    request: {
                      merchantId: 'merchant-7',
                      beneficiary: beneficiaryMatches ? 'wallet-approved' : 'wallet-attacker',
                      amount: amountMatches ? '10.00' : '11.00',
                      currency: currencyMatches ? 'USD' : 'EUR',
                    },
                    merchant: { id: merchantMatches ? 'merchant-7' : 'merchant-attacker', verified: merchantVerified },
                    humanApproval,
                    replayDetected,
                  }
                  if (mandateCovered) {
                    input.mandate = {
                      active: true,
                      maxAmount: '25.00',
                      currencies: [currencyMatches ? 'USD' : 'EUR'],
                      merchantIds: ['merchant-7'],
                      beneficiaries: [beneficiaryMatches ? 'wallet-approved' : 'wallet-attacker'],
                      validUntil: '2026-08-29T01:00:00Z',
                    }
                  }

                  const result = paymentIntentPreflight(input, { now: NOW })
                  prove(result.authority.paymentGrantedAuthority === false, 'payment-intent check cannot grant authority by being paid')
                  prove(result.authority.paymentExecutionPerformed === false, 'payment-intent check must never execute payment')

                  if (!merchantVerified) prove(result.decision === 'block', 'unverified merchant must block')
                  if (!merchantMatches) prove(result.decision === 'block', 'merchant identity mismatch must block')
                  if (!beneficiaryMatches) prove(result.decision === 'block', 'beneficiary switch must block')
                  if (!amountMatches) prove(result.decision === 'block', 'amount drift must block')
                  if (!currencyMatches) prove(result.decision === 'block', 'currency drift must block')
                  if (!intentFresh) prove(result.decision === 'block', 'expired intent must block')
                  if (replayDetected) prove(result.decision === 'block', 'detected replay must block')

                  const hardBindingsPass = merchantVerified && merchantMatches && beneficiaryMatches && amountMatches && currencyMatches && intentFresh && !replayDetected
                  if (hardBindingsPass && !mandateCovered && !humanApproval) prove(result.decision === 'review', 'clean payment without mandate or human approval must review')
                  if (result.decision === 'allow') {
                    prove(hardBindingsPass, 'allow requires every hard intent binding')
                    prove(mandateCovered || humanApproval, 'allow requires verified mandate or human approval')
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

// Model the execution mediator that sits after preflight. Only `allow` may execute,
// and an idempotency key that has already executed may never execute twice.
for (const decision of ['allow', 'review', 'block']) {
  for (const alreadyExecuted of BOOL) {
    explored += 1
    const mayExecute = decision === 'allow' && !alreadyExecuted
    if (decision !== 'allow') prove(!mayExecute, 'review/block must never execute')
    if (alreadyExecuted) prove(!mayExecute, 'replayed idempotency key must never execute twice')
  }
}

console.log(JSON.stringify({
  schema: 'ocn.formal-check/2',
  model: 'bounded exhaustive model check over production deterministic trust and payment-intent kernels',
  exploredStates: explored,
  assertions,
  result: 'PASS',
  provedWithinModel: [
    'authority derives only from an explicit active matching grant',
    'payment never grants authority',
    'preflight never executes consequential actions',
    'stale evidence blocks',
    'insufficient evidence blocks',
    'missing explicit authority blocks',
    'write/consequential work cannot be allowed without observed human approval in v1',
    'payment intent cannot allow an unverified/mismatched merchant',
    'payment intent cannot allow a changed beneficiary',
    'payment intent cannot allow amount or currency drift',
    'payment intent cannot allow an expired intent or detected replay',
    'payment intent allow requires a verified mandate or observed human approval',
    'payment-intent verification never executes payment',
    'review/block decisions cannot execute',
    'an already-executed idempotency key cannot execute twice in the mediator model',
  ],
  limitations: [
    'bounded finite-state verification, not a mathematical proof of every possible implementation state',
    'does not prove external sources, merchants or identity registries are substantively trustworthy',
    'does not prove an LLM is correct or safe in arbitrary contexts',
    'does not yet prove equivalence of every downstream execution adapter to this abstract mediator',
    'does not guarantee zero fraud or financial recovery',
  ],
}, null, 2))
