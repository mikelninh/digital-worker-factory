import crypto from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createHttpJsonAdapter, invokeCapabilityAdapter } from './capability-adapter.mjs'
import { BASE_SEPOLIA, makeServiceReceipt } from './commerce-core.mjs'
import { createApp as createCommerceApp } from './server.mjs'
import { buildTrustedEventCatalog } from './trusted-event-catalog.mjs'
import { prevalidateTrustedEventInput } from './trusted-event-input.mjs'
import { createTrustedEventPaymentGate, TRUSTED_EVENT_ROUTES } from './trusted-event-payment.mjs'
import { executeTrustedEvent, TRUSTED_EVENT_OFFERS } from './trusted-events.mjs'
import { MemoryTrustEvidenceStore } from './trust-telemetry.mjs'
import { MemoryUsageBudgetStore } from './usage-budget.mjs'

export const JUDGE_CAPABILITY_ID = 'judge.output.v1'

const TRUSTED_EVENT_PATHS = Object.freeze(Object.fromEntries(
  Object.entries(TRUSTED_EVENT_ROUTES).map(([route, capabilityId]) => [route.replace(/^POST /, ''), capabilityId]),
))

function isDirectRun(metaUrl = import.meta.url, argv1 = process.argv[1]) {
  return Boolean(argv1) && metaUrl === pathToFileURL(resolve(argv1)).href
}

function secureEqual(a, b) {
  const aa = Buffer.from(String(a ?? ''))
  const bb = Buffer.from(String(b ?? ''))
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb)
}

function validateJudgeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('judge_body_must_be_object')
  if (typeof input.artifact !== 'string' || !input.artifact.trim()) throw new Error('judge_artifact_required')
  if (input.artifact.length > 50_000) throw new Error('judge_artifact_too_large')
  if (typeof input.rubric_id !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(input.rubric_id)) throw new Error('judge_rubric_id_invalid')
  if (input.model !== undefined) throw new Error('judge_model_override_not_allowed')
  if (input.checks !== undefined && (!Array.isArray(input.checks) || input.checks.length > 20)) throw new Error('judge_checks_invalid')
  return input
}

function trustedEventDescriptor(capabilityId, { network }) {
  const offer = TRUSTED_EVENT_OFFERS[capabilityId]
  return Object.freeze({
    id: capabilityId,
    version: '1.0.0',
    pricing: Object.freeze({ amountUsd: offer.priceUsd, asset: 'USDC', network }),
  })
}

