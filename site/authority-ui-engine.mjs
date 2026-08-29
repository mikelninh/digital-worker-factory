export const uiScenarios = Object.freeze([
  { id: 'valid_purchase', sector: 'company', title: 'Approved €2 data purchase', description: 'Correct purpose, approved vendor, earned autonomy and enough delegated budget.' },
  { id: 'overspend', sector: 'company', title: 'Spend beyond the €10 envelope', description: 'The purchase is individually small enough, but would push the delegation over its total budget.' },
  { id: 'unknown_vendor', sector: 'company', title: 'Cheap but unapproved vendor', description: 'Low price is not authority. Counterparty policy still applies.' },
  { id: 'wrong_purpose', sector: 'company', title: 'Use research authority for another purpose', description: 'The agent has a valid identity but the requested purpose is outside the delegation.' },
  { id: 'prompt_injection', sector: 'regulated', title: 'Prompt-injected purchase instruction', description: 'A hard escalation overrides otherwise valid authority.' },
  { id: 'revoked_delegation', sector: 'government', title: 'Revoked casework authority', description: 'Yesterday’s delegation cannot become today’s standing permission.' },
  { id: 'government_denial', sector: 'government', title: 'Benefit denial without official approval', description: 'Evidence can be complete and the action can still require an accountable human decision.' },
  { id: 'government_denial_approved', sector: 'government', title: 'Benefit denial with exact-bound approval', description: 'Approval works only when bound to the correct action and delegation.' },
  { id: 'payment_is_not_permission', sector: 'finance', title: 'Payment settled, bank change still forbidden', description: 'A successful payment never grants a new capability.' },
  { id: 'facilitator_failure', sector: 'payments', title: 'Facilitator settlement collision', description: 'Authority allows the purchase; the external payment facilitator fails without expanding authority.' },
])

const PURPOSE = 'public_building_energy_research'
const BASE = Object.freeze({
  actor: { id: 'research-7', role: 'research_agent', autonomyLevel: 3 },
  principal: { id: 'public-buildings-lab', type: 'public_body' },
  delegation: {
    id: 'delegation-research-7',
    delegateId: 'research-7',
    principalId: 'public-buildings-lab',
    scopes: ['research.purchase_data'],
    purposes: [PURPOSE],
    validUntil: '2026-09-01T00:00:00.000Z',
  },
  action: {
    type: 'research.purchase_data',
    purpose: PURPOSE,
    amount: { currency: 'EUR', value: 2 },
    counterpartyApproved: true,
  },
  evidence: { claims: ['vendor_terms_checked', 'source_relevant'] },
  budget: { currency: 'EUR', spent: 3, limit: 10 },
  metrics: { cases: 300, acceptanceRate: 0.995, correctionRate: 0.004, unsafeExecutions: 0 },
})

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function governmentInput(actionType, revoked = false) {
  return {
    actor: { id: 'case-agent-1', role: 'casework_agent', autonomyLevel: 5 },
    principal: { id: 'district-office', type: 'government' },
    delegation: {
      id: 'delegation-case-agent-1',
      delegateId: 'case-agent-1',
      principalId: 'district-office',
      scopes: [actionType],
      purposes: ['benefit_casework'],
      validUntil: '2026-09-01T00:00:00.000Z',
      revoked,
    },
    action: { type: actionType, purpose: 'benefit_casework' },
    evidence: { claims: actionType === 'government.case.read' ? ['legal_basis'] : ['legal_basis', 'decision_evidence_complete'] },
    budget: null,
    metrics: {},
  }
}

export function scenarioInput(id) {
  const input = clone(BASE)

  if (id === 'overspend') {
    input.action.amount.value = 5
    input.budget.spent = 7
  }
  if (id === 'unknown_vendor') input.action.counterpartyApproved = false
  if (id === 'wrong_purpose') input.action.purpose = 'personal_shopping'
  if (id === 'prompt_injection') input.evidence.flags = ['instruction_injection']
  if (id === 'revoked_delegation') return governmentInput('government.case.read', true)

  if (id === 'government_denial' || id === 'government_denial_approved') {
    const gov = governmentInput('government.benefit.deny', false)
    if (id === 'government_denial_approved') {
      gov.approval = {
        approvedBy: 'official-147',
        actionType: 'government.benefit.deny',
        delegationId: 'delegation-case-agent-1',
      }
    }
    return gov
  }

  if (id === 'payment_is_not_permission') {
    input.actor = { id: 'finance-1', role: 'finance_agent', autonomyLevel: 5 }
    input.principal = { id: 'acme', type: 'company' }
    input.delegation = {
      id: 'delegation-finance-1',
      delegateId: 'finance-1',
      principalId: 'acme',
      scopes: ['finance.bank_detail_change'],
      purposes: ['finance_ops'],
      validUntil: '2026-09-01T00:00:00.000Z',
    }
    input.action = { type: 'finance.bank_detail_change', purpose: 'finance_ops', paymentStatus: 'settled' }
    input.evidence = { paymentProof: { settled: true } }
    input.budget = null
    input.metrics = {}
  }

  if (id === 'facilitator_failure') input.executionFailure = 'replacement transaction underpriced'
  return input
}

