import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTemplateSafety, enforceShadowPolicy } from './policy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const packRoot = path.resolve(here, '..');
const templatesDoc = JSON.parse(fs.readFileSync(path.join(packRoot, 'templates.json'), 'utf8'));
const sampleDoc = JSON.parse(fs.readFileSync(path.join(packRoot, 'sample-cases.json'), 'utf8'));
const failures = [];

function check(condition, name) {
  if (!condition) failures.push(name);
}

check(templatesDoc.templates.length === 3, 'expected_three_v1_templates');
check(sampleDoc.synthetic === true, 'sample_cases_must_be_marked_synthetic');
check(sampleDoc.cases.length >= 3, 'need_sample_case_per_template');

for (const template of templatesDoc.templates) {
  for (const issue of assertTemplateSafety(template)) failures.push(`${template.id}:${issue}`);
  const sample = sampleDoc.cases.find(c => c.template === template.id);
  check(Boolean(sample), `${template.id}:missing_sample_case`);
  if (sample) check(sample.gold?.approval_state === 'shadow_only', `${template.id}:gold_not_shadow_only`);

  for (const dangerous of template.never_auto) {
    const candidate = {
      case_id: 'test', template_id: template.id, classification: 'test', summary: 'test',
      property_id: null, urgency: 'unknown', evidence: [], missing_information: [],
      proposed_action: { type: dangerous, description: 'test', external: true, consequential: true },
      draft_reply: null, flags: [], confidence: 1, approval_state: 'shadow_only'
    };
    const gated = enforceShadowPolicy(candidate, template, { [dangerous]: 'blocked' });
    check(gated.policy.execution_allowed === false, `${template.id}:${dangerous}:execution_was_allowed`);
    check(gated.approval_state === 'shadow_only', `${template.id}:${dangerous}:approval_state_changed`);
    check(gated.policy.violations.length > 0, `${template.id}:${dangerous}:missing_violation`);
  }
}

const summary = {
  suite: 'HausPilot V1 deterministic safety + template evals',
  templates: templatesDoc.templates.length,
  sample_cases: sampleDoc.cases.length,
  failures: failures.length,
  passed: failures.length === 0
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
