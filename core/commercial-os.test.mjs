import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildCommercialQueue,
  createCommercialLead,
  executeCommercialAction,
  getProduct,
  requiresCommercialApproval,
  summarizeCommercialPortfolio,
} from './commercial-os.mjs'

const catalog = JSON.parse(await readFile(new URL('../commercial/products.json', import.meta.url), 'utf8'))
const hauspilot = getProduct(catalog, 'hauspilot-sprint')

function lead() {
  return createCommercialLead({
    id: 'deal-1',
    productId: 'hauspilot-sprint',
    account: 'Example Hausverwaltung GmbH',
    evidence: [{ source: 'https://example.com/jobs', fact: 'Current operations hiring signal' }],
  })
}

function act(record, action, outcome = {}, approvedBy = null) {
  return executeCommercialAction(record, { action, outcome, approvedBy, product: hauspilot, now: '2026-08-31T08:00:00.000Z' })
}

test('fixed product price is catalog-driven and external actions fail closed', () => {
  let record = act(lead(), 'qualify', { qualified: true })
  record = act(record, 'prepare_outreach')

  const blocked = act(record, 'external_message')
  assert.equal(blocked.stage, 'outreach_ready')
  assert.equal(blocked.blocked.reason, 'human_approval_required')

  record = act(record, 'external_message', {}, 'Michael')
  record = act(record, 'record_discovery', { workflow: 'repair_intake', successMetric: 'response time' })
  record = act(record, 'prepare_proposal')

  const priceBlocked = act(record, 'commit_price')
  assert.equal(priceBlocked.blocked.reason, 'human_approval_required')

  record = act(record, 'commit_price', { priceEur: 1 }, 'Michael')
  assert.equal(record.committedPriceEur, 1900)
  assert.equal(record.kickoffRequiredEur, 1330)
})

test('manual-quote products never invent a price', () => {
  const radar = getProduct(catalog, 'opportunity-radar')
  let record = createCommercialLead({
    id: 'deal-radar', productId: radar.id, account: 'NGO Example',
    evidence: [{ source: 'https://example.org', fact: 'Public funding-monitoring need' }],
  })
  record = executeCommercialAction(record, { action: 'qualify', product: radar, outcome: { qualified: true } })
  record = executeCommercialAction(record, { action: 'prepare_outreach', product: radar })
  record = executeCommercialAction(record, { action: 'external_message', product: radar, approvedBy: 'Michael' })
  record = executeCommercialAction(record, { action: 'record_discovery', product: radar, outcome: { workflow: 'funding_monitoring' } })
  record = executeCommercialAction(record, { action: 'prepare_proposal', product: radar })

  assert.throws(
    () => executeCommercialAction(record, { action: 'commit_price', product: radar, approvedBy: 'Michael', outcome: {} }),
    /priceEur/,
  )
})

test('payment evidence unlocks onboarding only after kickoff threshold', () => {
  let record = act(lead(), 'qualify', { qualified: true })
  record = act(record, 'prepare_outreach')
  record = act(record, 'external_message', {}, 'Michael')
  record = act(record, 'record_discovery', { workflow: 'repair_intake' })
  record = act(record, 'prepare_proposal')
  record = act(record, 'commit_price', {}, 'Michael')
  record = act(record, 'send_proposal', {}, 'Michael')
  record = act(record, 'create_payment_request', { provider: 'stripe' }, 'Michael')

  record = act(record, 'record_payment', { amountEur: 1000, provider: 'stripe', reference: 'pi_partial' })
  assert.equal(record.stage, 'awaiting_payment')

  record = act(record, 'record_payment', { amountEur: 330, provider: 'stripe', reference: 'pi_rest' })
  assert.equal(record.stage, 'paid')
  assert.equal(record.collectedCashEur, 1330)
})

test('paid customer reaches proof and recurring revenue without fabricating value', () => {
  let record = act(lead(), 'qualify', { qualified: true })
  record = act(record, 'prepare_outreach')
  record = act(record, 'external_message', {}, 'Michael')
  record = act(record, 'record_discovery', { workflow: 'repair_intake' })
  record = act(record, 'prepare_proposal')
  record = act(record, 'commit_price', {}, 'Michael')
  record = act(record, 'send_proposal', {}, 'Michael')
  record = act(record, 'create_payment_request', { provider: 'stripe' }, 'Michael')
  record = act(record, 'record_payment', { amountEur: 1330, provider: 'stripe', reference: 'pi_1' })
  record = act(record, 'start_onboarding', { workspacePath: '/tmp/customer-1' })
  record = act(record, 'start_delivery')
  record = act(record, 'record_delivery_outcome', {
    measuredCustomerValueEur: 4200,
    actualFounderHours: 4,
    sampleSize: 35,
    verdict: 'keep',
    evidence: ['review.json', 'measurement.json'],
  })
  record = act(record, 'prepare_renewal', { productId: 'hauspilot-managed-ops', monthlyEur: 750 })

  const blocked = act(record, 'send_renewal_offer', { monthlyEur: 750 })
  assert.equal(blocked.stage, 'proof')

  record = act(record, 'send_renewal_offer', { monthlyEur: 750 }, 'Michael')
  assert.equal(record.stage, 'recurring')
  assert.equal(record.recurringMonthlyEur, 750)

  record = act(record, 'record_recurring_payment', { amountEur: 750, provider: 'stripe', reference: 'in_1' })
  assert.equal(record.collectedCashEur, 2080)
  assert.equal(record.measuredCustomerValueEur, 4200)
})

test('queue exposes approval boundaries and portfolio only counts recorded cash', () => {
  let a = act(lead(), 'qualify', { qualified: true })
  a = act(a, 'prepare_outreach')
  const b = createCommercialLead({
    id: 'deal-2', productId: 'pruefpilot', account: 'Document Co',
    evidence: [{ source: 'https://example.net', fact: 'Document workflow signal' }],
  })
  const queue = buildCommercialQueue([a, b])
  assert.equal(queue[0].action, 'external_message')
  assert.equal(queue[0].approvalRequired, true)
  assert.equal(requiresCommercialApproval('record_payment'), false)

  const summary = summarizeCommercialPortfolio([a, b])
  assert.equal(summary.collectedCashEur, 0)
  assert.equal(summary.recurringMonthlyEur, 0)
})
