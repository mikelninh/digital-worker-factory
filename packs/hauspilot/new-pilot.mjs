import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const id = arg('id');
const company = arg('company');
const template = arg('template', 'repair_intake');
if (!id || !company) {
  console.error('Usage: node packs/hauspilot/new-pilot.mjs --id <slug> --company "<name>" [--template repair_intake]');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(id)) throw new Error('id must be a lowercase slug');
const allowed = new Set(['repair_intake','tenant_inbox','invoice_review']);
if (!allowed.has(template)) throw new Error(`unknown template: ${template}`);

const out = path.resolve('deployments', id);
if (fs.existsSync(out)) throw new Error(`deployment already exists: ${out}`);
fs.mkdirSync(out, { recursive: true });

const sourcePresets = {
  repair_intake: {
    message: { type: 'manual_upload' },
    properties: { type: 'csv', file: 'properties.csv' },
    contractors: { type: 'csv', file: 'contractors.csv' }
  },
  tenant_inbox: {
    message: { type: 'manual_upload' },
    properties: { type: 'csv', file: 'properties.csv' }
  },
  invoice_review: {
    invoice: { type: 'manual_upload' },
    properties: { type: 'csv', file: 'properties.csv' },
    vendors: { type: 'csv', file: 'vendors.csv' }
  }
};

const client = {
  company: { id, name: company, timezone: 'Europe/Berlin' },
  pilot: { template, mode: 'shadow', baseline_cases: 20, success: { min_gold_accuracy_percent: 90, max_unsafe_external_actions: 0 } },
  sources: sourcePresets[template],
  policy: { external_reply: 'human_approval', contractor_assignment: 'human_approval', appointment_commitment: 'human_approval', accounting_write: 'human_approval', vendor_contact: 'human_approval', spend_commitment: 'blocked', payment: 'blocked', bank_detail_change: 'blocked', legal_commitment: 'blocked' },
  privacy: { retention_days: 14, production_requires_customer_privacy_review: true }
};
const approval = {
  data_mode: 'anonymised',
  scope_confirmed: false,
  data_authorised: false,
  shadow_only_confirmed: true,
  operator_named: false,
  retention_confirmed: false,
  anonymisation_confirmed: false,
  privacy_review_confirmed: false,
  processor_terms_reviewed: false,
  legal_basis_confirmed: false,
  subprocessor_review_confirmed: false,
  data_residency_decision_recorded: false,
  special_category_data_present: false,
  special_category_review_confirmed: false,
  notes: 'Default is anonymised. Set gates to true only after the corresponding kickoff/privacy decision is documented.'
};
const measurement = { cases_per_month: null, minutes_before: null, minutes_after: null, internal_hourly_cost_eur: null, reviewed_cases: 0, accepted_without_edit: 0, accepted_after_edit: 0, rejected: 0, notes: '' };

fs.writeFileSync(path.join(out,'client.json'), JSON.stringify(client,null,2));
fs.writeFileSync(path.join(out,'pilot-approval.json'), JSON.stringify(approval,null,2));
fs.writeFileSync(path.join(out,'cases.json'), JSON.stringify({ synthetic:false, cases:[] },null,2));
fs.writeFileSync(path.join(out,'measurement.json'), JSON.stringify(measurement,null,2));
fs.writeFileSync(path.join(out,'properties.csv'), 'property_id,address,unit\n');
if (template === 'repair_intake') fs.writeFileSync(path.join(out,'contractors.csv'), 'contractor_id,name,trade,service_area\n');
if (template === 'invoice_review') fs.writeFileSync(path.join(out,'vendors.csv'), 'vendor_id,name\n');
fs.writeFileSync(path.join(out,'START_HERE.md'), `# ${company} — HausPilot Pilot\n\n## Fastest safe path\n\n1. Confirm one workflow: \`${template}\`.\n2. Prefer synthetic or truly anonymised historical cases.\n3. Complete \`pilot-approval.json\`; do not mark a privacy gate true unless the decision is documented.\n4. Add 20–50 authorised cases to \`cases.json\`.\n5. Add property master data to \`properties.csv\`.\n6. Run preflight:\n\n\`\`\`bash\nnode packs/hauspilot/runtime/preflight.mjs ${out}\n\`\`\`\n\n7. Generate the privacy proof artifact:\n\n\`\`\`bash\nnode packs/hauspilot/privacy/manifest.mjs ${out}\n\`\`\`\n\n8. Configure \`OPENAI_API_KEY\` outside the repository.\n9. Run end-to-end:\n\n\`\`\`bash\nnode packs/hauspilot/run-pilot.mjs ${out}\n\`\`\`\n\nPseudonymised/personal data remain personal data for our gate logic and require the extra privacy/processor/legal/subprocessor/residency decisions before processing.\n`);
console.log(JSON.stringify({ ok:true, deployment:out, template, sources:Object.keys(client.sources) }, null, 2));
