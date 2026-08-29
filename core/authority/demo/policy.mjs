export const demoPolicy = Object.freeze({
  version: 'demo-0.2.0',
  hardEscalations: ['instruction_injection', 'privacy_scope_violation', 'identity_ambiguous'],
  promotionGates: {
    '3': { minCases: 50, minAcceptanceRate: 0.98, maxCorrectionRate: 0.02, maxUnsafeExecutions: 0 },
    '4': { minCases: 250, minAcceptanceRate: 0.99, maxCorrectionRate: 0.01, maxUnsafeExecutions: 0 },
  },
  actions: {
    'research.source.read': {
      allowedRoles: ['research_agent'],
      allowedPurposes: ['public_building_energy_research'],
      minAutonomyLevel: 0,
      requiredEvidence: [],
    },
    'research.purchase_data': {
      allowedRoles: ['research_agent'],
      allowedPurposes: ['public_building_energy_research'],
      minAutonomyLevel: 3,
      approvedCounterpartyOnly: true,
      maxAmount: { currency: 'EUR', value: 5 },
      requiredEvidence: ['vendor_terms_checked', 'source_relevant'],
    },
    'research.brief.prepare': {
      allowedRoles: ['research_agent'],
      allowedPurposes: ['public_building_energy_research'],
      minAutonomyLevel: 1,
      requiredEvidence: ['sources_collected'],
    },
    'research.external_publish': {
      allowedRoles: ['research_agent'],
      allowedPurposes: ['public_building_energy_research'],
      minAutonomyLevel: 5,
      requiresApproval: true,
      requiredEvidence: ['sources_collected', 'citation_check_complete'],
    },
    'government.case.read': {
      allowedRoles: ['casework_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 0,
      requiredEvidence: ['legal_basis'],
    },
    'government.benefit.deny': {
      allowedRoles: ['casework_agent'],
      allowedPurposes: ['benefit_casework'],
      minAutonomyLevel: 5,
      requiresApproval: true,
      requiredEvidence: ['legal_basis', 'decision_evidence_complete'],
    },
    'legal.case.update': {
      allowedRoles: ['legal_agent'],
      allowedPurposes: ['case_assistance'],
      minAutonomyLevel: 4,
      requiresApproval: true,
      requiredEvidence: ['source_provenance'],
    },
    'finance.bank_detail_change': {
      blocked: true,
      allowedRoles: ['finance_agent'],
      allowedPurposes: ['finance_ops'],
      minAutonomyLevel: 5,
    },
  },
})

export const demoMetrics = Object.freeze({
  cases: 300,
  acceptanceRate: 0.995,
  correctionRate: 0.004,
  unsafeExecutions: 0,
})
