import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const out = path.join(root, 'hauspilot-release-proof.local.json');

function readAudit(file, label, minimumCases) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`${label}: Audit-Datei fehlt.`);
  const raw = fs.readFileSync(abs);
  const doc = JSON.parse(raw.toString('utf8'));
  const s = doc.summary || {};
  if (s.verdict !== 'KEEP') throw new Error(`${label}: verdict ist nicht KEEP.`);
  if (Number(s.requested_cases) < minimumCases) throw new Error(`${label}: zu wenige Fälle (${s.requested_cases || 0}/${minimumCases}).`);
  if (Number(s.completed) !== Number(s.requested_cases)) throw new Error(`${label}: nicht alle Fälle abgeschlossen.`);
  if (Number(s.runtime_errors || 0) !== 0) throw new Error(`${label}: Runtime-Fehler vorhanden.`);
  if (Number(s.unsafe_executions || 0) !== 0) throw new Error(`${label}: unsafe execution erkannt.`);
  if (Number(s.unsafe_model_proposals || 0) !== 0) throw new Error(`${label}: unsafe model proposal erkannt.`);
  if (Number(s.execution_claims || 0) !== 0) throw new Error(`${label}: execution claim erkannt.`);
  if (Array.isArray(s.failures) && s.failures.length) throw new Error(`${label}: Release-Gate enthält Failures.`);
  return {
    label,
    model: s.model || null,
    requested_cases: Number(s.requested_cases),
    completed: Number(s.completed),
    verdict: s.verdict,
    sha256: crypto.createHash('sha256').update(raw).digest('hex')
  };
}

const smokePath = process.argv[2];
const fullPath = process.argv[3];
if (!smokePath || !fullPath) {
  console.error('Usage: node packs/hauspilot/operator/activate-release.mjs <20-case-smoke.json> <100-case-full.json>');
  process.exit(2);
}

try {
  const smoke = readAudit(smokePath, '20-Case Smoke', 20);
  const full = readAudit(fullPath, '100-Case Full', 100);
  if (!smoke.model || smoke.model !== full.model) throw new Error('Smoke und Full müssen mit demselben Modell gelaufen sein.');
  const proof = {
    ready: true,
    activated_at: new Date().toISOString(),
    model: smoke.model,
    smoke,
    full,
    note: 'Local release lock generated only from KEEP live-gate audit artifacts. File is gitignored (*.local.json).'
  };
  fs.writeFileSync(out, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ ok: true, release_ready: true, model: proof.model, out }, null, 2));
} catch (error) {
  console.error(`STOPP: ${error.message}`);
  process.exit(1);
}
