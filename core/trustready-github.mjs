import { createHash } from 'node:crypto'

function cleanRepoName(value) {
  return value.replace(/\.git$/, '').replace(/\/$/, '')
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
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

function hasAny(text, phrases) {
  const value = text.toLowerCase()
  return phrases.some((phrase) => value.includes(phrase))
}

function source(canonicalUrl, revision, file) {
  return `${canonicalUrl}/blob/${revision}/${file}`
}

function evidence(status, sourceUrl, note, metadata = {}) {
  return {
    status,
    source: sourceUrl || undefined,
    note,
    ...metadata,
  }
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

function fileEvidence({ files, match, canonicalUrl, revision, note, status = 'verified', ruleId }) {
  if (!match) return null
  const [file, text] = match
  return evidence(status, source(canonicalUrl, revision, file), note, {
    evidenceClass: 'dedicated_artifact',
    ruleId,
    locator: file,
    sourceHash: sha256(text),
  })
}

function inferEvidence({ repo, files, canonicalUrl, revision }) {
  const readme = files['README.md'] || ''
  const all = Object.values(files).filter(Boolean).join('\n\n')
  const readmeSource = files['README.md'] ? source(canonicalUrl, revision, 'README.md') : canonicalUrl
  const heuristic = (status, note, ruleId) => evidence(status, readmeSource, note, {
    evidenceClass: 'heuristic_candidate',
    ruleId,
    locator: files['README.md'] ? 'README.md' : 'repository_metadata',
    sourceHash: files['README.md'] ? sha256(readme) : null,
  })

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
      ? evidence('verified', readmeSource, 'Repository README provides a substantive product description.', {
          evidenceClass: 'repository_artifact', ruleId: 'github.product_identity.readme', locator: 'README.md', sourceHash: sha256(readme),
        })
      : heuristic(repo.description ? 'partial' : 'missing', 'Only repository metadata was available.', 'github.product_identity.metadata'),

    ai_act_role: aiRoleFile
      ? fileEvidence({ files, match: aiRoleFile, canonicalUrl, revision, note: 'A role assessment artifact exists, but named authorised attestation is still required for full legal-role credit.', status: 'partial', ruleId: 'github.ai_act_role.artifact' })
      : evidence('missing', null, 'No explicit AI Act role/risk assessment file found.', { evidenceClass: 'absence', ruleId: 'github.ai_act_role.absent' }),

    ai_interaction_disclosure: disclosureFile
      ? fileEvidence({ files, match: disclosureFile, canonicalUrl, revision, note: 'Dedicated disclosure artifact found; actual placement/deployment still needs confirmation.', status: 'partial', ruleId: 'github.ai_disclosure.artifact' })
      : explicitAiDisclosure
        ? heuristic('partial', 'Disclosure language found in public evidence; deployment placement is not proven.', 'github.ai_disclosure.heuristic')
        : heuristic(hasAny(readme, [' ai ', 'artificial intelligence', 'llm', 'agent']) ? 'partial' : 'missing', 'AI may be described, but explicit user-facing disclosure placement is not evidenced.', 'github.ai_disclosure.description_only'),

    human_oversight: oversightFile
      ? fileEvidence({ files, match: oversightFile, canonicalUrl, revision, note: 'Dedicated human-oversight artifact found.', ruleId: 'github.human_oversight.artifact' })
      : humanBoundary
        ? heuristic('partial', 'Human approval/authority language found, but heuristic text cannot award verified status.', 'github.human_oversight.heuristic')
        : evidence('missing', null, 'No explicit human authority boundary found.', { evidenceClass: 'absence', ruleId: 'github.human_oversight.absent' }),

    model_vendor_inventory: modelFile
      ? fileEvidence({ files, match: modelFile, canonicalUrl, revision, note: 'Dedicated model/vendor inventory found.', ruleId: 'github.model_inventory.artifact' })
      : evidence('missing', null, 'No model/vendor inventory found.', { evidenceClass: 'absence', ruleId: 'github.model_inventory.absent' }),

    subprocessor_inventory: subprocessorsFile
      ? fileEvidence({ files, match: subprocessorsFile, canonicalUrl, revision, note: 'Subprocessor inventory found.', ruleId: 'github.subprocessors.artifact' })
      : evidence('missing', null, 'No subprocessor inventory found.', { evidenceClass: 'absence', ruleId: 'github.subprocessors.absent' }),

    data_flow: dataFlowFile
      ? fileEvidence({ files, match: dataFlowFile, canonicalUrl, revision, note: 'Dedicated data-flow artifact found.', ruleId: 'github.data_flow.artifact' })
      : hasAny(all, ['data flow', 'storage', 'postgres', 'database', 'input / event'])
        ? heuristic('partial', 'Architecture/storage flow evidence found, but no dedicated buyer-facing data-flow artifact.', 'github.data_flow.heuristic')
        : evidence('missing', null, 'No buyer-facing data flow found.', { evidenceClass: 'absence', ruleId: 'github.data_flow.absent' }),

    retention_deletion: retentionFile
      ? fileEvidence({ files, match: retentionFile, canonicalUrl, revision, note: 'Dedicated retention/deletion artifact found.', ruleId: 'github.retention.artifact' })
      : retentionSignals
        ? heuristic('partial', 'Retention/deletion behavior is mentioned but not consolidated into a buyer-facing policy.', 'github.retention.heuristic')
        : evidence('missing', null, 'No retention/deletion evidence found.', { evidenceClass: 'absence', ruleId: 'github.retention.absent' }),

    dpa_tom_package: dpaFile
      ? fileEvidence({ files, match: dpaFile, canonicalUrl, revision, note: 'DPA/TOM starter exists; authorised legal review is still required for full credit.', status: 'partial', ruleId: 'github.dpa_tom.artifact' })
      : evidence('missing', null, 'No DPA/TOM buyer package found.', { evidenceClass: 'absence', ruleId: 'github.dpa_tom.absent' }),

    security_contact: securityFile
      ? fileEvidence({ files, match: securityFile, canonicalUrl, revision, note: 'Security file exists; monitored contact/operational intake still needs confirmation.', status: 'partial', ruleId: 'github.security_contact.artifact' })
      : evidence('missing', null, 'No security contact file found.', { evidenceClass: 'absence', ruleId: 'github.security_contact.absent' }),

    incident_response: incidentFile
      ? fileEvidence({ files, match: incidentFile, canonicalUrl, revision, note: 'Dedicated AI/security incident-response artifact found.', ruleId: 'github.incident_response.artifact' })
      : incidentSignals
        ? heuristic('partial', 'Incident-related language found, but no dedicated response artifact.', 'github.incident_response.heuristic')
        : evidence('missing', null, 'No incident-response evidence found.', { evidenceClass: 'absence', ruleId: 'github.incident_response.absent' }),

    access_tenant_controls: accessSignals >= 3
      ? heuristic('partial', 'Multiple access/tenant-control signals found; verified status requires technical/test evidence, not keywords.', 'github.access_tenant.heuristic')
      : evidence('missing', null, 'Insufficient public evidence for authentication/authorization/tenant isolation.', { evidenceClass: 'absence', ruleId: 'github.access_tenant.absent' }),

    audit_trace: auditSignals >= 1
      ? heuristic('partial', 'Audit/trace/replay language found; verified status requires a dedicated artifact or executable/test evidence.', 'github.audit_trace.heuristic')
      : evidence('missing', null, 'No auditability evidence found.', { evidenceClass: 'absence', ruleId: 'github.audit_trace.absent' }),

    evals_limitations: assuranceFile
      ? fileEvidence({ files, match: assuranceFile, canonicalUrl, revision, note: 'Dedicated assurance/limitations artifact found.', ruleId: 'github.assurance.artifact' })
      : evalSignals > 0
        ? heuristic('partial', 'Evaluation/limitations language found; heuristic evidence cannot award verified status.', 'github.assurance.heuristic')
        : evidence('missing', null, 'No evaluation/limitations evidence found.', { evidenceClass: 'absence', ruleId: 'github.assurance.absent' }),

    trust_center: trustFile
      ? fileEvidence({ files, match: trustFile, canonicalUrl, revision, note: 'Buyer-facing trust artifact found.', ruleId: 'github.trust_center.artifact' })
      : evidence('missing', null, 'No consolidated trust centre found.', { evidenceClass: 'absence', ruleId: 'github.trust_center.absent' }),

    questionnaire_library: questionnaireFile
      ? fileEvidence({ files, match: questionnaireFile, canonicalUrl, revision, note: 'Reusable questionnaire answer library found.', ruleId: 'github.questionnaire.artifact' })
      : evidence('missing', null, 'No reusable buyer questionnaire answer library found.', { evidenceClass: 'absence', ruleId: 'github.questionnaire.absent' }),
  }
}

export async function collectGitHubTrustEvidence(inputUrl, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required')
  const parsed = parseGitHubRepositoryUrl(inputUrl)
  const repo = await fetchJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, fetchImpl)
  const branch = repo.default_branch || 'main'
  const commit = await fetchJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${encodeURIComponent(branch)}`, fetchImpl)
  const revision = commit.sha
  if (typeof revision !== 'string' || revision.length < 7) throw new Error('GitHub commit SHA could not be resolved')

  const files = {}
  await Promise.all(COMMON_FILES.map(async (file) => {
    const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${revision}/${file}`
    const text = await fetchTextIfExists(rawUrl, fetchImpl)
    if (text != null) files[file] = text
  }))

  const evidenceMap = inferEvidence({ repo, files, canonicalUrl: parsed.canonicalUrl, revision })
  const fileManifest = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([file, text]) => [file, sha256(text)]))
  const collectedAt = new Date().toISOString()

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
      collectorVersion: 'trustready-github-v2',
      collectedAt,
      defaultBranch: branch,
      revision,
      immutableTreeUrl: `${parsed.canonicalUrl}/tree/${revision}`,
      filesObserved: Object.keys(files).sort(),
      fileHashes: fileManifest,
      evidenceManifestHash: sha256(JSON.stringify({ revision, fileManifest })),
      note: 'Repository evidence is conservative and incomplete by design. Heuristic matches can only produce partial evidence; absence from public GitHub is not proof that a control does not exist elsewhere.',
    },
  }
}
