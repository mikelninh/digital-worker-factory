import test from 'node:test'
import assert from 'node:assert/strict'
import { PROOF_WEEK, scoreKanzleiWorkload } from '../../site/kanzlei-timefresser.mjs'

test('document-heavy Kanzlei is routed to document readiness without invented ROI', () => {
  const result = scoreKanzleiWorkload({
    activeMatters: 120,
    documentsWeek: 90,
    missingDocumentFollowupsWeek: 28,
    newInquiriesWeek: 12,
    researchHoursWeek: 3,
    draftingHoursWeek: 4,
  })
  assert.equal(result.opportunity, 'HIGH')
  assert.equal(result.qualification.qualified, true)
  assert.equal(result.recommendedFirstWorkflow.id, 'migration/document-readiness')
  assert.equal(result.truthBoundary.estimatedHoursSaved, null)
  assert.equal(result.truthBoundary.guaranteedRoi, false)
})

test('research-heavy Kanzlei ranks research rather than forcing document workflow', () => {
  const result = scoreKanzleiWorkload({ researchHoursWeek: 12, documentsWeek: 4, activeMatters: 10 })
  assert.equal(result.recommendedFirstWorkflow.id, 'legal/research-preparation')
  assert.equal(result.opportunity, 'HIGH')
})

test('small workload starts small and does not force a paid qualification', () => {
  const result = scoreKanzleiWorkload({ newInquiriesWeek: 1, documentsWeek: 2, activeMatters: 3 })
  assert.equal(result.opportunity, 'START_SMALL')
  assert.equal(result.qualification.qualified, false)
})

test('Proof Week commercial contract is fixed and no automatic subscription exists', () => {
  assert.equal(PROOF_WEEK.priceEurNet, 990)
  assert.equal(PROOF_WEEK.durationDays, 7)
  assert.equal(PROOF_WEEK.automaticSubscription, false)
  assert.deepEqual(PROOF_WEEK.customerInputs, ['one_recurring_workflow', '10_to_20_safe_shadow_cases', 'one_accountable_reviewer'])
})

test('malformed and negative input is bounded safely', () => {
  const result = scoreKanzleiWorkload({ documentsWeek: -100, researchHoursWeek: 'oops', statusRequestsWeek: 9999999 })
  assert.equal(result.observedInputSummary.directHoursReportedPerWeek, 0)
  assert.ok(result.observedInputSummary.repeatedVolumeSignalsPerWeek <= 10000)
  assert.equal(result.truthBoundary.resultIsWorkloadPrioritizationNotCustomerRoi, true)
})
