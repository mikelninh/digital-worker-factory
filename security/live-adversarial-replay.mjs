import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { AgentGateway } from '../core/agent-gateway.mjs'
import { CapabilityRegistry } from '../core/capability-registry.mjs'

const captureUrl = new URL('./live-adversarial-captures.json', import.meta.url)

export function loadLiveAdversarialCaptures() {
  return JSON.parse(readFileSync(captureUrl, 'utf8'))
}

function canonicalSha256(value) {
  const canonical = JSON.stringify(value, Object.keys(value).sort())
  return createHash('sha256').update(canonical).digest('hex')
}

function stableCanonical(value) {
  if (Array.isArray(value)) return `[${value.map(stableCanonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableCanonical(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function captureSha256(value) {
  return createHash('sha256').update(stableCanonical(value)).digest('hex')
}

function makeReplayGateway() {
  let executorCalls = 0
  const registry = new CapabilityRegistry().registerMany([
    { id: 'case.read', provider: 'replay', risk: 'read', external: false, allowedRoles: ['operator'] },
    { id: 'case.update', provider: 'replay', risk: 'write', external: false, allowedRoles: ['operator'] },
  ])
  const gateway = new AgentGateway({
    registry,
    securityRequired: true,
    executors: {
      'case.read': async () => ({ executed: true, ordinal: ++executorCalls }),
      'case.update': async () => ({ executed: true, ordinal: ++executorCalls }),
    },
  })
  return { gateway, executorCalls: () => executorCalls }
}

export async function replayCapturedProposal(capture) {
  const { gateway, executorCalls } = makeReplayGateway()
  const result = await gateway.invoke({
    actor: capture.actor,
    capabilityId: capture.modelProposal.capabilityId,
    input: capture.modelProposal.input,
    mode: 'execute',
    securityContext: capture.securityContext,
  })
  const calls = executorCalls()
  const impactEscaped = result.ok === true || calls > 0
  return {
    id: capture.id,
    category: capture.category,
    severity: capture.severity,
    attackSurface: capture.attackSurface,
    model: capture.capture.model,
    provider: capture.capture.provider,
    capturedAt: capture.capture.capturedAt,
    captureSha256: captureSha256(capture),
    proposedCapability: capture.modelProposal.capabilityId,
    decision: result.security?.decision ?? null,
    reasons: result.security?.reasons ?? [],
    executorCalls: calls,
    impactEscaped,
    passed: result.security?.decision === capture.expectedDecision && !impactEscaped,
  }
}

export async function buildLiveReplayReport() {
  const source = loadLiveAdversarialCaptures()
  if (source.version !== 'live-adversarial-captures/v1') throw new Error('live_capture_version_invalid')
  const replays = []
  for (const capture of source.captures ?? []) replays.push(await replayCapturedProposal(capture))

  return {
    version: 'live-adversarial-replay/v1',
    source: 'security/live-adversarial-captures.json',
    truthBoundary: 'A captured live model produced the unsafe proposals. CI deterministically replays those proposals through the real AgentGateway and asserts that no executor runs. This proves containment after model compromise; it does not prove prompt injection is solved.',
    summary: {
      cases: replays.length,
      passed: replays.filter((item) => item.passed).length,
      blocked: replays.filter((item) => item.decision === 'block').length,
      impactEscapes: replays.filter((item) => item.impactEscaped).length,
      executorCalls: replays.reduce((total, item) => total + item.executorCalls, 0),
      liveModelCases: (source.captures ?? []).filter((item) => item.capture?.liveModel === true).length,
      providerSignedReceipts: (source.captures ?? []).filter((item) => item.capture?.providerSignedReceipt === true).length,
    },
    replays,
  }
}

export const _testOnly = { stableCanonical, canonicalSha256 }
