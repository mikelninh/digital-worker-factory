import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm'
import { privateKeyToAccount } from 'viem/accounts'

import { BASE_SEPOLIA } from './commerce-core.mjs'
import { BASE_SEPOLIA_USDC, DEFAULT_MAX_PAYMENT_ATOMIC, selectSafePaymentRequirement } from './buyer-smoke.mjs'

export const DEFAULT_TRUST_EVENT_PATH = '/v1/freshness/verify'

export function isDirectRun(metaUrl = import.meta.url, argv1) {
  const candidate = arguments.length < 2 ? process.argv[1] : argv1
  return Boolean(candidate) && metaUrl === pathToFileURL(resolve(candidate)).href
}

export function validateTrustedBuyerConfig(env = process.env) {
  const privateKey = env.BUYER_EVM_KEY
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey ?? '')) throw new Error('BUYER_EVM_KEY_invalid')
  const rawUrl = env.OCN_BASE_URL ?? env.AGENT_COMMERCE_URL
  if (!rawUrl) throw new Error('OCN_BASE_URL_required')
  const baseUrl = new URL(rawUrl)
  const local = new Set(['127.0.0.1', 'localhost', '::1']).has(baseUrl.hostname)
  if (!local && baseUrl.protocol !== 'https:') throw new Error('remote_buyer_requires_https')
  const maxPaymentAtomic = env.MAX_PAYMENT_USDC_ATOMIC ? BigInt(env.MAX_PAYMENT_USDC_ATOMIC) : DEFAULT_MAX_PAYMENT_ATOMIC
  if (maxPaymentAtomic <= 0n || maxPaymentAtomic > 1_000_000n) throw new Error('buyer_spend_cap_invalid')
  const repeats = env.OCN_SMOKE_REPEATS ? Number(env.OCN_SMOKE_REPEATS) : 1
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 20) throw new Error('OCN_SMOKE_REPEATS_invalid')
  return {
    privateKey,
    baseUrl: baseUrl.toString().replace(/\/$/, ''),
    maxPaymentAtomic,
    repeats,
  }
}

export async function runTrustedEventBuyerSmoke({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  const config = validateTrustedBuyerConfig(env)
  const account = privateKeyToAccount(config.privateKey)
  const paidFetch = wrapFetchWithPaymentFromConfig(fetchImpl, {
    schemes: [{ network: BASE_SEPOLIA, client: new ExactEvmScheme(account) }],
    paymentRequirementsSelector: (version, accepts) => selectSafePaymentRequirement(version, accepts, {
      maxPaymentAtomic: config.maxPaymentAtomic,
      network: BASE_SEPOLIA,
      asset: BASE_SEPOLIA_USDC,
    }),
  })

  const calls = []
  for (let i = 0; i < config.repeats; i += 1) {
    const startedAt = now()
    const observedAt = new Date(now()).toISOString()
    const response = await paidFetch(`${config.baseUrl}${DEFAULT_TRUST_EVENT_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agent-id': 'ocn-trusted-event-smoke-buyer',
        'x-request-id': `ocn-smoke-${Date.now()}-${i}`,
      },
      body: JSON.stringify({ observedAt, maxAgeSeconds: 60 }),
    })
    const latencyMs = Math.max(0, now() - startedAt)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(`trusted_event_paid_request_failed:${response.status}`)
      error.details = body
      throw error
    }
    if (body?.receipt?.authority?.paymentGrantedAuthority !== false) throw new Error('receipt_authority_boundary_failed')
    if (body?.receipt?.authority?.consequentialActionExecuted !== false) throw new Error('unexpected_consequential_action')
    if (body?.capabilityId !== 'freshness.verify.v1') throw new Error('unexpected_trusted_event_capability')

    const settlementHeader = response.headers.get('PAYMENT-RESPONSE')
    const settlement = settlementHeader ? decodePaymentResponseHeader(settlementHeader) : null
    if (!settlement?.success) throw new Error('settlement_proof_missing_or_failed')

    calls.push({
      status: response.status,
      latencyMs,
      trustEventId: body.trustEventId ?? null,
      settlement,
      receipt: body.receipt,
      result: body.result,
    })
  }

  return {
    buyerAddress: account.address,
    endpoint: `${config.baseUrl}${DEFAULT_TRUST_EVENT_PATH}`,
    repeats: config.repeats,
    successfulCalls: calls.length,
    settlements: calls.map((call) => call.settlement?.transaction ?? null),
    avgLatencyMs: calls.length ? Math.round(calls.reduce((sum, call) => sum + call.latencyMs, 0) / calls.length) : null,
    calls,
  }
}

async function main() {
  const result = await runTrustedEventBuyerSmoke()
  console.log(JSON.stringify(result, null, 2))
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    if (error?.details) console.error(JSON.stringify(error.details, null, 2))
    process.exitCode = 1
  })
}
