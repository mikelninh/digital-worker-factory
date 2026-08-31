import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createCommercialLead,
  executeCommercialAction,
  getProduct,
  summarizeCommercialPortfolio,
} from '../core/commercial-os.mjs'
import {
  buildOutboundCommand,
  buildPaymentRequestCommand,
  createApprovedPaymentRequest,
  sendApprovedOutbound,
  verifyPaymentEvent,
} from '../core/commercial-adapters.mjs'
import { commercialLeadFromRevenueOpportunity } from '../core/revenue-commercial-bridge.mjs'
import { createCustomerWorkspace } from '../core/customer-workspace.mjs'
import { loadCommercialLedger, saveCommercialLedger } from '../core/commercial-store.mjs'

const catalog = JSON.parse(await readFile(new URL('../commercial/products.json', import.meta.url), 'utf8'))
const root = await mkdtemp(join(tmpdir(), 'commercial-os-'))
const ledgerPath = join(root, 'ledger.json')

const mockOutbound = {
  async send(command) {
    return { provider: 'mock-email', reference: `msg-${command.recordId}`, sentAt: '2026-08-31T08:30:00.000Z' }
  },
}
const mockPayments = {
  async createRequest(command) {
    return { provider: 'mock-stripe', reference: `checkout-${command.recordId}`, checkoutUrl: `https://example.invalid/pay/${command.recordId}` }
  },
}

function act(record, action, outcome = {}, approvedBy = null) {
  const product = getProduct(catalog, record.productId)
  return executeCommercialAction(record, { action, outcome, approvedBy, product, now: '2026-08-31T08:30:00.000Z' })
}

const revenueOpportunity = {
  id: 'rev-haus-1',
  vertical: 'hauspilot',
  account: 'Alpha Hausverwaltung GmbH',
  stage: 'qualified',
  evidence: [{ source: 'https://example.com/jobs', fact: 'Public operational hiring signal' }],
  hypothesis: 'Bounded repair-intake workflow may be worth testing.',
}
let alpha = commercialLeadFromRevenueOpportunity(revenueOpportunity, catalog)
alpha.contact = 'ops@example.invalid'
alpha = act(alpha, 'qualify', { qualified: true })
alpha = act(alpha, 'prepare_outreach')

const blockedOutbound = act(alpha, 'external_message')
assert.equal(blockedOutbound.blocked?.reason, 'human_approval_required')

const outboundCommand = buildOutboundCommand(alpha, { message: 'Specific approved pilot question', approvedBy: 'Michael' })
const outboundResult = await sendApprovedOutbound(outboundCommand, mockOutbound)
assert.equal(outboundResult.provider, 'mock-email')
alpha = act(alpha, 'external_message', { providerReference: outboundResult.reference }, 'Michael')
alpha = act(alpha, 'record_discovery', { workflow: 'repair_intake', successMetric: 'correct preparation rate' })
alpha = act(alpha, 'prepare_proposal')
alpha = act(alpha, 'commit_price', {}, 'Michael')
assert.equal(alpha.committedPriceEur, 1900)
assert.equal(alpha.kickoffRequiredEur, 1330)
alpha = act(alpha, 'send_proposal', {}, 'Michael')

const paymentCommand = buildPaymentRequestCommand(alpha, getProduct(catalog, alpha.productId), { approvedBy: 'Michael' })
const paymentRequest = await createApprovedPaymentRequest(paymentCommand, mockPayments)
alpha = act(alpha, 'create_payment_request', paymentRequest, 'Michael')
assert.equal(alpha.stage, 'awaiting_payment')

const verifiedDeposit = verifyPaymentEvent({
  recordId: alpha.id,
  provider: 'mock-stripe',
  reference: 'pi-alpha-deposit',
  amountEur: 1330,
}, alpha)
alpha = act(alpha, 'record_payment', verifiedDeposit)
assert.equal(alpha.stage, 'paid')

