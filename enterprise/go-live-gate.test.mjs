import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateEnterpriseGoLive } from './go-live-gate.mjs'

const readJson = (name) => JSON.parse(readFileSync(new URL(`./examples/${name}`, import.meta.url), 'utf8'))

test('enterprise-ready synthetic agent receives GO', () => {
  const result = evaluateEnterpriseGoLive(readJson('acme-support-agent.json'))
  assert.equal(result.decision, 'GO')
  assert.equal(result.summary.blockers, 0)
  assert.equal(result.summary.conditions, 0)
})

test('unsafe agent is blocked with concrete production blockers', () => {
  const result = evaluateEnterpriseGoLive(readJson('unsafe-agent.json'))
  assert.equal(result.decision, 'NO_GO')
  assert.ok(result.summary.blockers >= 10)
  assert.ok(result.blockers.some((item) => item.id === 'model_secret_access'))
  assert.ok(result.blockers.some((item) => item.id === 'critical_escape'))
  assert.ok(result.blockers.some((item) => item.id === 'kill_switch'))
})

test('missing independent review is conditional, not falsely certified', () => {
  const manifest = readJson('acme-support-agent.json')
  manifest.assurance.externalReview = false
  const result = evaluateEnterpriseGoLive(manifest)
  assert.equal(result.decision, 'CONDITIONAL')
  assert.equal(result.summary.blockers, 0)
  assert.ok(result.conditions.some((item) => item.id === 'external_review'))
  assert.match(result.scope, /not a certification/i)
})

test('consequential action without exact human approval is always NO_GO', () => {
  const manifest = readJson('acme-support-agent.json')
  manifest.actions.find((item) => item.id === 'customer.email').approvalBoundToIntent = false
  const result = evaluateEnterpriseGoLive(manifest)
  assert.equal(result.decision, 'NO_GO')
  assert.ok(result.blockers.some((item) => item.id === 'approval_binding:customer.email'))
})
