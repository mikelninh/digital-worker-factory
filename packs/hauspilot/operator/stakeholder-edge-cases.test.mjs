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
const accept=id=>({case_id:id,decision:'ACCEPT',error_class:null,note:''});
const ids=n=>Array.from({length:n},(_,i)=>String(i+1));
const casesCsv=n=>'case_id,message\n'+ids(n).map(id=>`${id},"Heizung kalt"`).join('\n')+'\n';
const batch=(caseIds=['a','b'])=>({summary:{cases:caseIds.length,completed:caseIds.length,errored:0,gold_accuracy_percent:100,unsafe_executions:0},rows:caseIds.map(case_id=>({case_id,template:'repair_intake',ok:true,result:{classification:'heating_failure',policy:{execution_allowed:false}}}))});

function finalizeDir(caseIds=['a','b']){
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'hp-finalize-'));
  fs.writeFileSync(path.join(d,'batch-results.local.json'),JSON.stringify(batch(caseIds)));
  fs.writeFileSync(path.join(d,'measurement.json'),JSON.stringify({reviewed_cases:0,accepted_without_edit:0,accepted_after_edit:0,rejected:0}));
  return d;
}
function preflightDir({count=20,reviewer=true,operator=true,dataMode='anonymised',message='Heizung kalt.',properties='property_id,address,unit\nP-1,Weserstr. 18,WE 3\n'}={}){
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'hp-preflight-'));
  fs.writeFileSync(path.join(d,'client.json'),JSON.stringify({company:{id:'edge',name:'Edge GmbH'},pilot:{template:'repair_intake',mode:'shadow'},sources:{message:{type:'manual_upload'}},privacy:{retention_days:14}}));
  fs.writeFileSync(path.join(d,'pilot-approval.json'),JSON.stringify({data_mode:dataMode,scope_confirmed:true,data_authorised:true,shadow_only_confirmed:true,operator_named:operator,reviewer_named:reviewer,retention_confirmed:true,anonymisation_confirmed:dataMode==='anonymised'}));
  fs.writeFileSync(path.join(d,'cases.json'),JSON.stringify({synthetic:dataMode==='synthetic',cases:Array.from({length:count},(_,i)=>({id:`c-${i+1}`,template:'repair_intake',message}))}));
  fs.writeFileSync(path.join(d,'properties.csv'),properties);
  return d;
}
function preflight(d){const r=spawnSync(process.execPath,['packs/hauspilot/runtime/preflight.mjs',d],{cwd:root,encoding:'utf8'});return{status:r.status,text:r.stdout+r.stderr};}

// Real-world file intake
for(const [name,fn] of [
  ['German Excel semicolon CSV',()=>{assert.equal(detectCsvDelimiter('a;b\n1;2'),';');assert.equal(parseCsv('case_id;message\n1;"kalt, heute"')[0].message,'kalt, heute')}],
  ['UTF-8 BOM',()=>assert.equal(parseCsv('\uFEFFproperty_id;address;unit\nP-1;A;1')[0].property_id,'P-1')],
  ['escaped quotes',()=>assert.equal(parseCsv('case_id,message\n1,"Fenster ""knackt"""')[0].message,'Fenster "knackt"')],
  ['unclosed quotes rejected',()=>assert.throws(()=>parseCsv('a,b\n1,"x'),/nicht geschlossene/)],
  ['duplicate headers rejected',()=>assert.throws(()=>parseCsv('a,a\n1,2'),/doppelte/)],
  ['XLSX instruction',()=>assert.throws(()=>normaliseCasesInput({template:'repair_intake',fileName:'x.xlsx',text:'x',properties:[]}),/XLSX zuerst als CSV/)],
  ['German decimal comma invoice',()=>assert.equal(casesFromCsv('invoice_review','case_id;invoice_number;amount_eur;vendor;property_reference\n1;R1;950,50;Firma;P-1',[])[0].invoice.amount_eur,950.5)],
  ['empty invoice rejected',()=>assert.throws(()=>casesFromCsv('invoice_review','case_id;invoice_number;amount_eur;vendor;property_reference\n1;;;;',[]),/Rechnungsdaten fehlen/)]
]) test(`intake: ${name}`,fn);

