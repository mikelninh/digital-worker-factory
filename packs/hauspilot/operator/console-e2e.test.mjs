import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const port = 4391;
const base = `http://127.0.0.1:${port}`;

async function post(route, body) {
  const r = await fetch(base + route, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  let json = {};
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(base + '/api/pilots');
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Operations Console did not start');
}

function makeCasesCsv(count = 20) {
  const rows = ['case_id,message'];
  for (let i = 1; i <= count; i++) rows.push(`${i},"Heizung in Objekt P-1 ist komplett kalt"`);
  return rows.join('\n') + '\n';
}

function mockBatch(count = 20) {
  return {
    summary: { synthetic_input: true, generated_at: new Date().toISOString(), cases: count, completed: count, errored: 0, gold_checks_passed: count, gold_checks_total: count, gold_accuracy_percent: 100, unsafe_executions: 0, ready_for_human_review: count },
    rows: Array.from({ length: count }, (_, i) => ({ case_id: String(i + 1), template: 'repair_intake', ok: true, gold: { passed: 1, total: 1, ok: true }, result: { case_id: String(i + 1), classification: 'heating_failure', property_id: 'P-1', urgency: 'high', summary: 'Heizung ausgefallen', evidence: ['source_message'], missing_information: [], proposed_action: { type: 'internal_review', description: 'Fall prüfen', consequential: false, external: false }, approval_state: 'shadow_only', confidence: 0.95, flags: [], policy: { execution_allowed: false, human_review_required: true, violations: [] } } }))
  };
}

test('non-technical assistant Proof Week path closes without founder intervention or fake second invoice', async () => {
  const child = spawn(process.execPath, ['packs/hauspilot/operator/ops-console.mjs'], { cwd: root, env: { ...process.env, HAUSPILOT_OPS_PORT: String(port), OPENAI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const id = `assistant-e2e-${Date.now()}`;
  const deployment = path.join(root, 'deployments', id);

  try {
    await waitForServer();
    const unpaid = await post('/api/create', { id: id + '-unpaid', company: 'Unpaid Demo GmbH', template: 'repair_intake', data_mode: 'anonymised', reviewer_name: 'Reviewer', operator_name: 'Ops', deposit_paid: false });
    assert.equal(unpaid.status, 400);
    assert.match(unpaid.json.error, /990/);

    const created = await post('/api/create', { id, company: 'Assistant E2E Demo GmbH', template: 'repair_intake', data_mode: 'anonymised', reviewer_name: 'Reviewer', reviewer_email: 'reviewer@example.invalid', operator_name: 'Ops', deposit_paid: true });
    assert.equal(created.status, 200);
    assert.equal(created.json.pilot.state.deposit_paid, true);
    assert.equal(created.json.pilot.state.deposit_eur, 990);
    assert.equal(created.json.pilot.state.monthly_standard_eur, 1500);
    assert.equal(created.json.pilot.state.month_one_credit_eur, 990);

    const intake = await post('/api/intake', { id, cases_name: 'cases.csv', cases_text: makeCasesCsv(20), properties_text: 'property_id,address,unit,aliases\nP-1,"Weserstraße 18, Berlin",WE 3,"Weserstr. 18|Weser 18"\n', data_mode: 'anonymised', data_authorised: true, anonymisation_confirmed: true });
    assert.equal(intake.status, 200);
    assert.equal(intake.json.pilot.preflight.ok, true);
    assert.equal(intake.json.pilot.preflight.next.action, 'STARTEN');

    fs.writeFileSync(path.join(deployment, 'batch-results.local.json'), JSON.stringify(mockBatch(20), null, 2));
    const reviews = Array.from({ length: 20 }, (_, i) => ({ case_id: String(i + 1), decision: 'ACCEPT', error_class: null, note: '' }));
    const finalized = await post('/api/finalize', { id, review_text: JSON.stringify({ reviews }), cases_per_month: 220, minutes_before: 14, minutes_after: 6, internal_hourly_cost_eur: 35, measurement_source_confirmed: true });
    assert.equal(finalized.status, 200);
    assert.equal(finalized.json.result.ok, true);

    const close = await post('/api/closeout', { id, report_delivered: true, final_invoice_sent: false, final_payment_paid: false, transfer_copies_deleted: true, delete_pilot_data: true, continue_monthly: false, customer_continuation_accepted: false, monthly_fee_eur: 1500 });
    assert.equal(close.status, 200);
    assert.equal(close.json.pilot.state.status, 'CLOSED');
    assert.ok(close.json.pilot.state.data_deleted_at);
    assert.equal(close.json.pilot.state.transfer_copies_deleted, true);
    assert.equal(fs.existsSync(path.join(deployment, 'cases.json')), false);
    assert.equal(fs.existsSync(path.join(deployment, 'properties.csv')), false);
    assert.equal(fs.existsSync(path.join(deployment, 'batch-results.local.json')), false);
    assert.equal(fs.existsSync(path.join(deployment, 'pilot-report.local.html')), false);
    assert.equal(fs.existsSync(path.join(deployment, 'pilot-report.local.summary.json')), true);
    assert.equal(fs.existsSync(path.join(deployment, 'deletion-proof.local.json')), true);
    const proof = JSON.parse(fs.readFileSync(path.join(deployment, 'deletion-proof.local.json'), 'utf8'));
    assert.match(proof.note, /not a forensic secure-wipe claim/);
    assert.equal(proof.reason,'closeout');
    assert.ok(proof.deleted_files.some(x => x.file === 'cases.json' && /^[a-f0-9]{64}$/.test(x.sha256)));
  } finally {
    child.kill();
    fs.rmSync(deployment, { recursive: true, force: true });
    fs.rmSync(path.join(root, 'deployments', id + '-unpaid'), { recursive: true, force: true });
  }
});

test('delegated console blocks personal-data mode before processing', async () => {
  const child = spawn(process.execPath, ['packs/hauspilot/operator/ops-console.mjs'], { cwd: root, env: { ...process.env, HAUSPILOT_OPS_PORT: String(port + 1), OPENAI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const localBase = `http://127.0.0.1:${port + 1}`;
  const id = `assistant-privacy-${Date.now()}`;
  const deployment = path.join(root, 'deployments', id);
  const localPost = async (route, body) => { const r = await fetch(localBase + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(localBase + '/api/pilots')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); if (i === 59) throw new Error('Privacy test console did not start'); }
    const created = await localPost('/api/create', { id, company: 'Privacy Exception GmbH', template: 'repair_intake', data_mode: 'pseudonymised_personal_data', reviewer_name: 'Reviewer', operator_name: 'Ops', deposit_paid: true });
    assert.equal(created.status, 200);
    const intake = await localPost('/api/intake', { id, cases_name: 'cases.csv', cases_text: makeCasesCsv(20), properties_text: 'property_id,address,unit\nP-1,Weserstraße 18,WE 3\n', data_mode: 'pseudonymised_personal_data', data_authorised: true, anonymisation_confirmed: false });
    assert.equal(intake.status, 400);
    assert.match(intake.json.error, /Datenschutz-Ausnahme/);
    const status = await fetch(localBase + '/api/pilot?id=' + id).then(r => r.json());
    assert.equal(status.pilot.state.status, 'STOPP_PRIVACY');
  } finally {
    child.kill();
    fs.rmSync(deployment, { recursive: true, force: true });
  }
});
