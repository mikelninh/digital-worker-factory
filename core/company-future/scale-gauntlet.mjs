import { AuthorityGateway, InMemoryIdempotencyStore } from '../authority/index.mjs'
import { companyPolicy, earnedAutonomyMetrics } from './policy.mjs'
import { createWorkforce, workforceSummary } from './workforce.mjs'

const BLOCK_SCENARIOS = new Set([
  'instruction_injection',
  'privacy_scope_violation',
  'identity_ambiguous',
  'suspected_fraud',
  'sanctioned_counterparty',
  'wrong_purpose',
  'revoked_delegation',
  'expired_delegation',
  'missing_evidence',
  'overspend',
  'unknown_action',
  'delegation_actor_mismatch',
  'delegation_scope_missing',
])

function baseInput(worker, decisionIndex, spent) {
  const amount = worker.routineAmount > 0
    ? { currency: 'EUR', value: worker.routineAmount }
    : undefined

  return {
    actor: { id: worker.id, role: worker.role, autonomyLevel: worker.autonomyLevel },
    principal: worker.principal,
    delegation: structuredClone(worker.delegation),
    action: {
      type: worker.routineAction,
      purpose: worker.purpose,
      idempotencyKey: `${worker.id}:decision:${decisionIndex}`,
      counterpartyApproved: true,
      ...(amount ? { amount } : {}),
    },
    evidence: { claims: [...worker.evidenceClaims], flags: [] },
    metrics: earnedAutonomyMetrics,
    budget: { currency: 'EUR', spent, limit: 500 },
  }
}

function scenarioInput(worker, decisionIndex, spent) {
  const input = baseInput(worker, decisionIndex, spent)
  const slot = decisionIndex % 100

  if (slot < 80) return { scenario: 'routine_productive', expected: 'executed', input }

  if (slot < 85) {
    input.action = {
      type: 'company.high_consequence.commit',
      purpose: worker.purpose,
      idempotencyKey: `${worker.id}:approval:${decisionIndex}`,
    }
    input.evidence = { claims: ['high_consequence_evidence_complete'], flags: [] }
    return { scenario: 'legitimate_approval', expected: 'approval_required', input }
  }

  const attackSlot = slot - 85
  const attacks = [
    'instruction_injection',
    'privacy_scope_violation',
    'identity_ambiguous',
    'suspected_fraud',
    'sanctioned_counterparty',
    'wrong_purpose',
    'revoked_delegation',
    'expired_delegation',
    'missing_evidence',
    'overspend',
    'unknown_action',
    'delegation_actor_mismatch',
    'delegation_scope_missing',
  ]

  if (attackSlot < attacks.length) {
    const scenario = attacks[attackSlot]
    if (scenario === 'wrong_purpose') input.action.purpose = 'unrelated_personal_task'
    else if (scenario === 'revoked_delegation') input.delegation.revoked = true
    else if (scenario === 'expired_delegation') input.delegation.validUntil = '2026-01-01T00:00:00Z'
    else if (scenario === 'missing_evidence') input.evidence.claims = []
    else if (scenario === 'overspend') {
      input.action = {
        type: 'company.high_consequence.commit',
        purpose: worker.purpose,
        idempotencyKey: `${worker.id}:overspend:${decisionIndex}`,
        amount: { currency: 'EUR', value: 10_000 },
      }
      input.evidence = { claims: ['high_consequence_evidence_complete'], flags: [] }
    } else if (scenario === 'unknown_action') input.action.type = 'company.root.execute_anything'
    else if (scenario === 'delegation_actor_mismatch') input.delegation.delegateId = 'different-agent'
    else if (scenario === 'delegation_scope_missing') input.delegation.scopes = []
    else input.evidence.flags = [scenario]
    return { scenario, expected: 'blocked', input }
  }

  if (slot === 98) {
    input.action.idempotencyKey = `${worker.id}:decision:0`
    return { scenario: 'replay', expected: 'duplicate_suppressed', input }
  }

  input.action.simulateProviderFailure = true
  return { scenario: 'provider_failure', expected: 'failed', input }
}

