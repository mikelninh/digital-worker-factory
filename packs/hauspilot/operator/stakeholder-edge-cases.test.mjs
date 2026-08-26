import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv, detectCsvDelimiter, propertiesFromCsv, validateProperties, normaliseCasesInput, casesFromCsv } from './intake.mjs';
import { finalizePilot } from './finalize.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');

function batch(ids=['a','b']){
  return {summary:{cases:ids.length,completed:ids.length,errored:0,gold_accuracy_percent:100,unsafe_executions:0},rows:ids.map(id=>({case_id:id,template:'repair_intake',ok:true,result:{classification:'heating_failure',policy:{execution_allowed:false}}}))};
}
function makeFinalizeDir(ids=['a','b']){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hauspilot-edge-finalize-'));
  fs.writeFileSync(path.join(dir,'batch-results.local.json'),JSON.stringify(batch(ids),null,2));
  fs.writeFileSync(path.join(dir,'measurement.json'),JSON.stringify({reviewed_cases:0,accepted_without_edit:0,accepted_after_edit:0,rejected:0},null,2));
  return dir;
}
const accept=id=>({case_id:id,decision:'ACCEPT',error_class:null,note:''});

// Intake / German office-file reality

test('CSV delimiter detection supports German Excel semicolon export',()=>{
  assert.equal(detectCsvDelimiter('case_id;message\n1;Hallo\n'),';');
  const rows=parseCsv('case_id;message\n1;"Heizung kalt, seit heute"\n');
  assert.equal(rows[0].case_id,'1');
  assert.equal(rows[0].message,'Heizung kalt, seit heute');
});

test('CSV parser strips UTF-8 BOM from Excel headers',()=>{
  const rows=parseCsv('\uFEFFproperty_id;address;unit\nP-1;Weserstr. 18;WE 3\n');
  assert.equal(rows[0].property_id,'P-1');
});

test('CSV parser handles escaped quotes',()=>{
  const rows=parseCsv('case_id,message\n1,"Fenster sagt ""knack"""\n');
  assert.equal(rows[0].message,'Fenster sagt "knack"');
});

test('CSV parser refuses unclosed quotes',()=>{
  assert.throws(()=>parseCsv('case_id,message\n1,"kaputt\n'),/nicht geschlossene/);
});

test('CSV parser refuses duplicate headers',()=>{
  assert.throws(()=>parseCsv('case_id,case_id\n1,2\n'),/doppelte Spalten/);
});

test('unsupported XLSX is rejected with a human instruction',()=>{
  assert.throws(()=>normaliseCasesInput({template:'repair_intake',fileName:'cases.xlsx',text:'x',properties:[]}),/XLSX zuerst als CSV/);
});

test('property validation catches missing id address and unit',()=>{
  assert.throws(()=>validateProperties([{property_id:'',address:'A',unit:'1'}]),/property_id fehlt/);
  assert.throws(()=>validateProperties([{property_id:'P-1',address:'',unit:'1'}]),/address fehlt/);
  assert.throws(()=>validateProperties([{property_id:'P-1',address:'A',unit:''}]),/unit fehlt/);
});

test('property validation catches duplicate ids',()=>{
  assert.throws(()=>validateProperties([{property_id:'P-1',address:'A',unit:'1'},{property_id:'P-1',address:'B',unit:'2'}]),/doppelt/);
});

test('invoice CSV accepts German decimal comma when semicolon-delimited',()=>{
  const cases=casesFromCsv('invoice_review','case_id;invoice_number;amount_eur;vendor;property_reference\n1;INV-1;950,50;Sanitär GmbH;P-1\n',[]);
  assert.equal(cases[0].invoice.amount_eur,950.5);
});

test('empty invoice row is refused instead of becoming a meaningless case',()=>{
  assert.throws(()=>casesFromCsv('invoice_review','case_id;invoice_number;amount_eur;vendor;property_reference\n1;;;;\n',[]),/Rechnungsdaten fehlen/);
});

