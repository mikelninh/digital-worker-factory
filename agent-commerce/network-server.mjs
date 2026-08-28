import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createHttpJsonAdapter, invokeCapabilityAdapter } from './capability-adapter.mjs'
import { createApp as createCommerceApp } from './server.mjs'

export const JUDGE_CAPABILITY_ID = 'judge.output.v1'

function isDirectRun(metaUrl = import.meta.url, argv1 = process.argv[1]) {
  return Boolean(argv1) && metaUrl === pathToFileURL(resolve(argv1)).href
}

function validateJudgeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('judge_body_must_be_object')
  if (typeof input.artifact !== 'string' || !input.artifact.trim()) throw new Error('judge_artifact_required')
  if (input.artifact.length > 50_000) throw new Error('judge_artifact_too_large')
  if (typeof input.rubric_id !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(input.rubric_id)) {
    throw new Error('judge_rubric_id_invalid')
  }
  if (input.model !== undefined) throw new Error('judge_model_override_not_allowed')
  if (input.checks !== undefined && (!Array.isArray(input.checks) || input.checks.length > 20)) {
    throw new Error('judge_checks_invalid')
  }
  return input
}

export function createNetworkApp({
  judgeProviderUrl = process.env.JUDGE_PROVIDER_URL,
  judgeFetchImpl = fetch,
  ...commerceOptions
} = {}) {
  const app = createCommerceApp(commerceOptions)

  if (!judgeProviderUrl) {
    app.get('/v1/network/health', (_req, res) => {
      return res.json({
        status: 'degraded',
        reason: 'judge_provider_not_configured',
        providers: { judge: false },
        requestId: res.locals.requestId ?? null,
      })
    })
    return app
  }

  const judgeAdapter = createHttpJsonAdapter({
    capabilityId: JUDGE_CAPABILITY_ID,
    version: '0.1.0',
    provider: 'judge-mcp',
    endpoint: judgeProviderUrl,
    timeoutMs: 20_000,
    validate: async (input) => validateJudgeInput(input),
    fetchImpl: judgeFetchImpl,
  })

  app.get('/v1/network/health', (_req, res) => {
    return res.json({
      status: 'ok',
      providers: { judge: true },
      requestId: res.locals.requestId ?? null,
    })
  })

  app.post('/v1/judge', async (req, res) => {
    try {
      const output = await invokeCapabilityAdapter(judgeAdapter, {
        input: req.body,
        context: { requestId: res.locals.requestId },
      })
      return res.json({
        ok: true,
        requestId: res.locals.requestId,
        capabilityId: JUDGE_CAPABILITY_ID,
        provider: 'judge-mcp',
        result: output.result ?? output,
        authority: {
          paymentGrantedAuthority: false,
          consequentialActionExecuted: false,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const status = message.startsWith('judge_') ? 400 : message === 'provider_timeout' ? 504 : 502
      return res.status(status).json({
        error: message,
        providerDetails: error?.details ?? null,
        requestId: res.locals.requestId ?? null,
      })
    }
  })

  return app
}

export function startNetworkServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 4021)
  const app = createNetworkApp(options)
  return app.listen(port, () => {
    console.log(`Open Capability Network listening on http://localhost:${port}`)
  })
}

if (isDirectRun()) startNetworkServer()
