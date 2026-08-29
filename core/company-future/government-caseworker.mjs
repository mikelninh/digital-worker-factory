import { AuthorityGateway } from '../authority/index.mjs'
import { compilePublicSectorGovernance, mergeGovernanceEvidence } from '../authority/profiles/public-sector.mjs'

export const benefitsCaseworkerPolicy = Object.freeze({
  version: 'benefits-caseworker-synthetic-0.1.0',
  hardEscalations: ['public_governance_incomplete', 'instruction_injection', 'privacy_scope_violation', 'identity_ambiguous'],
  promotionGates: {
    '3': { minCases: 50, minAcceptanceRate: 0.98, maxCorrectionRate: 0.02, maxUnsafeExecutions: 0 },
  },
  actions: {
    'government.case.read': {
      allowedRoles: ['benefits_caseworker_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 0,
      requiredEvidence: ['legal_basis', 'public_case_bound'],
    },
    'government.entitlement.calculate': {
      allowedRoles: ['benefits_caseworker_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 2,
      requiredEvidence: ['legal_basis', 'rule_version_pinned', 'input_evidence_complete'],
    },
    'government.decision.prepare': {
      allowedRoles: ['benefits_caseworker_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 1,
      requiredEvidence: ['rule_version_pinned', 'calculation_trace'],
    },
    'government.award.issue': {
      allowedRoles: ['benefits_caseworker_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 3,
      requiredEvidence: ['legal_basis', 'public_case_bound', 'accountable_official', 'positive_entitlement', 'calculation_trace'],
    },
    'government.denial.issue': {
      allowedRoles: ['benefits_caseworker_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 5,
      requiresApproval: true,
      requiredEvidence: [
        'legal_basis',
        'public_case_bound',
        'accountable_official',
        'decision_evidence_complete',
        'calculation_trace',
        'contestability_route',
        'reversibility_declared',
      ],
    },
  },
})

const earnedMetrics = Object.freeze({ cases: 200, acceptanceRate: 0.995, correctionRate: 0.005, unsafeExecutions: 0 })

function governanceFor({ caseId, program, adverse = false, complete = true } = {}) {
  const governance = {
    caseId,
    legalBasis: `SYNTHETIC_RULESET:${program}:2026-08-29`,
    jurisdiction: 'synthetic-berlin-demo',
    accountableOfficial: 'official:demo-001',
    purpose: 'benefit_casework',
    dataScope: ['household', 'income', 'housing_costs', 'submitted_evidence'],
  }
  if (adverse) {
    governance.contestability = complete ? { route: 'synthetic-objection-route', owner: 'appeals-team' } : null
    governance.reversibility = complete ? { mode: 'case-reopen-and-correct', owner: 'benefits-office' } : null
  }
  return governance
}

function baseContext({ caseId, program, scopes } = {}) {
  return {
    actor: { id: 'benefits-caseworker-01', role: 'benefits_caseworker_agent', autonomyLevel: 3 },
    principal: { id: 'synthetic-benefits-office', type: 'government' },
    delegation: {
      id: 'delegation-benefits-caseworker-01',
      delegateId: 'benefits-caseworker-01',
      principalId: 'synthetic-benefits-office',
      scopes,
      purposes: ['benefit_casework'],
      validUntil: '2027-08-01T00:00:00Z',
    },
    metrics: earnedMetrics,
    caseId,
    program,
  }
}

function governedEvidence({ action, caseId, program, adverse = false, complete = true, claims = [] } = {}) {
  const compiled = compilePublicSectorGovernance({
    action,
    governance: governanceFor({ caseId, program, adverse, complete }),
    adverse,
  })
  return mergeGovernanceEvidence({ claims }, compiled)
}

export async function runGovernmentCaseworkerProof() {
  const providerCalls = []
  const executor = async ({ action }) => {
    providerCalls.push(action.type)
    return { ok: true, syntheticCaseAction: action.type }
  }
  const gateway = new AuthorityGateway({
    policy: benefitsCaseworkerPolicy,
    executors: Object.fromEntries(Object.keys(benefitsCaseworkerPolicy.actions).map((type) => [type, executor])),
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const programs = ['Buergergeld', 'Wohngeld', 'Kinderzuschlag']
  const positive = []

  for (let index = 0; index < programs.length; index += 1) {
    const program = programs[index]
    const caseId = `synthetic-${program.toLowerCase()}-${index + 1}`
    const scopes = ['government.case.read', 'government.entitlement.calculate', 'government.decision.prepare', 'government.award.issue', 'government.denial.issue']
    const context = baseContext({ caseId, program, scopes })

    const readAction = { type: 'government.case.read', purpose: 'benefit_casework', idempotencyKey: `${caseId}:read` }
    const read = await gateway.invoke({
      ...context,
      action: readAction,
      evidence: governedEvidence({ action: readAction, caseId, program, claims: [] }),
    })

    const calculateAction = { type: 'government.entitlement.calculate', purpose: 'benefit_casework', idempotencyKey: `${caseId}:calculate` }
    const calculate = await gateway.invoke({
      ...context,
      action: calculateAction,
      evidence: governedEvidence({ action: calculateAction, caseId, program, claims: ['rule_version_pinned', 'input_evidence_complete'] }),
    })

    const prepareAction = { type: 'government.decision.prepare', purpose: 'benefit_casework', idempotencyKey: `${caseId}:prepare` }
    const prepare = await gateway.invoke({
      ...context,
      action: prepareAction,
      evidence: governedEvidence({ action: prepareAction, caseId, program, claims: ['rule_version_pinned', 'calculation_trace'] }),
    })

    const awardAction = { type: 'government.award.issue', purpose: 'benefit_casework', idempotencyKey: `${caseId}:award` }
    const award = await gateway.invoke({
      ...context,
      action: awardAction,
      evidence: governedEvidence({ action: awardAction, caseId, program, claims: ['positive_entitlement', 'calculation_trace'] }),
    })

    positive.push({ program, read, calculate, prepare, award })
  }

  const adverseProgram = 'Wohngeld'
  const adverseCaseId = 'synthetic-wohngeld-adverse-01'
  const scopes = ['government.case.read', 'government.entitlement.calculate', 'government.decision.prepare', 'government.award.issue', 'government.denial.issue']
  const adverseContext = baseContext({ caseId: adverseCaseId, program: adverseProgram, scopes })
  const denialAction = { type: 'government.denial.issue', purpose: 'benefit_casework', idempotencyKey: `${adverseCaseId}:deny` }
  const denialEvidence = governedEvidence({
    action: denialAction,
    caseId: adverseCaseId,
    program: adverseProgram,
    adverse: true,
    complete: true,
    claims: ['decision_evidence_complete', 'calculation_trace'],
  })

  const withoutApproval = await gateway.invoke({ ...adverseContext, action: denialAction, evidence: denialEvidence })
  const withApproval = await gateway.invoke({
    ...adverseContext,
    actor: { ...adverseContext.actor, autonomyLevel: 5 },
    action: { ...denialAction, idempotencyKey: `${adverseCaseId}:deny-approved` },
    evidence: denialEvidence,
    approval: {
      approvedBy: 'official:demo-001',
      actionType: 'government.denial.issue',
      delegationId: adverseContext.delegation.id,
      at: '2026-08-29T10:01:00Z',
      validUntil: '2026-08-29T11:00:00Z',
    },
  })

  const incompleteAction = { ...denialAction, idempotencyKey: `${adverseCaseId}:deny-incomplete` }
  const incompleteEvidence = governedEvidence({
    action: incompleteAction,
    caseId: adverseCaseId,
    program: adverseProgram,
    adverse: true,
    complete: false,
    claims: ['decision_evidence_complete', 'calculation_trace'],
  })
  const incompleteGovernance = await gateway.invoke({
    ...adverseContext,
    actor: { ...adverseContext.actor, autonomyLevel: 5 },
    action: incompleteAction,
    evidence: incompleteEvidence,
    approval: {
      approvedBy: 'official:demo-001',
      actionType: 'government.denial.issue',
      delegationId: adverseContext.delegation.id,
    },
  })

  return {
    programs,
    positive,
    adverse: { withoutApproval, withApproval, incompleteGovernance },
    providerCalls,
    receipts: gateway.receipts(),
  }
}
