const STATUS_CREDIT = Object.freeze({
  verified: 1,
  attested: 1,
  partial: 0.5,
  missing: 0,
})

function assertString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string`)
  return value.trim()
}

function round(value, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function validateTrustReadyControlPack(pack) {
  if (!pack || pack.schema !== 'trustready-control-pack-v1') throw new TypeError('Unsupported TrustReady control pack')
  if (!Array.isArray(pack.controls) || pack.controls.length === 0) throw new TypeError('TrustReady control pack must contain controls')

  const seen = new Set()
  let totalWeight = 0
  for (const control of pack.controls) {
    assertString(control.id, 'control.id')
    assertString(control.title, 'control.title')
    if (seen.has(control.id)) throw new TypeError(`Duplicate TrustReady control: ${control.id}`)
    seen.add(control.id)
    if (!Number.isFinite(control.weight) || control.weight <= 0) throw new TypeError(`Invalid weight for ${control.id}`)
    if (!Array.isArray(control.evidenceKeys) || control.evidenceKeys.length === 0) throw new TypeError(`Missing evidenceKeys for ${control.id}`)
    totalWeight += control.weight
  }
  return { ...pack, totalWeight }
}

function normalizeEvidenceEntry(entry) {
  if (!entry) return { status: 'missing', source: null, note: null }
  const status = STATUS_CREDIT[entry.status] == null ? 'missing' : entry.status
  const source = typeof entry.source === 'string' && entry.source.trim() ? entry.source.trim() : null
  const note = typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim() : null

  if ((status === 'verified' || status === 'attested') && !source) {
    return { status: 'partial', source: null, note: note || 'Claim has no evidence source yet.' }
  }
  return { status, source, note }
}

function strongestEvidence(productEvidence, keys) {
  const candidates = keys.map((key) => ({ key, ...normalizeEvidenceEntry(productEvidence?.[key]) }))
  candidates.sort((a, b) => STATUS_CREDIT[b.status] - STATUS_CREDIT[a.status])
  return candidates[0] || { key: keys[0], status: 'missing', source: null, note: null }
}

export function scanTrustReadiness(product, rawPack) {
  const pack = validateTrustReadyControlPack(rawPack)
  assertString(product?.id, 'product.id')
  assertString(product?.name, 'product.name')

  let earnedWeight = 0
  const controls = pack.controls.map((control) => {
    const evidence = strongestEvidence(product.evidence, control.evidenceKeys)
    const credit = STATUS_CREDIT[evidence.status]
    const earned = control.weight * credit
    earnedWeight += earned
    return {
      id: control.id,
      category: control.category,
      title: control.title,
      weight: control.weight,
      status: evidence.status,
      evidenceKey: evidence.key,
      source: evidence.source,
      note: evidence.note,
      credit,
      earnedWeight: round(earned, 2),
      gapWeight: round(control.weight - earned, 2),
      remediation: control.remediation,
      autoGenerate: control.autoGenerate || null,
      humanAttestationRequired: Boolean(control.humanAttestationRequired),
    }
  })

  const score = round((earnedWeight / pack.totalWeight) * 100)
  const verified = controls.filter((item) => item.status === 'verified').length
  const attested = controls.filter((item) => item.status === 'attested').length
  const partial = controls.filter((item) => item.status === 'partial').length
  const missing = controls.filter((item) => item.status === 'missing').length

  return {
    schema: 'trustready-scan-v1',
    product: { id: product.id, name: product.name, url: product.url || null },
    controlPackVersion: pack.version,
    score,
    controlsTotal: controls.length,
    verified,
    attested,
    partial,
    missing,
    controls,
    readyForBuyerPack: score === 100,
    scoreMeaning: pack.scoreMeaning,
    disclaimer: 'TrustReady measures configured buyer-readiness evidence. It does not certify legal compliance, security, or regulatory approval.',
  }
}

export function buildTrustReadyRemediationPlan(scan) {
  if (!scan || scan.schema !== 'trustready-scan-v1') throw new TypeError('TrustReady scan is required')

  const actions = scan.controls
    .filter((control) => control.status !== 'verified' && control.status !== 'attested')
    .map((control) => {
      let lane = 'manual_evidence'
      if (control.humanAttestationRequired) lane = 'human_review'
      else if (control.autoGenerate) lane = 'auto_prepare'

      return {
        controlId: control.id,
        title: control.title,
        category: control.category,
        currentStatus: control.status,
        gapWeight: control.gapWeight,
        lane,
        action: control.remediation,
        generatedArtifact: control.autoGenerate,
        completionRule: control.humanAttestationRequired
          ? 'A named authorised person must review/attest and attach the evidence source.'
          : control.autoGenerate
            ? 'Generate the draft, implement/deploy it where required, then attach observable evidence.'
            : 'Implement the control and attach observable evidence.',
      }
    })
    .sort((a, b) => b.gapWeight - a.gapWeight || a.title.localeCompare(b.title))

  return {
    schema: 'trustready-remediation-plan-v1',
    product: scan.product,
    currentScore: scan.score,
    targetScore: 100,
    actions,
    autoPrepare: actions.filter((item) => item.lane === 'auto_prepare'),
    humanReview: actions.filter((item) => item.lane === 'human_review'),
    manualEvidence: actions.filter((item) => item.lane === 'manual_evidence'),
    remainingTo100: actions.length,
    targetMeaning: '100 is reached only when every configured control has evidence or authorised human attestation.',
  }
}

function artifactHeader(product, title) {
  return `# ${title}\n\nProduct: **${product.name}**\n\nGenerated by TrustReady as a starter artifact. Verify company-specific facts before publication or contractual reliance.\n\n`
}

