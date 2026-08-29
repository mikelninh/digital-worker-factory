import { wrapFetchWithPaymentFromConfig } from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm'
import { privateKeyToAccount } from 'viem/accounts'

export const BASE_SEPOLIA = 'eip155:84532'
export const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
export const DEFAULT_MAX_PAYMENT_ATOMIC = 20_000n

function normalizeAddress(value) {
  return String(value ?? '').toLowerCase()
}

function cleanBaseUrl(value) {
  let url
  try { url = new URL(value) } catch { throw new Error('ocn_base_url_invalid') }
  const local = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
  if (!local && url.protocol !== 'https:') throw new Error('ocn_remote_https_required')
  return url.toString().replace(/\/$/, '')
}

export function selectSafePaymentRequirement(_version, accepts, { maxPaymentAtomic = DEFAULT_MAX_PAYMENT_ATOMIC } = {}) {
  const candidates = (Array.isArray(accepts) ? accepts : [])
    .filter((item) => item?.scheme === 'exact' && item?.network === BASE_SEPOLIA)
    .filter((item) => normalizeAddress(item?.asset) === normalizeAddress(BASE_SEPOLIA_USDC))
    .filter((item) => /^\d+$/.test(String(item?.amount ?? '')))
    .map((item) => ({ ...item, amountAtomic: BigInt(item.amount) }))
    .filter((item) => item.amountAtomic <= BigInt(maxPaymentAtomic))
    .sort((a, b) => (a.amountAtomic < b.amountAtomic ? -1 : a.amountAtomic > b.amountAtomic ? 1 : 0))
  if (!candidates.length) throw new Error('no_safe_ocn_payment_requirement')
  const { amountAtomic: _ignored, ...selected } = candidates[0]
  return selected
}

export function createPaidOCNClient({
  baseUrl,
  privateKey,
  maxPaymentAtomic = DEFAULT_MAX_PAYMENT_ATOMIC,
  fetchImpl = fetch,
  agentId = 'ocn-js-sdk',
} = {}) {
  const base = cleanBaseUrl(baseUrl)
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey ?? '')) throw new Error('ocn_private_key_invalid')
  const cap = BigInt(maxPaymentAtomic)
  if (cap <= 0n || cap > 1_000_000n) throw new Error('ocn_spend_cap_invalid')
  const account = privateKeyToAccount(privateKey)
  const paidFetch = wrapFetchWithPaymentFromConfig(fetchImpl, {
    schemes: [{ network: BASE_SEPOLIA, client: new ExactEvmScheme(account) }],
    paymentRequirementsSelector: (version, accepts) => selectSafePaymentRequirement(version, accepts, { maxPaymentAtomic: cap }),
  })

  async function post(path, body, { requestId, idempotencyKey } = {}) {
    const headers = { 'content-type': 'application/json', 'x-agent-id': String(agentId).slice(0, 100) }
    if (requestId) headers['x-request-id'] = requestId
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey
    const response = await paidFetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(`ocn_http_${response.status}`)
      error.details = payload
      throw error
    }
    return payload
  }

  return Object.freeze({
    buyerAddress: account.address,
    listTrustedEvents: async () => {
      const response = await fetchImpl(`${base}/.well-known/trusted-events.json`)
      if (!response.ok) throw new Error(`ocn_catalog_http_${response.status}`)
      return response.json()
    },
    preflight: (input, options) => post('/v1/trust/preflight', input, options),
    verifyEvidence: (input, options) => post('/v1/evidence/verify', input, options),
    verifyFreshness: (input, options) => post('/v1/freshness/verify', input, options),
    checkAuthority: (input, options) => post('/v1/authority/check', input, options),
    resolveOrganisation: (input, options) => post('/v1/entity/resolve', input, options),
  })
}

export function withOCNGuard({ client, reviewMode = 'return' } = {}) {
  if (!client || typeof client.preflight !== 'function') throw new Error('ocn_client_required')
  if (!['return', 'throw', 'execute'].includes(reviewMode)) throw new Error('ocn_review_mode_invalid')

  async function run({
    actorId,
    capabilityId,
    action = 'execute',
    scope = 'default',
    risk = 'read',
    grants = [],
    freshness,
    evidence,
    humanApproval = false,
    requestId,
    idempotencyKey,
    invoke,
  } = {}) {
    if (!actorId || !capabilityId) throw new Error('ocn_actor_and_capability_required')
    if (typeof invoke !== 'function') throw new Error('ocn_invoke_required')
    const preflightInput = {
      risk,
      humanApproval,
      ...(freshness ? { freshness } : {}),
      ...(evidence ? { evidence } : {}),
      ...(risk !== 'read' ? { authority: { actorId, capabilityId, action, scope, grants } } : {}),
    }
    const preflight = await client.preflight(preflightInput, { requestId, idempotencyKey })
    const decision = preflight?.result?.decision ?? preflight?.decision
    if (decision === 'block') return { status: 'blocked', executed: false, preflight }
    if (decision === 'review' && reviewMode !== 'execute') {
      if (reviewMode === 'throw') {
        const error = new Error('ocn_review_required')
        error.details = preflight
        throw error
      }
      return { status: 'review_required', executed: false, preflight }
    }
    if (decision !== 'allow' && !(decision === 'review' && reviewMode === 'execute')) throw new Error('ocn_invalid_preflight_decision')
    const output = await invoke()
    return { status: 'executed', executed: true, preflight, output }
  }

  function wrapTool(executor, describe) {
    if (typeof executor !== 'function' || typeof describe !== 'function') throw new Error('ocn_wrapper_invalid')
    return async (name, args, context = {}) => run({
      ...(await describe(name, args, context)),
      requestId: context.requestId,
      idempotencyKey: context.idempotencyKey,
      invoke: () => executor(name, args, context),
    })
  }

  return Object.freeze({ run, wrapTool })
}
