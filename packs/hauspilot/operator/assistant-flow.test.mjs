import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCsv, propertiesFromCsv, casesFromCsv, normaliseCasesInput } from './intake.mjs';
import { buildReviewHtml } from './review-package.mjs';
import { finalizePilot } from './finalize.mjs';

const propertiesCsv='property_id,address,unit,aliases\nP-1,"Weserstraße 18, Berlin",WE 3,"Weserstr. 18|Weser 18"\n';

test('CSV intake handles quoted commas and creates property context',()=>{
  const rows=parseCsv(propertiesCsv);assert.equal(rows[0].address,'Weserstraße 18, Berlin');
  const props=propertiesFromCsv(propertiesCsv);assert.equal(props[0].property_id,'P-1');assert.equal(props[0].aliases.length,2);
  const cases=casesFromCsv('repair_intake','case_id,message\nc-1,"Heizung komplett kalt"\n',props);
  assert.equal(cases[0].template,'repair_intake');assert.equal(cases[0].message,'Heizung komplett kalt');assert.equal(cases[0].context.properties[0].property_id,'P-1');
});

test('JSON intake fills template, id and property context without touching source text',()=>{
  const props=propertiesFromCsv(propertiesCsv);
  const out=normaliseCasesInput({template:'tenant_inbox',fileName:'cases.json',text:JSON.stringify({cases:[{case_id:'mail-1',message:'Nebenkostenfrage'}]}),properties:props});
  assert.equal(out.cases[0].id,'mail-1');assert.equal(out.cases[0].template,'tenant_inbox');assert.equal(out.cases[0].context.properties[0].property_id,'P-1');
});

test('review package exposes only simple human decisions and is self-contained',()=>{
  const html=buildReviewHtml({rows:[{case_id:'c1',template:'repair_intake',ok:true,result:{classification:'heating_failure',property_id:'P-1',summary:'Heizung kalt',proposed_action:{description:'Rückfrage vorbereiten'},confidence:.9,policy:{execution_allowed:false}}}]},{company:'Demo',pilot_id:'demo'});
  assert.match(html,/✓ Richtig/);assert.match(html,/✎ Ändern/);assert.match(html,/✕ Falsch/);assert.match(html,/Es werden keine Aktionen ausgeführt/);assert.doesNotMatch(html,/>A · ACCEPT</);assert.doesNotMatch(html,/https?:\/\//);
});

test('finalizer requires complete review and creates customer report',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hauspilot-finalize-'));
  fs.writeFileSync(path.join(dir,'batch-results.local.json'),JSON.stringify({summary:{cases:2,completed:2,errored:0,gold_accuracy_percent:100,unsafe_executions:0},rows:[{case_id:'a',ok:true},{case_id:'b',ok:true}]},null,2));
  fs.writeFileSync(path.join(dir,'measurement.json'),JSON.stringify({cases_per_month:null,minutes_before:null,minutes_after:null,internal_hourly_cost_eur:null,reviewed_cases:0,accepted_without_edit:0,accepted_after_edit:0,rejected:0},null,2));
  assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[{case_id:'a',decision:'ACCEPT'}]}}),/Review unvollständig/);
  const result=finalizePilot({pilotDir:dir,reviewDoc:{reviews:[{case_id:'a',decision:'ACCEPT'},{case_id:'b',decision:'EDIT',error_class:'bad_draft'}]},measurementInput:{cases_per_month:100,minutes_before:10,minutes_after:5,internal_hourly_cost_eur:35}});
  assert.equal(result.ok,true);assert.ok(fs.existsSync(result.reportPath));assert.equal(result.summary.measurement.reviewed_cases,2);
});

test('operations console contract contains complete no-founder standard path',()=>{
  const source=fs.readFileSync(new URL('./ops-console.mjs',import.meta.url),'utf8');
  for(const route of ['/api/create','/api/intake','/api/run','/api/finalize','/api/closeout'])assert.match(source,new RegExp(route.replaceAll('/','\\/')));
  for(const label of ['Zahlungseingang 1.330 €','Drei Dinge vom Kunden','Starten →','Review-Datei herunterladen','570 € Restzahlung','Kundenreport sicher gesendet','Pilotdaten jetzt gemäß Retention löschen'])assert.ok(source.includes(label),label);
  assert.ok(source.includes('Sonderpreis/Sonderscope'));
  assert.ok(source.includes('OPENAI_API_KEY'));
});

test('delegated standard path refuses personal-data exceptions',()=>{
  const source=fs.readFileSync(new URL('./ops-console.mjs',import.meta.url),'utf8');
  assert.match(source,/pseudonymised_personal_data/);
  assert.match(source,/authorised_personal_data/);
  assert.match(source,/STOPP · Datenschutz-Ausnahme/);
  assert.match(source,/Privacy\/Owner entscheidet zuerst/);
});

test('closeout performs application-level deletion and records proof without secure-wipe overclaim',()=>{
  const source=fs.readFileSync(new URL('./ops-console.mjs',import.meta.url),'utf8');
  assert.match(source,/function purgePilotData/);
  assert.match(source,/deletion-proof\.local\.json/);
  assert.match(source,/sha256/);
  assert.match(source,/fs\.rmSync/);
  assert.match(source,/not a forensic secure-wipe claim/);
  assert.match(source,/report_delivered===true/);
  assert.match(source,/final_payment_paid===true/);
  assert.match(source,/delete_pilot_data===true/);
});
