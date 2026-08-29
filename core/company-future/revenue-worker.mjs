import { company01Prospects, firstCrossSectorCohort, trustedAgentPilotSpecs } from './design-partners.mjs'

const outreachByProspect = Object.freeze({
  'warm-law-firm-01': {
    subject: 'Small experiment for your Kanzlei',
    draft: 'I built a control layer for AI agents and I would love to test it on one boring but real Kanzlei workflow with you. We would start only with synthetic or redacted matters: intake, evidence summary, source-backed research and draft preparation. Anything consequential such as sending to a client, changing the case record or filing externally stays human-approved. The interesting question is simple: does it actually save you time without creating new risk? If you are up for it, I would build the first workflow around how you already work and we can judge it brutally after a few cases.',
  },
  brettinghams: {
    subject: 'A weird but useful experiment for THE BRETTINGHAMS',
    draft: 'I am building a small company where AI workers can do real work, but every consequential action sits behind an explicit authority boundary. I think THE BRETTINGHAMS would be a great reality check because your work is fast, collaborative and client-facing. I would start with one low-risk workflow such as prospect research, account/project briefs or proposal preparation. The agent can prepare; client commitments and external sends stay with you. The goal is not another AI demo — it is to measure whether this removes real coordination work without becoming governance bureaucracy. I would love to run a tiny design-partner test with you and get the harsh UX feedback.',
  },
  'digitalservice-aai-hub': {
    subject: 'Design-partner idea: authority layer for municipal AI agents',
    draft: 'The Agentic AI Hub has already demonstrated that municipal agents can reduce administrative workload. We are building the next boundary: a provider-neutral authority layer that decides and proves what an agent may do, for whom, for which purpose and under which legal/operational constraints before a consequential action executes. We would like to test this first with synthetic or shadow Wohngeld-style cases: completeness checks and decision preparation can run automatically, while adverse decisions, unrelated registry access or incomplete legal/contestability context fail closed. The output is an inspectable authority receipt for every attempted consequence. We are looking for a small design-partner workflow rather than a large procurement project.',
  },
  'charite-imi': {
    subject: 'Design-partner idea: authority boundaries for clinical AI workflows',
    draft: 'Your work on AI-supported clinical documentation is exactly the kind of environment where useful automation and accountable boundaries need to coexist. We are building an organisation-controlled authority layer for autonomous systems. A first hospital proof would stay deliberately narrow: synthetic records first, then read-only/shadow documentation. Summarisation, structuring and missing-documentation detection can be allowed; unrelated-patient access, autonomous treatment or medication changes are blocked; consequential record writes or external transfers can require exact approval. We would measure clinician time saved and correction rate alongside zero unauthorised clinical execution. I would be interested in testing whether this governance boundary is useful in practice rather than adding process overhead.',
  },
})

export function designPartnerBrief(prospectId) {
  const prospect = company01Prospects.find((item) => item.id === prospectId)
  const pilot = trustedAgentPilotSpecs[prospectId]
  const outreach = outreachByProspect[prospectId]
  if (!prospect || !pilot || !outreach) return null
  return Object.freeze({ prospect, pilot, outreach, outreachAction: 'APPROVAL' })
}

export function firstCohortBriefs() {
  return Object.entries(firstCrossSectorCohort).map(([sector, prospectId]) => ({
    sector,
    ...designPartnerBrief(prospectId),
  }))
}

export function requestOutreachSend({ approved = false } = {}) {
  return approved
    ? { decision: 'ALLOW', reason: 'exact_human_approval_required_by_company_01' }
    : { decision: 'APPROVAL', reason: 'external_outreach_is_consequential' }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(firstCohortBriefs(), null, 2))
}
