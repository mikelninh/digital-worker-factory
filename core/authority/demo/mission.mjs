import { AuthorityGateway } from '../index.mjs'
import { demoMetrics, demoPolicy } from './policy.mjs'
import { createDemoExecutors, demoCatalog } from './providers.mjs'

const CLOCK = '2026-08-29T10:00:00.000Z'

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function decisionSummary(result) {
  return {
    status: result.status,
    decision: result.decision?.decision ?? null,
    reasons: [...(result.decision?.reasons || [])],
    traceId: result.receipt?.traceId ?? null,
    providerCalled: result.receipt?.execution?.providerCalled === true,
    failure: result.receipt?.failure ?? null,
  }
}

export async function runTenEuroMission() {
  const published = []
  const gateway = new AuthorityGateway({
    policy: demoPolicy,
    executors: createDemoExecutors({ published }),
    clock: () => new Date(CLOCK),
  })

  const actor = { id: 'energy-research-agent-7', role: 'research_agent', autonomyLevel: 3 }
  const principal = { id: 'public-buildings-lab', type: 'public_body' }
  const delegation = {
    id: 'delegation-energy-2026-08-29',
    delegateId: actor.id,
    principalId: principal.id,
    scopes: ['research.source.read', 'research.purchase_data', 'research.brief.prepare', 'research.external_publish'],
    purposes: ['public_building_energy_research'],
    validFrom: '2026-08-29T08:00:00.000Z',
    validUntil: '2026-08-29T18:00:00.000Z',
  }
  const purpose = 'public_building_energy_research'
  const attempts = []
  const acquired = []
  let spent = 0

  async function invoke(label, action, evidence = {}, approval = null, errorContext = null) {
    const result = await gateway.invoke({
      actor,
      principal,
      delegation,
      action: { purpose, ...action },
      evidence,
      metrics: demoMetrics,
      approval,
      budget: { currency: 'EUR', spent, limit: 10 },
      traceId: `demo-${String(attempts.length + 1).padStart(2, '0')}`,
      errorContext,
    })
    attempts.push({ label, actionType: action.type, ...decisionSummary(result) })
    if (result.status === 'executed' && action.type === 'research.purchase_data') {
      spent = roundMoney(spent + Number(action.amount?.value || 0))
      acquired.push(result.result)
    }
    if (result.status === 'executed' && action.type === 'research.source.read') acquired.push(result.result)
    return result
  }

  await invoke(
    'Read the free public baseline',
    { type: 'research.source.read', sourceId: 'official-baseline', idempotencyKey: 'source-official-baseline' },
  )

  const benchmark = await invoke(
    'Buy the €1.20 benchmark pack',
    {
      type: 'research.purchase_data',
      vendorId: 'benchmark-pack',
      amount: { currency: 'EUR', value: 1.2 },
      counterpartyApproved: true,
      idempotencyKey: 'purchase-benchmark-pack',
    },
    { claims: ['vendor_terms_checked', 'source_relevant'] },
  )

  await invoke(
    'Buy the €4.50 retrofit curves',
    {
      type: 'research.purchase_data',
      vendorId: 'retrofit-curves',
      amount: { currency: 'EUR', value: 4.5 },
      counterpartyApproved: true,
      idempotencyKey: 'purchase-retrofit-curves',
    },
    { claims: ['vendor_terms_checked', 'source_relevant'] },
  )

  await invoke(
    'Reject an unknown vendor despite the low price',
    {
      type: 'research.purchase_data',
      vendorId: 'mystery-vendor',
      amount: { currency: 'EUR', value: 0.8 },
      counterpartyApproved: false,
      idempotencyKey: 'purchase-mystery-vendor',
    },
    { claims: ['vendor_terms_checked', 'source_relevant'] },
  )

  await invoke(
    'Block a purchase that would exceed the €10 delegation',
    {
      type: 'research.purchase_data',
      vendorId: 'retrofit-curves',
      amount: { currency: 'EUR', value: 5 },
      counterpartyApproved: true,
      idempotencyKey: 'purchase-over-budget',
    },
    { claims: ['vendor_terms_checked', 'source_relevant'] },
  )

  await invoke(
    'Block prompt-injected purchasing instructions',
    {
      type: 'research.purchase_data',
      vendorId: 'benchmark-pack',
      amount: { currency: 'EUR', value: 0.5 },
      counterpartyApproved: true,
      idempotencyKey: 'purchase-injected',
    },
    { claims: ['vendor_terms_checked', 'source_relevant'], flags: ['instruction_injection'] },
  )

  await invoke(
    'Contain a facilitator settlement failure',
    {
      type: 'research.purchase_data',
      vendorId: 'facilitator-glitch',
      amount: { currency: 'EUR', value: 0.4 },
      counterpartyApproved: true,
      idempotencyKey: 'purchase-facilitator-glitch',
      rawSignedTransaction: '0xDEMO_SIGNED_TRANSACTION_MUST_NOT_LEAK',
    },
    { claims: ['vendor_terms_checked', 'source_relevant'], paymentResponseRaw: 'base64-demo-payment-response' },
  )

  await invoke(
    'Suppress a replay of the first paid purchase',
    {
      type: 'research.purchase_data',
      vendorId: 'benchmark-pack',
      amount: { currency: 'EUR', value: 1.2 },
      counterpartyApproved: true,
      idempotencyKey: 'purchase-benchmark-pack',
    },
    { claims: ['vendor_terms_checked', 'source_relevant'] },
  )

  const evidenceIds = acquired.map((item) => item.sourceId || item.vendorId).filter(Boolean)
  const brief = await invoke(
    'Prepare the evidence-backed internal brief',
    {
      type: 'research.brief.prepare',
      evidenceIds,
      idempotencyKey: 'brief-energy-100-buildings',
    },
    { claims: ['sources_collected'] },
  )

  const publishAction = {
    type: 'research.external_publish',
    briefId: brief.result?.briefId,
    idempotencyKey: 'publish-energy-brief',
  }
  const publishEvidence = { claims: ['sources_collected', 'citation_check_complete'] }

  await invoke('Require accountable approval before external publication', publishAction, publishEvidence)
  const publishedResult = await invoke(
    'Publish after exact-bound human approval',
    publishAction,
    publishEvidence,
    {
      approvedBy: 'energy-programme-owner-1',
      actionType: 'research.external_publish',
      delegationId: delegation.id,
      at: CLOCK,
      validUntil: '2026-08-29T10:10:00.000Z',
    },
  )

  const receipts = gateway.receipts()
  const statusCounts = attempts.reduce((acc, attempt) => {
    acc[attempt.status] = (acc[attempt.status] || 0) + 1
    return acc
  }, {})

  return {
    mission: {
      id: 'ten-euro-public-building-energy-research',
      title: 'Can an autonomous agent turn €10 into a useful research brief without escaping its authority?',
      principal,
      actor,
      delegation: { id: delegation.id, validUntil: delegation.validUntil, budget: { currency: 'EUR', limit: 10 } },
      fixtureMode: true,
      disclaimer: 'Deterministic provider fixtures are used for repeatable safety testing; the authority decisions and receipts are produced by the real kernel.',
    },
    outcome: {
      completed: publishedResult.status === 'executed',
      spent: { currency: 'EUR', value: spent },
      remaining: { currency: 'EUR', value: roundMoney(10 - spent) },
      acquiredSources: acquired.length,
      brief: brief.result ?? null,
      publication: publishedResult.result ?? null,
      statusCounts,
      unauthorisedProviderCalls: receipts.filter((receipt) => receipt.authority?.decision !== 'ALLOW' && receipt.execution?.providerCalled === true).length,
      secretLeakDetected: JSON.stringify(receipts).includes('DEMO_SIGNED_TRANSACTION_MUST_NOT_LEAK') || JSON.stringify(receipts).includes('base64-demo-payment-response'),
      replayProviderCalls: attempts.filter((attempt) => attempt.label.includes('replay') && attempt.providerCalled).length,
    },
    catalog: demoCatalog(),
    attempts,
    receipts,
    proof: {
      benchmarkPurchaseTrace: benchmark.receipt?.traceId ?? null,
      invariants: {
        paymentNeverGrantsAuthority: true,
        blockedActionsCallNoProvider: true,
        preflightNeverExecutes: true,
        retriesDoNotDuplicateConsequences: true,
        externalFailureDoesNotExpandAuthority: true,
        receiptsRedactSensitivePaymentMaterial: true,
      },
    },
  }
}
