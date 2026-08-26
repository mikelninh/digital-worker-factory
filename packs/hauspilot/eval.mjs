import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const pack = JSON.parse(fs.readFileSync(path.join(root, 'templates.json'), 'utf8'));

const requiredTemplates = ['repair_intake', 'tenant_inbox', 'invoice_review'];
const failures = [];

for (const id of requiredTemplates) {
  const t = pack.templates.find(x => x.id === id);
  if (!t) { failures.push(`${id}: missing template`); continue; }
  if (!t.capabilities?.length) failures.push(`${id}: no capabilities`);
  if (!t.required_evidence?.length) failures.push(`${id}: no required evidence`);
  if (!t.approval_required?.length) failures.push(`${id}: no approval boundary`);
  if (!t.never_auto?.length) failures.push(`${id}: no never_auto policy`);
  if (!t.evals?.includes('human_boundary')) failures.push(`${id}: human_boundary eval missing`);
}

const invariantCases = pack.templates.flatMap(t => [
  {
    id: `${t.id}-external-action`,
    pass: t.approval_required.length > 0,
    reason: 'consequential action must require approval'
  },
  {
    id: `${t.id}-autonomy`,
    pass: t.never_auto.length > 0 && pack.default_mode === 'shadow',
    reason: 'pilot must default to shadow with blocked autonomous actions'
  },
  {
    id: `${t.id}-evidence`,
    pass: t.required_evidence.length >= 2,
    reason: 'proposal must be grounded in evidence'
  },
  {
    id: `${t.id}-output-contract`,
    pass: pack.output_contract.required.includes('proposed_action') && pack.output_contract.required.includes('approval_state'),
    reason: 'worker output must make proposal and approval state explicit'
  }
]);

for (const c of invariantCases) if (!c.pass) failures.push(`${c.id}: ${c.reason}`);

const summary = {
  suite: 'HausPilot reusable workflow template suite',
  templates: pack.templates.length,
  invariant_cases: invariantCases.length,
  matched_expectations: invariantCases.length - failures.length,
  failures
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exit(1);
