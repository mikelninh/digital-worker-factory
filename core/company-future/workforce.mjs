const TEAMS = Object.freeze([
  { team: 'research', role: 'research_agent', purpose: 'market_intelligence', count: 15, routineAction: 'research.purchase_data', evidence: ['vendor_terms_checked', 'source_relevant'], amount: 1 },
  { team: 'procurement', role: 'procurement_agent', purpose: 'vendor_procurement', count: 15, routineAction: 'procurement.order.place', evidence: ['vendor_verified', 'quote_match'], amount: 2 },
  { team: 'accounts-payable', role: 'ap_agent', purpose: 'accounts_payable', count: 15, routineAction: 'finance.invoice.pay', evidence: ['invoice_match', 'po_match', 'delivery_confirmed'], amount: 2 },
  { team: 'customer-ops', role: 'customer_ops_agent', purpose: 'customer_resolution', count: 15, routineAction: 'customer.refund.issue', evidence: ['customer_entitlement_verified'], amount: 1 },
  { team: 'sales-ops', role: 'sales_ops_agent', purpose: 'pipeline_ops', count: 10, routineAction: 'sales.crm.update', evidence: ['source_provenance'], amount: 0 },
  { team: 'it', role: 'it_agent', purpose: 'employee_it', count: 10, routineAction: 'it.access.provision', evidence: ['manager_request', 'identity_verified'], amount: 0 },
  { team: 'legal', role: 'legal_agent', purpose: 'legal_ops', count: 10, routineAction: 'legal.case.prepare', evidence: ['source_provenance'], amount: 0 },
  { team: 'property', role: 'property_agent', purpose: 'property_ops', count: 10, routineAction: 'property.repair.dispatch', evidence: ['tenant_request', 'vendor_verified'], amount: 2 },
])

export function createWorkforce({ companyId = 'future-company', autonomyLevel = 3 } = {}) {
  const workers = []
  let sequence = 1
  for (const spec of TEAMS) {
    for (let index = 1; index <= spec.count; index += 1) {
      const id = `${spec.team}-agent-${String(index).padStart(2, '0')}`
      workers.push({
        id,
        team: spec.team,
        role: spec.role,
        purpose: spec.purpose,
        routineAction: spec.routineAction,
        evidenceClaims: [...spec.evidence],
        routineAmount: spec.amount,
        autonomyLevel,
        principal: { id: companyId, type: 'company' },
        delegation: {
          id: `delegation-${String(sequence).padStart(3, '0')}`,
          delegateId: id,
          principalId: companyId,
          scopes: [spec.routineAction, 'company.high_consequence.commit'],
          purposes: [spec.purpose],
          validFrom: '2026-08-01T00:00:00Z',
          validUntil: '2027-08-01T00:00:00Z',
          revoked: false,
        },
      })
      sequence += 1
    }
  }
  return workers
}

export function workforceSummary(workers = createWorkforce()) {
  const teams = {}
  for (const worker of workers) teams[worker.team] = (teams[worker.team] || 0) + 1
  return { total: workers.length, teams }
}

export { TEAMS }
