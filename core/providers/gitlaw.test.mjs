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

test('GitLaw write executes only after its legal gate and Factory approval name agree', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    if (url.includes('/api/pro/legal-findings')) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            ok: true,
            gate: {
              allow: true,
              caseId: 'case-42',
              approvedBy: 'lawyer-alice',
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
      async json() { return { ok: true, id: 'case-42', collection: 'cases' } },
    }
  }
  const executors = createGitLawExecutors({
    baseUrl: 'https://gitlaw.example/',
    fetchImpl,
    sessionHeaders: async () => ({ Authorization: 'Bearer injected-by-caller' }),
  })

  const result = await executors['gitlaw.case.update']({
    input: {
      caseId: 'case-42',
      findingId: 'finding-7',
      item: { id: 'case-42', caseStatus: 'in_pruefung' },
    },
    approvedBy: 'lawyer-alice',
  })

  assert.equal(result.ok, true)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'https://gitlaw.example/api/pro/legal-findings?id=finding-7')
  assert.equal(calls[1].init.method, 'PUT')
  assert.equal(calls[1].init.headers.Authorization, 'Bearer injected-by-caller')
  assert.equal(calls[1].init.headers['X-GitLaw-Trust-Finding'], 'finding-7')
  assert.equal(calls[1].init.headers['X-GitLaw-Trust-Chain'], 'a'.repeat(64))
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    item: { id: 'case-42', caseStatus: 'in_pruefung' },
  })
})

test('GitLaw write fails before PUT for missing finding, red gate, wrong case or different approver', async () => {
  const executorsMissing = createGitLawExecutors({ baseUrl: 'https://gitlaw.example', fetchImpl: async () => { throw new Error('network_must_not_run') } })
  await assert.rejects(
    () => executorsMissing['gitlaw.case.update']({ input: { caseId: 'case-42', item: {} }, approvedBy: 'lawyer-alice' }),
    /gitlaw_legal_finding_required/,
  )

  for (const scenario of [
    { gate: { allow: false, caseId: 'case-42', approvedBy: 'lawyer-alice', reasons: ['human_decision_pending'] }, error: /gitlaw_legal_trust_gate_blocked/ },
    { gate: { allow: true, caseId: 'case-99', approvedBy: 'lawyer-alice', reasons: [] }, error: /gitlaw_legal_finding_case_mismatch/ },
    { gate: { allow: true, caseId: 'case-42', approvedBy: 'lawyer-bob', reasons: [] }, error: /gitlaw_legal_approval_mismatch/ },
  ]) {
    let calls = 0
    const executors = createGitLawExecutors({
      baseUrl: 'https://gitlaw.example',
      fetchImpl: async () => {
        calls += 1
        return { ok: true, status: 200, async json() { return { ok: true, gate: scenario.gate } } }
      },
    })
    await assert.rejects(
      () => executors['gitlaw.case.update']({ input: { caseId: 'case-42', findingId: 'finding-7', item: {} }, approvedBy: 'lawyer-alice' }),
      scenario.error,
    )
    assert.equal(calls, 1, 'blocked write must never reach the case PUT')
  }
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
