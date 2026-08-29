export const QUESTIONS = Object.freeze([
  ['explicitPurpose', 'Does every agent have an explicit business purpose?'],
  ['toolAllowlist', 'Are the tools/actions it may use explicitly bounded?'],
  ['approvalRules', 'Are consequential actions mapped to human approval rules?'],
  ['revocation', 'Can its authority be revoked immediately?'],
  ['idempotency', 'Are duplicate consequential actions safely suppressed?'],
  ['receipts', 'Do you get an inspectable receipt for every attempted consequence?'],
  ['externalPolicy', 'Is authority enforced outside the model/prompt?'],
  ['dataScope', 'Is data access limited by case/customer/purpose scope?'],
])

const pilotBySector = Object.freeze({
  legal: 'Law-firm Authority Pilot',
  healthcare: 'Clinical Documentation Authority Pilot',
  government: 'Public Caseworker Authority Pilot',
  commercial: 'Commercial Operations Authority Pilot',
  technology: 'Agent Tool Authority Pilot',
})

export function scoreAnswers(input = {}) {
  const controls = QUESTIONS.map(([key]) => Boolean(input[key]))
  const readiness = Math.round((controls.filter(Boolean).length / controls.length) * 100)
  const consequenceSignals = [
    input.canSendExternally,
    input.canWriteSystems,
    input.canSpendMoney,
    input.canAccessSensitiveData,
    input.canAffectPeople,
  ].filter(Boolean).length
  const risk = Math.min(100, consequenceSignals * 14 + Math.round((100 - readiness) * 0.45))
  const urgency = consequenceSignals >= 3 && readiness < 75 ? 'high' : consequenceSignals >= 1 ? 'medium' : 'low'
  const sector = pilotBySector[input.sector] ? input.sector : 'commercial'
  return {
    readiness,
    consequenceSignals,
    risk,
    urgency,
    qualified: consequenceSignals >= 1 && (readiness < 90 || input.agentStage === 'production'),
    recommendedPilot: pilotBySector[sector],
  }
}

export function authorityMap(input = {}) {
  const allow = ['Research', 'Summarise', 'Prepare drafts']
  const approval = []
  const block = ['Self-expand authority']
  if (input.canSendExternally) approval.push('External sends')
  if (input.canWriteSystems) approval.push('Authoritative system writes')
  if (input.canSpendMoney) approval.push('Material spend')
  if (input.canAffectPeople) approval.push('Adverse / high-consequence decisions')
  if (input.canAccessSensitiveData) block.push('Unrelated sensitive-data access')
  return { allow, approval, block }
}

export function missingControls(input = {}) {
  return QUESTIONS.filter(([key]) => !input[key]).map(([, label]) => label)
}

export function buildResult(input = {}) {
  const score = scoreAnswers(input)
  const map = authorityMap(input)
  const missing = missingControls(input)
  return {
    score,
    map,
    missing,
    nextStep: score.qualified ? 'Run a synthetic/shadow Trusted Agent Pilot' : 'Start with one read-only workflow',
  }
}
