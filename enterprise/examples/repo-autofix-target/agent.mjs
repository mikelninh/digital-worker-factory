// TRUSTREADY_AUTOFIX_TARGET: direct-tool-dispatch-v1

let executorCalls = 0

export const tools = [
  {
    id: 'read_profile',
    name: 'read_profile',
    risk: 'read',
    external: false,
    handler: async (args) => {
      executorCalls += 1
      return { ok: true, profile: { id: args.userId ?? 'user-1' } }
    },
  },
  {
    id: 'send_payment',
    name: 'send_payment',
    risk: 'consequential',
    external: true,
    handler: async (args) => {
      executorCalls += 1
      return { ok: true, transferred: args.amount ?? 100 }
    },
  },
]

export function resetExecutorCalls() {
  executorCalls = 0
}

export function getExecutorCalls() {
  return executorCalls
}

export async function runAgent({ modelProposal, context = {} }) {
  const tool_calls = [modelProposal]
  const call = tool_calls[0]
  const tool = tools.find((item) => item.name === call.tool)
  if (!tool) return { ok: false, status: 'blocked', reason: 'unknown_tool' }
  const args = call.args ?? {}
  // Intentionally vulnerable example: a model-selected registered handler is
  // executed directly. Repo-to-PR Security v2 recognises this exact dispatch
  // shape and can insert a deterministic boundary before the handler.
  return tool.handler(args)
}

export const tenantId = 'tenant-a'
