import {
  rankRevenueOpportunities,
  requiresHumanApproval,
  scoreRevenueOpportunity,
  summarizeRevenuePortfolio,
} from './revenue-os.mjs'

const TERMINAL_STAGES = new Set(['lost'])

const ACTION_RULES = Object.freeze({
  research_account: { from: ['signal'], to: 'researched' },
  qualify_opportunity: { from: ['researched'], to: 'qualified' },
  prepare_outreach: { from: ['qualified'], to: 'awaiting_approval' },
  external_message: { from: ['awaiting_approval'], to: 'contacted' },
  record_discovery: { from: ['contacted'], to: 'discovery' },
  prepare_proposal: { from: ['discovery'], to: 'proposal' },
  commit_price: { from: ['proposal'], to: 'proposal' },
  send_proposal: { from: ['proposal'], to: 'proposal' },
  wait_or_follow_up: { from: ['contacted', 'proposal'], to: null },
  deal_won: { from: ['proposal'], to: 'won' },
  deal_lost: {
    from: ['signal', 'researched', 'qualified', 'awaiting_approval', 'contacted', 'discovery', 'proposal'],
    to: 'lost',
  },
  start_delivery: { from: ['won'], to: 'delivery' },
  measure_value: { from: ['delivery'], to: 'proof' },
  identify_expansion: { from: ['proof'], to: 'expansion' },
  prepare_expansion_offer: { from: ['expansion'], to: 'expansion' },
})

function nowIso(now) {
  if (typeof now === 'string') return now
  if (now instanceof Date) return now.toISOString()
  return new Date().toISOString()
}

