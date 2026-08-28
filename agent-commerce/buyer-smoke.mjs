import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm'
import { privateKeyToAccount } from 'viem/accounts'

import { BASE_SEPOLIA } from './commerce-core.mjs'

export const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
export const DEFAULT_MAX_PAYMENT_ATOMIC = 20_000n // $0.02 USDC (6 decimals)

function normalizeAddress(value) {
  return String(value ?? '').toLowerCase()
}

export function selectSafePaymentRequirement(_version, accepts, {
  maxPaymentAtomic = DEFAULT_MAX_PAYMENT_ATOMIC,
  network = BASE_SEPOLIA,
  asset = BASE_SEPOLIA_USDC,
} = {}) {
  if (!Array.isArray(accepts) || accepts.length === 0) throw new Error('no_payment_requirements')

  const candidates = accepts
    .filter((item) => item?.scheme === 'exact')
    .filter((item) => item?.network === network)
    .filter((item) => normalizeAddress(item?.asset) === normalizeAddress(asset))
    .map((item) => {
      if (!/^\d+$/.test(String(item.amount ?? ''))) return null
      return { ...item, amountAtomic: BigInt(item.amount) }
    })
    .filter(Boolean)
    .filter((item) => item.amountAtomic <= BigInt(maxPaymentAtomic))
    .sort((a, b) => (a.amountAtomic < b.amountAtomic ? -1 : a.amountAtomic > b.amountAtomic ? 1 : 0))

  if (candidates.length === 0) throw new Error('no_safe_payment_requirement')

  const { amountAtomic: _amountAtomic, ...selected } = candidates[0]
  return selected
}

export function validateBuyerConfig(env = process.env) {
  const privateKey = env.BUYER_EVM_KEY
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey ?? '')) throw new Error('BUYER_EVM_KEY_invalid')

  const rawUrl = env.AGENT_COMMERCE_URL
  if (!rawUrl) throw new Error('AGENT_COMMERCE_URL_required')
  const baseUrl = new URL(rawUrl)
  const localhost = new Set(['127.0.0.1', 'localhost', '::1']).has(baseUrl.hostname)
  if (!localhost && baseUrl.protocol !== 'https:') throw new Error('remote_buyer_requires_https')

  const maxPaymentAtomic = env.MAX_PAYMENT_USDC_ATOMIC
    ? BigInt(env.MAX_PAYMENT_USDC_ATOMIC)
    : DEFAULT_MAX_PAYMENT_ATOMIC
  if (maxPaymentAtomic <= 0n || maxPaymentAtomic > 1_000_000n) throw new Error('buyer_spend_cap_invalid')

  return {
    privateKey,
    baseUrl: baseUrl.toString().replace(/\/$/, ''),
    maxPaymentAtomic,
  }
}

export async function runBuyerSmoke({ env = process.env, fetchImpl = fetch } = {}) {
  const config = validateBuyerConfig(env)
  const account = privateKeyToAccount(config.privateKey)

  const paidFetch = wrapFetchWithPaymentFromConfig(fetchImpl, {
    schemes: [
      {
        network: BASE_SEPOLIA,
        client: new ExactEvmScheme(account),
      },
    ],
    paymentRequirementsSelector: (version, accepts) =>
      selectSafePaymentRequirement(version, accepts, { maxPaymentAtomic: config.maxPaymentAtomic }),
  })

  const startedAt = Date.now()
  const response = await paidFetch(`${config.baseUrl}/v1/triage`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-agent-id': 'agent-commerce-smoke-buyer',
    },
    body: JSON.stringify({ message: 'Heizung ist defekt und verliert Wasser.' }),
  })
  const latencyMs = Date.now() - startedAt
  const body = await response.json()

  if (!response.ok) {
    const error = new Error(`paid_request_failed:${response.status}`)
    error.details = body
    throw error
  }
  if (body?.receipt?.authority?.paymentGrantedAuthority !== false) throw new Error('receipt_authority_boundary_failed')
  if (body?.result?.externalActionExecuted !== false) throw new Error('unexpected_external_action')

  const settlementHeader = response.headers.get('PAYMENT-RESPONSE')
  const settlement = settlementHeader ? decodePaymentResponseHeader(settlementHeader) : null

  return {
    buyerAddress: account.address,
    endpoint: `${config.baseUrl}/v1/triage`,
    status: response.status,
    latencyMs,
    settlement,
    serviceReceipt: body.receipt,
    result: body.result,
  }
}

async function main() {
  const result = await runBuyerSmoke()
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    if (error?.details) console.error(JSON.stringify(error.details, null, 2))
    process.exitCode = 1
  })
}
