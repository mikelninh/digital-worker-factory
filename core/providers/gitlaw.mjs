function normalizeBaseUrl(baseUrl) {
  const value = String(baseUrl || '').replace(/\/$/, '')
  if (!value) throw new Error('gitlaw_base_url_required')
  const url = new URL(value)
  const local = ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !local) throw new Error('gitlaw_https_required')
  return value
}

async function parseResponse(response) {
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    const message = payload?.error || `gitlaw_http_${response.status}`
    throw new Error(message)
  }
  return payload
}

export function createGitLawExecutors({ baseUrl, fetchImpl = globalThis.fetch, sessionHeaders = async () => ({}) }) {
  const origin = normalizeBaseUrl(baseUrl)
  if (typeof fetchImpl !== 'function') throw new Error('gitlaw_fetch_required')

  async function request(path, init = {}) {
    const authHeaders = await sessionHeaders()
    const headers = {
      Accept: 'application/json',
      ...authHeaders,
      ...(init.headers || {}),
    }
    const response = await fetchImpl(`${origin}${path}`, { ...init, headers })
    return parseResponse(response)
  }

  return {
    'gitlaw.case.read': async ({ input }) => {
      if (!input?.caseId) throw new Error('gitlaw_case_id_required')
      const caseId = encodeURIComponent(String(input.caseId))
      const payload = await request(`/api/pro/entities?collection=cases&id=${caseId}`)
      return payload?.item ?? payload
    },

    'gitlaw.case.update': async ({ input }) => {
      if (!input?.caseId) throw new Error('gitlaw_case_id_required')
      if (!input?.item || typeof input.item !== 'object') throw new Error('gitlaw_case_item_required')
      const caseId = encodeURIComponent(String(input.caseId))
      return request(`/api/pro/entities?collection=cases&id=${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: input.item }),
      })
    },
  }
}