function clean(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function signatureFor(signal) {
  if (signal.id) return `id:${clean(signal.id)}`
  return [signal.vertical, signal.account, signal.hypothesis].map(clean).join('|')
}

function cloneRecord(record) {
  return {
    ...record,
    evidence: Array.isArray(record.evidence) ? [...record.evidence] : [],
    history: Array.isArray(record.history) ? [...record.history] : [],
  }
}

function assertActionAllowed(record, action) {
  const rule = ACTION_RULES[action]
  if (!rule) throw new TypeError(`Unknown revenue action: ${action}`)
  if (!rule.from.includes(record.stage)) {
    throw new Error(`Action ${action} is not allowed from stage ${record.stage}`)
  }
  return rule
}

export function validateRevenueSignal(signal) {
  const errors = []
  if (!signal || typeof signal !== 'object') return ['signal_must_be_object']
  if (!clean(signal.vertical)) errors.push('missing_vertical')
  if (!clean(signal.account)) errors.push('missing_account')
  if (!clean(signal.hypothesis)) errors.push('missing_hypothesis')
  if (!Array.isArray(signal.evidence) || signal.evidence.length === 0) errors.push('missing_evidence')

  try {
    scoreRevenueOpportunity(signal.economics ?? {})
  } catch (error) {
    errors.push(`invalid_economics:${error.message}`)
  }

  return errors
}

export function ingestRevenueSignals({ ledger = [], signals = [], now = new Date() } = {}) {
  const timestamp = nowIso(now)
  const nextLedger = ledger.map(cloneRecord)
  const seen = new Set(nextLedger.map(signatureFor))
  const accepted = []
  const duplicates = []
  const rejected = []

  for (const signal of signals) {
    const signature = signatureFor(signal)
    if (seen.has(signature)) {
      duplicates.push({ signal, reason: 'duplicate_signal' })
      continue
    }

    const errors = validateRevenueSignal(signal)
    if (errors.length > 0) {
      rejected.push({ signal, errors })
      continue
    }

    const record = {
      ...signal,
      stage: signal.stage ?? 'signal',
      collectedCashEur: Number.isFinite(signal.collectedCashEur) ? signal.collectedCashEur : 0,
      measuredCustomerValueEur: Number.isFinite(signal.measuredCustomerValueEur)
        ? signal.measuredCustomerValueEur
        : 0,
      history: [
        ...(Array.isArray(signal.history) ? signal.history : []),
        { at: timestamp, event: 'signal_ingested' },
      ],
    }

    nextLedger.push(record)
    seen.add(signature)
    accepted.push(record)
  }

  return { ledger: nextLedger, accepted, duplicates, rejected }
}

export function nextExecutableRevenueAction(record) {
  if (!record || TERMINAL_STAGES.has(record.stage)) return null

  switch (record.stage) {
    case 'signal': return 'research_account'
    case 'researched': return 'qualify_opportunity'
    case 'qualified': return 'prepare_outreach'
    case 'awaiting_approval': return 'external_message'
    case 'contacted': return 'wait_or_follow_up'
    case 'discovery': return 'prepare_proposal'
    case 'proposal':
      if (!record.priceApproved) return 'commit_price'
      if (!record.proposalSent) return 'send_proposal'
      return 'wait_or_follow_up'
    case 'won': return 'start_delivery'
    case 'delivery': return 'measure_value'
    case 'proof': return 'identify_expansion'
    case 'expansion': return 'prepare_expansion_offer'
    default: return null
  }
}

export function buildRevenueActionQueue(ledger = [], { maxActions = 5 } = {}) {
  const active = ledger.filter((record) => record.economics && !TERMINAL_STAGES.has(record.stage))
  const ranked = rankRevenueOpportunities(active)

  return ranked
    .map((record) => {
      const action = nextExecutableRevenueAction(record)
      return action
        ? {
            id: record.id,
            vertical: record.vertical,
            account: record.account,
            stage: record.stage,
            action,
            approvalRequired: requiresHumanApproval(action),
            economics: record.economics,
          }
        : null
    })
    .filter(Boolean)
    .slice(0, maxActions)
}

export function executeRevenueAction(record, {
  action,
  approved = false,
  outcome = {},
  now = new Date(),
} = {}) {
  if (!record || typeof record !== 'object') throw new TypeError('record is required')
  if (!action) throw new TypeError('action is required')

  const rule = assertActionAllowed(record, action)
  if (requiresHumanApproval(action) && !approved) {
    return {
      ...cloneRecord(record),
      blocked: {
        action,
        reason: 'human_approval_required',
      },
      history: [
        ...record.history,
        { at: nowIso(now), event: 'action_blocked', action, reason: 'human_approval_required' },
      ],
    }
  }

  const next = cloneRecord(record)
  delete next.blocked
  if (rule.to) next.stage = rule.to

  if (action === 'commit_price') {
    if (!Number.isFinite(outcome.priceEur) || outcome.priceEur <= 0) {
      throw new TypeError('commit_price requires positive outcome.priceEur')
    }
    next.priceApproved = true
    next.committedPriceEur = outcome.priceEur
  }

  if (action === 'send_proposal') next.proposalSent = true

  if (action === 'deal_won') {
    const cash = outcome.collectedCashEur ?? 0
    if (!Number.isFinite(cash) || cash < 0) throw new TypeError('collectedCashEur must be non-negative')
    next.collectedCashEur = cash
    next.wonAt = nowIso(now)
  }

  if (action === 'deal_lost') {
    next.lossReason = outcome.lossReason || 'unknown'
  }

  if (action === 'measure_value') {
    if (!Number.isFinite(outcome.measuredCustomerValueEur) || outcome.measuredCustomerValueEur < 0) {
      throw new TypeError('measure_value requires non-negative outcome.measuredCustomerValueEur')
    }
    next.measuredCustomerValueEur = outcome.measuredCustomerValueEur
    if (Number.isFinite(outcome.actualFounderHours) && outcome.actualFounderHours >= 0) {
      next.actualFounderHours = outcome.actualFounderHours
    }
  }

  if (action === 'identify_expansion' && outcome.expansionCandidate) {
    next.expansionCandidate = outcome.expansionCandidate
  }

  next.history.push({
    at: nowIso(now),
    event: 'action_executed',
    action,
    approved: requiresHumanApproval(action) ? approved : undefined,
  })

  return next
}

export function upsertRevenueRecord(ledger = [], record) {
  const index = ledger.findIndex((candidate) => candidate.id === record.id)
  if (index === -1) return [...ledger, cloneRecord(record)]
  const next = [...ledger]
  next[index] = cloneRecord(record)
  return next
}

export function buildRevenueLearning(ledger = [], { minDecisions = 3 } = {}) {
  const groups = new Map()

  for (const record of ledger) {
    const key = clean(record.signalType || 'unknown')
    if (!groups.has(key)) {
      groups.set(key, {
        signalType: key,
        opportunities: 0,
        wins: 0,
        losses: 0,
        collectedCashEur: 0,
        measuredCustomerValueEur: 0,
        actualFounderHours: 0,
      })
    }
    const group = groups.get(key)
    group.opportunities += 1
    if (record.stage === 'won' || record.stage === 'delivery' || record.stage === 'proof' || record.stage === 'expansion') group.wins += 1
    if (record.stage === 'lost') group.losses += 1
    group.collectedCashEur += Number.isFinite(record.collectedCashEur) ? record.collectedCashEur : 0
    group.measuredCustomerValueEur += Number.isFinite(record.measuredCustomerValueEur) ? record.measuredCustomerValueEur : 0
    group.actualFounderHours += Number.isFinite(record.actualFounderHours) ? record.actualFounderHours : 0
  }

  return [...groups.values()]
    .map((group) => {
      const decisions = group.wins + group.losses
      const winRate = decisions === 0 ? null : group.wins / decisions
      return {
        ...group,
        decisions,
        winRate,
        cashPerActualFounderHour:
          group.actualFounderHours > 0 ? group.collectedCashEur / group.actualFounderHours : null,
        promotableLearning: decisions >= minDecisions,
      }
    })
    .sort((a, b) => b.collectedCashEur - a.collectedCashEur)
}

export function buildRevenueLoopReport(ledger = []) {
  return {
    portfolio: summarizeRevenuePortfolio(ledger),
    learning: buildRevenueLearning(ledger),
    queue: buildRevenueActionQueue(ledger),
  }
}

export function assessRevenueLoopReadiness(checks = {}) {
  const required = [
    'evidenceGate',
    'dedupeGate',
    'economicRanking',
    'approvalGate',
    'lifecycleToProof',
    'realOutcomeAccounting',
    'learningLoop',
  ]

  const gates = Object.fromEntries(required.map((key) => [key, checks[key] === true]))
  const failed = required.filter((key) => !gates[key])

  return {
    ready: failed.length === 0,
    gates,
    failed,
  }
}

export const REVENUE_LOOP_ACTIONS = Object.freeze(Object.keys(ACTION_RULES))
