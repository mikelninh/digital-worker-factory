export const SECURITY_CONTEXT_VERSION = 'security-context/v1'
export const SECURITY_DECISIONS = Object.freeze({ ALLOW: 'allow', REVIEW: 'review', BLOCK: 'block' })

const EFFECTFUL_RISKS = new Set(['write', 'consequential'])
const PROTECTED_SCOPES = new Set([
  'secrets',
  'credentials',
  'system_prompt',
  'cross_tenant_data',
  'audit_mutation',
  'policy_mutation',
])
const AUTHORITIES = new Set(['human', 'policy', 'untrusted_content', 'peer_agent', 'model'])
const ORIGIN_TRUST = new Set(['trusted_internal', 'verified_external', 'untrusted'])
const SUPPLY_CHAIN = new Set(['verified', 'allowlisted', 'unverified', 'known_bad'])
const EGRESS_DESTINATIONS = new Set(['none', 'internal', 'approved_external', 'approved_model', 'unapproved_model', 'arbitrary_external'])

const present = (value) => typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined

export function evaluateSecurityBoundary({
  context,
  actor,
  capability = null,
  approvedBy = null,
  mode = 'execute',
} = {}) {
  const block = []
  const review = []

  if (!context || typeof context !== 'object') {
    return { decision: SECURITY_DECISIONS.BLOCK, reasons: ['security_context_required'] }
  }
  if (context.version !== SECURITY_CONTEXT_VERSION) block.push('security_context_version_invalid')
  if (!present(context.tenantId)) block.push('security_tenant_required')
  if (!actor?.id) block.push('security_actor_required')
  if (!actor?.role) block.push('security_actor_role_required')
  if (actor?.tenantId && context.tenantId && actor.tenantId !== context.tenantId) block.push('cross_tenant_actor_blocked')

  if (!AUTHORITIES.has(context.instructionAuthority)) block.push('instruction_authority_invalid')
  if (!ORIGIN_TRUST.has(context.origin?.trust)) block.push('origin_trust_invalid')
  if (!present(context.origin?.kind)) block.push('origin_kind_required')
  if (!SUPPLY_CHAIN.has(context.origin?.supplyChainStatus)) block.push('supply_chain_status_invalid')

  if (!Array.isArray(context.requestedScopes)) block.push('requested_scopes_required')
  for (const scope of context.requestedScopes ?? []) {
    if (PROTECTED_SCOPES.has(scope)) block.push(`protected_scope_requested:${scope}`)
  }

  const toolCalls = Number(context.execution?.toolCalls ?? 0)
  const maxToolCalls = Number(context.execution?.maxToolCalls ?? 0)
  const depth = Number(context.execution?.subagentDepth ?? 0)
  const maxDepth = Number(context.execution?.maxSubagentDepth ?? 0)
  if (!Number.isFinite(toolCalls) || !Number.isFinite(maxToolCalls) || maxToolCalls < 1) block.push('tool_budget_invalid')
  else if (toolCalls >= maxToolCalls) block.push('tool_budget_exhausted')
  if (!Number.isFinite(depth) || !Number.isFinite(maxDepth) || maxDepth < 0) block.push('subagent_budget_invalid')
  else if (depth > maxDepth) block.push('subagent_depth_exceeded')

  const destination = context.egress?.destination
  if (!EGRESS_DESTINATIONS.has(destination)) block.push('egress_destination_invalid')
  if (context.egress?.containsSensitive === true && ['unapproved_model', 'arbitrary_external'].includes(destination)) {
    block.push('sensitive_egress_blocked')
  }

  if (context.origin?.supplyChainStatus === 'known_bad') block.push('known_bad_supply_chain_component')
  if (context.origin?.supplyChainStatus === 'unverified') review.push('unverified_supply_chain_component')

  if (context.instructionAuthority === 'peer_agent') {
    if (context.peer?.authenticated !== true) block.push('unauthenticated_peer_agent')
    if (context.peer?.tenantId && context.tenantId && context.peer.tenantId !== context.tenantId) block.push('cross_tenant_peer_agent')
  }

  const effectful = EFFECTFUL_RISKS.has(capability?.risk) || capability?.external === true
  if (effectful && ['untrusted_content', 'peer_agent', 'model'].includes(context.instructionAuthority)) {
    if (!approvedBy) block.push('untrusted_instruction_cannot_authorize_effect')
    if (approvedBy && context.approval?.boundToIntent !== true) block.push('approval_not_bound_to_intent')
  }
  if (effectful && context.origin?.trust === 'untrusted' && !approvedBy) block.push('untrusted_origin_requires_human_approval')
  if (effectful && mode === 'execute' && context.approval?.required === true && !approvedBy) block.push('security_human_approval_required')

  if (context.origin?.trust === 'untrusted' && !effectful) review.push('untrusted_origin_read')
  if (destination === 'approved_external' && context.egress?.containsSensitive === true) review.push('sensitive_approved_external_egress')

  const reasons = [...new Set([...block, ...review])]
  if (block.length > 0) return { decision: SECURITY_DECISIONS.BLOCK, reasons, effectful }
  if (review.length > 0) return { decision: SECURITY_DECISIONS.REVIEW, reasons, effectful }
  return { decision: SECURITY_DECISIONS.ALLOW, reasons: [], effectful }
}

export function makeSecurityContext({
  tenantId,
  instructionAuthority = 'human',
  originKind = 'authenticated_request',
  originTrust = 'trusted_internal',
  supplyChainStatus = 'allowlisted',
  requestedScopes = [],
  toolCalls = 0,
  maxToolCalls = 8,
  subagentDepth = 0,
  maxSubagentDepth = 0,
  egressDestination = 'none',
  containsSensitive = false,
  approvalRequired = false,
  approvalBoundToIntent = false,
  peer = null,
} = {}) {
  return {
    version: SECURITY_CONTEXT_VERSION,
    tenantId,
    instructionAuthority,
    origin: { kind: originKind, trust: originTrust, supplyChainStatus },
    requestedScopes: [...requestedScopes],
    execution: { toolCalls, maxToolCalls, subagentDepth, maxSubagentDepth },
    egress: { destination: egressDestination, containsSensitive },
    approval: { required: approvalRequired, boundToIntent: approvalBoundToIntent },
    peer: peer ?? { authenticated: false, tenantId: null, agentId: null },
  }
}
