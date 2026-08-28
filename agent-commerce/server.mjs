import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import express from 'express'
import { paymentMiddleware } from '@x402/express'
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server'
import { registerExactEvmScheme } from '@x402/evm/exact/server'

import { AgentGateway } from '../core/agent-gateway.mjs'
import { CapabilityRegistry, RISK_LEVELS } from '../core/capability-registry.mjs'
import { evaluateCapabilityPolicy } from '../core/policy-gate.mjs'
import { BASE_MAINNET, BASE_SEPOLIA, makeServiceReceipt, publicCapabilityDescriptor } from './commerce-core.mjs'
import { buildOpenCapabilitiesCatalog, OPEN_CAPABILITIES } from './open-capabilities.mjs'
import { triageCase, validateTriageInput } from './triage-capability.mjs'

export const TRIAGE_CAPABILITY_ID = 'hauspilot.triage.v1'

export const TRIAGE_OFFER = Object.freeze({
  id: TRIAGE_CAPABILITY_ID,
  description: 'Classify a bounded property-operations message and return route, confidence, evidence and missing information.',
  version: '0.1.0',
  protocols: ['http', 'x402'],
  priceUsd: '0.01',
  asset: 'USDC',
  network: BASE_SEPOLIA,
  risk: RISK_LEVELS.READ,
  humanApprovalRequired: true,
  paymentBuysTrust: false,
  retention: 'none',
  acceptsSensitiveData: false,
  deterministicCore: true,
  evidenceReturned: true,
  tests: 'adversarial-contract-suite',
})

function isDirectRun(metaUrl = import.meta.url, argv1 = process.argv[1]) {
  return Boolean(argv1) && metaUrl === pathToFileURL(resolve(argv1)).href
}

function assertReceiverAddress(payTo) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(payTo ?? '')) throw new Error('PAY_TO_must_be_an_EVM_address')
}

function createRuntime() {
  const registry = new CapabilityRegistry().register({
    id: TRIAGE_CAPABILITY_ID,
    provider: 'agent-commerce',
    risk: RISK_LEVELS.READ,
    allowedRoles: ['external_agent'],
  })

  const gateway = new AgentGateway({
    registry,
    executors: {
      [TRIAGE_CAPABILITY_ID]: async ({ input }) => triageCase(input),
    },
  })

  return { registry, gateway }
}

function mockPaymentGate({ allowMock }) {
  if (!allowMock) throw new Error('mock_payments_are_test_only')
  return (req, res, next) => {
    if (req.method !== 'POST' || req.path !== '/v1/triage') return next()
    if (req.get('x-test-payment') !== 'valid') {
      return res.status(402).json({
        error: 'payment_required',
        testOnly: true,
        price: TRIAGE_OFFER.priceUsd,
        asset: TRIAGE_OFFER.asset,
        network: TRIAGE_OFFER.network,
      })
    }
    res.locals.payment = { settlementRef: `mock:${req.get('x-test-payment-id') ?? 'settled'}` }
    return next()
  }
}

function realX402Gate({ payTo, network, facilitatorUrl }) {
  assertReceiverAddress(payTo)
  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl })
  const resourceServer = new x402ResourceServer(facilitatorClient)
  registerExactEvmScheme(resourceServer)

  return paymentMiddleware(
    {
      'POST /v1/triage': {
        accepts: [
          {
            scheme: 'exact',
            price: `$${TRIAGE_OFFER.priceUsd}`,
            network,
            payTo,
          },
        ],
        description: TRIAGE_OFFER.description,
        mimeType: 'application/json',
      },
    },
    resourceServer,
  )
}

export function createApp({
  paymentsMode = process.env.PAYMENTS_MODE ?? 'x402',
  payTo = process.env.PAY_TO,
  network = process.env.X402_NETWORK ?? BASE_SEPOLIA,
  facilitatorUrl = process.env.X402_FACILITATOR_URL ?? 'https://x402.org/facilitator',
  allowMock = false,
  allowMainnet = process.env.ALLOW_MAINNET === 'true',
} = {}) {
  if (![BASE_SEPOLIA, BASE_MAINNET].includes(network)) throw new Error('unsupported_x402_network')
  if (network === BASE_MAINNET && !allowMainnet) throw new Error('mainnet_requires_explicit_ALLOW_MAINNET')
  if (!['x402', 'mock'].includes(paymentsMode)) throw new Error('unsupported_payments_mode')

  const descriptor = publicCapabilityDescriptor({ ...TRIAGE_OFFER, network })
  const { registry, gateway } = createRuntime()
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'agent-commerce-rc0',
      paymentsMode,
      network,
      mainnetEnabled: network === BASE_MAINNET,
      capabilities: [TRIAGE_CAPABILITY_ID],
      openCapabilities: OPEN_CAPABILITIES.length,
    })
  })

  app.get('/.well-known/agent-capabilities.json', (_req, res) => {
    res.json({ schema: 'agent-commerce.catalog/1', capabilities: [descriptor] })
  })

  app.get('/.well-known/open-capabilities.json', (_req, res) => {
    res.set('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    res.json(buildOpenCapabilitiesCatalog())
  })

  app.get('/v1/capabilities/:id', (req, res) => {
    const capability = OPEN_CAPABILITIES.find((item) => item.id === req.params.id)
    if (!capability) return res.status(404).json({ error: 'capability_not_found' })
    return res.json({ schema: 'open-capabilities.detail/1', capability })
  })

  app.use('/v1/triage', (req, res, next) => {
    if (req.method !== 'POST') return next()
    try {
      validateTriageInput(req.body)
      const actor = { id: req.get('x-agent-id')?.slice(0, 100) || 'external-agent', role: 'external_agent' }
      const policy = evaluateCapabilityPolicy({ registry, actor, capabilityId: TRIAGE_CAPABILITY_ID, mode: 'execute' })
      if (!policy.allowed || !policy.executionAllowed) return res.status(403).json({ error: 'policy_blocked', policy })
      res.locals.actor = actor
      return next()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : String(error) })
    }
  })

  app.use(
    paymentsMode === 'mock'
      ? mockPaymentGate({ allowMock })
      : realX402Gate({ payTo, network, facilitatorUrl }),
  )

  app.post('/v1/triage', async (req, res) => {
    const actor = res.locals.actor ?? { id: 'external-agent', role: 'external_agent' }
    const result = await gateway.invoke({ actor, capabilityId: TRIAGE_CAPABILITY_ID, input: req.body })
    if (!result.ok) return res.status(403).json({ error: 'capability_blocked', result })

    const receipt = makeServiceReceipt({
      descriptor,
      request: req.body,
      traceId: result.traceId,
      output: result.output,
      payment: res.locals.payment ?? { settlementRef: null },
    })

    return res.json({
      ok: true,
      capability: descriptor,
      result: result.output,
      receipt,
    })
  })

  app.use((error, _req, res, _next) => {
    const message = error instanceof Error ? error.message : String(error)
    res.status(500).json({ error: 'internal_error', message })
  })

  return app
}

export function startServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 4021)
  const app = createApp(options)
  return app.listen(port, () => {
    console.log(`Agent Commerce RC0 listening on http://localhost:${port}`)
  })
}

if (isDirectRun()) startServer()
