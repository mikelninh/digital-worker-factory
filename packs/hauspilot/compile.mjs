import fs from 'node:fs';
import path from 'node:path';

const configPath = process.argv[2] || new URL('./client.example.json', import.meta.url).pathname;
const root = path.dirname(new URL(import.meta.url).pathname);
const templates = JSON.parse(fs.readFileSync(path.join(root, 'templates.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function fail(message) {
  console.error(`HausPilot config error: ${message}`);
  process.exit(1);
}

if (!config.company?.id || !config.company?.name) fail('company.id and company.name are required');
if (!config.pilot?.template) fail('pilot.template is required');
const template = templates.templates.find(t => t.id === config.pilot.template);
if (!template) fail(`unknown template: ${config.pilot.template}`);

for (const source of template.required_sources) {
  if (!config.sources?.[source]) fail(`required source missing: ${source}`);
}

const policy = { ...(config.policy || {}) };
for (const action of template.never_auto) {
  if (!['blocked', 'human_approval'].includes(policy[action])) policy[action] = 'blocked';
}
for (const action of template.approval_required) {
  if (!policy[action]) policy[action] = 'human_approval';
}

const deployment = {
  deployment_version: '1.0.0',
  generated_at: new Date().toISOString(),
  tenant: config.company,
  lifecycle: {
    mode: config.pilot.mode || 'shadow',
    allowed_modes: ['shadow', 'copilot'],
    promotion_requires: ['eval_pass', 'operator_review', 'explicit_human_approval']
  },
  workflow: template,
  sources: config.sources,
  policy,
  privacy: config.privacy || {},
  success: config.pilot.success || {},
  output_contract: templates.output_contract
};

const outDir = path.resolve(process.cwd(), 'deployments');
fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, `${config.company.id}.json`);
fs.writeFileSync(output, JSON.stringify(deployment, null, 2));
console.log(JSON.stringify({ ok: true, template: template.id, mode: deployment.lifecycle.mode, output }, null, 2));
