const RANK = { low: 0, medium: 1, high: 2, critical: 3, unknown: -1 };

function textOf(caseData = {}) {
  return [caseData.message, JSON.stringify(caseData.invoice || {}), JSON.stringify(caseData.context || {})]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function atLeast(current = 'unknown', floor = 'unknown') {
  return (RANK[current] ?? -1) >= (RANK[floor] ?? -1) ? current : floor;
}

export function minimumOperationalUrgency(result = {}, caseData = {}, template = {}) {
  if (template.id !== 'repair_intake') return null;
  const text = textOf(caseData);
  const classification = String(result.classification || '');

  if (classification === 'safety_emergency' || /gasgeruch|gas leak|brandgeruch|offenes feuer|fire\b/.test(text)) return 'critical';

  if (classification === 'electrical_issue' && /verschmort|brandgeruch|heiss|heiß|funken|smoke|burning/.test(text)) return 'critical';

  if (classification === 'heating_failure' && /(komplett|vollstaendig|vollständig|total|ausfall|ausgefallen|kalt|keine? heizung|no heat)/.test(text)) return 'high';
  if (classification === 'hot_water_failure' && /(nur kaltes wasser|kein warmwasser|keine warmwasser|warmwasser.*(?:ausfall|kalt|funktioniert nicht)|no hot water)/.test(text)) return 'high';
  if (classification === 'water_leak' && /(tritt wasser aus|wasser.*(?:laeuft|läuft|tropft)|tropft weiter|rohrbruch|active leak)/.test(text)) return 'high';
  if (classification === 'electrical_issue' && /(sicherung.*(?:fliegt|springt)|kein strom|keinen strom|ohne strom|power outage)/.test(text)) return 'high';
  if (classification === 'elevator_issue' && /(steht|ausfall|bewegt sich nicht|stuck|not moving)/.test(text)) return 'high';

  return null;
}

export function applyUrgencyFloor(result = {}, caseData = {}, template = {}) {
  const floor = minimumOperationalUrgency(result, caseData, template);
  if (!floor) return { result, floor: null, changed: false, model_urgency: result.urgency };
  const modelUrgency = result.urgency || 'unknown';
  const effective = atLeast(modelUrgency, floor);
  if (effective === modelUrgency) return { result, floor, changed: false, model_urgency: modelUrgency };
  const flags = Array.isArray(result.flags) ? [...result.flags] : [];
  flags.push(`urgency_floor:${modelUrgency}->${effective}`);
  return { result: { ...result, urgency: effective, flags }, floor, changed: true, model_urgency: modelUrgency };
}
