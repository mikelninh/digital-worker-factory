export const growthContentPillars = Object.freeze([
  {
    id: 'authority-basics',
    promise: 'Help operators understand the difference between agent capability and organisational authority.',
  },
  {
    id: 'proof-ledger',
    promise: 'Publish Company 01 evidence, including failures and human attention, rather than generic AI claims.',
  },
  {
    id: 'sector-maps',
    promise: 'Show concrete ALLOW / APPROVAL / BLOCK maps for real professional workflows.',
  },
  {
    id: 'earned-autonomy',
    promise: 'Teach teams to increase autonomy from observed evidence instead of a binary trust toggle.',
  },
])

export const initialGrowthContentQueue = Object.freeze([
  {
    id: 'agent-authority-scorecard',
    pillar: 'authority-basics',
    format: 'interactive_tool',
    title: 'How much power does your AI agent actually have?',
    cta: '/scorecard',
    status: 'built',
  },
  {
    id: 'kanzlei-timefresser-scan',
    pillar: 'sector-maps',
    format: 'interactive_tool',
    title: 'Wo verliert Ihre Kanzlei jede Woche Zeit?',
    cta: '/kanzlei',
    secondaryCta: '/pilot/legal',
    status: 'built',
  },
  {
    id: 'governance-not-binary',
    pillar: 'earned-autonomy',
    format: 'article_and_social',
    title: 'AI agent governance is not locked down vs fully trusted',
    cta: '/scorecard',
    status: 'draft_next',
  },
  {
    id: '10000-decisions',
    pillar: 'proof-ledger',
    format: 'benchmark_story',
    title: 'What breaks when 100 agents make 10,000 consequential decisions?',
    cta: '/company',
    secondaryCta: '/scorecard',
    status: 'draft_next',
  },
  {
    id: 'payment-not-permission',
    pillar: 'authority-basics',
    format: 'technical_article',
    title: 'Payment is not permission: why x402 spend rails still need local authority',
    cta: '/authority',
    secondaryCta: '/scorecard',
    status: 'queued',
  },
  {
    id: 'mcp-tool-not-authority',
    pillar: 'authority-basics',
    format: 'technical_article',
    title: 'An MCP tool call can be valid and still be unauthorised',
    cta: '/authority',
    secondaryCta: '/scorecard',
    status: 'queued',
  },
  {
    id: 'law-firm-map',
    pillar: 'sector-maps',
    format: 'sector_playbook',
    title: 'A practical authority map for AI agents in a law firm',
    cta: '/pilot/legal',
    secondaryCta: '/kanzlei',
    status: 'queued',
  },
  {
    id: 'kanzlei-proof-week-case-study',
    pillar: 'proof-ledger',
    format: 'measured_case_study',
    title: 'How many confirmed lawyer minutes did Kanzlei Autopilot actually return?',
    cta: '/kanzlei',
    secondaryCta: '/pilot/legal',
    status: 'awaiting_customer_evidence',
  },
  {
    id: 'government-map',
    pillar: 'sector-maps',
    format: 'sector_playbook',
    title: 'What should an AI caseworker be allowed to do without a human?',
    cta: '/pilot/government',
    secondaryCta: '/scorecard',
    status: 'queued',
  },
  {
    id: 'hospital-map',
    pillar: 'sector-maps',
    format: 'sector_playbook',
    title: 'Where documentation assistance ends and clinical authority begins',
    cta: '/pilot/healthcare',
    secondaryCta: '/scorecard',
    status: 'queued',
  },
  {
    id: 'weekly-company01-ledger',
    pillar: 'proof-ledger',
    format: 'weekly_update',
    title: 'Company 01 weekly proof ledger',
    cta: '/company',
    secondaryCta: '/scorecard',
    status: 'recurring',
  },
])

export function validateGrowthContentJob(job = {}) {
  const errors = []
  if (!job.id) errors.push('missing_id')
  if (!job.title) errors.push('missing_title')
  if (!job.cta) errors.push('missing_cta')
  if (!growthContentPillars.some((pillar) => pillar.id === job.pillar)) errors.push('unknown_pillar')
  if (job.guaranteedRoi === true) errors.push('guaranteed_roi_not_allowed')
  return { valid: errors.length === 0, errors }
}

export function nextGrowthContentJobs(limit = 3) {
  return initialGrowthContentQueue
    .filter((job) => job.status === 'draft_next' || job.status === 'queued')
    .slice(0, Math.max(0, limit))
}
