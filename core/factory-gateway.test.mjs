import test from 'node:test'
import assert from 'node:assert/strict'
import { createFactoryGateway } from './factory-gateway.mjs'

test('shared gateway blocks GitLaw writes before network and executes only after matching legal + runtime approval', async () => {
  const networkCalls = []
  const gateway = createFactoryGateway({
    gitlaw: {
      baseUrl: 'https://gitlaw.example',
      sessionHeaders: async () => ({ Cookie: 'session=test' }),
      fetchImpl: async (url, init) => {
        networkCalls.push({ url, init })
        if (url.endsWith('/api/pro/legal-findings?id=finding-99')) {
          return {
            ok: true,
            status: 200,
            async json() {
              return {
                ok: true,
                gate: {
                  allow: true,
                  caseId: 'case-99',
                  approvedBy: 'lawyer-2',
                  chainSha256: 'a'.repeat(64),
                  reasons: [],
                },
              }
            },
          }
        }
        return {
          ok: true,
          status: 200,
          async json() { return { ok: true, id: 'case-99', collection: 'cases' } },
        }
      },
    },
  })

  const input = {
    caseId: 'case-99',
    findingId: 'finding-99',
    item: { id: 'case-99', caseStatus: 'in_pruefung' },
  }

  const blocked = await gateway.invoke({
    actor: { id: 'assistant-9', role: 'legal_assistant' },
    capabilityId: 'gitlaw.case.update',
    input,
  })

  assert.equal(blocked.status, 'blocked')
  assert.equal(networkCalls.length, 0, 'runtime policy gate must block before the provider/network boundary')

  const approved = await gateway.invoke({
    actor: { id: 'assistant-9', role: 'legal_assistant' },
    capabilityId: 'gitlaw.case.update',
    input,
    approvedBy: 'lawyer-2',
  })

  assert.equal(approved.status, 'executed')
  assert.equal(networkCalls.length, 2, 'provider must verify the legal finding before the case PUT')
  assert.match(networkCalls[0].url, /\/api\/pro\/legal-findings\?id=finding-99$/)
  assert.match(networkCalls[1].url, /\/api\/pro\/entities\?collection=cases&id=case-99$/)
  assert.equal(networkCalls[1].init.method, 'PUT')
  assert.equal(networkCalls[1].init.headers['X-GitLaw-Trust-Finding'], 'finding-99')
  assert.equal(networkCalls[1].init.headers['X-GitLaw-Trust-Chain'], 'a'.repeat(64))
  assert.equal(gateway.auditLog().length, 2)
  assert.equal(gateway.auditLog()[0].status, 'blocked')
  assert.equal(gateway.auditLog()[1].status, 'executed')
})
