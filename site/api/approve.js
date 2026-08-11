export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { runId, decision = 'approve', demo } = req.body || {};
  if (!runId) return res.status(400).json({ error: 'runId required' });
  const approved = decision === 'approve';
  return res.status(200).json({
    runId,
    demo,
    decision,
    status: approved ? 'approved' : 'rejected',
    audit: {
      actor: 'human_reviewer',
      event: approved ? 'action_approved' : 'action_rejected',
      recordedAt: new Date().toISOString(),
      externalActionExecuted: false
    },
    message: approved
      ? 'Human gate passed. The proposed action is now eligible for execution by an authorised connector.'
      : 'Proposal rejected. No external action was executed.'
  });
}