const workspace = await createCustomerWorkspace({ root: join(root, 'customers'), record: alpha, product: getProduct(catalog, alpha.productId) })
alpha = act(alpha, 'start_onboarding', { workspacePath: workspace.workspace })
alpha = act(alpha, 'start_delivery')
alpha = act(alpha, 'record_delivery_outcome', {
  measuredCustomerValueEur: 4800,
  actualFounderHours: 4.5,
  sampleSize: 40,
  verdict: 'keep',
  evidence: ['proof/review.json', 'proof/measurement.json'],
})
alpha = act(alpha, 'prepare_renewal', { productId: 'hauspilot-managed-ops', monthlyEur: 750 })
alpha = act(alpha, 'send_renewal_offer', { monthlyEur: 750 }, 'Michael')
alpha = act(alpha, 'record_recurring_payment', { provider: 'mock-stripe', reference: 'in-alpha-1', amountEur: 750 })
assert.equal(alpha.stage, 'recurring')
assert.equal(alpha.collectedCashEur, 2080)

let beta = createCommercialLead({
  id: 'beta-radar', productId: 'opportunity-radar', account: 'Beta NGO',
  evidence: [{ source: 'https://example.org/funding', fact: 'Organisation operates in a grant-heavy domain' }],
})
beta = act(beta, 'qualify', { qualified: true })
beta = act(beta, 'prepare_outreach')
beta = act(beta, 'external_message', {}, 'Michael')
beta = act(beta, 'record_discovery', { workflow: 'grant_monitoring', successMetric: 'qualified opportunities before deadline' })
beta = act(beta, 'prepare_proposal')
assert.throws(() => act(beta, 'commit_price', {}, 'Michael'), /priceEur/)
beta = act(beta, 'commit_price', { priceEur: 299 }, 'Michael')
assert.equal(beta.committedPriceEur, 299)

let gamma = createCommercialLead({
  id: 'gamma-docs', productId: 'pruefpilot', account: 'Gamma Documents GmbH',
  evidence: [{ source: 'https://example.net/process', fact: 'Public document-processing workflow' }],
})
gamma = act(gamma, 'qualify', { qualified: false, lossReason: 'weak_fit' })
assert.equal(gamma.stage, 'lost')

let delta = createCommercialLead({
  id: 'delta-legal', productId: 'gitlaw-workflow', account: 'Delta Kanzlei',
  evidence: [{ source: 'https://example.de/jobs', fact: 'Public legal workflow hiring signal' }],
})
delta = act(delta, 'qualify', { qualified: true })
delta = act(delta, 'prepare_outreach')
assert.equal(act(delta, 'external_message').stage, 'outreach_ready')

let epsilon = createCommercialLead({
  id: 'epsilon-proof', productId: 'openproof-integration', account: 'Epsilon AI GmbH',
  evidence: [{ source: 'https://example.ai/trust', fact: 'Publicly describes agent governance requirement' }],
})
epsilon = act(epsilon, 'qualify', { qualified: true })
epsilon = act(epsilon, 'prepare_outreach')

const records = [alpha, beta, gamma, delta, epsilon]
await saveCommercialLedger(ledgerPath, records, { now: '2026-08-31T08:45:00.000Z' })
const reloaded = await loadCommercialLedger(ledgerPath)
assert.equal(reloaded.records.length, 5)

const summary = summarizeCommercialPortfolio(reloaded.records)
assert.equal(summary.collectedCashEur, 2080)
assert.equal(summary.recurringMonthlyEur, 750)
assert.equal(summary.measuredCustomerValueEur, 4800)
assert.equal(summary.paidCustomers, 1)
assert.equal(summary.lost, 1)

const result = {
  suite: 'CommercialOS five-customer end-to-end supervised revenue loop',
  synthetic: true,
  readyForSupervisedSelling: true,
  customers: 5,
  approvalGate: blockedOutbound.blocked?.reason === 'human_approval_required',
  fixedPriceTruth: alpha.committedPriceEur === 1900,
  manualQuoteTruth: beta.committedPriceEur === 299,
  paymentEvidenceGate: alpha.payments.length === 2,
  paidWorkspaceCreated: Boolean(workspace.workspace),
  proofToRecurring: alpha.stage === 'recurring' && alpha.recurringMonthlyEur === 750,
  durableLedger: reloaded.records.length === 5,
  portfolio: summary,
  limitations: [
    'Synthetic customers and mock outbound/payment providers were used.',
    'No real email, CRM, invoice, checkout, bank transfer or production customer action was executed.',
    'Live adapters can be attached only after credentials/provider configuration and must preserve the same approval and evidence contracts.'
  ]
}

console.log(JSON.stringify(result, null, 2))
