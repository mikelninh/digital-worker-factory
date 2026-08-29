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
    allowedActions: ['matter.read', 'matter.summarize', 'legal.research', 'draft.prepare', 'case_update.prepare'],
    approvalActions: ['client_communication.send', 'case_record.update', 'external_filing.submit'],
    blockedActions: ['deadline.change', 'payment_details.change', 'client_funds.instruct', 'cross_matter.read'],
    successMetrics: ['lawyer_reviewed_useful_work', 'human_minutes_saved_per_matter', 'source_correction_rate', 'prepared_work_acceptance_rate', 'cross_matter_leaks', 'unauthorized_external_executions'],
  }),
  freezeProfile({
    id: 'design-partner-commercial-01',
    tenantId: 'tenant-commercial-01',
    type: 'commercial_service_company',
    phase: DESIGN_PARTNER_PHASES.SYNTHETIC,
    purpose: 'commercial_operations_assistance',
    dataMode: 'synthetic_or_non_sensitive_first',
    allowedActions: ['prospect.research', 'account_brief.prepare', 'proposal.prepare', 'meeting_brief.prepare', 'customer_request.triage'],
    approvalActions: ['external_outreach.send', 'commercial_commitment.make', 'money.spend'],
    blockedActions: ['payment_details.change', 'unrelated_customer_data.read', 'unrelated_project_data.read'],
    successMetrics: ['useful_work_units', 'operator_minutes_saved', 'accepted_drafts', 'qualified_opportunities', 'unauthorized_external_communications', 'unauthorized_spend_or_data_access'],
  }),
])

export function designPartnerByTenant(tenantId) {
  return designPartners.find((partner) => partner.tenantId === tenantId) || null
}

export function evaluateTenantAuthority({ tenantId, delegationTenantId, actionType } = {}) {
  const partner = designPartnerByTenant(tenantId)
  if (!partner) return { decision: 'BLOCK', reason: 'unknown_tenant' }
  if (!delegationTenantId || delegationTenantId !== tenantId) return { decision: 'BLOCK', reason: 'tenant_delegation_mismatch' }
  if (partner.blockedActions.includes(actionType)) return { decision: 'BLOCK', reason: 'action_blocked_by_tenant_policy' }
  if (partner.approvalActions.includes(actionType)) return { decision: 'APPROVAL', reason: 'tenant_action_requires_approval' }
  if (partner.allowedActions.includes(actionType)) return { decision: 'ALLOW', reason: 'within_tenant_authority_profile' }
  return { decision: 'BLOCK', reason: 'action_not_in_tenant_profile' }
}

export const prospectScoring = Object.freeze({
  pain: 20,
  agentReadiness: 15,
  authorityRisk: 20,
  feedbackSpeed: 20,
  pilotability: 15,
  strategicLearning: 10,
})

