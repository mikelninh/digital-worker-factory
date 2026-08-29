import { DECISIONS } from '../policy.mjs'

const KNOWN_OUTCOMES = new Set(['conformant', 'non_conformant', 'insufficient_evidence', 'not_yet_valid', 'expired'])

export function evaluatePortableContractResult(result, continuity = null) {
  const reasons = []

  if (!result || typeof result !== 'object') {
    return { eligible: false, reasons: ['portable_contract_conformance_missing'], binding: null }
  }

  const outcome = String(result.outcome || '')
  if (!KNOWN_OUTCOMES.has(outcome)) reasons.push('portable_contract_outcome_invalid')
  else if (outcome !== 'conformant') reasons.push(`portable_contract_${outcome}`)

  const contractId = result.contract_id ?? result.contractId
  const contractSpecVersion = result.contract_spec_version ?? result.contractSpecVersion
  const contractDigest = result.contract_digest ?? result.contractDigest

  if (!contractId) reasons.push('portable_contract_id_missing')
  if (!contractSpecVersion) reasons.push('portable_contract_spec_version_missing')
  if (!contractDigest) reasons.push('portable_contract_digest_missing')
  if (result.requires_fresh_conformance === true || result.requiresFreshConformance === true) {
    reasons.push('portable_contract_fresh_conformance_required')
  }

  if (continuity != null) {
    const continuityOutcome = String(continuity.outcome || '')
    if (continuity.requires_fresh_conformance === true || continuity.requiresFreshConformance === true) {
      reasons.push('portable_contract_changed')
    } else if (continuityOutcome && continuityOutcome !== 'current') {
      reasons.push(`portable_contract_continuity_${continuityOutcome}`)
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons: [...new Set(reasons)],
    binding: contractId && contractSpecVersion && contractDigest ? {
      contractId,
      contractSpecVersion,
      contractDigest,
    } : null,
  }
}

export function applyPortableContractGate(decision, result, continuity = null) {
  const portable = evaluatePortableContractResult(result, continuity)
  if (!portable.eligible) {
    return {
      decision: DECISIONS.BLOCK,
      executionAllowed: false,
      actionType: decision?.actionType ?? null,
      reasons: portable.reasons,
      authority: decision?.authority ?? null,
      portableContract: portable.binding,
    }
  }

  return { ...decision, portableContract: portable.binding }
}
