function present(value) {
  return value != null && String(value).trim().length > 0
}

function unique(values = []) {
  return [...new Set(values)]
}

/**
 * Reference public-sector governance profile.
 *
 * This does not claim legal compliance. It turns institution-supplied
 * governance metadata into explicit evidence claims that the Authority
 * Kernel can require before a consequential action is eligible to execute.
 */
export function compilePublicSectorGovernance({ action = {}, governance = {}, adverse = false } = {}) {
  const reasons = []
  const claims = []

  if (!present(governance.caseId)) reasons.push('public_case_id_required')
  if (!present(governance.legalBasis)) reasons.push('public_legal_basis_required')
  if (!present(governance.jurisdiction)) reasons.push('public_jurisdiction_required')
  if (!present(governance.accountableOfficial)) reasons.push('public_accountable_official_required')
  if (!present(governance.purpose)) reasons.push('public_purpose_required')
  if (present(governance.purpose) && present(action.purpose) && governance.purpose !== action.purpose) {
    reasons.push('public_purpose_mismatch')
  }
  if (!Array.isArray(governance.dataScope) || governance.dataScope.length === 0) {
    reasons.push('public_data_scope_required')
  }

  if (present(governance.caseId)) claims.push('public_case_bound')
  if (present(governance.legalBasis)) claims.push('legal_basis')
  if (present(governance.jurisdiction)) claims.push('jurisdiction_declared')
  if (present(governance.accountableOfficial)) claims.push('accountable_official')
  if (present(governance.purpose)) claims.push('purpose_declared')
  if (Array.isArray(governance.dataScope) && governance.dataScope.length > 0) claims.push('data_scope_declared')

  if (adverse === true) {
    if (!present(governance.contestability?.route)) reasons.push('public_contestability_route_required')
    if (!present(governance.contestability?.owner)) reasons.push('public_contestability_owner_required')
    if (!present(governance.reversibility?.mode)) reasons.push('public_reversibility_mode_required')
    if (!present(governance.reversibility?.owner)) reasons.push('public_reversibility_owner_required')

    if (present(governance.contestability?.route) && present(governance.contestability?.owner)) claims.push('contestability_route')
    if (present(governance.reversibility?.mode) && present(governance.reversibility?.owner)) claims.push('reversibility_declared')
  }

  return {
    ok: reasons.length === 0,
    reasons: unique(reasons),
    evidence: {
      claims: unique(claims),
      governanceRef: present(governance.caseId) ? String(governance.caseId) : null,
    },
    governance: {
      caseId: present(governance.caseId) ? String(governance.caseId) : null,
      legalBasis: present(governance.legalBasis) ? String(governance.legalBasis) : null,
      jurisdiction: present(governance.jurisdiction) ? String(governance.jurisdiction) : null,
      accountableOfficial: present(governance.accountableOfficial) ? String(governance.accountableOfficial) : null,
      purpose: present(governance.purpose) ? String(governance.purpose) : null,
      dataScope: Array.isArray(governance.dataScope) ? [...governance.dataScope] : [],
      contestability: governance.contestability ? { ...governance.contestability } : null,
      reversibility: governance.reversibility ? { ...governance.reversibility } : null,
    },
  }
}

export function mergeGovernanceEvidence(existing = {}, compiled = {}) {
  const claims = unique([...(existing.claims || []), ...(compiled.evidence?.claims || [])])
  const flags = unique([...(existing.flags || []), ...(compiled.ok === false ? ['public_governance_incomplete'] : [])])
  return {
    ...existing,
    claims,
    flags,
    governanceRef: compiled.evidence?.governanceRef ?? existing.governanceRef ?? null,
  }
}