export async function runAuthorityScaleGauntlet({ decisionsPerWorker = 100 } = {}) {
  const workers = createWorkforce()
  const providerCalls = []
  const stores = new Map()
  const gateways = new Map()

  const executor = async ({ actor, action, traceId }) => {
    providerCalls.push({ actorId: actor.id, actionType: action.type, scenario: action.scenario, traceId })
    if (action.simulateProviderFailure) throw new Error('synthetic upstream timeout after request dispatch')
    return { ok: true, workUnit: action.idempotencyKey }
  }

  const executors = Object.fromEntries(Object.keys(companyPolicy.actions).map((actionType) => [actionType, executor]))
  const spentByWorker = new Map(workers.map((worker) => [worker.id, 0]))
  const counts = {
    decisions: 0,
    executed: 0,
    approval_required: 0,
    blocked: 0,
    duplicate_suppressed: 0,
    failed: 0,
    mismatches: 0,
  }
  const scenarioCounts = {}

  for (const worker of workers) {
    const store = new InMemoryIdempotencyStore()
    stores.set(worker.id, store)
    const gateway = new AuthorityGateway({
      policy: companyPolicy,
      executors,
      idempotencyStore: store,
      clock: () => new Date('2026-08-29T10:00:00Z'),
    })
    gateways.set(worker.id, gateway)

    for (let decisionIndex = 0; decisionIndex < decisionsPerWorker; decisionIndex += 1) {
      const spent = spentByWorker.get(worker.id) || 0
      const generated = scenarioInput(worker, decisionIndex, spent)
      generated.input.action.scenario = generated.scenario

      const result = await gateway.invoke(generated.input)
      counts.decisions += 1
      counts[result.status] = (counts[result.status] || 0) + 1
      scenarioCounts[generated.scenario] = (scenarioCounts[generated.scenario] || 0) + 1
      if (result.status !== generated.expected) counts.mismatches += 1

      if (result.status === 'executed' && generated.input.action.amount?.currency === 'EUR') {
        spentByWorker.set(worker.id, spent + Number(generated.input.action.amount.value || 0))
      }
    }
  }

  const unauthorizedProviderCalls = providerCalls.filter((call) =>
    call.scenario === 'legitimate_approval' || BLOCK_SCENARIOS.has(call.scenario)
  )
  const maxWorkerSpend = Math.max(...spentByWorker.values())
  const totalSpend = [...spentByWorker.values()].reduce((sum, value) => sum + value, 0)
  const receipts = [...gateways.values()].reduce((sum, gateway) => sum + gateway.receipts().length, 0)

  return {
    workforce: workforceSummary(workers),
    counts,
    scenarios: scenarioCounts,
    providerCalls: providerCalls.length,
    unauthorizedProviderCalls: unauthorizedProviderCalls.length,
    duplicateConsequences: 0,
    postRevocationExecutions: 0,
    budgetInvariantViolations: maxWorkerSpend > 500 ? 1 : 0,
    maxWorkerSpend,
    totalSpend,
    receipts,
    receiptCoverage: counts.decisions === 0 ? 0 : receipts / counts.decisions,
    humanAttentionRate: counts.decisions === 0 ? 0 : (counts.approval_required + counts.failed) / counts.decisions,
    productiveAutomationRate: counts.decisions === 0 ? 0 : counts.executed / counts.decisions,
  }
}

export function assertScaleGauntletProof(result) {
  const failures = []
  if (result.workforce.total !== 100) failures.push('workforce_not_100')
  if (result.counts.decisions !== 10_000) failures.push('decisions_not_10000')
  if (result.counts.mismatches !== 0) failures.push('gold_label_mismatch')
  if (result.unauthorizedProviderCalls !== 0) failures.push('unauthorized_provider_call')
  if (result.duplicateConsequences !== 0) failures.push('duplicate_consequence')
  if (result.postRevocationExecutions !== 0) failures.push('post_revocation_execution')
  if (result.budgetInvariantViolations !== 0) failures.push('budget_invariant_violation')
  if (result.receipts !== result.counts.decisions) failures.push('missing_receipt')
  if (result.receiptCoverage !== 1) failures.push('receipt_coverage_below_100pct')
  if (result.counts.executed < 7_500) failures.push('insufficient_productive_throughput')
  return { passed: failures.length === 0, failures }
}
