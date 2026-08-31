import test from 'node:test'
import assert from 'node:assert/strict'

import { createCommercialLead, executeCommercialAction, getProduct } from '../../core/commercial-os.mjs'
import { approvePreparedAction, renderCommercialCommandCenter } from './command-center.mjs'
import { readFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile(new URL('../products.json', import.meta.url), 'utf8'))
const product = getProduct(catalog, 'hauspilot-sprint')

function outreachReady() {
  let record = createCommercialLead({
    id: 'ui-1', productId: product.id, account: 'UI Hausverwaltung GmbH',
    evidence: [{ source: 'https://example.com', fact: 'Visible operations signal' }],
  })
  record = executeCommercialAction(record, { action: 'qualify', product, outcome: { qualified: true } })
  return executeCommercialAction(record, { action: 'prepare_outreach', product })
}

test('dashboard shows real portfolio numbers and approval action', () => {
  const html = renderCommercialCommandCenter([outreachReady()])
  assert.match(html, /CommercialOS/)
  assert.match(html, /UI Hausverwaltung GmbH/)
  assert.match(html, /external_message/)
  assert.match(html, /Approve/)
  assert.match(html, /€0/)
})

test('prepared external action still fails closed without named approver', () => {
  const record = outreachReady()
  const blocked = approvePreparedAction(record, { action: 'external_message', approvedBy: '' })
  assert.equal(blocked.stage, 'outreach_ready')
  assert.equal(blocked.blocked.reason, 'human_approval_required')
})

test('named approval advances only the prepared action', () => {
  const updated = approvePreparedAction(outreachReady(), { action: 'external_message', approvedBy: 'Michael' })
  assert.equal(updated.stage, 'contacted')
  assert.equal(updated.history.some((event) => event.event === 'human_approval_recorded'), true)
})
