import assert from 'node:assert/strict'
import test from 'node:test'
import { scoreAuthorityReadiness } from './growth-agent.mjs'
import { scoreAnswers } from '../../site/authority-scorecard.mjs'

const scenarios = [
  {
    name: 'production healthcare agent with weak controls',
    input: {
      sector: 'healthcare', agentStage: 'production',
      canSendExternally: true, canWriteSystems: true, canSpendMoney: false,
      canAccessSensitiveData: true, canAffectPeople: true,
      explicitPurpose: true, toolAllowlist: false, approvalRules: false,
      revocation: false, idempotency: false, receipts: false, externalPolicy: false, dataScope: true,
    },
  },
  {
    name: 'commercial read-only pilot with mature controls',
    input: {
      sector: 'commercial', agentStage: 'pilot',
      canSendExternally: false, canWriteSystems: false, canSpendMoney: false,
      canAccessSensitiveData: false, canAffectPeople: false,
      explicitPurpose: true, toolAllowlist: true, approvalRules: true,
      revocation: true, idempotency: true, receipts: true, externalPolicy: true, dataScope: true,
    },
  },
  {
    name: 'legal agent with external communication and confidential data',
    input: {
      sector: 'legal', agentStage: 'pilot',
      canSendExternally: true, canWriteSystems: true, canSpendMoney: false,
      canAccessSensitiveData: true, canAffectPeople: true,
      explicitPurpose: true, toolAllowlist: true, approvalRules: true,
      revocation: true, idempotency: false, receipts: true, externalPolicy: true, dataScope: true,
    },
  },
]

for (const scenario of scenarios) {
  test(`scorecard parity: ${scenario.name}`, () => {
    const server = scoreAuthorityReadiness(scenario.input)
    const browser = scoreAnswers(scenario.input)
    assert.equal(browser.readiness, server.readiness)
    assert.equal(browser.consequenceSignals, server.consequenceSignals)
    assert.equal(browser.risk, server.risk)
    assert.equal(browser.urgency, server.urgency)
    assert.equal(browser.qualified, server.qualified)
  })
}
