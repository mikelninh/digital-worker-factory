export const OPEN_CAPABILITIES_SCHEMA = 'open-capabilities.catalog/1'

const READINESS = new Set(['live', 'adapter_ready', 'pilot'])
const RISK = new Set(['read', 'write', 'consequential'])
const PROTOCOLS = new Set(['http', 'mcp', 'a2a', 'x402'])

function freezeCapability(capability) {
  return Object.freeze({
    ...capability,
    domains: Object.freeze([...(capability.domains ?? [])]),
    protocols: Object.freeze([...(capability.protocols ?? [])]),
    authority: Object.freeze({ ...capability.authority }),
    trust: Object.freeze({ ...capability.trust }),
    privacy: Object.freeze({ ...capability.privacy }),
    deployment: Object.freeze([...(capability.deployment ?? [])]),
    commercial: Object.freeze({
      ...capability.commercial,
      models: Object.freeze([...(capability.commercial?.models ?? [])]),
    }),
    proof: capability.proof ? Object.freeze({ ...capability.proof }) : null,
  })
}

export function assertOpenCapability(capability) {
  if (!capability || typeof capability !== 'object') throw new Error('capability_required')
  if (!/^[a-z0-9][a-z0-9._-]{2,100}$/.test(capability.id ?? '')) throw new Error('capability_invalid_id')
  if (!/^\d+\.\d+\.\d+$/.test(capability.version ?? '')) throw new Error('capability_invalid_version')
  if (!capability.name || capability.name.length > 120) throw new Error('capability_invalid_name')
  if (!capability.provider) throw new Error('capability_provider_required')
  if (!READINESS.has(capability.readiness)) throw new Error('capability_invalid_readiness')
  if (!RISK.has(capability.risk)) throw new Error('capability_invalid_risk')
  if (!Array.isArray(capability.domains) || capability.domains.length === 0) throw new Error('capability_domains_required')
  if (!Array.isArray(capability.protocols) || capability.protocols.length === 0) throw new Error('capability_protocols_required')
  if (capability.protocols.some((protocol) => !PROTOCOLS.has(protocol))) throw new Error('capability_invalid_protocol')
  if (typeof capability.authority?.canExecuteConsequentialAction !== 'boolean') throw new Error('capability_authority_contract_required')
  if (typeof capability.authority?.humanApprovalRequired !== 'boolean') throw new Error('capability_human_approval_contract_required')
  if (capability.risk === 'consequential' && capability.authority.humanApprovalRequired !== true) {
    throw new Error('consequential_capability_requires_human_approval')
  }
  if (typeof capability.trust?.evidenceReturned !== 'boolean') throw new Error('capability_evidence_contract_required')
  if (typeof capability.trust?.deterministicCore !== 'boolean') throw new Error('capability_determinism_contract_required')
  if (typeof capability.trust?.evalsPublished !== 'boolean') throw new Error('capability_eval_contract_required')
  if (typeof capability.privacy?.acceptsSensitiveData !== 'boolean') throw new Error('capability_privacy_contract_required')
  if (!capability.privacy?.retention) throw new Error('capability_retention_required')
  if (!Array.isArray(capability.deployment) || capability.deployment.length === 0) throw new Error('capability_deployment_required')
  if (!Array.isArray(capability.commercial?.models) || capability.commercial.models.length === 0) {
    throw new Error('capability_commercial_models_required')
  }
  if (!capability.sourceRepo?.startsWith('https://github.com/')) throw new Error('capability_source_repo_required')
  if (capability.readiness === 'live' && !capability.endpoint) throw new Error('live_capability_requires_endpoint')
  return true
}

