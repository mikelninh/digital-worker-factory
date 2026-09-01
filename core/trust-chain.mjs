import { createHash } from 'node:crypto'

export const TRUST_CHAIN_VERSION = 'trust-chain/v1'
export const TRUST_LEVELS = Object.freeze({ NONE: 'none', TRACEABLE: 'traceable', VERIFIED: 'verified' })
const AUTHENTICITY = new Set(['unverified', 'original_as_received', 'verified_issuer'])
const DECISIONS = new Set(['pending', 'approved', 'rejected'])
const present = (v) => typeof v === 'string' ? v.trim().length > 0 : v !== null && v !== undefined
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v}
export function trustChainDigest(chain){return createHash('sha256').update(JSON.stringify(stable(chain))).digest('hex')}

export function validateTrustChain(chain,{minimumLevel=TRUST_LEVELS.TRACEABLE,approvedBy=null}={}){
  const reasons=[]
  if(!chain||typeof chain!=='object')return{ok:false,level:TRUST_LEVELS.NONE,reasons:['trust_chain_required']}
  if(chain.version!==TRUST_CHAIN_VERSION)reasons.push('trust_chain_version_invalid')
  if(!present(chain.subject?.id)||!present(chain.subject?.type))reasons.push('subject_required')
  if(!AUTHENTICITY.has(chain.authenticity?.status))reasons.push('authenticity_status_required')
  if(!present(chain.authenticity?.method))reasons.push('authenticity_method_required')
  if(chain.integrity?.verified!==true)reasons.push('integrity_not_verified')
  if(!/^[a-f0-9]{64}$/i.test(chain.integrity?.sha256??''))reasons.push('integrity_sha256_required')
  if(!present(chain.integrity?.version)||!present(chain.integrity?.capturedAt))reasons.push('integrity_version_timestamp_required')
  if(!present(chain.provenance?.sourceSystem)||!present(chain.provenance?.sourceUri)||!present(chain.provenance?.acquiredAt))reasons.push('provenance_required')
  if(!present(chain.authority?.id)||!present(chain.authority?.title)||!present(chain.authority?.version)||!present(chain.authority?.sourceUrl))reasons.push('authority_required')
  if(!['authoritative','case_specific'].includes(chain.authority?.status))reasons.push('authority_status_required')
  if(!Array.isArray(chain.evidence)||chain.evidence.length===0)reasons.push('evidence_required')
  const ids=new Set()
  for(const item of chain.evidence??[]){if(!present(item?.id)||!present(item?.sourceId))reasons.push('evidence_identity_required');if(!present(item?.locator?.kind)||!present(item?.locator?.value))reasons.push('evidence_exact_locator_required');if(!/^[a-f0-9]{64}$/i.test(item?.excerptHash??''))reasons.push('evidence_excerpt_hash_required');if(present(item?.id))ids.add(item.id)}
  if(!present(chain.derivation?.summary)||!present(chain.derivation?.method))reasons.push('derivation_summary_required')
  if(!Array.isArray(chain.derivation?.evidenceIds)||chain.derivation.evidenceIds.length===0)reasons.push('derivation_evidence_required')
  for(const id of chain.derivation?.evidenceIds??[])if(!ids.has(id))reasons.push(`derivation_unknown_evidence:${id}`)
  if(chain.humanDecision?.required!==true||!DECISIONS.has(chain.humanDecision?.status))reasons.push('human_decision_state_required')
  if(approvedBy&&chain.humanDecision?.status!=='approved')reasons.push('human_approval_not_recorded')
  if(chain.humanDecision?.status==='approved'){
    if(!present(chain.humanDecision?.actorId)||!present(chain.humanDecision?.at))reasons.push('human_approval_identity_required')
    if(approvedBy&&chain.humanDecision.actorId!==approvedBy)reasons.push('human_approval_mismatch')
  }
  if(!present(chain.audit?.traceId)||!present(chain.audit?.createdAt))reasons.push('audit_anchor_required')
  let level=TRUST_LEVELS.NONE
  if(reasons.length===0&&chain.authenticity?.status!=='unverified')level=TRUST_LEVELS.TRACEABLE
  if(level===TRUST_LEVELS.TRACEABLE&&chain.authenticity?.status==='verified_issuer'&&chain.authority?.status==='authoritative')level=TRUST_LEVELS.VERIFIED
  if(minimumLevel===TRUST_LEVELS.TRACEABLE&&level===TRUST_LEVELS.NONE)reasons.push('minimum_trust_level_not_met:traceable')
  if(minimumLevel===TRUST_LEVELS.VERIFIED&&level!==TRUST_LEVELS.VERIFIED)reasons.push('minimum_trust_level_not_met:verified')
  return{ok:reasons.length===0,level,reasons:[...new Set(reasons)],digest:trustChainDigest(chain)}
}

export function buildEvidenceRef({id,sourceId,locatorKind,locatorValue,excerpt=''}){return{id,sourceId,locator:{kind:locatorKind,value:locatorValue},excerptHash:createHash('sha256').update(excerpt).digest('hex')}}
