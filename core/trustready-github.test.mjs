import assert from 'node:assert/strict'
import test from 'node:test'

import { collectGitHubTrustEvidence, parseGitHubRepositoryUrl } from './trustready-github.mjs'

function response(status, body, json = false) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return json ? body : JSON.parse(body) },
    async text() { return json ? JSON.stringify(body) : body },
  }
}

test('parses canonical GitHub repository URLs and rejects other hosts', () => {
  assert.deepEqual(parseGitHubRepositoryUrl('https://github.com/acme/trust-app.git'), {
    owner: 'acme',
    repo: 'trust-app',
    canonicalUrl: 'https://github.com/acme/trust-app',
  })
  assert.throws(() => parseGitHubRepositoryUrl('https://example.com/acme/trust-app'), /Only github.com/)
})

test('collects public repository evidence conservatively and pins it to an immutable revision', async () => {
  const revision = 'abc1234567890defabc1234567890defabc12345'
  const files = new Map([
    ['README.md', '# Acme AI\n\nAI assistant for operations. Human approval is required for consequential actions. The system keeps an audit trace and replay. We run evals and document limitations and failure cases. Authentication binds users to a tenant and role. Data storage uses Postgres.'],
    ['HUMAN_OVERSIGHT.md', '# Human Oversight\nFinal authority remains with an authorised operator.'],
    ['RETENTION_AND_DELETION.md', '# Retention and deletion\nCustomer data is deleted on tenant deletion.'],
    ['ASSURANCE.md', '# Assurance\nSynthetic evaluations are not production accuracy claims.'],
  ])

  const fetchImpl = async (url) => {
    if (url === 'https://api.github.com/repos/acme/trust-app') {
      return response(200, { name: 'trust-app', description: 'AI assistant for operations', default_branch: 'main' }, true)
    }
    if (url === 'https://api.github.com/repos/acme/trust-app/commits/main') {
      return response(200, { sha: revision }, true)
    }
    const prefix = `https://raw.githubusercontent.com/acme/trust-app/${revision}/`
    if (url.startsWith(prefix)) {
      const file = decodeURIComponent(url.slice(prefix.length))
      return files.has(file) ? response(200, files.get(file)) : response(404, '')
    }
    throw new Error(`Unexpected URL ${url}`)
  }

  const product = await collectGitHubTrustEvidence('https://github.com/acme/trust-app', { fetchImpl })
  assert.equal(product.name, 'trust-app')
  assert.equal(product.evidence.product_identity.status, 'verified')
  assert.equal(product.evidence.human_oversight.status, 'verified')
  assert.equal(product.evidence.retention_deletion.status, 'verified')
  assert.equal(product.evidence.audit_trace.status, 'partial')
  assert.equal(product.evidence.evals_limitations.status, 'verified')
  assert.equal(product.evidence.model_vendor_inventory.status, 'missing')
  assert.equal(product.evidence.ai_act_role.status, 'missing')
  assert.equal(product.collection.revision, revision)
  assert.match(product.collection.evidenceManifestHash, /^[a-f0-9]{64}$/)
  assert.match(product.evidence.human_oversight.source, new RegExp(revision))
  assert.equal(product.evidence.audit_trace.evidenceClass, 'heuristic_candidate')
  assert.ok(product.collection.filesObserved.includes('README.md'))
})

test('README keywords alone never become verified controls', async () => {
  const revision = 'def1234567890abc1234567890abc12345678901'
  const readme = '# Keyword Soup\n\nHuman approval. Audit trace. Replay. Incident response. Tenant authentication authorization role. Evals tests limitations failures.'
  const fetchImpl = async (url) => {
    if (url === 'https://api.github.com/repos/acme/keyword-soup') return response(200, { name: 'keyword-soup', description: 'test', default_branch: 'main' }, true)
    if (url === 'https://api.github.com/repos/acme/keyword-soup/commits/main') return response(200, { sha: revision }, true)
    const prefix = `https://raw.githubusercontent.com/acme/keyword-soup/${revision}/`
    if (url.startsWith(prefix)) {
      const file = url.slice(prefix.length)
      return file === 'README.md' ? response(200, readme) : response(404, '')
    }
    throw new Error(`Unexpected URL ${url}`)
  }
  const product = await collectGitHubTrustEvidence('https://github.com/acme/keyword-soup', { fetchImpl })
  for (const id of ['human_oversight', 'audit_trace', 'incident_response', 'access_tenant_controls', 'evals_limitations']) {
    assert.notEqual(product.evidence[id].status, 'verified', `${id} must not verify from keyword heuristics`)
  }
})
