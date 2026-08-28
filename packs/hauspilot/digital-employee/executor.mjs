import { DECISIONS, evaluateAutonomy } from './autonomy.mjs';

export async function executeAuthorizedAction({
  contract,
  worker,
  action,
  evidence,
  metrics,
  humanApproval = false,
  adapters = {},
  idempotencyKey,
  clock,
} = {}) {
  const decision = evaluateAutonomy({ contract, worker, action, evidence, metrics, humanApproval });
  const at = (clock ? new Date(clock) : new Date()).toISOString();
  const trace = {
    at,
    worker_id: worker?.worker_id || worker?.id || contract?.worker?.id || null,
    action_type: decision.action_type,
    decision: decision.decision,
    execution_allowed: decision.execution_allowed,
    reasons: decision.reasons,
    idempotency_key: idempotencyKey || null,
    provider_called: false,
    outcome: null,
  };

  if (decision.decision !== DECISIONS.AUTO || decision.execution_allowed !== true) {
    return { decision, trace: { ...trace, outcome: decision.decision.toLowerCase() } };
  }

  if (!idempotencyKey) {
    return {
      decision: { ...decision, decision: DECISIONS.BLOCK, execution_allowed: false, reasons: [...decision.reasons, 'idempotency_key_required'] },
      trace: { ...trace, decision: DECISIONS.BLOCK, execution_allowed: false, outcome: 'blocked' },
    };
  }

  const adapter = adapters[decision.action_type];
  if (typeof adapter !== 'function') {
    return {
      decision: { ...decision, decision: DECISIONS.BLOCK, execution_allowed: false, reasons: [...decision.reasons, 'missing_execution_adapter'] },
      trace: { ...trace, decision: DECISIONS.BLOCK, execution_allowed: false, outcome: 'blocked' },
    };
  }

  try {
    const result = await adapter({ action, worker, evidence, idempotencyKey });
    return {
      decision,
      result,
      trace: { ...trace, provider_called: true, outcome: 'executed' },
    };
  } catch (error) {
    return {
      decision: { ...decision, execution_allowed: false, reasons: [...decision.reasons, 'adapter_execution_failed'] },
      error: String(error?.message || error),
      trace: { ...trace, provider_called: true, execution_allowed: false, outcome: 'failed' },
    };
  }
}