function artifactFor(kind, product) {
  const name = product.name
  const known = product.known || {}
  switch (kind) {
    case 'product_card':
      return { path: 'PRODUCT_TRUST_CARD.md', content: `${artifactHeader(product, 'Product Trust Card')}## Intended purpose\n${known.intendedPurpose || '[Confirm intended purpose]'}\n\n## Intended users\n${known.intendedUsers || '[Confirm intended users]'}\n\n## Non-goals\n${known.nonGoals || '[Confirm explicit non-goals]'}\n` }
    case 'ai_act_assessment':
      return { path: 'AI_ACT_ROLE_ASSESSMENT.md', requiresHumanReview: true, content: `${artifactHeader(product, 'AI Act Role Assessment')}## Candidate role\n${known.aiActRole || '[Provider / deployer / downstream provider / other — legal owner to confirm]'}\n\n## Candidate risk classification\n${known.aiActRisk || '[Confirm classification and rationale]'}\n\n## Review\nA named authorised reviewer must confirm this assessment against the actual deployment and current law.\n` }
    case 'ai_disclosure':
      return { path: 'AI_DISCLOSURE.md', content: `${artifactHeader(product, 'AI Interaction Disclosure')}Suggested user-facing wording:\n\n> You are interacting with an AI-assisted system. ${name} can prepare or organise information, but important decisions remain subject to the human authority described in this product's workflow.\n\nConfirm placement in every directly interactive surface where disclosure is required.\n` }
    case 'human_oversight':
      return { path: 'HUMAN_OVERSIGHT.md', content: `${artifactHeader(product, 'Human Oversight')}## AI may\n- analyse permitted inputs\n- retrieve permitted evidence\n- prepare bounded outputs\n\n## Human approval required\n${known.humanApproval || '- consequential external actions\n- material customer decisions\n- changes to authority, price or contractual terms'}\n\n## Final authority\n${known.finalAuthority || '[Name the role with final authority]'}\n` }
    case 'model_inventory':
      return { path: 'MODEL_VENDOR_INVENTORY.md', content: `${artifactHeader(product, 'Model and AI Vendor Inventory')}| Provider / model | Purpose | Data sent | Region | Fallback | Evidence |\n| --- | --- | --- | --- | --- | --- |\n| ${known.modelProvider || '[Confirm]'} | ${known.modelPurpose || '[Confirm]'} | ${known.modelData || '[Confirm]'} | ${known.modelRegion || '[Confirm]'} | ${known.modelFallback || '[Confirm]'} | [link] |\n` }
    case 'subprocessor_inventory':
      return { path: 'SUBPROCESSORS.md', content: `${artifactHeader(product, 'Subprocessor Inventory')}| Subprocessor | Purpose | Data categories | Location / transfer mechanism | Evidence |\n| --- | --- | --- | --- | --- |\n| [Confirm] | [Confirm] | [Confirm] | [Confirm] | [link] |\n` }
    case 'data_flow':
      return { path: 'DATA_FLOW.md', content: `${artifactHeader(product, 'Data Flow')}1. **Input:** ${known.dataInput || '[Confirm]'}\n2. **Processing:** ${known.dataProcessing || '[Confirm]'}\n3. **External model/provider calls:** ${known.externalCalls || '[Confirm]'}\n4. **Storage:** ${known.storage || '[Confirm]'}\n5. **Audit/logging:** ${known.audit || '[Confirm]'}\n6. **Deletion:** ${known.deletion || '[Confirm]'}\n7. **Never leaves boundary:** ${known.neverLeaves || '[Confirm]'}\n` }
    case 'retention_policy':
      return { path: 'RETENTION_AND_DELETION.md', content: `${artifactHeader(product, 'Retention and Deletion')}| Data class | Default retention | Deletion trigger | Exception | Evidence |\n| --- | --- | --- | --- | --- |\n| Customer inputs | [Confirm] | customer/admin deletion | [Confirm] | [link] |\n| Audit events | [Confirm] | policy expiry | legal/security need if applicable | [link] |\n` }
    case 'dpa_tom_starter':
      return { path: 'DPA_TOM_STARTER.md', requiresHumanReview: true, content: `${artifactHeader(product, 'DPA / TOM Starter')}This is procurement preparation, **not a signed DPA and not legal advice**.\n\n## Processing scope\n- purpose: [confirm]\n- data subjects: [confirm]\n- data categories: [confirm]\n- duration: [confirm]\n\n## Technical and organisational measures\n- access control: [link evidence]\n- tenant isolation: [link evidence]\n- encryption: [confirm in transit / at rest]\n- logging and monitoring: [link evidence]\n- incident response: [link]\n- deletion/retention: [link]\n\nCompany counsel or an authorised legal owner must approve contractual wording.\n` }
    case 'security_contact':
      return { path: 'SECURITY.md', content: `${artifactHeader(product, 'Security Contact')}Report suspected vulnerabilities to **${known.securityContact || '[security contact to configure]'}**.\n\nInclude impact, reproduction steps and affected surface. Do not include unnecessary personal or customer data.\n` }
    case 'incident_response':
      return { path: 'AI_SECURITY_INCIDENT_RESPONSE.md', content: `${artifactHeader(product, 'AI and Security Incident Response')}1. Triage and assign severity.\n2. Contain unsafe access or consequential automation.\n3. Preserve relevant evidence without exposing secrets.\n4. Assess affected tenants/data/decisions.\n5. Escalate to the named security/privacy/AI owner.\n6. Decide customer/regulator notification with the authorised owner.\n7. Remediate, add regression coverage and record lessons learned.\n` }
    case 'assurance_summary':
      return { path: 'ASSURANCE.md', content: `${artifactHeader(product, 'Assurance and Limitations')}## Proven\n${known.proven || '- [link tested claims]'}\n\n## Not yet proven\n${known.notProven || '- real-world production performance\n- deployment-specific legal/security acceptance'}\n\n## Release rule\nClaims must remain scoped to the evaluation that supports them. Synthetic results are labelled synthetic.\n` }
    case 'trust_center':
      return { path: 'TRUST_CENTER.md', content: `${artifactHeader(product, 'Trust Centre')}## AI governance\n- [AI Act role assessment]\n- [AI interaction disclosure]\n- [human oversight]\n\n## Security & privacy\n- [data flow]\n- [subprocessors]\n- [retention/deletion]\n- [incident response]\n\n## Assurance\n- [evaluations and limitations]\n- [auditability]\n\n## Contact\n- Security: ${known.securityContact || '[configure]'}\n- Privacy: ${known.privacyContact || '[configure]'}\n` }
    case 'questionnaire_library':
      return { path: 'QUESTIONNAIRE_ANSWER_LIBRARY.md', content: `${artifactHeader(product, 'Buyer Questionnaire Answer Library')}| Question | Approved answer | Evidence | Owner | Last reviewed |\n| --- | --- | --- | --- | --- |\n| Does the product use AI? | Yes. See product and AI governance documentation. | [link] | [owner] | [date] |\n| Is consequential action autonomous? | [Confirm from human-oversight policy.] | [link] | [owner] | [date] |\n| How is customer data deleted? | [Confirm from retention policy.] | [link] | [owner] | [date] |\n` }
    default:
      return null
  }
}

