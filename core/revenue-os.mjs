const APPROVAL_ACTIONS = new Set([
  'external_message',
  'commit_price',
  'spend_money',
  'sign_terms',
  'production_write',
  'submit_application',
])

const STAGE_NEXT_ACTION = Object.freeze({
  signal: 'research_account',
  researched: 'qualify_opportunity',
  qualified: 'prepare_outreach',
  awaiting_approval: 'request_human_approval',
  contacted: 'wait_or_follow_up',
  discovery: 'prepare_proposal',
  proposal: 'request_commercial_approval',
  won: 'start_delivery',
  delivery: 'measure_value',
  proof: 'identify_expansion',
  expansion: 'prepare_expansion_offer',
  lost: 'record_loss_reason',
})

function assertProbability(value, field) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${field} must be a number between 0 and 1`)
  }
}

function positiveNumber(value, field, { allowZero = true } = {}) {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new TypeError(`${field} must be ${allowZero ? 'a non-negative' : 'a positive'} number`)
  }
}

/**
 * Score an opportunity by expected collected cash per scarce founder hour.
 *
 * The score intentionally keeps cash, customer value and confidence visible
 * instead of collapsing them into one opaque model judgement.
 */
export function scoreRevenueOpportunity({
  closeProbability,
  upfrontCashEur,
  founderHours,
  urgency = 1,
  proofReuse = 1,
  riskPenalty = 1,
  expansionProbability = 0,
  expansionCashEur = 0,
  customerValueEur = 0,
}) {
  assertProbability(closeProbability, 'closeProbability')
  assertProbability(expansionProbability, 'expansionProbability')
  positiveNumber(upfrontCashEur, 'upfrontCashEur')
  positiveNumber(expansionCashEur, 'expansionCashEur')
  positiveNumber(customerValueEur, 'customerValueEur')
  positiveNumber(founderHours, 'founderHours', { allowZero: false })
  positiveNumber(urgency, 'urgency', { allowZero: false })
  positiveNumber(proofReuse, 'proofReuse', { allowZero: false })
  positiveNumber(riskPenalty, 'riskPenalty', { allowZero: false })

  const expectedCashEur =
    closeProbability * upfrontCashEur +
    expansionProbability * expansionCashEur

  const cashPerFounderHour = expectedCashEur / founderHours
  const expectedCustomerValueEur = closeProbability * customerValueEur
  const customerValuePerFounderHour = expectedCustomerValueEur / founderHours

  // High urgency and reusable proof raise priority. Risk lowers it.
  const priority = (cashPerFounderHour * urgency * proofReuse) / riskPenalty

  return Object.freeze({
    expectedCashEur,
    cashPerFounderHour,
    expectedCustomerValueEur,
    customerValuePerFounderHour,
    priority,
  })
}

export function rankRevenueOpportunities(opportunities = []) {
  return opportunities
    .map((opportunity) => ({
      ...opportunity,
      economics: scoreRevenueOpportunity(opportunity.economics),
    }))
    .sort((a, b) => b.economics.priority - a.economics.priority)
}

export function requiresHumanApproval(action) {
  return APPROVAL_ACTIONS.has(action)
}

export function nextRevenueAction(stage) {
  return STAGE_NEXT_ACTION[stage] ?? 'inspect_manually'
}

/**
 * Portfolio-level truth layer. Only recorded outcomes count.
 * No synthetic estimate is silently promoted to real revenue.
 */
export function summarizeRevenuePortfolio(records = []) {
  const won = records.filter((record) => record.stage === 'won' || record.collectedCashEur > 0)
  const lost = records.filter((record) => record.stage === 'lost')
  const decided = won.length + lost.length
  const collectedCashEur = records.reduce(
    (sum, record) => sum + (Number.isFinite(record.collectedCashEur) ? record.collectedCashEur : 0),
    0,
  )
  const measuredCustomerValueEur = records.reduce(
    (sum, record) => sum + (Number.isFinite(record.measuredCustomerValueEur) ? record.measuredCustomerValueEur : 0),
    0,
  )

  return Object.freeze({
    opportunities: records.length,
    won: won.length,
    lost: lost.length,
    winRate: decided === 0 ? null : won.length / decided,
    collectedCashEur,
    measuredCustomerValueEur,
  })
}

export const REVENUE_OS_APPROVAL_ACTIONS = Object.freeze([...APPROVAL_ACTIONS])
export const REVENUE_OS_STAGES = Object.freeze(Object.keys(STAGE_NEXT_ACTION))
