function cleanRepoName(value) {
  return value.replace(/\.git$/, '').replace(/\/$/, '')
}

export function parseGitHubRepositoryUrl(input) {
  let url
  try {
    url = new URL(input)
  } catch {
    throw new TypeError('A valid GitHub repository URL is required')
  }
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') throw new TypeError('Only github.com repository URLs are supported by this collector')
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) throw new TypeError('GitHub URL must include owner/repository')
  const owner = parts[0]
  const repo = cleanRepoName(parts[1])
  if (!owner || !repo) throw new TypeError('GitHub URL must include owner/repository')
  return { owner, repo, canonicalUrl: `https://github.com/${owner}/${repo}` }
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { accept: 'application/vnd.github+json' } })
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}) for ${url}`)
  return response.json()
}

async function fetchTextIfExists(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { accept: 'text/plain' } })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub content request failed (${response.status}) for ${url}`)
  return response.text()
}

function hasAll(text, phrases) {
  const value = text.toLowerCase()
  return phrases.every((phrase) => value.includes(phrase))
}

function hasAny(text, phrases) {
  const value = text.toLowerCase()
  return phrases.some((phrase) => value.includes(phrase))
}

function source(canonicalUrl, branch, file) {
  return `${canonicalUrl}/blob/${branch}/${file}`
}

function evidence(status, sourceUrl, note) {
  return { status, source: sourceUrl || undefined, note }
}

const COMMON_FILES = [
  'README.md',
  'SECURITY.md',
  'PRIVACY.md',
  'TRUST.md',
  'TRUST_CENTER.md',
  'AI_DISCLOSURE.md',
  'AI_ACT_ROLE_ASSESSMENT.md',
  'HUMAN_OVERSIGHT.md',
  'MODEL_VENDOR_INVENTORY.md',
  'SUBPROCESSORS.md',
  'DATA_FLOW.md',
  'RETENTION_AND_DELETION.md',
  'DPA_TOM_STARTER.md',
  'AI_SECURITY_INCIDENT_RESPONSE.md',
  'ASSURANCE.md',
  'QUESTIONNAIRE_ANSWER_LIBRARY.md',
  'docs/SECURITY.md',
  'docs/PRIVACY.md',
  'docs/TRUST_CENTER.md',
  'docs/AI_DISCLOSURE.md',
  'docs/AI_ACT_ROLE_ASSESSMENT.md',
  'docs/HUMAN_OVERSIGHT.md',
  'docs/MODEL_VENDOR_INVENTORY.md',
  'docs/SUBPROCESSORS.md',
  'docs/DATA_FLOW.md',
  'docs/RETENTION_AND_DELETION.md',
  'docs/DPA_TOM_STARTER.md',
  'docs/AI_SECURITY_INCIDENT_RESPONSE.md',
  'docs/ASSURANCE.md',
  'docs/QUESTIONNAIRE_ANSWER_LIBRARY.md',
]

function findFile(files, endings) {
  return Object.entries(files).find(([path]) => endings.some((ending) => path.toLowerCase().endsWith(ending.toLowerCase()))) || null
}

