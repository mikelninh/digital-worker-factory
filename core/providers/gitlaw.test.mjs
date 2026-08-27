import test from 'node:test'
import assert from 'node:assert/strict'
import { createGitLawExecutors } from './gitlaw.mjs'

test('GitLaw read uses the existing authenticated case entity endpoint', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true, item: { id: 'case-42', status: 'aktiv' } } },
    }
  }
  const executors = createGitLawExecutors({
    baseUrl: 'https://gitlaw.example',
    fetchImpl,
    sessionHeaders: async () => ({ Cookie: 'session=test' }),
  })

  const result = await executors['gitlaw.case.read']({ input: { caseId: 'case-42' } })
  assert.equal(result.id, 'case-42')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://gitlaw.example/api/pro/entities?collection=cases&id=case-42')
  assert.equal(calls[0].init.headers.Cookie, 'session=test')
})

test('GitLaw writes use PUT and preserve the existing auth boundary', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return {
      ok: true,
      status: 200,
      async json() { return { ok: true, id: 'case-42', collection: 'cases' } },
    }
  }
  const executors = createGitLawExecutors({
    baseUrl: 'https://gitlaw.example/',
    fetchImpl,
    sessionHeaders: async () => ({ Authorization: 'Bearer injected-by-caller' }),
  })

  const result = await executors['gitlaw.case.update']({
    input: { caseId: 'case-42', item: { id: 'case-42', caseStatus: 'in_pruefung' } },
  })

  assert.equal(result.ok, true)
  assert.equal(calls[0].init.method, 'PUT')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer injected-by-caller')
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    item: { id: 'case-42', caseStatus: 'in_pruefung' },
  })
})

test('GitLaw provider fails closed on insecure remote origins and API errors', async () => {
  assert.throws(() => createGitLawExecutors({ baseUrl: 'http://gitlaw.example' }), /gitlaw_https_required/)

  const executors = createGitLawExecutors({
    baseUrl: 'https://gitlaw.example',
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      async json() { return { error: 'Origin not allowed' } },
    }),
  })

  await assert.rejects(
    () => executors['gitlaw.case.read']({ input: { caseId: 'case-42' } }),
    /Origin not allowed/,
  )
})