// Reviewer integrity / proof truth

test('finalizer refuses incomplete review',()=>{
  const dir=makeFinalizeDir();
  try{assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[accept('a')]}}),/Review unvollständig/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('finalizer refuses unknown case ids even when count matches',()=>{
  const dir=makeFinalizeDir();
  try{assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[accept('a'),accept('x')]}}),/unbekannten Fall x/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('finalizer refuses duplicate review ids',()=>{
  const dir=makeFinalizeDir();
  try{assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[accept('a'),accept('a')]}}),/doppelt/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('finalizer refuses invalid reviewer decisions',()=>{
  const dir=makeFinalizeDir(['a']);
  try{assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[{case_id:'a',decision:'MAYBE'}]}}),/ungültige Entscheidung/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('EDIT and REJECT require a valid reason',()=>{
  for(const decision of ['EDIT','REJECT']){
    const dir=makeFinalizeDir(['a']);
    try{assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[{case_id:'a',decision,error_class:null}]}}),/gültiger Fehlergrund/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
  }
});

test('ACCEPT cannot secretly carry an error class',()=>{
  const dir=makeFinalizeDir(['a']);
  try{assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[{case_id:'a',decision:'ACCEPT',error_class:'bad_draft'}]}}),/darf keinen Fehlergrund/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('negative or impossible measurement inputs are refused',()=>{
  const inputs=[
    {cases_per_month:-1},
    {minutes_before:0},
    {minutes_after:-0.1},
    {internal_hourly_cost_eur:-5}
  ];
  for(const measurementInput of inputs){
    const dir=makeFinalizeDir(['a']);
    try{assert.throws(()=>finalizePilot({pilotDir:dir,reviewDoc:{reviews:[accept('a')]},measurementInput}));}finally{fs.rmSync(dir,{recursive:true,force:true});}
  }
});