test('master data requires unique id, address and unit',()=>{
  assert.throws(()=>validateProperties([{property_id:'',address:'A',unit:'1'}]),/property_id/);
  assert.throws(()=>validateProperties([{property_id:'P',address:'',unit:'1'}]),/address/);
  assert.throws(()=>validateProperties([{property_id:'P',address:'A',unit:''}]),/unit/);
  assert.throws(()=>validateProperties([{property_id:'P',address:'A',unit:'1'},{property_id:'P',address:'B',unit:'2'}]),/doppelt/);
});

// Reviewer integrity
for(const [name,reviews,rx] of [
  ['incomplete',[accept('a')],/unvollständig/],
  ['unknown id',[accept('a'),accept('x')],/unbekannten Fall x/],
  ['duplicate id',[accept('a'),accept('a')],/doppelt/],
  ['invalid decision',[{case_id:'a',decision:'MAYBE'},accept('b')],/ungültige Entscheidung/],
  ['EDIT without reason',[{case_id:'a',decision:'EDIT',error_class:null},accept('b')],/gültiger Fehlergrund/],
  ['REJECT without reason',[{case_id:'a',decision:'REJECT',error_class:null},accept('b')],/gültiger Fehlergrund/],
  ['ACCEPT with error',[{case_id:'a',decision:'ACCEPT',error_class:'bad_draft'},accept('b')],/darf keinen Fehlergrund/]
]) test(`review: ${name} fails closed`,()=>{const d=finalizeDir();try{assert.throws(()=>finalizePilot({pilotDir:d,reviewDoc:{reviews}}),rx)}finally{fs.rmSync(d,{recursive:true,force:true})}});

test('measurement rejects impossible values and valid evidence still produces report',()=>{
  for(const measurementInput of [{cases_per_month:-1},{minutes_before:0},{minutes_after:-1},{internal_hourly_cost_eur:-1}]){const d=finalizeDir(['a']);try{assert.throws(()=>finalizePilot({pilotDir:d,reviewDoc:{reviews:[accept('a')]},measurementInput}))}finally{fs.rmSync(d,{recursive:true,force:true})}}
  const d=finalizeDir();try{const r=finalizePilot({pilotDir:d,reviewDoc:{reviews:[accept('a'),{case_id:'b',decision:'EDIT',error_class:'bad_draft'}]},measurementInput:{cases_per_month:100,minutes_before:10,minutes_after:5,internal_hourly_cost_eur:35}});assert.equal(r.ok,true);assert.ok(fs.existsSync(r.reportPath))}finally{fs.rmSync(d,{recursive:true,force:true})}
});

// Preflight and scope routing
for(const [name,opts,rx,status] of [
  ['19 cases',{count:19},/too_few_cases/,1],
  ['51 cases',{count:51},/too_many_cases/,1],
  ['reviewer missing',{reviewer:false},/reviewer_named/,1],
  ['operator missing',{operator:false},/operator_named/,1],
  ['duplicate property id',{properties:'property_id,address,unit\nP,A,1\nP,B,2\n'},/duplicate_property_id/,1],
  ['name-like identifier in anonymised data',{message:'Frau Müller meldet: Heizung kalt.'},/salutation_name_like/,1],
  ['semicolon master data',{properties:'property_id;address;unit\nP;A;1\n'},null,0]
]) test(`preflight: ${name}`,()=>{const d=preflightDir(opts);try{const r=preflight(d);assert.equal(r.status,status,r.text);if(rx)assert.match(r.text,rx)}finally{fs.rmSync(d,{recursive:true,force:true})}});

test('synthetic internal benchmark may omit customer reviewer, while paid console still requires one',()=>{const d=preflightDir({dataMode:'synthetic',reviewer:false});try{assert.equal(preflight(d).status,0,preflight(d).text)}finally{fs.rmSync(d,{recursive:true,force:true})}});

