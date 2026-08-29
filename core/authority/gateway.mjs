import crypto from 'node:crypto'
import { evaluateAuthority } from './policy.mjs'
import { executeWithAuthority, InMemoryIdempotencyStore } from './execution.mjs'

export class AuthorityGateway {
  #policy
  #executors
  #idempotencyStore
  #receiptStore
  #clock
  #receipts

  constructor({
    policy,
    executors = {},
    idempotencyStore = new InMemoryIdempotencyStore(),
    receiptStore = null,
    clock = () => new Date(),
  } = {}) {
    if (!policy?.version) throw new Error('authority_policy_version_required')
    this.#policy = policy
    this.#executors = { ...executors }
    this.#idempotencyStore = idempotencyStore
    this.#receiptStore = receiptStore
    this.#clock = clock
    this.#receipts = []
  }

  receipts() {
    if (this.#receiptStore && typeof this.#receiptStore.list === 'function') {
      return this.#receiptStore.list().map((receipt) => structuredClone(receipt))
    }
    return this.#receipts.map((receipt) => structuredClone(receipt))
  }

  preflight(input = {}) {
    return evaluateAuthority({ ...input, policy: this.#policy, now: this.#clock().toISOString() })
  }

  async invoke({ actor, principal, delegation, action = {}, evidence = {}, metrics = {}, approval = null, budget = null, traceId = crypto.randomUUID(), errorContext = null } = {}) {
    const at = this.#clock().toISOString()
    const decision = evaluateAuthority({
      policy: this.#policy, actor, principal, delegation, action, evidence, metrics, approval, budget, now: at,
    })

    const result = await executeWithAuthority({
      traceId,
      at,
      actor,
      principal,
      delegation,
      action,
      evidence,
      approval,
      decision,
      executor: this.#executors[action.type],
      idempotencyStore: this.#idempotencyStore,
      errorContext,
    })

    this.#receipts.push(result.receipt)
    if (this.#receiptStore && typeof this.#receiptStore.append === 'function') this.#receiptStore.append(result.receipt)
    return result
  }
}
