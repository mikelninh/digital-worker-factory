import test from 'node:test'
import assert from 'node:assert/strict'
import { createFactoryGateway } from './factory-gateway.mjs'

test('shared gateway blocks GitLaw writes before network and executes after approval', async () => {
  const networkCalls = []
  const gateway = createFactoryGateway({
    gitlaw: {
      baseUrl: 'https://gitlaw.example',
      sessionHeaders: async () => ({ Cookie: 'session=test' }),
      fetchImpl: async (url, init) => {
        networkCalls.push({ url, init })
        return {
          ok: true,
          status: 200,
          async json() { return { ok: true, id: 'case-99', collection: 'cases' } },
        }
      },
    },
  })

  const blocked = await gateway.invoke({
    actor: { id: 'assistant-9', role: 'legal_assistant' },
    capabilityId: 'gitlaw.case.update',
    input: { caseId: 'case-99', item: { id: 'case-99', caseStatus: 'in_pruefung' } },
  })

  assert.equal(blocked.status, 'blocked')
  assert.equal(networkCalls.length, 0, 'policy gate must block before the provider/network boundary')

  const approved = await gateway.invoke({
    actor: { id: 'assistant-9', role: 'legal_assistant' },
    capabilityId: 'gitlaw.case.update',
    input: { caseId: 'case-99', item: { id: 'case-99', caseStatus: 'in_pruefung' } },
    approvedBy: 'lawyer-2',
  })

  assert.equal(approved.status, 'executed')
  assert.equal(networkCalls.length, 1)
  assert.match(networkCalls[0].url, /\/api\/pro\/entities\?collection=cases&id=case-99$/)
  assert.equal(networkCalls[0].init.method, 'PUT')
  assert.equal(gateway.auditLog().length, 2)
  assert.equal(gateway.auditLog()[0].status, 'blocked')
  assert.equal(gateway.auditLog()[1].status, 'executed')
})