export function generateTrustReadyArtifacts(product, scan) {
  const plan = buildTrustReadyRemediationPlan(scan)
  const artifacts = []
  const seen = new Set()
  for (const action of plan.actions) {
    if (!action.generatedArtifact || seen.has(action.generatedArtifact)) continue
    seen.add(action.generatedArtifact)
    const artifact = artifactFor(action.generatedArtifact, product)
    if (!artifact) continue
    artifacts.push({
      controlId: action.controlId,
      kind: action.generatedArtifact,
      requiresHumanReview: Boolean(artifact.requiresHumanReview),
      ...artifact,
    })
  }
  return {
    schema: 'trustready-generated-pack-v1',
    product: scan.product,
    generatedAt: new Date().toISOString(),
    artifacts,
    warning: 'Generated artifacts are drafts. A control earns full readiness credit only after implementation/publication and evidence attachment, or authorised human attestation where allowed.',
  }
}

export function applyTrustReadyEvidence(product, updates = {}) {
  const evidence = { ...(product.evidence || {}) }
  for (const [key, value] of Object.entries(updates)) evidence[key] = normalizeEvidenceEntry(value)
  return { ...product, evidence }
}

export function buildTrustReadyBuyerPack(product, scan) {
  if (scan.score !== 100) {
    return {
      ready: false,
      product: scan.product,
      score: scan.score,
      blockers: buildTrustReadyRemediationPlan(scan).actions,
      message: 'Buyer pack remains draft until every configured readiness control is evidence-backed or explicitly attested.',
    }
  }

  return {
    ready: true,
    schema: 'trustready-buyer-pack-v1',
    product: scan.product,
    score: scan.score,
    generatedAt: new Date().toISOString(),
    evidenceIndex: scan.controls.map((control) => ({
      controlId: control.id,
      title: control.title,
      status: control.status,
      source: control.source,
    })),
    disclaimer: scan.disclaimer,
  }
}