// Research Buyer hypotheses as of 2026-08-29. Scores are prioritisation aids,
// not customer facts; interviews and pilot evidence must replace them.
export const company01Prospects = Object.freeze([
  { id: 'warm-law-firm-01', name: 'Warm law-firm design partner', sector: 'legal', score: 91, access: 'warm', pilot: 'matter-intake-research-draft' },
  { id: 'digitalservice-aai-hub', name: 'DigitalService / BMDS Agentic AI Hub', sector: 'government', score: 88, access: 'public-programme', pilot: 'wohngeld-authority-boundary' },
  { id: 'charite-imi', name: 'Charité IMI / CMIO', sector: 'healthcare', score: 83, access: 'cold-local', pilot: 'clinical-documentation-authority' },
  { id: 'avelios-medical', name: 'Avelios Medical', sector: 'healthcare', score: 82, access: 'cold', pilot: 'hospital-agent-authority-adapter' },
  { id: 'brettinghams', name: 'THE BRETTINGHAMS GmbH', sector: 'commercial', score: 81, access: 'warm', pilot: 'agency-research-proposal-ops' },
  { id: 'klinikum-stuttgart', name: 'Klinikum Stuttgart', sector: 'healthcare', score: 81, access: 'cold', pilot: 'kis-agent-boundary-shadow' },
  { id: 'conny', name: 'CONNY', sector: 'legal', score: 80, access: 'cold-local', pilot: 'casework-authority-profile' },
  { id: 'berlin-administration', name: 'Land Berlin / participating administration', sector: 'government', score: 80, access: 'cold-local', pilot: 'benefits-caseworker-shadow' },
  { id: 'gleiss-lutz', name: 'Gleiss Lutz', sector: 'legal', score: 79, access: 'cold', pilot: 'legal-agent-consequence-gates' },
  { id: 'duesseldorf', name: 'Landeshauptstadt Düsseldorf', sector: 'government', score: 79, access: 'cold', pilot: 'wohngeld-caseworker-shadow' },
  { id: 'noxtua', name: 'Noxtua', sector: 'legal', score: 79, access: 'cold', pilot: 'legal-workspace-authority-adapter' },
  { id: 'borken', name: 'Kreis Borken', sector: 'government', score: 78, access: 'cold', pilot: 'orchestration-authority-gateway' },
  { id: 'fresenius-helios', name: 'Fresenius / Helios', sector: 'healthcare', score: 78, access: 'cold', pilot: 'health-system-authority-profile' },
  { id: 'parloa', name: 'Parloa', sector: 'commercial', score: 77, access: 'cold-local', pilot: 'customer-agent-consequence-gates' },
  { id: 'braunschweig', name: 'Städtisches Klinikum Braunschweig', sector: 'healthcare', score: 77, access: 'cold', pilot: 'kis-governed-automation-shadow' },
  { id: 'raue', name: 'Raue', sector: 'legal', score: 76, access: 'cold-local', pilot: 'law-firm-ai-authority-profile' },
  { id: 'munich', name: 'Landeshauptstadt München', sector: 'government', score: 76, access: 'cold', pilot: 'naturalisation-agent-shadow' },
  { id: 'commercetools', name: 'commercetools', sector: 'commercial', score: 76, access: 'cold-local', pilot: 'autonomous-commerce-authority' },
  { id: 'n8n', name: 'n8n', sector: 'commercial', score: 75, access: 'cold-local', pilot: 'workflow-agent-authority-adapter' },
  { id: 'langdock', name: 'Langdock', sector: 'commercial', score: 74, access: 'cold-local', pilot: 'enterprise-agent-authority-adapter' },
])

export const firstCrossSectorCohort = Object.freeze({
  legal: 'warm-law-firm-01',
  commercial: 'brettinghams',
  government: 'digitalservice-aai-hub',
  healthcare: 'charite-imi',
})

export const trustedAgentPilotSpecs = Object.freeze({
  'warm-law-firm-01': {
    goal: 'Save lawyer time on matter intake, evidence review, research and drafting without autonomous legal commitments.',
    startMode: 'P0 synthetic/redacted -> P1 read-only -> P2 prepare',
    allow: ['read explicitly permitted matter', 'extract facts/deadlines', 'source-backed research', 'prepare draft'],
    approval: ['send client communication', 'mutate official case record', 'submit/file externally'],
    block: ['cross-matter access', 'change payment/client-fund instructions', 'invent legal authority', 'self-approve'],
  },
  brettinghams: {
    goal: 'Reduce agency founder/team coordination load while keeping client commitments and outbound actions accountable.',
    startMode: 'P1 public/internal read -> P2 prepare',
    allow: ['prospect/market research', 'account brief', 'project brief', 'meeting prep', 'proposal draft'],
    approval: ['external send', 'customer commitment', 'material scope/timeline change'],
    block: ['unrelated client data', 'payment-detail change', 'unapproved spend'],
  },
  'digitalservice-aai-hub': {
    goal: 'Prove municipal agents can prepare bounded administrative work while state authority remains explicit, reviewable and revocable.',
    startMode: 'P0 synthetic Wohngeld -> P1 shadow against human-labelled cases',
    allow: ['case completeness check', 'permitted evidence retrieval', 'pinned-rule calculation', 'decision preparation'],
    approval: ['adverse consequential decision', 'external citizen communication where policy requires'],
    block: ['unrelated registry access', 'missing legal basis/jurisdiction', 'missing contestability/reversibility', 'self-expanded data scope'],
  },
  'charite-imi': {
    goal: 'Reduce clinical documentation burden while AI assistance cannot silently cross into unapproved clinical or patient-data consequences.',
    startMode: 'P0 synthetic clinical records -> P1 read-only/shadow documentation',
    allow: ['summarize permitted encounter', 'structure documentation', 'identify missing documentation', 'prepare discharge/coding suggestion'],
    approval: ['write authoritative clinical record where required', 'send sensitive record externally', 'final discharge communication'],
    block: ['unrelated-patient access', 'autonomous medication change', 'autonomous treatment/order', 'purpose expansion'],
  },
})

export function prospectsBySector(sector) {
  return company01Prospects.filter((p) => p.sector === sector).sort((a, b) => b.score - a.score)
}
