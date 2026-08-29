import { AuthorityGateway, InMemoryIdempotencyStore } from '../authority/index.mjs'
import { companyPolicy, earnedAutonomyMetrics } from './policy.mjs'
import { createWorkforce, workforceSummary } from './workforce.mjs'

function routineInput(worker, globalIndex, spent) {
  return {
    actor: { id: worker.id, role: worker.role, autonomyLevel: worker.autonomyLevel },
    principal: worker.principal,
    delegation: structuredClone(worker.delegation),
    action: {
      type: worker.routineAction,
      purpose: worker.purpose,
      idempotencyKey: `${worker.id}:operating-day:${globalIndex}`,
      counterpartyApproved: true,
      ...(worker.routineAmount > 0 ? { amount: { currency: 'EUR', value: worker.routineAmount } } : {}),
    },
    evidence: { claims: [...worker.evidenceClaims], flags: [] },
    metrics: earnedAutonomyMetrics,
    budget: { currency: 'EUR', spent, limit: 500 },
  }
}

export async function runMatureOperatingDay({ averageHumanReviewMinutes = 2 } = {}) {
  const workers = createWorkforce()
  const gateways = new Map()
  const providerCalls = []
  const spentByWorker = new Map(workers.map((worker) => [worker.id, 0]))
  const counts = { decisions: 0, executed: 0, approval_required: 0, blocked: 0, duplicate_suppressed: 0, failed: 0 }

  const executor = async ({ actor, action }) => {
    providerCalls.push({ actorId: actor.id, actionType: action.type, scenario: action.scenario })
    if (action.simulateProviderFailure) throw new Error('synthetic mature-day provider timeout')
    return { ok: true }
  }
  const executors = Object.fromEntries(Object.keys(companyPolicy.actions).map((type) => [type, executor]))

  for (const worker of workers) {
    gateways.set(worker.id, new AuthorityGateway({
      policy: companyPolicy,
      executors,
      idempotencyStore: new InMemoryIdempotencyStore(),
      clock: () => new Date('2026-08-29T10:00:00Z'),
    }))
  }

  for (let globalIndex = 0; globalIndex < 10_000; globalIndex += 1) {
    const worker = workers[globalIndex % workers.length]
    const gateway = gateways.get(worker.id)
    const spent = spentByWorker.get(worker.id) || 0
    const input = routineInput(worker, globalIndex, spent)

    if (globalIndex >= 9_850 && globalIndex < 9_890) {
      input.action = {
        type: 'company.high_consequence.commit',
        purpose: worker.purpose,
        idempotencyKey: `${worker.id}:mature-approval:${globalIndex}`,
        scenario: 'legitimate_approval',
      }
      input.evidence = { claims: ['high_consequence_evidence_complete'], flags: [] }
    } else if (globalIndex >= 9_890 && globalIndex < 9_970) {
      input.action.scenario = 'blocked_risk_signal'
      input.evidence.flags = ['instruction_injection']
    } else if (globalIndex >= 9_970 && globalIndex < 9_990) {
      input.action.scenario = 'replay'
      input.action.idempotencyKey = `${worker.id}:operating-day:${globalIndex % workers.length}`
    } else if (globalIndex >= 9_990) {
      input.action.scenario = 'provider_failure'
      input.action.simulateProviderFailure = true
    } else {
      input.action.scenario = 'routine_productive'
    }

    const result = await gateway.invoke(input)
    counts.decisions += 1
    counts[result.status] = (counts[result.status] || 0) + 1
    if (result.status === 'executed' && input.action.amount?.currency === 'EUR') {
      spentByWorker.set(worker.id, spent + Number(input.action.amount.value || 0))
    }
  }

  const humanAttentionItems = counts.approval_required + counts.failed
  const estimatedHumanMinutes = humanAttentionItems * averageHumanReviewMinutes
  const receipts = [...gateways.values()].reduce((sum, gateway) => sum + gateway.receipts().length, 0)
  const unauthorizedProviderCalls = providerCalls.filter((call) => ['legitimate_approval', 'blocked_risk_signal'].includes(call.scenario)).length

  return {
    workforce: workforceSummary(workers),
    counts,
    providerCalls: providerCalls.length,
    unauthorizedProviderCalls,
    receipts,
    humanAttentionItems,
    humanAttentionRate: humanAttentionItems / counts.decisions,
    estimatedHumanMinutes,
    onePersonSupervisionTarget: {
      maxHumanItems: 50,
      maxHumanMinutes: 120,
      passed: humanAttentionItems <= 50 && estimatedHumanMinutes <= 120,
    },
    caveat: 'Synthetic mature operating profile. This proves authority-system behavior under the profile, not that one person can run a real company without additional operational work.',
  }
}