test('valid reviewed pilot still produces a report',()=>{
  const dir=makeFinalizeDir(['a','b']);
  try{
    const out=finalizePilot({pilotDir:dir,reviewDoc:{reviews:[accept('a'),{case_id:'b',decision:'EDIT',error_class:'bad_draft'}]},measurementInput:{cases_per_month:100,minutes_before:10,minutes_after:5,internal_hourly_cost_eur:35}});
    assert.equal(out.ok,true);
    assert.ok(fs.existsSync(out.reportPath));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

// Preflight routing / standard scope
function makePreflightPilot({count=20,reviewer=true,operator=true,dataMode='synthetic',message='Heizung kalt.',properties='property_id,address,unit\nP-1,Weserstr. 18,WE 3\n'}={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hauspilot-edge-preflight-'));
  const client={company:{id:'edge',name:'Edge GmbH'},pilot:{template:'repair_intake',mode:'shadow'},sources:{message:{type:'manual_upload'}},privacy:{retention_days:14}};
  const approval={data_mode:dataMode,scope_confirmed:true,data_authorised:true,shadow_only_confirmed:true,operator_named:operator,reviewer_named:reviewer,retention_confirmed:true,anonymisation_confirmed:dataMode==='anonymised'};
  const cases=Array.from({length:count},(_,i)=>({id:`c-${i+1}`,template:'repair_intake',message}));
  fs.writeFileSync(path.join(dir,'client.json'),JSON.stringify(client));fs.writeFileSync(path.join(dir,'pilot-approval.json'),JSON.stringify(approval));fs.writeFileSync(path.join(dir,'cases.json'),JSON.stringify({synthetic:dataMode==='synthetic',cases}));fs.writeFileSync(path.join(dir,'properties.csv'),properties);
  return dir;
}
function preflight(dir){const r=spawnSync(process.execPath,['packs/hauspilot/runtime/preflight.mjs',dir],{cwd:root,encoding:'utf8'});return {status:r.status,text:r.stdout+r.stderr};}

test('19 cases fail the standard minimum',()=>{const d=makePreflightPilot({count:19});try{assert.match(preflight(d).text,/too_few_cases/);}finally{fs.rmSync(d,{recursive:true,force:true});}});
test('51 cases fail the standard maximum instead of silently expanding scope',()=>{const d=makePreflightPilot({count:51});try{assert.match(preflight(d).text,/too_many_cases/);}finally{fs.rmSync(d,{recursive:true,force:true});}});
test('missing reviewer is a real gate',()=>{const d=makePreflightPilot({reviewer:false});try{assert.match(preflight(d).text,/reviewer_named/);}finally{fs.rmSync(d,{recursive:true,force:true});}});
test('missing operator is a real gate',()=>{const d=makePreflightPilot({operator:false});try{assert.match(preflight(d).text,/operator_named/);}finally{fs.rmSync(d,{recursive:true,force:true});}});
test('semicolon master data passes preflight',()=>{const d=makePreflightPilot({properties:'property_id;address;unit\nP-1;Weserstr. 18;WE 3\n'});try{assert.equal(preflight(d).status,0,preflight(d).text);}finally{fs.rmSync(d,{recursive:true,force:true});}});
test('duplicate property ids fail preflight',()=>{const d=makePreflightPilot({properties:'property_id,address,unit\nP-1,A,1\nP-1,B,2\n'});try{assert.match(preflight(d).text,/duplicate_property_id/);}finally{fs.rmSync(d,{recursive:true,force:true});}});
test('anonymised salutation/name pattern fails closed',()=>{const d=makePreflightPilot({dataMode:'anonymised',message:'Frau Müller meldet: Heizung kalt.'});try{assert.match(preflight(d).text,/salutation_name_like/);}finally{fs.rmSync(d,{recursive:true,force:true});}});

// Real HTTP operator-flow exceptions
async function withServer(port,fn){
  const child=spawn(process.execPath,['packs/hauspilot/operator/ops-console.mjs'],{cwd:root,env:{...process.env,HAUSPILOT_OPS_PORT:String(port),OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  const base=`http://127.0.0.1:${port}`;
  try{
    for(let i=0;i<80;i++){try{if((await fetch(base+'/api/pilots')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));if(i===79)throw new Error('console did not start');}
    const post=async(route,b)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return{status:r.status,json:await r.json()}};
    await fn({base,post});
  }finally{child.kill();}
}
function casesCsv(count){return 'case_id,message\n'+Array.from({length:count},(_,i)=>`${i+1},"Heizung kalt"`).join('\n')+'\n';}

 test('console catches commercial identity scope measurement continuation deletion and retention edges',async()=>{
  const port=4497;
  const ids=[];
  await withServer(port,async({base,post})=>{
    const stem=`edge-${Date.now()}`;
    const missingReviewer=await post('/api/create',{id:stem+'-r',company:'No Reviewer GmbH',reviewer_name:'',operator_name:'Ops',deposit_paid:true});
    assert.equal(missingReviewer.status,400);assert.match(missingReviewer.json.error,/prüfende Person/);
    const missingOperator=await post('/api/create',{id:stem+'-o',company:'No Ops GmbH',reviewer_name:'Reviewer',operator_name:'',deposit_paid:true});
    assert.equal(missingOperator.status,400);assert.match(missingOperator.json.error,/Operations Assistant/);

    const id=stem+'-main';ids.push(id);
    const created=await post('/api/create',{id,company:'Edge Main GmbH',template:'repair_intake',data_mode:'anonymised',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true});assert.equal(created.status,200);
    const duplicate=await post('/api/create',{id,company:'Edge Main GmbH',template:'repair_intake',data_mode:'anonymised',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true});assert.equal(duplicate.status,400);assert.match(duplicate.json.error,/existiert bereits/);

    const tooMany=await post('/api/intake',{id,cases_name:'cases.csv',cases_text:casesCsv(51),properties_text:'property_id,address,unit\nP-1,A,1\n',data_mode:'anonymised',data_authorised:true,anonymisation_confirmed:true});assert.equal(tooMany.status,400);assert.match(tooMany.json.error,/maximal 50/);

    const id2=stem+'-proof';ids.push(id2);
    assert.equal((await post('/api/create',{id:id2,company:'Proof GmbH',template:'repair_intake',data_mode:'anonymised',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true})).status,200);
    assert.equal((await post('/api/intake',{id:id2,cases_name:'cases.csv',cases_text:casesCsv(20),properties_text:'property_id,address,unit\nP-1,A,1\n',data_mode:'anonymised',data_authorised:true,anonymisation_confirmed:true})).status,200);
    const d=path.join(root,'deployments',id2);fs.writeFileSync(path.join(d,'batch-results.local.json'),JSON.stringify(batch(Array.from({length:20},(_,i)=>String(i+1))),null,2));
    const reviews=Array.from({length:20},(_,i)=>accept(String(i+1)));
    const unproven=await post('/api/finalize',{id:id2,review_text:JSON.stringify({reviews}),cases_per_month:100,minutes_before:10,minutes_after:5,internal_hourly_cost_eur:35,measurement_source_confirmed:false});assert.equal(unproven.status,400);assert.match(unproven.json.error,/Baseline\/Quelle/);
    const finalized=await post('/api/finalize',{id:id2,review_text:JSON.stringify({reviews}),cases_per_month:100,minutes_before:10,minutes_after:5,internal_hourly_cost_eur:35,measurement_source_confirmed:true});assert.equal(finalized.status,200);assert.equal(finalized.json.result.summary.verdict,'KEEP');
    const noCustomerOptin=await post('/api/closeout',{id:id2,report_delivered:true,final_invoice_sent:true,final_payment_paid:true,transfer_copies_deleted:true,delete_pilot_data:true,continue_monthly:true,customer_continuation_accepted:false,monthly_fee_eur:750});assert.equal(noCustomerOptin.status,400);assert.match(noCustomerOptin.json.error,/ausdrücklich angenommen/);
    const missingTransferDeletion=await post('/api/closeout',{id:id2,report_delivered:true,final_invoice_sent:true,final_payment_paid:true,transfer_copies_deleted:false,delete_pilot_data:true,continue_monthly:false,customer_continuation_accepted:false,monthly_fee_eur:750});assert.equal(missingTransferDeletion.status,200);assert.equal(missingTransferDeletion.json.pilot.state.status,'CLOSEOUT_OPEN');

    const id3=stem+'-retention';ids.push(id3);
    assert.equal((await post('/api/create',{id:id3,company:'Retention GmbH',template:'repair_intake',data_mode:'anonymised',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true})).status,200);
    assert.equal((await post('/api/intake',{id:id3,cases_name:'cases.csv',cases_text:casesCsv(20),properties_text:'property_id,address,unit\nP-1,A,1\n',data_mode:'anonymised',data_authorised:true,anonymisation_confirmed:true})).status,200);
    const statePath=path.join(root,'deployments',id3,'ops-state.local.json');const state=JSON.parse(fs.readFileSync(statePath,'utf8'));state.data_received_at=new Date(Date.now()-15*86400000).toISOString();fs.writeFileSync(statePath,JSON.stringify(state,null,2));
    const expired=await fetch(base+'/api/pilot?id='+id3).then(r=>r.json());assert.equal(expired.pilot.state.status,'STOPP_RETENTION');assert.ok(expired.pilot.state.data_deleted_at);assert.equal(fs.existsSync(path.join(root,'deployments',id3,'cases.json')),false);assert.equal(fs.existsSync(path.join(root,'deployments',id3,'deletion-proof.local.json')),true);
  });
  for(const id of ids)fs.rmSync(path.join(root,'deployments',id),{recursive:true,force:true});
});
