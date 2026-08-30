import test from 'node:test'
import assert from 'node:assert/strict'

import {
  nextRevenueAction,
  rankRevenueOpportunities,
  requiresHumanApproval,
  scoreRevenueOpportunity,
  summarizeRevenuePortfolio,
} from './revenue-os.mjs'

test('scores expected cash and founder-hour efficiency', () => {
  const result = scoreRevenueOpportunity({
    closeProbability: 0.5,
    upfrontCashEur: 2000,
    founderHours: 2,
    urgency: 2,
    proofReuse: 1.5,
    riskPenalty: 1,
    expansionProbability: 0.25,
    expansionCashEur: 4000,
    customerValueEur: 10000,
  })

  assert.equal(result.expectedCashEur, 2000)
  assert.equal(result.cashPerFounderHour, 1000)
  assert.equal(result.expectedCustomerValueEur, 5000)
  assert.equal(result.priority, 3000)
})

test('ranks better cash-per-founder-hour opportunities first', () => {
  const ranked = rankRevenueOpportunities([
    {
      id: 'slow-big-deal',
      economics: {
        closeProbability: 0.25,
        upfrontCashEur: 8000,
        founderHours: 16,
      },
    },
    {
      id: 'fast-pilot',
      economics: {
        closeProbability: 0.6,
        upfrontCashEur: 1900,
        founderHours: 2,
      },
    },
  ])

  assert.equal(ranked[0].id, 'fast-pilot')
})

test('keeps consequential actions behind human approval', () => {
  assert.equal(requiresHumanApproval('external_message'), true)
  assert.equal(requiresHumanApproval('commit_price'), true)
  assert.equal(requiresHumanApproval('spend_money'), true)
  assert.equal(requiresHumanApproval('research_account'), false)
})

test('maps stages to deterministic next actions', () => {
  assert.equal(nextRevenueAction('qualified'), 'prepare_outreach')
  assert.equal(nextRevenueAction('won'), 'start_delivery')
  assert.equal(nextRevenueAction('unknown'), 'inspect_manually')
})

test('summarizes only recorded outcomes as real portfolio results', () => {
  const summary = summarizeRevenuePortfolio([
    { stage: 'won', collectedCashEur: 1900, measuredCustomerValueEur: 5000 },
    { stage: 'lost', collectedCashEur: 0 },
    { stage: 'qualified' },
  ])

  assert.equal(summary.opportunities, 3)
  assert.equal(summary.won, 1)
  assert.equal(summary.lost, 1)
  assert.equal(summary.winRate, 0.5)
  assert.equal(summary.collectedCashEur, 1900)
  assert.equal(summary.measuredCustomerValueEur, 5000)
})
