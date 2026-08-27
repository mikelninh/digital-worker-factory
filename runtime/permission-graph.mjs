export class PermissionGraph {
  #grants = new Set()

  grant({ principal, capability, action }) {
    requireValue(principal, 'principal')
    requireValue(capability, 'capability')
    requireValue(action, 'action')
    this.#grants.add(key(principal, capability, action))
    return this
  }

  revoke({ principal, capability, action }) {
    this.#grants.delete(key(principal, capability, action))
    return this
  }

  allows({ principal, capability, action }) {
    if (!principal || !capability || !action) return false
    return this.#grants.has(key(principal, capability, action))
  }
}

export function principalFor({ actor, agent }) {
  if (!actor || !agent) return null
  return `${actor}::${agent}`
}

function key(principal, capability, action) {
  return `${principal}\u0000${capability}\u0000${action}`
}

function requireValue(value, name) {
  if (!value || typeof value !== 'string') throw new TypeError(`${name} is required`)
}
