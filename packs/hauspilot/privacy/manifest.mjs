import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const pilotDir = path.resolve(process.argv[2] || '');
const outPath = path.resolve(process.argv[3] || path.join(pilotDir, 'privacy-manifest.json'));
if (!process.argv[2]) {
  console.error('Usage: node packs/hauspilot/privacy/manifest.mjs <pilot-directory> [output.json]');
  process.exit(2);
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(pilotDir, name), 'utf8'));
}
function fileProof(name) {
  const file = path.join(pilotDir, name);
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  return { sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}

const client = readJson('client.json');
const approval = readJson('pilot-approval.json');
const inputNames = ['client.json','pilot-approval.json','cases.json','properties.csv','contractors.csv','vendors.csv'];
const inputHashes = Object.fromEntries(inputNames.map(n => [n,fileProof(n)]).filter(([,v]) => v));
const personalMode = ['pseudonymised_personal_data','authorised_personal_data'].includes(approval.data_mode);

const manifest = {
  schema: 'hauspilot-privacy-manifest-v1',
  generated_at: new Date().toISOString(),
  pilot: {
    company_id: client.company?.id || null,
    company_name: client.company?.name || null,
    template: client.pilot?.template || null,
    mode: client.pilot?.mode || null,
    data_mode: approval.data_mode || null,
    retention_days: client.privacy?.retention_days ?? null
  },
  controls: {
    shadow_only: client.pilot?.mode === 'shadow' && approval.shadow_only_confirmed === true,
    openai_store: false,
    model_execution_tools: 0,
    external_execution_allowed: false,
    input_contents_embedded_in_manifest: false
  },
  privacy_gates: {
    scope_confirmed: approval.scope_confirmed === true,
    data_authorised: approval.data_authorised === true,
    retention_confirmed: approval.retention_confirmed === true,
    anonymisation_confirmed: approval.anonymisation_confirmed === true,
    privacy_review_confirmed: approval.privacy_review_confirmed === true,
    processor_terms_reviewed: approval.processor_terms_reviewed === true,
    legal_basis_confirmed: approval.legal_basis_confirmed === true,
    subprocessor_review_confirmed: approval.subprocessor_review_confirmed === true,
    data_residency_decision_recorded: approval.data_residency_decision_recorded === true,
    special_category_data_present: approval.special_category_data_present === true,
    special_category_review_confirmed: approval.special_category_review_confirmed === true
  },
  provider_configuration_claims: {
    zero_data_retention: 'not_claimed_unless_separately_verified',
    eu_only_processing: 'not_claimed_unless_separately_verified',
    note: 'store:false is not equivalent to Zero Data Retention. Provider retention/residency must be verified separately for a personal-data pilot.'
  },
  personal_data_extra_gates_required: personalMode,
  input_hashes: inputHashes
};

fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ok:true, outPath, schema:manifest.schema, data_mode:manifest.pilot.data_mode, files_hashed:Object.keys(inputHashes).length }, null, 2));
