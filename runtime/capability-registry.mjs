export class CapabilityRegistry {
  #capabilities = new Map()

  register(capability) {
    validateCapability(capability)
    if (this.#capabilities.has(capability.id)) {
      throw new Error(`Capability already registered: ${capability.id}`)
    }
    const normalized = Object.freeze({
      risk: 'low',
      description: '',
      ...capability,
      actions: Object.freeze([...capability.actions]),
    })
    this.#capabilities.set(normalized.id, normalized)
    return normalized
  }

  get(id) {
    return this.#capabilities.get(id) ?? null
  }

  list() {
    return [...this.#capabilities.values()]
  }
}

function validateCapability(capability) {
  if (!capability || typeof capability !== 'object') throw new TypeError('Capability must be an object')
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(capability.id ?? '')) throw new TypeError('Capability id is invalid')
  if (!capability.provider || typeof capability.provider !== 'string') throw new TypeError('Capability provider is required')
  if (!Array.isArray(capability.actions) || capability.actions.length === 0) throw new TypeError('Capability actions are required')
  if (new Set(capability.actions).size !== capability.actions.length) throw new TypeError('Capability actions must be unique')
  if (typeof capability.invoke !== 'function') throw new TypeError('Capability invoke function is required')
  if (!['low', 'write', 'high'].includes(capability.risk ?? 'low')) throw new TypeError('Capability risk is invalid')
}
