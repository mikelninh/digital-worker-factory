import { AgentGateway } from './agent-gateway.mjs'
import { createFactoryRegistry } from './catalog.mjs'
import { createGitLawExecutors } from './providers/gitlaw.mjs'

export function createFactoryGateway({ gitlaw = null, hauspilotExecutors = {}, extraExecutors = {} } = {}) {
  const executors = {
    ...hauspilotExecutors,
    ...(gitlaw ? createGitLawExecutors(gitlaw) : {}),
    ...extraExecutors,
  }

  return new AgentGateway({
    registry: createFactoryRegistry(),
    executors,
  })
}
