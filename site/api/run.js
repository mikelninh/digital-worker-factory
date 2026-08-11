const demos = {
  aconium: {
    company: 'aconium',
    worker: 'PrüfPilot',
    scenario: 'Förderfall · Glasfaser-Ausbau Sonnenhain',
    input: 'Prüfe, ob die Schlusszahlung vorbereitet werden kann.',
    badge: 'Document AI · Case Engine',
    steps: [
      ['document_intake','3 synthetic documents normalised','pass'],
      ['rule_retrieval','Funding rule v2026.4 retrieved','pass'],
      ['evidence_match','Invoice total verified against approved budget','pass'],
      ['completeness_check','One required proof remains missing','warn'],
      ['next_action','Prepare targeted document request','pass']
    ],
    evidence: [
      ['Bewilligungsbescheid','Version 2026.4 · Abschnitt 8.2','verified'],
      ['Rechnung Bauabschnitt 3','€184,200 · amount consistent','verified'],
      ['Abnahmeprotokoll','Signed · 04 Aug 2026','verified'],
      ['Mittelverwendungsnachweis','Not present in file','missing']
    ],
    finding: 'Payment should not be released yet. The file is otherwise consistent, but one required proof is still missing.',
    action: 'Request Mittelverwendungsnachweis from project owner',
    gate: 'Human reviewer confirms the request before external communication.',
    reliability: { completion: 100, tools: 100, evidence: 96, escalation: 100 }
  },
  interloom: {
    company: 'Interloom',
    worker: 'CasePilot Reliability',
    scenario: 'Case #1842 · Vendor invoice reconciliation',
    input: 'Agent claims the reconciliation stage is complete.',
    badge: 'Agent Reliability · Trace Replay',
    steps: [
      ['invoice_opened','Tool call observed','pass'],
      ['purchase_order_searched','Tool call observed','pass'],
      ['purchase_order_verified','Required event missing','fail'],
      ['reconciliation_note_created','Required artifact missing','fail'],
      ['stage_completed','Agent claimed completion','warn']
    ],
    evidence: [
      ['Required actions','2 of 4 observed','missing'],
      ['Required artifacts','0 of 1 observed','missing'],
      ['Blocking violations','2','missing'],
      ['Agent completion claim','Observed but unsupported','verified']
    ],
    finding: 'Completion gate failed: the agent sounded finished before the required work was proven.',
    action: 'Replay with revised procedure and block completion until required evidence exists',
    gate: 'CI / promotion gate blocks the worker version until replay passes.',
    reliability: { completion: 50, tools: 67, evidence: 40, escalation: 100 },
    replay: {
      steps: [
        ['invoice_opened','Tool call observed','pass'],
        ['purchase_order_searched','Tool call observed','pass'],
        ['purchase_order_verified','PO #7712 verified','pass'],
        ['reconciliation_note_created','Artifact present','pass'],
        ['stage_completed','Completion supported by trace','pass']
      ],
      finding: 'Revised procedure passes every deterministic completion gate.',
      reliability: { completion: 100, tools: 100, evidence: 100, escalation: 100 }
    }
  },
  conny: {
    company: 'CONNY',
    worker: 'KanzleiPilot',
    scenario: 'Mietrecht · Mandant Müller',
    input: 'Prüfe die Akte, finde relevante Rechtsgrundlagen und bereite eine Mandantenantwort vor.',
    badge: 'Legal Workflow · GitLaw',
    steps: [
      ['matter_loaded','Case facts and documents structured','pass'],
      ['gitlaw_search','Relevant federal provisions retrieved','pass'],
      ['citation_verify','Every cited paragraph resolved locally','pass'],
      ['deadline_check','No critical deadline conflict detected','pass'],
      ['client_draft','Editable response prepared','pass']
    ],
    evidence: [
      ['Case facts','Synthetic lease + notice','verified'],
      ['Legal sources','Retrieved through GitLaw capability','verified'],
      ['Citation resolution','All demo citations resolvable','verified'],
      ['External communication','Not sent','verified']
    ],
    finding: 'A grounded draft is ready, with source evidence and uncertainty visible to the reviewer.',
    action: 'Qualified lawyer reviews and edits client response',
    gate: 'External legal communication always requires qualified human approval.',
    reliability: { completion: 100, tools: 100, evidence: 100, escalation: 100 }
  },
  digitalservice: {
    company: 'DigitalService',
    worker: 'BürgerPilot',
    scenario: 'Life event · Umzug nach Berlin',
    input: 'Welche nächsten Verwaltungsschritte sind nötig und welche Daten sollten nicht erneut abgefragt werden?',
    badge: 'Public Service · Proactive Workflow',
    steps: [
      ['identity_context','Identity requirement identified','pass'],
      ['register_need','Reusable register facts mapped','pass'],
      ['service_route','Responsible service workflow selected','pass'],
      ['data_minimisation','Only missing information requested','pass'],
      ['next_action','Human-checkable service plan prepared','pass']
    ],
    evidence: [
      ['Identity','Would use authorised identity layer','verified'],
      ['Register facts','Reuse before re-asking','verified'],
      ['Exchange','Structured hand-off mapped','verified'],
      ['External execution','Synthetic sandbox only','verified']
    ],
    finding: 'The worker turns a life event into a minimal-data service plan instead of another form-filling journey.',
    action: 'Review proposed service sequence and missing-data request',
    gate: 'No government action is executed in this demo; policy and authority remain explicit.',
    reliability: { completion: 100, tools: 100, evidence: 94, escalation: 100 }
  },
  overfly: {
    company: 'Overfly',
    worker: 'Worker Builder',
    scenario: 'Client workflow · Quote-to-scheduling handoff',
    input: 'Turn this messy recurring office process into a deployable digital worker.',
    badge: 'Applied AI · Worker Factory',
    steps: [
      ['workflow_map','Trigger, states and outcome extracted','pass'],
      ['capability_select','Email, CRM, calendar and documents composed','pass'],
      ['policy_generate','External commitments require approval','pass'],
      ['eval_contract','Golden case + failure cases generated','pass'],
      ['shadow_plan','Worker prepared for shadow deployment','pass']
    ],
    evidence: [
      ['Workflow boundary','Quote approved → schedule job','verified'],
      ['Capabilities','4 reusable blocks selected','verified'],
      ['Policy','No autonomous external commitment','verified'],
      ['Promotion rule','Shadow → Copilot only after eval pass','verified']
    ],
    finding: 'A reusable worker pack has been assembled from the same primitives used across the Factory.',
    action: 'Deploy in shadow mode and collect operator corrections',
    gate: 'Autonomy is promoted from observed outcomes, never enabled by default.',
    reliability: { completion: 100, tools: 100, evidence: 100, escalation: 100 }
  }
};

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = req.body?.demo;
  const demo = demos[key];
  if (!demo) return res.status(400).json({ error: 'Unknown demo' });
  const replay = Boolean(req.body?.replay) && demo.replay;
  const payload = replay ? { ...demo, steps: demo.replay.steps, finding: demo.replay.finding, reliability: demo.replay.reliability, replayed: true } : demo;
  return res.status(200).json({
    runId: `${key}-${Date.now().toString(36)}`,
    status: key === 'interloom' && !replay ? 'blocked' : 'awaiting_approval',
    synthetic: true,
    timestamp: new Date().toISOString(),
    ...payload
  });
}