export const OPEN_CAPABILITIES = Object.freeze([
  freezeCapability({
    id: 'hauspilot.triage.v1',
    version: '0.1.0',
    name: 'Operations triage',
    provider: 'digital-worker-factory',
    readiness: 'adapter_ready',
    domains: ['operations', 'housing'],
    protocols: ['http', 'x402'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: true },
    trust: { evidenceReturned: true, deterministicCore: true, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['usage', 'pilot', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/digital-worker-factory',
    endpoint: null,
    proof: {
      status: 'base-sepolia-x402-settlement-proven',
      transaction: '0xb28f1b80c766f02ad1fb3d53ae718b51a734ad41814ef8acd75bfcaa5272f385',
      network: 'eip155:84532',
    },
  }),
  freezeCapability({
    id: 'judge.output.v1',
    version: '0.1.0',
    name: 'Independent output judge',
    provider: 'judge-mcp',
    readiness: 'adapter_ready',
    domains: ['agent-quality', 'evaluation'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: false },
    trust: { evidenceReturned: true, deterministicCore: false, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['usage', 'pilot', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/judge-mcp',
    endpoint: null,
  }),
  freezeCapability({
    id: 'rights.eu261.v1',
    version: '0.1.0',
    name: 'EU261 flight-rights check',
    provider: 'flight-rights-mcp',
    readiness: 'adapter_ready',
    domains: ['rights', 'travel'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: false },
    trust: { evidenceReturned: true, deterministicCore: true, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['usage', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/flight-rights-mcp',
    endpoint: null,
  }),
  freezeCapability({
    id: 'rights.elterngeld.de.v1',
    version: '0.1.0',
    name: 'German parental-benefit calculation',
    provider: 'elterngeld-mcp',
    readiness: 'adapter_ready',
    domains: ['rights', 'public-benefits'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: false },
    trust: { evidenceReturned: true, deterministicCore: true, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['usage', 'pilot', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/elterngeld-mcp',
    endpoint: null,
  }),
  freezeCapability({
    id: 'terms.agb.de.v1',
    version: '0.1.0',
    name: 'German terms risk scan',
    provider: 'agb-reader-mcp',
    readiness: 'adapter_ready',
    domains: ['legal', 'consumer-rights'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: false },
    trust: { evidenceReturned: true, deterministicCore: true, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['usage', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/agb-reader-mcp',
    endpoint: null,
  }),
  freezeCapability({
    id: 'legal.gitlaw.de.v1',
    version: '0.1.0',
    name: 'Source-grounded German legal research',
    provider: 'gitlaw',
    readiness: 'adapter_ready',
    domains: ['legal', 'rights', 'public-administration'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: true },
    trust: { evidenceReturned: true, deterministicCore: false, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['pilot', 'annual-license', 'usage'] },
    sourceRepo: 'https://github.com/mikelninh/gitlaw',
    endpoint: null,
  }),
  freezeCapability({
    id: 'document.preflight.v1',
    version: '0.1.0',
    name: 'Document completeness and evidence preflight',
    provider: 'pruefpilot',
    readiness: 'adapter_ready',
    domains: ['public-administration', 'documents', 'grants'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: true },
    trust: { evidenceReturned: true, deterministicCore: false, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['pilot', 'annual-license', 'usage'] },
    sourceRepo: 'https://github.com/mikelninh/pruefpilot-document-ai',
    endpoint: null,
  }),
  freezeCapability({
    id: 'entity.resolve.org.v1',
    version: '0.1.0',
    name: 'Organisation entity resolution with merge evidence',
    provider: 'safetrace',
    readiness: 'pilot',
    domains: ['entity-resolution', 'compliance', 'public-administration'],
    protocols: ['http'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: true },
    trust: { evidenceReturned: true, deterministicCore: false, evalsPublished: false },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['pilot', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/safetrace',
    endpoint: null,
  }),
  freezeCapability({
    id: 'publicmoney.de.v1',
    version: '0.1.0',
    name: 'Grounded German public-budget lookup',
    provider: 'pmm-mcp',
    readiness: 'adapter_ready',
    domains: ['public-finance', 'transparency', 'public-administration'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: false },
    trust: { evidenceReturned: true, deterministicCore: true, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['managed-eu', 'customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['usage', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/pmm-mcp',
    endpoint: null,
  }),
  freezeCapability({
    id: 'openproof.verify.v1',
    version: '0.1.0',
    name: 'Proof and claim binding verification',
    provider: 'openaction',
    readiness: 'adapter_ready',
    domains: ['trust', 'identity', 'permission'],
    protocols: ['http', 'mcp'],
    risk: 'read',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: false },
    trust: { evidenceReturned: true, deterministicCore: true, evalsPublished: true },
    privacy: { acceptsSensitiveData: false, retention: 'none' },
    deployment: ['customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['pilot', 'annual-license', 'usage'] },
    sourceRepo: 'https://github.com/mikelninh/openaction',
    endpoint: null,
  }),
  freezeCapability({
    id: 'careos.review.v1',
    version: '0.1.0',
    name: 'Evidence-first clinical workflow review',
    provider: 'care-os',
    readiness: 'pilot',
    domains: ['healthcare', 'clinical-workflow'],
    protocols: ['http'],
    risk: 'consequential',
    authority: { canExecuteConsequentialAction: false, humanApprovalRequired: true },
    trust: { evidenceReturned: true, deterministicCore: false, evalsPublished: true },
    privacy: { acceptsSensitiveData: true, retention: 'contract-specific' },
    deployment: ['customer-vpc', 'sovereign-compatible'],
    commercial: { models: ['pilot', 'annual-license'] },
    sourceRepo: 'https://github.com/mikelninh/care-os',
    endpoint: null,
  }),
])

for (const capability of OPEN_CAPABILITIES) assertOpenCapability(capability)

export function buildOpenCapabilitiesCatalog({ generatedAt = new Date().toISOString() } = {}) {
  const counts = OPEN_CAPABILITIES.reduce(
    (acc, capability) => {
      acc[capability.readiness] += 1
      return acc
    },
    { live: 0, adapter_ready: 0, pilot: 0 },
  )

  return Object.freeze({
    schema: OPEN_CAPABILITIES_SCHEMA,
    generatedAt,
    positioning: 'Proof before trust. Authority outside the model. Evidence with every action.',
    readinessPolicy: {
      live: 'Public reachable endpoint plus green contract/eval gates.',
      adapter_ready: 'Existing provider logic/evals exist; common OCN adapter or public hosting remains.',
      pilot: 'Institution-specific validation, governance or additional eval evidence is required.',
    },
    counts: Object.freeze(counts),
    capabilities: OPEN_CAPABILITIES,
  })
}
