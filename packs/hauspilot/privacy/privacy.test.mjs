import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();

function makePilot({dataMode='synthetic', approvalExtra={}, message='Weserstraße 18, WE 1: Die Heizung ist kalt.'}={}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'hauspilot-privacy-'));
  const client = {
    company:{id:'privacy-test',name:'Privacy Test GmbH'},
    pilot:{template:'repair_intake',mode:'shadow'},
    sources:{message:{type:'manual_upload'},properties:{type:'csv',file:'properties.csv'}},
    privacy:{retention_days:14}
  };
  const approval = {
    data_mode:dataMode,
    scope_confirmed:true,
    data_authorised:true,
    shadow_only_confirmed:true,
    operator_named:true,
    reviewer_named:true,
    retention_confirmed:true,
    anonymisation_confirmed:false,
    privacy_review_confirmed:false,
    processor_terms_reviewed:false,
    legal_basis_confirmed:false,
    subprocessor_review_confirmed:false,
    data_residency_decision_recorded:false,
    special_category_data_present:false,
    special_category_review_confirmed:false,
    ...approvalExtra
  };
  const cases = Array.from({length:20},(_,i)=>({id:`c-${i+1}`,template:'repair_intake',message,context:{properties:[{property_id:'P-1',address:'Weserstraße 18 Berlin',unit:'WE 1'}]}}));
  fs.writeFileSync(path.join(dir,'client.json'),JSON.stringify(client,null,2));
  fs.writeFileSync(path.join(dir,'pilot-approval.json'),JSON.stringify(approval,null,2));
  fs.writeFileSync(path.join(dir,'cases.json'),JSON.stringify({synthetic:dataMode==='synthetic',cases},null,2));
  fs.writeFileSync(path.join(dir,'properties.csv'),'property_id,address,unit\nP-1,Weserstraße 18 Berlin,WE 1\n');
  return dir;
}
function preflight(dir){return spawnSync(process.execPath,['packs/hauspilot/runtime/preflight.mjs',dir],{cwd:repo,encoding:'utf8'});}
function manifest(dir){return spawnSync(process.execPath,['packs/hauspilot/privacy/manifest.mjs',dir],{cwd:repo,encoding:'utf8'});}

test('synthetic pilot passes without personal-data gates',()=>{
  const dir=makePilot();
  const r=preflight(dir);
  assert.equal(r.status,0,r.stdout+r.stderr);
});

test('anonymised mode blocks obvious direct identifier and requires confirmation',()=>{
  const dir=makePilot({dataMode:'anonymised',approvalExtra:{anonymisation_confirmed:true},message:'Kontakt: maria@example.com. Weserstraße 18, WE 1: Heizung kalt.'});
  const r=preflight(dir);
  assert.notEqual(r.status,0);
  assert.match(r.stdout,/anonymised_mode_direct_identifier/);
});

test('anonymised mode blocks salutation plus likely personal name',()=>{
  const dir=makePilot({dataMode:'anonymised',approvalExtra:{anonymisation_confirmed:true},message:'Frau Müller meldet: Heizung kalt.'});
  const r=preflight(dir);
  assert.notEqual(r.status,0);
  assert.match(r.stdout,/salutation_name_like/);
});

test('personal/pseudonymised data fail closed until all extra gates are documented',()=>{
  const dir=makePilot({dataMode:'pseudonymised_personal_data'});
  const r=preflight(dir);
  assert.notEqual(r.status,0);
  for(const gate of ['privacy_review_confirmed','processor_terms_reviewed','legal_basis_confirmed','subprocessor_review_confirmed','data_residency_decision_recorded']) assert.match(r.stdout,new RegExp(gate));
});

test('personal data can pass only after explicit extra gates',()=>{
  const dir=makePilot({dataMode:'authorised_personal_data',approvalExtra:{privacy_review_confirmed:true,processor_terms_reviewed:true,legal_basis_confirmed:true,subprocessor_review_confirmed:true,data_residency_decision_recorded:true}});
  const r=preflight(dir);
  assert.equal(r.status,0,r.stdout+r.stderr);
});

test('privacy manifest contains hashes and controls but no case contents',()=>{
  const secretSentence='UNIQUE-RAW-CASE-CONTENT-DO-NOT-COPY';
  const dir=makePilot({message:secretSentence});
  assert.equal(preflight(dir).status,0);
  const r=manifest(dir);
  assert.equal(r.status,0,r.stdout+r.stderr);
  const text=fs.readFileSync(path.join(dir,'privacy-manifest.json'),'utf8');
  const m=JSON.parse(text);
  assert.equal(m.controls.openai_store,false);
  assert.equal(m.controls.model_execution_tools,0);
  assert.equal(m.controls.external_execution_allowed,false);
  assert.ok(m.input_hashes['cases.json'].sha256.length===64);
  assert.equal(text.includes(secretSentence),false);
});
