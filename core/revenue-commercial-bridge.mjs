import { createCommercialLead, getProduct } from './commercial-os.mjs'

const DEFAULT_PRODUCT_BY_VERTICAL = Object.freeze({
  hauspilot: 'hauspilot-sprint',
  'opportunity-radar': 'opportunity-radar',
  citizen_agents: 'opportunity-radar',
  pruefpilot: 'pruefpilot',
  gitlaw: 'gitlaw-workflow',
  openproof: 'openproof-integration',
})

export function chooseProductForRevenueOpportunity(opportunity, catalog) {
  const explicit = opportunity?.productId
  if (explicit && getProduct(catalog, explicit)) return explicit
  const mapped = DEFAULT_PRODUCT_BY_VERTICAL[String(opportunity?.vertical ?? '').trim().toLowerCase()]
  return mapped && getProduct(catalog, mapped) ? mapped : null
}

export function commercialLeadFromRevenueOpportunity(opportunity, catalog, { now = new Date() } = {}) {
  if (!opportunity?.id) throw new TypeError('Revenue opportunity id is required')
  if (!['qualified', 'awaiting_approval', 'contacted', 'discovery', 'proposal'].includes(opportunity.stage)) {
    throw new Error(`Revenue opportunity must be qualified before commercial handoff; got ${opportunity.stage}`)
  }
  const productId = chooseProductForRevenueOpportunity(opportunity, catalog)
  if (!productId) throw new Error(`No sellable product mapping for vertical: ${opportunity.vertical}`)
  if (!Array.isArray(opportunity.evidence) || opportunity.evidence.length === 0) {
    throw new Error('Commercial handoff requires source evidence')
  }

  return createCommercialLead({
    id: `sale-${opportunity.id}`,
    productId,
    account: opportunity.account,
    sourceOpportunityId: opportunity.id,
    evidence: opportunity.evidence,
    hypothesis: opportunity.hypothesis || '',
    now,
  })
}

export const REVENUE_TO_PRODUCT_DEFAULTS = DEFAULT_PRODUCT_BY_VERTICAL
