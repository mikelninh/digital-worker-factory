#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm'
import { privateKeyToAccount } from 'viem/accounts'
import * as z from 'zod/v4'

const BASE_SEPOLIA = 'eip155:84532'
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const DEFAULT_MAX_PAYMENT_ATOMIC = 20_000n

function normalizeAddress(value) {
  return String(value ?? '').toLowerCase()
}

function config(env = process.env) {
  const privateKey = env.OCN_BUYER_EVM_KEY
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey ?? '')) throw new Error('OCN_BUYER_EVM_KEY_invalid')
  const baseUrl = new URL(env.OCN_BASE_URL ?? '')
  const local = ['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname)
  if (!local && baseUrl.protocol !== 'https:') throw new Error('OCN_BASE_URL_requires_https')
  if ((env.OCN_NETWORK ?? BASE_SEPOLIA) !== BASE_SEPOLIA) throw new Error('ocn_mcp_v0_1_is_base_sepolia_only')
  const maxPaymentAtomic = env.OCN_MAX_PAYMENT_USDC_ATOMIC ? BigInt(env.OCN_MAX_PAYMENT_USDC_ATOMIC) : DEFAULT_MAX_PAYMENT_ATOMIC
  if (maxPaymentAtomic <= 0n || maxPaymentAtomic > 1_000_000n) throw new Error('OCN_MAX_PAYMENT_USDC_ATOMIC_invalid')
  return { privateKey, baseUrl: baseUrl.toString().replace(/\/$/, ''), maxPaymentAtomic }
}

function selectSafePaymentRequirement(_version, accepts, maxPaymentAtomic) {
  const candidates = (Array.isArray(accepts) ? accepts : [])
    .filter((item) => item?.scheme === 'exact' && item?.network === BASE_SEPOLIA)
    .filter((item) => normalizeAddress(item?.asset) === normalizeAddress(BASE_SEPOLIA_USDC))
    .filter((item) => /^\d+$/.test(String(item?.amount ?? '')))
    .map((item) => ({ ...item, amountAtomic: BigInt(item.amount) }))
    .filter((item) => item.amountAtomic <= maxPaymentAtomic)
    .sort((a, b) => (a.amountAtomic < b.amountAtomic ? -1 : a.amountAtomic > b.amountAtomic ? 1 : 0))
  if (!candidates.length) throw new Error('no_safe_ocn_payment_requirement')
  const { amountAtomic: _ignored, ...selected } = candidates[0]
  return selected
}

function createPaidFetch(env = process.env) {
  const c = config(env)
  const account = privateKeyToAccount(c.privateKey)
  const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: BASE_SEPOLIA, client: new ExactEvmScheme(account) }],
    paymentRequirementsSelector: (version, accepts) => selectSafePaymentRequirement(version, accepts, c.maxPaymentAtomic),
  })
  return { c, paidFetch, account }
}

async function callJson(fetchImpl, url, body) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-agent-id': 'ocn-mcp-bridge' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`ocn_http_${response.status}:${JSON.stringify(payload)}`)
  return payload
}

function textResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

function buildServer() {
  const { c, paidFetch, account } = createPaidFetch()
  const server = new McpServer({ name: 'open-capability-network', version: '0.1.0' })

  server.registerTool('ocn_list_trusted_events', {
    description: 'List OCN trusted events, prices and trust boundaries. This discovery call is free.',
    inputSchema: z.object({}),
  }, async () => {
    const response = await fetch(`${c.baseUrl}/.well-known/trusted-events.json`)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`ocn_catalog_http_${response.status}`)
    return textResult({ buyerAddress: account.address, ...body })
  })

  server.registerTool('ocn_preflight', {
    description: 'Paid trust preflight before an agent action. Returns allow, review or block; payment never grants authority.',
    inputSchema: z.object({
      risk: z.enum(['read', 'write', 'consequential']),
      humanApproval: z.boolean().optional(),
      freshness: z.record(z.string(), z.unknown()).optional(),
      evidence: z.record(z.string(), z.unknown()).optional(),
      authority: z.record(z.string(), z.unknown()).optional(),
    }),
  }, async (input) => textResult(await callJson(paidFetch, `${c.baseUrl}/v1/trust/preflight`, input)))

  server.registerTool('ocn_verify_evidence', {
    description: 'Paid evidence coverage and provenance-binding verification. Does not claim substantive source truth.',
    inputSchema: z.object({
      claims: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
      evidence: z.array(z.record(z.string(), z.unknown())).min(1).max(100),
    }),
  }, async (input) => textResult(await callJson(paidFetch, `${c.baseUrl}/v1/evidence/verify`, input)))

  server.registerTool('ocn_verify_freshness', {
    description: 'Paid freshness check against an explicit max-age policy.',
    inputSchema: z.object({ observedAt: z.string(), maxAgeSeconds: z.number().int().min(0).max(31_536_000) }),
  }, async (input) => textResult(await callJson(paidFetch, `${c.baseUrl}/v1/freshness/verify`, input)))

  server.registerTool('ocn_check_authority', {
    description: 'Paid explicit-grant authority check before a write or consequential action.',
    inputSchema: z.object({
      actorId: z.string().min(1), capabilityId: z.string().min(1), action: z.string().min(1), scope: z.string().optional(),
      grants: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
    }),
  }, async (input) => textResult(await callJson(paidFetch, `${c.baseUrl}/v1/authority/check`, input)))

  server.registerTool('ocn_resolve_organisation', {
    description: 'Paid bounded organisation entity resolution. Returns match evidence or ambiguity; never performs a merge.',
    inputSchema: z.object({
      query: z.record(z.string(), z.unknown()),
      candidates: z.array(z.record(z.string(), z.unknown())).min(1).max(25),
    }),
  }, async (input) => textResult(await callJson(paidFetch, `${c.baseUrl}/v1/entity/resolve`, input)))

  return server
}

serveStdio(buildServer)