export function createNetworkApp({
  judgeProviderUrl = process.env.JUDGE_PROVIDER_URL,
  judgeFetchImpl = fetch,
  trustEvidenceStore = new MemoryTrustEvidenceStore(),
  usageBudgetStore = new MemoryUsageBudgetStore({ windowMs: 60_000, defaultLimit: 600 }),
  usageLimitPerMinute = Number(process.env.OCN_USAGE_LIMIT_PER_MINUTE ?? 600),
  feedbackToken = process.env.OCN_FEEDBACK_TOKEN,
  publicBaseUrl = process.env.OCN_PUBLIC_BASE_URL ?? null,
  ...commerceOptions
} = {}) {
  const app = createCommerceApp(commerceOptions)
  const paymentsMode = commerceOptions.paymentsMode ?? process.env.PAYMENTS_MODE ?? 'x402'
  const network = commerceOptions.network ?? process.env.X402_NETWORK ?? BASE_SEPOLIA
  const trustedPaymentGate = createTrustedEventPaymentGate({ ...commerceOptions, paymentsMode, network })
  app.locals.trustEvidenceStore = trustEvidenceStore
  app.locals.usageBudgetStore = usageBudgetStore

  let judgeAdapter = null
  if (judgeProviderUrl) {
    judgeAdapter = createHttpJsonAdapter({
      capabilityId: JUDGE_CAPABILITY_ID,
      version: '0.1.0',
      provider: 'judge-mcp',
      endpoint: judgeProviderUrl,
      timeoutMs: 20_000,
      validate: async (input) => validateJudgeInput(input),
      fetchImpl: judgeFetchImpl,
    })
  }

  app.get('/.well-known/trusted-events.json', (_req, res) => {
    res.set('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    return res.json(buildTrustedEventCatalog({ baseUrl: publicBaseUrl, network }))
  })

  app.get('/v1/network/health', (_req, res) => res.json({
    status: judgeAdapter ? 'ok' : 'degraded',
    reason: judgeAdapter ? null : 'judge_provider_not_configured',
    providers: { judge: Boolean(judgeAdapter) },
    trustedEvents: Object.keys(TRUSTED_EVENT_OFFERS).length,
    paymentsMode,
    network,
    telemetry: 'aggregate-no-raw-payloads',
    requestId: res.locals.requestId ?? null,
  }))

  app.get('/v1/trust/metrics', (_req, res) => {
    res.set('cache-control', 'public, max-age=30')
    return res.json(trustEvidenceStore.summary())
  })

  app.post('/v1/trust/outcomes', (req, res) => {
    if (!feedbackToken) return res.status(503).json({ error: 'feedback_not_configured', requestId: res.locals.requestId ?? null })
    const auth = req.get('authorization') ?? ''
    const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!secureEqual(supplied, feedbackToken)) return res.status(401).json({ error: 'unauthorized', requestId: res.locals.requestId ?? null })
    try {
      const feedback = trustEvidenceStore.recordOutcome(req.body)
      return res.json({ ok: true, feedback, requestId: res.locals.requestId ?? null })
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : String(error), requestId: res.locals.requestId ?? null })
    }
  })

  app.post('/v1/judge', async (req, res) => {
    if (!judgeAdapter) return res.status(503).json({ error: 'judge_provider_not_configured', requestId: res.locals.requestId ?? null })
    const started = Date.now()
    try {
      const output = await invokeCapabilityAdapter(judgeAdapter, { input: req.body, context: { requestId: res.locals.requestId } })
      const result = output.result ?? output
      const trustEvent = trustEvidenceStore.record({
        capabilityId: JUDGE_CAPABILITY_ID,
        requestId: res.locals.requestId,
        result,
        latencyMs: Date.now() - started,
        actorClass: 'external_agent',
      })
      return res.json({
        ok: true,
        requestId: res.locals.requestId,
        trustEventId: trustEvent.eventId,
        capabilityId: JUDGE_CAPABILITY_ID,
        provider: 'judge-mcp',
        result,
        authority: { paymentGrantedAuthority: false, consequentialActionExecuted: false },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const status = message.startsWith('judge_') ? 400 : message === 'provider_timeout' ? 504 : 502
      return res.status(status).json({ error: message, providerDetails: error?.details ?? null, requestId: res.locals.requestId ?? null })
    }
  })

  // Cheap validation and abuse budget happen before payment, so malformed/over-limit traffic is not charged.
  app.use((req, res, next) => {
    if (req.method !== 'POST') return next()
    const capabilityId = TRUSTED_EVENT_PATHS[req.path]
    if (!capabilityId) return next()
    try {
      prevalidateTrustedEventInput(capabilityId, req.body)
      const subject = (req.get('x-agent-id') ?? req.ip ?? 'anonymous').slice(0, 160)
      const budget = usageBudgetStore.consume({ subject, capabilityId, limit: usageLimitPerMinute })
      res.set('x-ratelimit-limit', String(budget.limit))
      res.set('x-ratelimit-remaining', String(Math.max(0, budget.limit - budget.used)))
      res.set('x-ratelimit-reset', String(Math.ceil(budget.resetAt / 1000)))
      if (!budget.allowed) return res.status(429).json({ error: 'usage_budget_exceeded', requestId: res.locals.requestId ?? null })
      res.locals.trustedEventCapabilityId = capabilityId
      return next()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : String(error), requestId: res.locals.requestId ?? null })
    }
  })

  app.use(trustedPaymentGate)

  for (const [path, capabilityId] of Object.entries(TRUSTED_EVENT_PATHS)) {
    app.post(path, (req, res) => {
      const started = Date.now()
      try {
        const result = executeTrustedEvent(capabilityId, req.body)
        const descriptor = trustedEventDescriptor(capabilityId, { network })
        const payment = res.locals.trustedEventPayment ?? { settlementRef: null }
        const receipt = makeServiceReceipt({ descriptor, request: req.body, traceId: res.locals.requestId, output: result, payment })
        const trustEvent = trustEvidenceStore.record({
          capabilityId,
          requestId: res.locals.requestId,
          result,
          latencyMs: Date.now() - started,
          payment: receipt.payment,
          actorClass: 'external_agent',
        })
        return res.json({
          ok: true,
          requestId: res.locals.requestId,
          trustEventId: trustEvent.eventId,
          capabilityId,
          trustedEvent: true,
          result,
          receipt,
        })
      } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : String(error), requestId: res.locals.requestId ?? null })
      }
    })
  }

  return app
}

export function startNetworkServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 4021)
  const app = createNetworkApp(options)
  return app.listen(port, () => console.log(`Open Capability Network listening on http://localhost:${port}`))
}

if (isDirectRun()) startNetworkServer()
