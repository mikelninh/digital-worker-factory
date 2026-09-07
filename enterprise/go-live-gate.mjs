export const GO_LIVE_DECISIONS = Object.freeze({ GO: 'GO', CONDITIONAL: 'CONDITIONAL', NO_GO: 'NO_GO' })

const isTrue = (value) => value === true
const present = (value) => typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined

function finding(id, severity, title, evidence = []) {
  return { id, severity, title, evidence }
}

export function evaluateEnterpriseGoLive(manifest = {}) {
  const blockers = []
  const conditions = []
  const strengths = []

  if (!present(manifest.agent?.id)) blockers.push(finding('agent_identity', 'blocker', 'Agent identity is missing'))
  if (!present(manifest.owner?.team) || !present(manifest.owner?.securityContact)) blockers.push(finding('accountable_owner', 'blocker', 'Named product and security ownership are required'))

  if (!isTrue(manifest.identity?.authenticatedUsers)) blockers.push(finding('authenticated_users', 'blocker', 'Users must be authenticated'))
  if (!isTrue(manifest.identity?.workloadIdentity)) blockers.push(finding('workload_identity', 'blocker', 'Agent/tool calls need workload identity outside the model'))
  if (manifest.identity?.sso === true) strengths.push('Enterprise SSO is configured')
  else conditions.push(finding('enterprise_sso', 'condition', 'Add SSO/SAML or OIDC before broad enterprise rollout'))

  if (manifest.tenancy?.mode === 'multi_tenant') {
    if (!isTrue(manifest.tenancy?.strictIsolation)) blockers.push(finding('tenant_isolation', 'blocker', 'Multi-tenant deployment requires strict tenant isolation'))
    if (!isTrue(manifest.tenancy?.tenantBoundObjects)) blockers.push(finding('tenant_bound_objects', 'blocker', 'Persistent objects must be tenant-bound'))
  }

  if (manifest.data?.secretsAccessibleToModel === true) blockers.push(finding('model_secret_access', 'blocker', 'Raw secrets must not be exposed to the model'))
  if (manifest.data?.sensitive === true) {
    if (!isTrue(manifest.data?.encryptionAtRest) || !isTrue(manifest.data?.encryptionInTransit)) blockers.push(finding('encryption', 'blocker', 'Sensitive data requires encryption at rest and in transit'))
    if (!Number.isInteger(manifest.data?.retentionDays) || manifest.data.retentionDays < 1) conditions.push(finding('retention_policy', 'condition', 'Define an explicit data retention period'))
  }

  const actions = Array.isArray(manifest.actions) ? manifest.actions : []
  if (actions.length === 0) conditions.push(finding('declared_actions', 'condition', 'Declare the agent tool/action inventory'))
  for (const action of actions) {
    const consequential = action.external === true || ['write', 'consequential', 'irreversible'].includes(action.risk)
    if (consequential && !isTrue(action.humanApproval)) blockers.push(finding(`approval:${action.id ?? 'unknown'}`, 'blocker', `Consequential action ${action.id ?? 'unknown'} requires human approval`))
    if (consequential && !isTrue(action.approvalBoundToIntent)) blockers.push(finding(`approval_binding:${action.id ?? 'unknown'}`, 'blocker', `Approval for ${action.id ?? 'unknown'} must be bound to the exact intent`))
  }

  if (!isTrue(manifest.runtime?.denyByDefault)) blockers.push(finding('deny_by_default', 'blocker', 'Runtime capability policy must deny by default'))
  if (!isTrue(manifest.runtime?.killSwitch)) blockers.push(finding('kill_switch', 'blocker', 'A kill switch is required'))
  if (!isTrue(manifest.runtime?.egressAllowlist)) blockers.push(finding('egress_allowlist', 'blocker', 'External egress must be allowlisted'))
  if (!Number.isInteger(manifest.runtime?.maxToolCalls) || manifest.runtime.maxToolCalls < 1) blockers.push(finding('execution_budget', 'blocker', 'A finite tool-call budget is required'))

  if (!isTrue(manifest.audit?.appendOnly) || !isTrue(manifest.audit?.decisionReasons) || !isTrue(manifest.audit?.traceIds)) blockers.push(finding('audit_evidence', 'blocker', 'Append-only audit records must include trace IDs and decision reasons'))
  if (manifest.audit?.siemExport === true) strengths.push('Security events can be exported to SIEM')
  else conditions.push(finding('siem_export', 'condition', 'Add SIEM/security-event export for enterprise operations'))

  const adv = manifest.adversarial ?? {}
  if (!Number.isInteger(adv.cases) || adv.cases < 1) blockers.push(finding('adversarial_cases', 'blocker', 'Adversarial security cases are required'))
  if (Number.isInteger(adv.cases) && adv.passed !== adv.cases) blockers.push(finding('adversarial_regression', 'blocker', 'All release-gating adversarial cases must pass'))
  if ((adv.criticalEscapes ?? 1) !== 0) blockers.push(finding('critical_escape', 'blocker', 'Critical impact escapes must be zero'))
  if (adv.liveModel === true) strengths.push('Live-model compromised-output evidence is present')
  else conditions.push(finding('online_model_redteam', 'condition', 'Add repeatable live/online-model adversarial testing'))

  if (!isTrue(manifest.supplyChain?.sbom)) conditions.push(finding('sbom', 'condition', 'Generate and retain an SBOM'))
  if (!isTrue(manifest.supplyChain?.dependencyScanning)) conditions.push(finding('dependency_scanning', 'condition', 'Enable dependency/vulnerability scanning'))
  if (!isTrue(manifest.supplyChain?.signedRelease)) conditions.push(finding('signed_release', 'condition', 'Sign release artifacts and record provenance'))

  if (!present(manifest.incident?.owner) || !isTrue(manifest.incident?.runbook)) blockers.push(finding('incident_response', 'blocker', 'Named incident ownership and a tested runbook are required'))
  if (!isTrue(manifest.incident?.replayable)) conditions.push(finding('incident_replay', 'condition', 'Make security incidents replayable from stored evidence'))

  if (manifest.assurance?.externalReview === true) strengths.push('Independent security review evidence is attached')
  else conditions.push(finding('external_review', 'condition', 'Independent security review/pentest remains outstanding'))

  const decision = blockers.length > 0
    ? GO_LIVE_DECISIONS.NO_GO
    : conditions.length > 0
      ? GO_LIVE_DECISIONS.CONDITIONAL
      : GO_LIVE_DECISIONS.GO

  return {
    version: 'enterprise-go-live/v1',
    decision,
    scope: 'Engineering release evidence; not a certification, legal opinion, or guarantee of security.',
    summary: {
      blockers: blockers.length,
      conditions: conditions.length,
      strengths: strengths.length,
    },
    blockers,
    conditions,
    strengths,
    nextActions: decision === GO_LIVE_DECISIONS.NO_GO ? blockers.map((item) => item.title) : conditions.map((item) => item.title),
  }
}
