export const RISK_LEVELS = Object.freeze({ READ: 'read', WRITE: 'write', CONSEQUENTIAL: 'consequential' })

function assertCapability(capability) {
  if (!capability?.id) throw new Error('capability_missing_id')
  if (!capability?.provider) throw new Error(`capability_missing_provider:${capability.id}`)
  if (!Object.values(RISK_LEVELS).includes(capability.risk)) throw new Error(`capability_invalid_risk:${capability.id}`)
  if (!Array.isArray(capability.allowedRoles) || capability.allowedRoles.length === 0) {
    throw new Error(`capability_missing_roles:${capability.id}`)
  }
}

export class CapabilityRegistry {
  #capabilities = new Map()

  register(capability) {
    assertCapability(capability)
    if (this.#capabilities.has(capability.id)) throw new Error(`capability_duplicate:${capability.id}`)
    this.#capabilities.set(capability.id, Object.freeze({ ...capability, allowedRoles: [...capability.allowedRoles] }))
    return this
  }

  registerMany(capabilities = []) {
    for (const capability of capabilities) this.register(capability)
    return this
  }

  get(id) {
    return this.#capabilities.get(id) ?? null
  }

  list({ provider } = {}) {
    const all = [...this.#capabilities.values()]
    return provider ? all.filter((item) => item.provider === provider) : all
  }

  can(role, capabilityId) {
    const capability = this.get(capabilityId)
    return Boolean(capability && capability.allowedRoles.includes(role))
  }
}
