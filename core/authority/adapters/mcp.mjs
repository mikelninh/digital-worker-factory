export function createMcpToolExecutor({ callTool } = {}) {
  if (typeof callTool !== 'function') throw new Error('mcp_call_tool_required')

  return async ({ action, actor, principal, traceId }) => {
    if (!action?.toolName) throw new Error('mcp_tool_name_required')
    const response = await callTool({
      name: action.toolName,
      arguments: action.arguments || {},
      metadata: {
        authorityTraceId: traceId,
        actorId: actor?.id ?? null,
        principalId: principal?.id ?? null,
        idempotencyKey: action.idempotencyKey ?? null,
      },
    })
    return { transport: 'mcp', toolName: action.toolName, response }
  }
}
