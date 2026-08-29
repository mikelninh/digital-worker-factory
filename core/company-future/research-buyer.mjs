import { AuthorityGateway } from '../authority/index.mjs'
import { createX402Executor } from '../authority/adapters/x402.mjs'
import { companyPolicy, earnedAutonomyMetrics } from './policy.mjs'

function normalizeHosts(hosts = []) {
  return new Set(hosts.map((host) => String(host).toLowerCase()))
}

function sourceBoundaryEvidence(sourceUrl, hostSet) {
  try {
    const url = new URL(sourceUrl || '')
    const approved = url.protocol === 'https:' && hostSet.has(url.hostname.toLowerCase())
    return approved
      ? { claims: ['source_host_approved'], flags: [] }
      : { claims: [], flags: ['privacy_scope_violation'] }
  } catch {
    return { claims: [], flags: ['privacy_scope_violation'] }
  }
}

export function createSafeHttpsReadExecutor({
  allowedHosts,
  fetchImpl = globalThis.fetch,
  maxResponseBytes = 128_000,
  timeoutMs = 8_000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch_implementation_required')
  const hostSet = normalizeHosts(allowedHosts)
  if (hostSet.size === 0) throw new Error('research_allowed_hosts_required')

  return async ({ action }) => {
    const url = new URL(action?.sourceUrl || '')
    if (url.protocol !== 'https:') throw new Error('research_source_https_required')
    if (!hostSet.has(url.hostname.toLowerCase())) throw new Error('research_source_host_not_allowed')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        redirect: 'error',
        signal: controller.signal,
        headers: { 'user-agent': 'authority-research-buyer/0.1', accept: 'application/json,text/plain;q=0.9,*/*;q=0.1' },
      })
      if (!response?.ok) throw new Error(`research_source_http_${response?.status || 'error'}`)
      const declaredLength = Number(response.headers?.get?.('content-length') || 0)
      if (declaredLength > maxResponseBytes) throw new Error('research_source_response_too_large')
      const text = await response.text()
      if (Buffer.byteLength(text, 'utf8') > maxResponseBytes) throw new Error('research_source_response_too_large')

      const contentType = String(response.headers?.get?.('content-type') || '')
      let data = text
      if (contentType.includes('application/json')) {
        try { data = JSON.parse(text) } catch { data = text }
      }
      return { transport: 'https', sourceUrl: url.toString(), contentType, data }
    } finally {
      clearTimeout(timer)
    }
  }
}

export function createResearchBuyerAgent({
  principalId = 'future-company',
  allowedHosts = ['api.github.com'],
  fetchImpl = globalThis.fetch,
  requestPaidResource = null,
  clock = () => new Date(),
} = {}) {
  const hostSet = normalizeHosts(allowedHosts)
  const actor = { id: 'research-buyer-01', role: 'research_agent', autonomyLevel: 3 }
  const principal = { id: principalId, type: 'company' }
  const delegation = {
    id: 'delegation-research-buyer-01',
    delegateId: actor.id,
    principalId,
    scopes: ['research.source.read', 'research.purchase_data'],
    purposes: ['market_intelligence'],
    validUntil: '2027-08-01T00:00:00Z',
  }

  const executors = {
    'research.source.read': createSafeHttpsReadExecutor({ allowedHosts, fetchImpl }),
  }
  if (typeof requestPaidResource === 'function') {
    executors['research.purchase_data'] = createX402Executor({ requestPaidResource })
  }

  const gateway = new AuthorityGateway({ policy: companyPolicy, executors, clock })
  let spent = 0

  return {
    actor,
    principal,
    delegation,
    receipts: () => gateway.receipts(),
    async readSource({ sourceUrl, sourceId, idempotencyKey = `read:${sourceId || sourceUrl}` } = {}) {
      return gateway.invoke({
        actor,
        principal,
        delegation,
        action: {
          type: 'research.source.read',
          purpose: 'market_intelligence',
          sourceUrl,
          sourceId: sourceId ?? null,
          idempotencyKey,
        },
        evidence: sourceBoundaryEvidence(sourceUrl, hostSet),
        metrics: earnedAutonomyMetrics,
        budget: { currency: 'EUR', spent, limit: 10 },
      })
    },
    async buyData({ resourceUrl, vendorId, amount, counterpartyApproved = true, evidenceClaims = ['vendor_terms_checked', 'source_relevant'], idempotencyKey } = {}) {
      const result = await gateway.invoke({
        actor,
        principal,
        delegation,
        action: {
          type: 'research.purchase_data',
          purpose: 'market_intelligence',
          resourceUrl,
          vendorId,
          amount: { currency: 'EUR', value: Number(amount) },
          counterpartyApproved,
          idempotencyKey: idempotencyKey || `buy:${vendorId || resourceUrl}`,
        },
        evidence: { claims: evidenceClaims },
        metrics: earnedAutonomyMetrics,
        budget: { currency: 'EUR', spent, limit: 10 },
      })
      if (result.status === 'executed') spent += Number(amount || 0)
      return result
    },
    budget: () => ({ currency: 'EUR', spent, limit: 10, remaining: Math.max(0, 10 - spent) }),
  }
}

export async function runLiveResearchBuyerSmoke() {
  const agent = createResearchBuyerAgent({
    allowedHosts: ['api.github.com'],
    clock: () => new Date('2026-08-29T10:00:00Z'),
  })

  const sources = [
    { sourceId: 'mcp-spec', sourceUrl: 'https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol' },
    { sourceId: 'x402', sourceUrl: 'https://api.github.com/repos/coinbase/x402' },
  ]
  const results = []
  for (const source of sources) {
    const result = await agent.readSource(source)
    results.push({
      sourceId: source.sourceId,
      status: result.status,
      fullName: result.result?.data?.full_name ?? null,
      description: result.result?.data?.description ?? null,
      updatedAt: result.result?.data?.updated_at ?? null,
    })
  }

  return {
    live: true,
    sources: results,
    receipts: agent.receipts().length,
    unauthorizedProviderCalls: agent.receipts().filter((receipt) => receipt.authority?.decision !== 'ALLOW' && receipt.execution?.providerCalled === true).length,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runLiveResearchBuyerSmoke()
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}
