const DEFAULT_BASE_URL = 'https://gitlaw.vercel.app'

export function createGitLawSearchCapability({ transport = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  if (typeof transport !== 'function') throw new TypeError('transport must be a function')

  return {
    id: 'gitlaw.search',
    provider: 'gitlaw',
    description: 'Read-only grounded legal search through GitLaw',
    actions: ['search'],
    risk: 'low',
    async invoke({ args, context }) {
      const query = String(args?.query ?? '').trim()
      if (!query) throw new TypeError('GitLaw search query is required')

      const response = await transport(`${baseUrl.replace(/\/$/, '')}/api/search`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(context?.authorization ? { authorization: context.authorization } : {}),
        },
        body: JSON.stringify({ query, limit: args?.limit ?? 8 }),
      })

      if (!response?.ok) {
        throw new Error(`GitLaw search failed with status ${response?.status ?? 'unknown'}`)
      }

      return response.json()
    },
  }
}