const RULES = Object.freeze({
  'research.purchase_data': {
    roles: ['research_agent'],
    purposes: [PURPOSE],
    approvedCounterpartyOnly: true,
    max: 5,
    requiredEvidence: ['vendor_terms_checked', 'source_relevant'],
  },
  'government.case.read': {
    roles: ['casework_agent'],
    purposes: ['benefit_casework'],
    requiredEvidence: ['legal_basis'],
  },
  'government.benefit.deny': {
    roles: ['casework_agent'],
    purposes: ['benefit_casework'],
    requiresApproval: true,
    requiredEvidence: ['legal_basis', 'decision_evidence_complete'],
  },
  'finance.bank_detail_change': {
    roles: ['finance_agent'],
    purposes: ['finance_ops'],
    blocked: true,
    requiredEvidence: [],
  },
})

export function evaluateUiAuthority(input) {
  const rule = RULES[input.action.type]
  const reasons = []
  if (!rule) return { decision: 'BLOCK', reasons: ['unknown_action'], execution: 'not_executed' }

  if (input.delegation.revoked) reasons.push('delegation_revoked')
  if (!input.delegation.scopes?.includes(input.action.type)) reasons.push('delegation_scope_missing')
  if (!input.delegation.purposes?.includes(input.action.purpose)) reasons.push('delegation_purpose_missing')
  if (!rule.purposes?.includes(input.action.purpose)) reasons.push('action_purpose_not_allowed')
  if (!rule.roles?.includes(input.actor.role)) reasons.push(`role_not_allowed:${input.actor.role}`)
  if (rule.blocked) reasons.push('hard_blocked_action')
  if (input.evidence.flags?.includes('instruction_injection')) reasons.push('hard_escalation:instruction_injection')

  for (const claim of rule.requiredEvidence || []) {
    if (!input.evidence.claims?.includes(claim)) reasons.push(`required_evidence_missing:${claim}`)
  }

  if (rule.approvedCounterpartyOnly && input.action.counterpartyApproved !== true) reasons.push('counterparty_not_approved')
  if (input.action.amount && Number(input.action.amount.value) > Number(rule.max)) reasons.push('action_budget_exceeded')
  if (input.action.amount && input.budget && Number(input.budget.spent) + Number(input.action.amount.value) > Number(input.budget.limit)) reasons.push('delegated_budget_exceeded')

  if (reasons.length) return { decision: 'BLOCK', reasons: [...new Set(reasons)], execution: 'not_executed' }

  if (rule.requiresApproval && !input.approval?.approvedBy) {
    return { decision: 'APPROVAL', reasons: ['explicit_approval_required'], execution: 'not_executed' }
  }
  if (input.approval?.approvedBy) {
    if (input.approval.actionType !== input.action.type) return { decision: 'BLOCK', reasons: ['approval_action_mismatch'], execution: 'not_executed' }
    if (input.approval.delegationId !== input.delegation.id) return { decision: 'BLOCK', reasons: ['approval_delegation_mismatch'], execution: 'not_executed' }
  }

  if (input.executionFailure) {
    return {
      decision: 'ALLOW',
      reasons: ['within_delegated_authority'],
      execution: 'failed',
      failureLayer: 'facilitator_settlement',
      detail: input.executionFailure,
    }
  }

  return {
    decision: 'ALLOW',
    reasons: [input.approval?.approvedBy ? 'human_approval_present' : 'within_delegated_authority'],
    execution: 'executed',
  }
}

export function runUiScenario(id) {
  const scenario = uiScenarios.find((item) => item.id === id)
  if (!scenario) throw new Error(`unknown_scenario:${id}`)
  const input = scenarioInput(id)
  return { ...scenario, input, result: evaluateUiAuthority(input) }
}
