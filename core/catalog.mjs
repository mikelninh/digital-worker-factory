import { CapabilityRegistry, RISK_LEVELS } from './capability-registry.mjs'

export const CAPABILITIES = Object.freeze([
  {
    id: 'hauspilot.case.read',
    provider: 'hauspilot',
    risk: RISK_LEVELS.READ,
    external: false,
    allowedRoles: ['operator', 'reviewer', 'admin'],
    contract: 'Read a prepared HausPilot case without performing an external action.',
  },
  {
    id: 'hauspilot.review.prepare',
    provider: 'hauspilot',
    risk: RISK_LEVELS.WRITE,
    external: false,
    allowedRoles: ['operator', 'reviewer', 'admin'],
    contract: 'Prepare or update an internal human-review package.',
  },
  {
    id: 'hauspilot.action.external',
    provider: 'hauspilot',
    risk: RISK_LEVELS.CONSEQUENTIAL,
    external: true,
    allowedRoles: ['reviewer', 'admin'],
    contract: 'Execute an externally visible HausPilot action only after explicit human approval.',
  },
  {
    id: 'gitlaw.case.read',
    provider: 'gitlaw',
    risk: RISK_LEVELS.READ,
    external: false,
    allowedRoles: ['legal_assistant', 'lawyer', 'admin'],
    contract: 'Read an authenticated GitLaw case through the existing case/entity persistence boundary.',
    endpoint: { method: 'GET', path: '/api/pro/entities?collection=cases&id=:caseId' },
  },
  {
    id: 'gitlaw.case.update',
    provider: 'gitlaw',
    risk: RISK_LEVELS.WRITE,
    external: false,
    allowedRoles: ['legal_assistant', 'lawyer', 'admin'],
    contract: 'Update an authenticated GitLaw case through the existing entity persistence boundary.',
    endpoint: { method: 'PUT', path: '/api/pro/entities?collection=cases&id=:caseId' },
  },
  {
    id: 'gitlaw.client.checklist_change.read',
    provider: 'gitlaw',
    risk: RISK_LEVELS.READ,
    external: false,
    allowedRoles: ['legal_assistant', 'lawyer', 'admin'],
    contract: 'Read client checklist-change requests visible to the law-firm side.',
    endpoint: { method: 'GET', path: '/api/mandant/checklist-changes' },
  },
])

export function createFactoryRegistry() {
  return new CapabilityRegistry().registerMany(CAPABILITIES)
}
