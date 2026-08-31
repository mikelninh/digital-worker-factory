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

test('collects public repository evidence conservatively', async () => {
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
    const prefix = 'https://raw.githubusercontent.com/acme/trust-app/main/'
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
  assert.equal(product.evidence.audit_trace.status, 'verified')
  assert.equal(product.evidence.evals_limitations.status, 'verified')
  assert.equal(product.evidence.model_vendor_inventory.status, 'missing')
  assert.equal(product.evidence.ai_act_role.status, 'missing')
  assert.ok(product.collection.filesObserved.includes('README.md'))
})