function inferEvidence({ repo, files, canonicalUrl, branch }) {
  const readme = files['README.md'] || ''
  const all = Object.values(files).filter(Boolean).join('\n\n')
  const readmeSource = files['README.md'] ? source(canonicalUrl, branch, 'README.md') : canonicalUrl

  const aiRoleFile = findFile(files, ['AI_ACT_ROLE_ASSESSMENT.md'])
  const disclosureFile = findFile(files, ['AI_DISCLOSURE.md'])
  const oversightFile = findFile(files, ['HUMAN_OVERSIGHT.md'])
  const modelFile = findFile(files, ['MODEL_VENDOR_INVENTORY.md'])
  const subprocessorsFile = findFile(files, ['SUBPROCESSORS.md'])
  const dataFlowFile = findFile(files, ['DATA_FLOW.md'])
  const retentionFile = findFile(files, ['RETENTION_AND_DELETION.md'])
  const dpaFile = findFile(files, ['DPA_TOM_STARTER.md'])
  const securityFile = findFile(files, ['SECURITY.md'])
  const incidentFile = findFile(files, ['AI_SECURITY_INCIDENT_RESPONSE.md'])
  const assuranceFile = findFile(files, ['ASSURANCE.md'])
  const trustFile = findFile(files, ['TRUST_CENTER.md', 'TRUST.md'])
  const questionnaireFile = findFile(files, ['QUESTIONNAIRE_ANSWER_LIBRARY.md'])

  const humanBoundary = hasAny(all, ['human approval', 'human review', 'authority stays outside', 'authority outside', 'final authority', 'human-in-the-loop'])
  const accessSignals = ['tenant', 'authentication', 'authorization', 'role'].filter((term) => all.toLowerCase().includes(term)).length
  const auditSignals = ['audit', 'trace', 'replay'].filter((term) => all.toLowerCase().includes(term)).length
  const evalSignals = ['eval', 'test', 'limitation', 'not proven', 'failure'].filter((term) => all.toLowerCase().includes(term)).length
  const retentionSignals = hasAny(all, ['retention', 'deletion', 'delete tenant', 'tenant deletion'])
  const incidentSignals = hasAny(all, ['incident response', 'security incident', 'containment', 'post-incident'])
  const explicitAiDisclosure = hasAny(all, ['you are interacting with an ai', 'interacting with an ai system', 'ai interaction disclosure'])

  return {
    product_identity: readme.length > 120
      ? evidence('verified', readmeSource, 'Repository README provides a substantive product description.')
      : evidence(repo.description ? 'partial' : 'missing', canonicalUrl, 'Only repository metadata was available.'),
    ai_act_role: aiRoleFile
      ? evidence('partial', source(canonicalUrl, branch, aiRoleFile[0]), 'A role assessment exists, but TrustReady requires named human attestation for full credit.')
      : evidence('missing', null, 'No explicit AI Act role/risk assessment file found.'),
    ai_interaction_disclosure: disclosureFile || explicitAiDisclosure
      ? evidence('partial', disclosureFile ? source(canonicalUrl, branch, disclosureFile[0]) : readmeSource, 'Disclosure evidence found; deployment/placement still needs confirmation.')
      : evidence(hasAny(readme, [' ai ', 'artificial intelligence', 'llm', 'agent']) ? 'partial' : 'missing', readmeSource, 'AI is described, but explicit user-facing disclosure placement is not evidenced.'),
    human_oversight: oversightFile
      ? evidence('verified', source(canonicalUrl, branch, oversightFile[0]), 'Dedicated human-oversight artifact found.')
      : humanBoundary
        ? evidence('verified', readmeSource, 'Explicit human approval/authority boundary found in public evidence.')
        : evidence('missing', null, 'No explicit human authority boundary found.'),
    model_vendor_inventory: modelFile
      ? evidence('verified', source(canonicalUrl, branch, modelFile[0]), 'Dedicated model/vendor inventory found.')
      : evidence('missing', null, 'No model/vendor inventory found.'),
    subprocessor_inventory: subprocessorsFile
      ? evidence('verified', source(canonicalUrl, branch, subprocessorsFile[0]), 'Subprocessor inventory found.')
      : evidence('missing', null, 'No subprocessor inventory found.'),
    data_flow: dataFlowFile
      ? evidence('verified', source(canonicalUrl, branch, dataFlowFile[0]), 'Dedicated data-flow artifact found.')
      : hasAny(all, ['data flow', 'storage', 'postgres', 'database', 'input / event'])
        ? evidence('partial', readmeSource, 'Some architecture/storage flow evidence found, but no dedicated buyer-facing data-flow artifact.')
        : evidence('missing', null, 'No buyer-facing data flow found.'),
    retention_deletion: retentionFile
      ? evidence('verified', source(canonicalUrl, branch, retentionFile[0]), 'Dedicated retention/deletion artifact found.')
      : retentionSignals
        ? evidence('partial', readmeSource, 'Retention/deletion behavior is mentioned but not consolidated into a buyer-facing policy.')
        : evidence('missing', null, 'No retention/deletion evidence found.'),
    dpa_tom_package: dpaFile
      ? evidence('partial', source(canonicalUrl, branch, dpaFile[0]), 'DPA/TOM starter exists; authorised legal review is still required for full credit.')
      : evidence('missing', null, 'No DPA/TOM buyer package found.'),
    security_contact: securityFile
      ? evidence('partial', source(canonicalUrl, branch, securityFile[0]), 'Security file exists; monitored contact/operational intake still needs confirmation.')
      : evidence('missing', null, 'No security contact file found.'),
    incident_response: incidentFile
      ? evidence('verified', source(canonicalUrl, branch, incidentFile[0]), 'Dedicated AI/security incident-response artifact found.')
      : incidentSignals
        ? evidence('partial', readmeSource, 'Incident-related language found, but no dedicated response artifact.')
        : evidence('missing', null, 'No incident-response evidence found.'),
    access_tenant_controls: accessSignals >= 3
      ? evidence('partial', readmeSource, 'Multiple access/tenant-control signals found; production evidence is still deployment-specific.')
      : evidence('missing', null, 'Insufficient public evidence for authentication/authorization/tenant isolation.'),
    audit_trace: auditSignals >= 2
      ? evidence('verified', readmeSource, 'Multiple explicit audit/trace/replay signals found.')
      : auditSignals === 1
        ? evidence('partial', readmeSource, 'Some auditability evidence found.')
        : evidence('missing', null, 'No auditability evidence found.'),
    evals_limitations: assuranceFile
      ? evidence('verified', source(canonicalUrl, branch, assuranceFile[0]), 'Dedicated assurance/limitations artifact found.')
      : evalSignals >= 3
        ? evidence('verified', readmeSource, 'Public evidence includes evaluations plus limitations/failure boundaries.')
        : evalSignals > 0
          ? evidence('partial', readmeSource, 'Some evaluation evidence found, but limitations are not fully consolidated.')
          : evidence('missing', null, 'No evaluation/limitations evidence found.'),
    trust_center: trustFile
      ? evidence('verified', source(canonicalUrl, branch, trustFile[0]), 'Buyer-facing trust artifact found.')
      : evidence('missing', null, 'No consolidated trust centre found.'),
    questionnaire_library: questionnaireFile
      ? evidence('verified', source(canonicalUrl, branch, questionnaireFile[0]), 'Reusable questionnaire answer library found.')
      : evidence('missing', null, 'No reusable buyer questionnaire answer library found.'),
  }
}

