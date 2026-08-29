function firstRole(value) {
  if (Array.isArray(value)) return value[0] || null
  if (typeof value === 'string') return value
  return null
}

export function actorFromOidcClaims(claims = {}, options = {}) {
  const subjectClaim = options.subjectClaim || 'sub'
  const roleClaim = options.roleClaim || 'role'
  const id = claims[subjectClaim]
  if (!id) throw new Error('oidc_actor_subject_required')

  const role = firstRole(claims[roleClaim] ?? claims.roles)
  if (!role) throw new Error('oidc_actor_role_required')

  return {
    id: String(id),
    role: String(role),
    autonomyLevel: Number(options.autonomyLevel ?? claims.autonomy_level ?? 0),
    identityProvider: claims.iss ? String(claims.iss) : null,
  }
}

export function principalFromOidcClaims(claims = {}, options = {}) {
  const principalClaim = options.principalClaim || 'org_id'
  const id = claims[principalClaim] ?? options.principalId
  if (!id) throw new Error('oidc_principal_required')
  return { id: String(id), type: String(options.principalType || 'organization') }
}
