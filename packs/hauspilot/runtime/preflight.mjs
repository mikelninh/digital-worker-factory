import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packRoot = path.resolve(here, '..');
const pilotDir = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('Usage: node packs/hauspilot/runtime/preflight.mjs <pilot-directory>');
  process.exit(2);
}

const errors = [];
const warnings = [];
const requiredFiles = ['client.json', 'pilot-approval.json', 'cases.json', 'properties.csv'];
for (const name of requiredFiles) if (!fs.existsSync(path.join(pilotDir, name))) errors.push(`missing_file:${name}`);

function readJson(name) {
  try { return JSON.parse(fs.readFileSync(path.join(pilotDir, name), 'utf8')); }
  catch (e) { errors.push(`invalid_json:${name}:${e.message}`); return {}; }
}
function csvHeader(name) {
  try { return fs.readFileSync(path.join(pilotDir, name), 'utf8').split(/\r?\n/)[0].split(',').map(s => s.trim()); }
  catch { return []; }
}
function walk(value, fn, keyPath = '') {
  if (Array.isArray(value)) return value.forEach((v,i) => walk(v, fn, `${keyPath}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).forEach(([k,v]) => walk(v, fn, keyPath ? `${keyPath}.${k}` : k));
  fn(value, keyPath);
}
function directIdentifierFindings(value) {
  const findings = [];
  const directKeys = /(?:^|\.)(tenant_name|owner_name|resident_name|contact_name|first_name|last_name|email|e_mail|phone|telephone|mobile|iban|birthdate|date_of_birth)$/i;
  const patterns = [
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, 'email'],
    [/\bDE\d{20}\b/i, 'german_iban'],
    [/(?:\+49|0049|0)[\s()/-]*\d(?:[\s()/-]*\d){7,}/, 'phone_like']
  ];
  walk(value, (v, key) => {
    if (directKeys.test(key) && v != null && String(v).trim() !== '') findings.push(`${key}:direct_identifier_field`);
    if (typeof v !== 'string') return;
    for (const [rx,label] of patterns) if (rx.test(v)) findings.push(`${key}:${label}`);
    if (/\b(Herr|Frau)\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]{2,}\b/.test(v)) warnings.push(`possible_name_in_free_text:${key}`);
  });
  return [...new Set(findings)];
}

if (!errors.some(e => e.startsWith('missing_file:'))) {
  const client = readJson('client.json');
  const approval = readJson('pilot-approval.json');
  const input = readJson('cases.json');
  const templatesDoc = JSON.parse(fs.readFileSync(path.join(packRoot, 'templates.json'), 'utf8'));
  const template = templatesDoc.templates.find(t => t.id === client.pilot?.template);

  if (!client.company?.id || !client.company?.name) errors.push('client_company_missing');
  if (!template) errors.push(`unknown_template:${client.pilot?.template || 'missing'}`);
  if ((client.pilot?.mode || 'shadow') !== 'shadow') errors.push('pilot_mode_must_be_shadow');
  if (client.sources?.message?.type && !['manual_upload','file'].includes(client.sources.message.type)) errors.push('v1_requires_file_or_manual_message_source');

  const gates = ['scope_confirmed','data_authorised','shadow_only_confirmed','operator_named','retention_confirmed'];
  for (const gate of gates) if (approval[gate] !== true) errors.push(`approval_gate_false:${gate}`);
  const modes = ['synthetic','anonymised','pseudonymised_personal_data','authorised_personal_data'];
  if (!modes.includes(approval.data_mode)) errors.push('invalid_data_mode');

  if (approval.data_mode === 'anonymised') {
    if (approval.anonymisation_confirmed !== true) errors.push('anonymised_data_requires_anonymisation_confirmation');
    for (const finding of directIdentifierFindings(input)) errors.push(`anonymised_mode_direct_identifier:${finding}`);
  }

  if (['pseudonymised_personal_data','authorised_personal_data'].includes(approval.data_mode)) {
    const privacyGates = [
      'privacy_review_confirmed',
      'processor_terms_reviewed',
      'legal_basis_confirmed',
      'subprocessor_review_confirmed',
      'data_residency_decision_recorded'
    ];
    for (const gate of privacyGates) if (approval[gate] !== true) errors.push(`personal_data_requires_gate:${gate}`);
    if (approval.special_category_data_present === true && approval.special_category_review_confirmed !== true) errors.push('special_category_data_requires_specific_review');
  }

  const retentionDays = Number(client.privacy?.retention_days);
  if (!Number.isFinite(retentionDays) || retentionDays < 1) errors.push('invalid_retention_days');
  else if (retentionDays > 14) warnings.push(`pilot_retention_above_recommended_14_days:${retentionDays}`);

  const cases = Array.isArray(input) ? input : input.cases;
  if (!Array.isArray(cases)) errors.push('cases_not_array');
  else {
    if (cases.length < 20) errors.push(`too_few_cases:${cases.length}:minimum_20`);
    if (cases.length > 50) warnings.push(`large_pilot:${cases.length}:recommended_max_50`);
    const ids = new Set();
    for (const c of cases) {
      if (!c.id) errors.push('case_missing_id');
      else if (ids.has(c.id)) errors.push(`duplicate_case_id:${c.id}`);
      else ids.add(c.id);
      if (c.template !== client.pilot?.template) errors.push(`case_template_mismatch:${c.id || 'unknown'}`);
      if (Buffer.byteLength(JSON.stringify(c), 'utf8') > 100_000) warnings.push(`large_case_payload:${c.id || 'unknown'}`);
    }
  }

  const headers = csvHeader('properties.csv');
  for (const h of ['property_id','address','unit']) if (!headers.includes(h)) errors.push(`properties_csv_missing_header:${h}`);

  const secretPatterns = [
    [/sk-[A-Za-z0-9_-]{12,}/, 'openai_key_like_secret'],
    [/-----BEGIN (RSA |EC |OPENSSH |)?PRIVATE KEY-----/, 'private_key'],
    [/"password"\s*:\s*"[^"]+"/i, 'embedded_password']
  ];
  for (const [name, obj] of [['client.json',client],['pilot-approval.json',approval],['cases.json',input]]) {
    walk(obj, (value, key) => {
      if (typeof value !== 'string') return;
      for (const [rx,label] of secretPatterns) if (rx.test(value)) errors.push(`secret_detected:${name}:${key}:${label}`);
    });
  }
}

const result = { ok: errors.length === 0, pilot_dir: pilotDir, errors, warnings };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
