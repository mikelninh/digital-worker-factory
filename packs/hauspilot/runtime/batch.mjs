import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runShadow } from './shadow.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const packRoot = path.resolve(here, '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function includesAll(actual = [], expected = []) {
  return expected.every(x => actual.includes(x));
}

function scoreAgainstGold(result, gold = {}) {
  const checks = [];
  if (gold.classification) checks.push(result.classification === gold.classification);
  if (gold.property_id) checks.push(result.property_id === gold.property_id);
  if (gold.urgency) checks.push(result.urgency === gold.urgency);
  if (gold.approval_state) checks.push(result.approval_state === gold.approval_state);
  if (gold.missing_information) checks.push(includesAll(result.missing_information, gold.missing_information));
  if (gold.flags_include) checks.push(includesAll(result.flags, gold.flags_include));
  return { passed: checks.filter(Boolean).length, total: checks.length, ok: checks.every(Boolean) };
}

const casesPath = path.resolve(process.argv[2] || path.join(packRoot, 'sample-cases.json'));
const clientPath = process.argv[3] ? path.resolve(process.argv[3]) : path.join(packRoot, 'client.example.json');
const outPath = path.resolve(process.argv[4] || 'hauspilot-batch-results.json');

const templatesDoc = readJson(path.join(packRoot, 'templates.json'));
const input = readJson(casesPath);
const clientConfig = readJson(clientPath);
const cases = Array.isArray(input) ? input : input.cases;

if (!Array.isArray(cases) || !cases.length) throw new Error('No cases supplied');

const rows = [];
for (const caseData of cases) {
  const template = templatesDoc.templates.find(t => t.id === caseData.template);
  if (!template) throw new Error(`Unknown template ${caseData.template} for case ${caseData.id}`);
  process.stderr.write(`HausPilot shadow: ${caseData.id} (${template.id})... `);
  try {
    const result = await runShadow({ caseData, template, clientConfig });
    const gold = scoreAgainstGold(result, caseData.gold || {});
    rows.push({ case_id: caseData.id, template: template.id, ok: true, gold, result });
    process.stderr.write(`${gold.ok ? 'PASS' : 'REVIEW'}\n`);
  } catch (error) {
    rows.push({ case_id: caseData.id, template: template.id, ok: false, error: error.message });
    process.stderr.write(`ERROR: ${error.message}\n`);
  }
}

const goldPassed = rows.reduce((n, r) => n + (r.gold?.passed || 0), 0);
const goldTotal = rows.reduce((n, r) => n + (r.gold?.total || 0), 0);
const unsafeExecution = rows.filter(r => r.result?.policy?.execution_allowed === true).length;
const summary = {
  synthetic_input: Boolean(input.synthetic),
  generated_at: new Date().toISOString(),
  cases: rows.length,
  completed: rows.filter(r => r.ok).length,
  errored: rows.filter(r => !r.ok).length,
  gold_checks_passed: goldPassed,
  gold_checks_total: goldTotal,
  gold_accuracy_percent: goldTotal ? Math.round((goldPassed / goldTotal) * 1000) / 10 : null,
  unsafe_executions: unsafeExecution,
  ready_for_human_review: rows.filter(r => r.ok && r.result?.approval_state === 'shadow_only').length
};

const output = { summary, rows };
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ ok: summary.errored === 0 && unsafeExecution === 0, outPath, summary }, null, 2));
if (unsafeExecution > 0) process.exitCode = 2;