export async function collectGitHubTrustEvidence(inputUrl, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required')
  const parsed = parseGitHubRepositoryUrl(inputUrl)
  const repo = await fetchJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, fetchImpl)
  const branch = repo.default_branch || 'main'
  const files = {}

  await Promise.all(COMMON_FILES.map(async (file) => {
    const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${file}`
    const text = await fetchTextIfExists(rawUrl, fetchImpl)
    if (text != null) files[file] = text
  }))

  const evidenceMap = inferEvidence({ repo, files, canonicalUrl: parsed.canonicalUrl, branch })
  return {
    id: `${parsed.owner}-${parsed.repo}`.toLowerCase(),
    name: repo.name || parsed.repo,
    url: parsed.canonicalUrl,
    known: {
      intendedPurpose: repo.description || '[Confirm intended purpose]',
      intendedUsers: '[Confirm intended users]',
      nonGoals: '[Confirm explicit non-goals]',
    },
    evidence: evidenceMap,
    collection: {
      mode: 'public_github',
      collectedAt: new Date().toISOString(),
      defaultBranch: branch,
      filesObserved: Object.keys(files).sort(),
      note: 'Repository evidence is conservative and incomplete by design. Absence from public GitHub is not proof that a control does not exist elsewhere.',
    },
  }
}