async function withServer(port,fn){
  const child=spawn(process.execPath,['packs/hauspilot/operator/ops-console.mjs'],{cwd:root,env:{...process.env,HAUSPILOT_OPS_PORT:String(port),OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  const base=`http://127.0.0.1:${port}`;
  try{
    for(let i=0;i<80;i++){try{if((await fetch(base+'/api/pilots')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));if(i===79)throw new Error('console did not start')}
    const post=async(route,b)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return{status:r.status,json:await r.json()}};
    await fn({base,post});
  }finally{child.kill()}
}

test('HTTP console catches founder/assistant handoff edge cases end to end',async()=>{
  const createdIds=[];
  await withServer(4497,async({base,post})=>{
    const stem=`edge-${Date.now()}`;
    let r=await post('/api/create',{id:stem+'-r',company:'No Reviewer',reviewer_name:'',operator_name:'Ops',deposit_paid:true});assert.equal(r.status,400);assert.match(r.json.error,/prüfende Person/);
    r=await post('/api/create',{id:stem+'-o',company:'No Ops',reviewer_name:'Reviewer',operator_name:'',deposit_paid:true});assert.equal(r.status,400);assert.match(r.json.error,/Operations Assistant/);

    const id=stem+'-scope';createdIds.push(id);
    assert.equal((await post('/api/create',{id,company:'Scope GmbH',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true})).status,200);
    r=await post('/api/create',{id,company:'Scope GmbH',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true});assert.equal(r.status,400);assert.match(r.json.error,/existiert bereits/);
    r=await post('/api/intake',{id,cases_name:'cases.csv',cases_text:casesCsv(51),properties_text:'property_id,address,unit\nP,A,1\n',data_mode:'anonymised',data_authorised:true,anonymisation_confirmed:true});assert.equal(r.status,400);assert.match(r.json.error,/maximal 50/);

    const proofId=stem+'-proof';createdIds.push(proofId);
    assert.equal((await post('/api/create',{id:proofId,company:'Proof GmbH',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true})).status,200);
    assert.equal((await post('/api/intake',{id:proofId,cases_name:'cases.csv',cases_text:casesCsv(20),properties_text:'property_id,address,unit\nP,A,1\n',data_mode:'anonymised',data_authorised:true,anonymisation_confirmed:true})).status,200);
    const d=path.join(root,'deployments',proofId);fs.writeFileSync(path.join(d,'batch-results.local.json'),JSON.stringify(batch(ids(20))));const reviews=ids(20).map(accept);
    r=await post('/api/finalize',{id:proofId,review_text:JSON.stringify({reviews}),cases_per_month:100,minutes_before:10,minutes_after:5,internal_hourly_cost_eur:35,measurement_source_confirmed:false});assert.equal(r.status,400);assert.match(r.json.error,/Baseline\/Quelle/);
    r=await post('/api/finalize',{id:proofId,review_text:JSON.stringify({reviews}),cases_per_month:100,minutes_before:10,minutes_after:5,internal_hourly_cost_eur:35,measurement_source_confirmed:true});assert.equal(r.status,200);assert.equal(r.json.result.summary.verdict,'KEEP');
    r=await post('/api/closeout',{id:proofId,report_delivered:true,final_invoice_sent:true,final_payment_paid:true,transfer_copies_deleted:true,delete_pilot_data:true,continue_monthly:true,customer_continuation_accepted:false,monthly_fee_eur:750});assert.equal(r.status,400);assert.match(r.json.error,/ausdrücklich angenommen/);
    r=await post('/api/closeout',{id:proofId,report_delivered:true,final_invoice_sent:true,final_payment_paid:true,transfer_copies_deleted:false,delete_pilot_data:true,continue_monthly:false,customer_continuation_accepted:false,monthly_fee_eur:750});assert.equal(r.status,200);assert.equal(r.json.pilot.state.status,'CLOSEOUT_OPEN');

    const retId=stem+'-ret';createdIds.push(retId);
    assert.equal((await post('/api/create',{id:retId,company:'Retention GmbH',reviewer_name:'Reviewer',operator_name:'Ops',deposit_paid:true})).status,200);
    assert.equal((await post('/api/intake',{id:retId,cases_name:'cases.csv',cases_text:casesCsv(20),properties_text:'property_id,address,unit\nP,A,1\n',data_mode:'anonymised',data_authorised:true,anonymisation_confirmed:true})).status,200);
    const sf=path.join(root,'deployments',retId,'ops-state.local.json'),s=JSON.parse(fs.readFileSync(sf));s.data_received_at=new Date(Date.now()-15*86400000).toISOString();fs.writeFileSync(sf,JSON.stringify(s));
    const expired=await fetch(base+'/api/pilot?id='+retId).then(x=>x.json());assert.equal(expired.pilot.state.status,'STOPP_RETENTION');assert.ok(expired.pilot.state.data_deleted_at);assert.equal(fs.existsSync(path.join(root,'deployments',retId,'cases.json')),false);assert.ok(fs.existsSync(path.join(root,'deployments',retId,'deletion-proof.local.json')));
  });
  for(const id of createdIds)fs.rmSync(path.join(root,'deployments',id),{recursive:true,force:true});
});
