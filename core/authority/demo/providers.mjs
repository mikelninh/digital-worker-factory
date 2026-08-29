const catalog = Object.freeze({
  'official-baseline': {
    title: 'Public Building Heat-Pump Baseline',
    kind: 'public_source',
    summary: 'Baseline evidence on building heat demand, system temperatures and retrofit prerequisites.',
  },
  'benchmark-pack': {
    title: 'Building Energy Benchmark Pack',
    kind: 'paid_dataset',
    price: { currency: 'EUR', value: 1.2 },
    summary: 'Synthetic benchmark rows for 100 public buildings: demand band, system temperature and retrofit readiness.',
  },
  'retrofit-curves': {
    title: 'Retrofit Cost Curves',
    kind: 'paid_dataset',
    price: { currency: 'EUR', value: 4.5 },
    summary: 'Synthetic cost/impact curves for insulation, emitter upgrades and heat-pump conversion.',
  },
  'facilitator-glitch': {
    title: 'Settlement Reliability Probe',
    kind: 'paid_dataset',
    price: { currency: 'EUR', value: 0.4 },
    summary: 'A synthetic provider used to prove settlement-failure attribution.',
  },
})

export function demoCatalog() {
  return structuredClone(catalog)
}

export function createDemoExecutors({ published = [] } = {}) {
  return {
    'research.source.read': async ({ action }) => {
      const item = catalog[action.sourceId]
      if (!item) throw new Error('source_not_found')
      return { sourceId: action.sourceId, title: item.title, summary: item.summary, kind: item.kind }
    },
    'research.purchase_data': async ({ action }) => {
      const item = catalog[action.vendorId]
      if (!item) throw new Error('dataset_not_found')
      if (action.vendorId === 'facilitator-glitch') {
        throw new Error('invalid_exact_evm_transaction_failed: replacement transaction underpriced')
      }
      return {
        vendorId: action.vendorId,
        title: item.title,
        charged: structuredClone(action.amount),
        rows: action.vendorId === 'benchmark-pack' ? 100 : 12,
        summary: item.summary,
      }
    },
    'research.brief.prepare': async ({ action }) => ({
      briefId: 'brief-energy-100-buildings',
      title: '100 public buildings — heat-pump decision brief',
      finding: 'Prioritise buildings with lower system temperatures and higher retrofit readiness; route high-temperature or poorly insulated buildings through prerequisite retrofit analysis first.',
      evidenceIds: [...(action.evidenceIds || [])],
      caveat: 'Synthetic demonstration evidence — not a real procurement or public-policy recommendation.',
    }),
    'research.external_publish': async ({ action }) => {
      const record = {
        publicationId: 'sandbox-publication-1',
        briefId: action.briefId,
        channel: 'sandbox_registry',
        visibility: 'demo_only',
      }
      published.push(record)
      return record
    },
  }
}
