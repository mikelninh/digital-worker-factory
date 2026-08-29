import { runGovernmentCaseworkerProof } from './government-caseworker.mjs'
import { runMatureOperatingDay } from './operating-day.mjs'
import { assertScaleGauntletProof, runAuthorityScaleGauntlet } from './scale-gauntlet.mjs'
import { companyPolicy } from './policy.mjs'
import { recommendAutonomyLevel } from './autonomy.mjs'

export async function runCompanyOfFutureProof() {
  const scale = await runAuthorityScaleGauntlet()
  const scaleProof = assertScaleGauntletProof(scale)
  const operatingDay = await runMatureOperatingDay()
  const government = await runGovernmentCaseworkerProof()

  const progressiveAutonomy = {
    novice: recommendAutonomyLevel({
      policy: companyPolicy,
      currentLevel: 2,
      metrics: { cases: 20, acceptanceRate: 1, correctionRate: 0, unsafeExecutions: 0 },
    }),
    bounded: recommendAutonomyLevel({
      policy: companyPolicy,
      currentLevel: 2,
      metrics: { cases: 75, acceptanceRate: 0.99, correctionRate: 0.01, unsafeExecutions: 0 },
    }),
    supervised: recommendAutonomyLevel({
      policy: companyPolicy,
      currentLevel: 3,
      metrics: { cases: 500, acceptanceRate: 0.995, correctionRate: 0.004, unsafeExecutions: 0 },
    }),
    regression: recommendAutonomyLevel({
      policy: companyPolicy,
      currentLevel: 4,
      metrics: { cases: 500, acceptanceRate: 0.995, correctionRate: 0.004, unsafeExecutions: 1 },
    }),
  }

  return {
    proofVersion: 'company-of-future/0.1',
    scale: {
      passed: scaleProof.passed,
      failures: scaleProof.failures,
      workforce: scale.workforce,
      counts: scale.counts,
      providerCalls: scale.providerCalls,
      unauthorizedProviderCalls: scale.unauthorizedProviderCalls,
      duplicateConsequences: scale.duplicateConsequences,
      postRevocationExecutions: scale.postRevocationExecutions,
      budgetInvariantViolations: scale.budgetInvariantViolations,
      receiptCoverage: scale.receiptCoverage,
      humanAttentionRate: scale.humanAttentionRate,
    },
    operatingDay: {
      workforce: operatingDay.workforce,
      counts: operatingDay.counts,
      humanAttentionItems: operatingDay.humanAttentionItems,
      humanAttentionRate: operatingDay.humanAttentionRate,
      estimatedHumanMinutes: operatingDay.estimatedHumanMinutes,
      unauthorizedProviderCalls: operatingDay.unauthorizedProviderCalls,
      onePersonSupervisionTarget: operatingDay.onePersonSupervisionTarget,
      caveat: operatingDay.caveat,
    },
    progressiveAutonomy,
    government: {
      programs: government.programs,
      positiveCases: government.positive.map(({ program, read, calculate, prepare, award }) => ({
        program,
        read: read.status,
        calculate: calculate.status,
        prepare: prepare.status,
        award: award.status,
      })),
      adverse: {
        withoutApproval: government.adverse.withoutApproval.status,
        withApproval: government.adverse.withApproval.status,
        incompleteGovernance: government.adverse.incompleteGovernance.status,
      },
    },
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runCompanyOfFutureProof()
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}
