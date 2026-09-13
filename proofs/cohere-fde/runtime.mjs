import { AgentGateway } from '../../core/agent-gateway.mjs'
import { CapabilityRegistry, RISK_LEVELS } from '../../core/capability-registry.mjs'
import { makeSecurityContext } from '../../core/security-boundary.mjs'

export const COHERE_FDE_RUNTIME_VERSION = 'cohere-fde-runtime/v1'

const TENANT_ID = 'synthetic-cohere-fde'
const ACTOR = Object.freeze({ id: 'north-demo-agent', role: 'fde_demo_agent', tenantId: TENANT_ID })

const CAPABILITIES = Object.freeze([
  {
    id: 'policy.read',
    provider: 'synthetic_policy_store',
    risk: RISK_LEVELS.READ,
    external: false,
    allowedRoles: [ACTOR.role],
  },
  {
    id: 'contract.read',
    provider: 'synthetic_contract_store',
    risk: RISK_LEVELS.READ,
    external: false,
    allowedRoles: [ACTOR.role],
  },
  {
    id: 'crm.lookup',
    provider: 'synthetic_crm',
    risk: RISK_LEVELS.READ,
    external: false,
    allowedRoles: [ACTOR.role],
  },
  {
    id: 'case.update.prepare',
    provider: 'synthetic_case_service',
    risk: RISK_LEVELS.READ,
    external: false,
    allowedRoles: [ACTOR.role],
  },
  {
    id: 'case.update.release',
    provider: 'synthetic_case_service',
    risk: RISK_LEVELS.CONSEQUENTIAL,
    external: true,
    allowedRoles: [ACTOR.role],
  },
])

function makeRegistry() {
  return new CapabilityRegistry().registerMany(CAPABILITIES)
}

function makeSecurity({ toolCalls, approvalRequired = false, approvalBoundToIntent = false, egressDestination = 'none' } = {}) {
  return makeSecurityContext({
    tenantId: TENANT_ID,
    instructionAuthority: 'human',
    originKind: 'synthetic_fixture',
    originTrust: 'trusted_internal',
    supplyChainStatus: 'allowlisted',
    requestedScopes: [],
    toolCalls,
    maxToolCalls: 8,
    subagentDepth: 0,
    maxSubagentDepth: 0,
    egressDestination,
    containsSensitive: false,
    approvalRequired,
    approvalBoundToIntent,
  })
}

function makeGateway() {
  const registry = makeRegistry()
  const executors = {
    'policy.read': async () => ({
      source: 'payment-policy-v4.2',
      finding: 'vendor exception requires human approval before consequential write',
      citation: 'exception-matrix:high-impact-write',
    }),
    'contract.read': async () => ({
      source: 'orion-labs-contract.pdf',
      finding: 'payment exception may be reviewed under clause 8.3',
      citation: 'clause-8.3',
    }),
    'crm.lookup': async () => ({
      source: 'crm://orion-labs',
      finding: 'account active; prior exception exists; no release authority present',
      citation: 'account-status+prior-exception',
    }),
    'case.update.prepare': async ({ input }) => ({
      draft: {
        caseId: 'CASE-ORION-042',
        disposition: 'review_required',
        summary: 'Evidence supports review, but release remains human-controlled.',
        evidenceIds: input.evidenceIds,
      },
      effect: 'none',
    }),
    'case.update.release': async ({ approvedBy, traceId }) => ({
      simulated: true,
      releasedBy: approvedBy,
      receipt: `SIM-${traceId}`,
      effect: 'synthetic_only',
    }),
  }
  return new AgentGateway({ registry, executors, securityRequired: true })
}

function toEvidence(toolResults) {
  return toolResults.map(({ capabilityId, result }) => ({
    capabilityId,
    status: result.ok ? 'verified' : result.status,
    source: result.output?.source ?? null,
    finding: result.output?.finding ?? null,
    citation: result.output?.citation ?? null,
    traceId: result.traceId,
  }))
}

function toolReceipt(toolResults) {
  return toolResults.map(({ capabilityId, result }) => ({
    capabilityId,
    status: result.status,
    provider: result.policy?.capability?.provider ?? null,
    risk: result.policy?.capability?.risk ?? null,
    traceId: result.traceId,
  }))
}

export async function runCohereFdeDemo({
  contractPresent = true,
  approvedBy = null,
  requestId = crypto.randomUUID(),
} = {}) {
  const gateway = makeGateway()
  const toolResults = []
  let toolCalls = 0

  const invoke = async (capabilityId, input = {}, securityOverrides = {}) => {
    const result = await gateway.invoke({
      actor: ACTOR,
      capabilityId,
      input,
      approvedBy: securityOverrides.approvedBy ?? null,
      traceId: `${requestId}:${capabilityId}`,
      securityContext: makeSecurity({ toolCalls, ...securityOverrides }),
    })
    toolCalls += 1
    toolResults.push({ capabilityId, result })
    return result
  }

  const policy = await invoke('policy.read')
  const crm = await invoke('crm.lookup')

  let contract = null
  if (contractPresent) contract = await invoke('contract.read')

  const evidence = toEvidence(toolResults)
  const requiredEvidence = ['payment-policy-v4.2', 'orion-labs-contract.pdf', 'crm://orion-labs']
  const presentSources = new Set(evidence.filter((item) => item.status === 'verified').map((item) => item.source))
  const missingEvidence = requiredEvidence.filter((source) => !presentSources.has(source))

  if (missingEvidence.length > 0) {
    return {
      schema: COHERE_FDE_RUNTIME_VERSION,
      synthetic: true,
      requestId,
      status: 'blocked',
      decision: 'BLOCKED',
      reason: 'required_evidence_missing',
      missingEvidence,
      evidence,
      tools: toolReceipt(toolResults),
      policy: null,
      security: null,
      actionEffect: 'NONE',
      audit: gateway.auditLog(),
    }
  }

  const prepared = await invoke('case.update.prepare', {
    evidenceIds: [policy.output.source, contract.output.source, crm.output.source],
  })

  const release = await invoke(
    'case.update.release',
    { draft: prepared.output.draft },
    {
      approvedBy,
      approvalRequired: true,
      approvalBoundToIntent: Boolean(approvedBy),
      egressDestination: 'approved_external',
    },
  )

  const decision = release.ok ? 'APPROVED' : 'REVIEW_REQUIRED'
  const reason = release.ok
    ? 'human_approval_verified'
    : (release.policy?.reasons?.[0] ?? release.security?.reasons?.[0] ?? 'human_approval_required')

  return {
    schema: COHERE_FDE_RUNTIME_VERSION,
    synthetic: true,
    requestId,
    status: release.ok ? 'approved' : 'review',
    decision,
    reason,
    evidence: toEvidence(toolResults.filter((item) => ['policy.read', 'contract.read', 'crm.lookup'].includes(item.capabilityId))),
    tools: toolReceipt(toolResults),
    draft: prepared.output?.draft ?? null,
    policy: release.policy ?? null,
    security: release.security ?? null,
    actionEffect: release.output?.effect ?? 'NONE',
    releaseReceipt: release.output ?? null,
    audit: gateway.auditLog(),
  }
}
