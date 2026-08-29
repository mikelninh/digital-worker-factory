export const DESIGN_PARTNER_PHASES = Object.freeze({
  SYNTHETIC: 'P0_SYNTHETIC',
  SHADOW: 'P1_SHADOW_READ_ONLY',
  PREPARE: 'P2_PREPARE',
  BOUNDED_EXECUTE: 'P3_BOUNDED_EXECUTE',
  EARNED_AUTONOMY: 'P4_EARNED_AUTONOMY',
})

function freezeProfile(profile) {
  return Object.freeze({
    ...profile,
    allowedActions: Object.freeze([...(profile.allowedActions || [])]),
    approvalActions: Object.freeze([...(profile.approvalActions || [])]),
    blockedActions: Object.freeze([...(profile.blockedActions || [])]),
    successMetrics: Object.freeze([...(profile.successMetrics || [])]),
  })
}

export const designPartners = Object.freeze([
  freezeProfile({
    id: 'design-partner-law-01',
    tenantId: 'tenant-law-01',
    type: 'law_firm',
    phase: DESIGN_PARTNER_PHASES.SYNTHETIC,
    purpose: 'matter_assistance',
    dataMode: 'synthetic_or_redacted_first',
    allowedActions: [
      'matter.read',
      'matter.summarize',
      'legal.research',
      'draft.prepare',
      'case_update.prepare',
    ],
    approvalActions: [
      'client_communication.send',
      'case_record.update',
      'external_filing.submit',
    ],
    blockedActions: [
      'deadline.change',
      'payment_details.change',
      'client_funds.instruct',
      'cross_matter.read',
    ],
    successMetrics: [
      'lawyer_reviewed_useful_work',
      'human_minutes_saved_per_matter',
      'source_correction_rate',
      'prepared_work_acceptance_rate',
      'cross_matter_leaks',
      'unauthorized_external_executions',
    ],
  }),
  freezeProfile({
    id: 'design-partner-commercial-01',
    tenantId: 'tenant-commercial-01',
    type: 'commercial_service_company',
    phase: DESIGN_PARTNER_PHASES.SYNTHETIC,
    purpose: 'commercial_operations_assistance',
    dataMode: 'synthetic_or_non_sensitive_first',
    allowedActions: [
      'prospect.research',
      'account_brief.prepare',
      'proposal.prepare',
      'meeting_brief.prepare',
      'customer_request.triage',
    ],
    approvalActions: [
      'external_outreach.send',
      'commercial_commitment.make',
      'money.spend',
    ],
    blockedActions: [
      'payment_details.change',
      'unrelated_customer_data.read',
      'unrelated_project_data.read',
    ],
    successMetrics: [
      'useful_work_units',
      'operator_minutes_saved',
      'accepted_drafts',
      'qualified_opportunities',
      'unauthorized_external_communications',
      'unauthorized_spend_or_data_access',
    ],
  }),
])

export function designPartnerByTenant(tenantId) {
  return designPartners.find((partner) => partner.tenantId === tenantId) || null
}

export function evaluateTenantAuthority({ tenantId, delegationTenantId, actionType } = {}) {
  const partner = designPartnerByTenant(tenantId)
  if (!partner) return { decision: 'BLOCK', reason: 'unknown_tenant' }
  if (!delegationTenantId || delegationTenantId !== tenantId) {
    return { decision: 'BLOCK', reason: 'tenant_delegation_mismatch' }
  }
  if (partner.blockedActions.includes(actionType)) {
    return { decision: 'BLOCK', reason: 'action_blocked_by_tenant_policy' }
  }
  if (partner.approvalActions.includes(actionType)) {
    return { decision: 'APPROVAL', reason: 'tenant_action_requires_approval' }
  }
  if (partner.allowedActions.includes(actionType)) {
    return { decision: 'ALLOW', reason: 'within_tenant_authority_profile' }
  }
  return { decision: 'BLOCK', reason: 'action_not_in_tenant_profile' }
}
