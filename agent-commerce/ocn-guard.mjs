export class OCNGuardError extends Error {
  constructor(message, details = null) {
    super(message)
    this.name = 'OCNGuardError'
    this.details = details
  }
}

function cleanBaseUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('ocn_remote_https_required')
  }
  return url.toString().replace(/\/$/, '')
}

function ensureObject(value, error) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(error)
  return value
}

export function deriveTrustPlan({ risk = 'read', timeSensitive = false, hasEvidence = false, requiresAuthority } = {}) {
  if (!['read', 'write', 'consequential'].includes(risk)) throw new Error('guard_risk_invalid')
  const authority = requiresAuthority ?? risk !== 'read'
  const events = ['trust.preflight.v1']
  if (timeSensitive) events.push('freshness.verify.v1')
  if (hasEvidence) events.push('evidence.verify.v1')
  if (authority) events.push('authority.check.v1')
  return Object.freeze({ risk, events: Object.freeze(events), requiresAuthority: authority })
}

export function createOCNClient({
  baseUrl,
  fetchImpl = fetch,
  agentId = 'ocn-guard-client',
} = {}) {
  if (!baseUrl) throw new Error('ocn_base_url_required')
  if (typeof fetchImpl !== 'function') throw new Error('ocn_fetch_required')
  const base = cleanBaseUrl(baseUrl)

  async function post(path, body, { requestId, idempotencyKey } = {}) {
    const headers = {
      'content-type': 'application/json',
      'x-agent-id': String(agentId).slice(0, 100),
    }
    if (requestId) headers['x-request-id'] = requestId
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey
    const response = await fetchImpl(`${base}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new OCNGuardError(`ocn_http_${response.status}`, { path, payload })
    return payload
  }

  return Object.freeze({
    preflight: (input, options) => post('/v1/trust/preflight', input, options),
    verifyEvidence: (input, options) => post('/v1/evidence/verify', input, options),
    verifyFreshness: (input, options) => post('/v1/freshness/verify', input, options),
    checkAuthority: (input, options) => post('/v1/authority/check', input, options),
    resolveOrganisation: (input, options) => post('/v1/entity/resolve', input, options),
    judge: (input, options) => post('/v1/judge', input, options),
  })
}

export function createOCNGuard({ client, defaultReviewMode = 'return' } = {}) {
  if (!client || typeof client.preflight !== 'function') throw new Error('ocn_client_required')
  if (!['return', 'throw', 'execute'].includes(defaultReviewMode)) throw new Error('guard_review_mode_invalid')

  async function execute({
    actorId,
    capabilityId,
    action = 'execute',
    scope = 'default',
    risk = 'read',
    grants = [],
    freshness,
    evidence,
    humanApproval = false,
    reviewMode = defaultReviewMode,
    requestId,
    idempotencyKey,
    invoke,
    postEvidence,
    judge,
  } = {}) {
    if (typeof invoke !== 'function') throw new Error('guard_invoke_required')
    if (!actorId || !capabilityId) throw new Error('guard_actor_and_capability_required')
    const plan = deriveTrustPlan({ risk, timeSensitive: Boolean(freshness), hasEvidence: Boolean(evidence) })
    const preflightInput = {
      risk,
      humanApproval,
      ...(freshness ? { freshness } : {}),
      ...(evidence ? { evidence } : {}),
      ...(plan.requiresAuthority ? {
        authority: { actorId, capabilityId, action, scope, grants },
      } : {}),
    }

    const preflight = await client.preflight(preflightInput, { requestId, idempotencyKey })
    const decision = preflight.result?.decision ?? preflight.decision
    if (decision === 'block') {
      return Object.freeze({ status: 'blocked', executed: false, plan, preflight })
    }
    if (decision === 'review' && reviewMode !== 'execute') {
      if (reviewMode === 'throw') throw new OCNGuardError('ocn_review_required', preflight)
      return Object.freeze({ status: 'review_required', executed: false, plan, preflight })
    }

    const output = await invoke()
    const postflight = {}
    if (postEvidence) {
      ensureObject(postEvidence, 'guard_post_evidence_invalid')
      postflight.evidence = await client.verifyEvidence(postEvidence, { requestId })
    }
    if (judge) {
      ensureObject(judge, 'guard_judge_invalid')
      postflight.judge = await client.judge({ ...judge, artifact: judge.artifact ?? JSON.stringify(output) }, { requestId })
    }

    return Object.freeze({
      status: 'executed',
      executed: true,
      plan,
      preflight,
      output,
      postflight: Object.freeze(postflight),
    })
  }

  return Object.freeze({ execute })
}

export function wrapToolExecutor(executor, { guard, describe } = {}) {
  if (typeof executor !== 'function') throw new Error('guard_executor_required')
  if (!guard || typeof guard.execute !== 'function') throw new Error('guard_required')
  if (typeof describe !== 'function') throw new Error('guard_describe_required')

  return async function guardedToolCall(toolName, args, context = {}) {
    const description = ensureObject(await describe(toolName, args, context), 'guard_description_invalid')
    return guard.execute({
      ...description,
      requestId: context.requestId,
      idempotencyKey: context.idempotencyKey,
      invoke: () => executor(toolName, args, context),
    })
  }
}

export function createGuardedFetch({ guard, fetchImpl = fetch, classifyRequest } = {}) {
  if (!guard || typeof guard.execute !== 'function') throw new Error('guard_required')
  if (typeof fetchImpl !== 'function') throw new Error('guard_fetch_required')
  if (typeof classifyRequest !== 'function') throw new Error('guard_classifier_required')

  return async function guardedFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url
    const description = ensureObject(await classifyRequest({ url, init }), 'guard_description_invalid')
    const result = await guard.execute({
      ...description,
      invoke: () => fetchImpl(input, init),
    })
    if (!result.executed) throw new OCNGuardError(`ocn_${result.status}`, result)
    return result.output
  }
}
