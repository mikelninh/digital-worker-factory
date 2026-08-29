import { evaluatePromotionGate } from '../authority/index.mjs'

export function recommendAutonomyLevel({ policy, metrics = {}, currentLevel = 2, maxLevel = 4 } = {}) {
  const normalizedCurrent = Number(currentLevel) || 0
  const safeBaseline = Math.min(normalizedCurrent, 2)
  let eligibleLevel = safeBaseline
  const evaluations = []

  for (let level = 3; level <= maxLevel; level += 1) {
    const gate = policy?.promotionGates?.[String(level)] || policy?.promotion_gates?.[String(level)]
    if (!gate) continue
    const evaluation = evaluatePromotionGate(metrics, gate)
    evaluations.push({ level, ...evaluation })
    if (!evaluation.earned) break
    eligibleLevel = level
  }

  return {
    currentLevel: normalizedCurrent,
    eligibleLevel,
    promoted: eligibleLevel > normalizedCurrent,
    demotionRequired: eligibleLevel < normalizedCurrent,
    evaluations,
  }
}

export function autonomyLabel(level) {
  return ({
    0: 'observe',
    1: 'draft',
    2: 'approve_each',
    3: 'bounded_autonomy',
    4: 'supervised_autonomy',
    5: 'delegated_autonomy',
  })[Number(level)] || 'unknown'
}
