import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mergeReviewMeasurement, REVIEW_ERROR_CLASSES } from '../runtime/review.mjs';

function validateMeasurementInput(input={}){
  const rules={
    cases_per_month:{min:0,label:'Fälle / Monat'},
    minutes_before:{minExclusive:0,label:'Minuten / Fall vorher'},
    minutes_after:{min:0,label:'Minuten / Fall mit Workflow'},
    internal_hourly_cost_eur:{min:0,label:'Interner Stundenwert'}
  };
  for(const [key,rule] of Object.entries(rules)){
    const raw=input[key];
    if(raw===''||raw==null)continue;
    const n=Number(raw);
    if(!Number.isFinite(n))throw new Error(`${rule.label}: ungültiger Zahlenwert.`);
    if(rule.min!=null&&n<rule.min)throw new Error(`${rule.label}: darf nicht negativ sein.`);
    if(rule.minExclusive!=null&&n<=rule.minExclusive)throw new Error(`${rule.label}: muss größer als 0 sein.`);
  }
}

function validateReviews(batch,reviewDoc){
  const rows=(batch.rows||[]).filter(r=>r.ok!==false);
  const expectedIds=rows.map(r=>String(r.case_id));
  const expected=new Set(expectedIds);
  const reviews=Array.isArray(reviewDoc)?reviewDoc:(reviewDoc?.reviews||[]);
  if(!Array.isArray(reviews))throw new Error('Review-Datei ist ungültig.');
  const seen=new Set();
  const allowedDecisions=new Set(['ACCEPT','EDIT','REJECT']);
  const allowedErrors=new Set(REVIEW_ERROR_CLASSES);
  for(const r of reviews){
    const id=String(r?.case_id??'');
    if(!id)throw new Error('Review enthält einen Fall ohne case_id.');
    if(seen.has(id))throw new Error(`Review enthält Fall ${id} doppelt.`);
    seen.add(id);
    if(!expected.has(id))throw new Error(`Review enthält unbekannten Fall ${id}.`);
    if(!allowedDecisions.has(r?.decision))throw new Error(`Review ${id}: ungültige Entscheidung.`);
    if((r.decision==='EDIT'||r.decision==='REJECT')&&!allowedErrors.has(r?.error_class))throw new Error(`Review ${id}: bei Ändern/Falsch muss ein gültiger Fehlergrund gewählt werden.`);
    if(r.decision==='ACCEPT'&&r?.error_class)throw new Error(`Review ${id}: Richtig darf keinen Fehlergrund enthalten.`);
  }
  const missing=expectedIds.filter(id=>!seen.has(id));
  if(missing.length)throw new Error(`Review unvollständig: ${seen.size}/${expected.size} Fälle geprüft. Fehlend: ${missing.slice(0,5).join(', ')}${missing.length>5?' …':''}`);
  if(seen.size!==expected.size)throw new Error(`Review unvollständig: ${seen.size}/${expected.size} Fälle geprüft.`);
  return reviews;
}

export function finalizePilot({pilotDir,reviewDoc,measurementInput={}}){
  const dir=path.resolve(pilotDir);
  const resultsPath=path.join(dir,'batch-results.local.json');
  const measurementPath=path.join(dir,'measurement.json');
  if(!fs.existsSync(resultsPath))throw new Error('Pilot-Ergebnisse fehlen. Zuerst den Pilot starten.');
  const batch=JSON.parse(fs.readFileSync(resultsPath,'utf8'));
  const reviews=validateReviews(batch,reviewDoc);
  validateMeasurementInput(measurementInput);
  let measurement=fs.existsSync(measurementPath)?JSON.parse(fs.readFileSync(measurementPath,'utf8')):{};
  for(const [k,v] of Object.entries(measurementInput)) if(v!==''&&v!=null) measurement[k]=Number.isFinite(Number(v))?Number(v):v;
  measurement=mergeReviewMeasurement(measurement,reviews);
  fs.writeFileSync(path.join(dir,'review-decisions.local.json'),JSON.stringify({reviews},null,2));
  fs.writeFileSync(measurementPath,JSON.stringify(measurement,null,2));
  const reportPath=path.join(dir,'pilot-report.local.html');
  const r=spawnSync(process.execPath,['packs/hauspilot/runtime/report.mjs',resultsPath,measurementPath,reportPath],{cwd:process.cwd(),encoding:'utf8'});
  if(r.status!==0)throw new Error(r.stderr||r.stdout||'Report konnte nicht erzeugt werden.');
  const summaryPath=reportPath.replace(/\.html$/i,'.summary.json');
  const summary=JSON.parse(fs.readFileSync(summaryPath,'utf8'));
  return {ok:true,reviewed:reviews.length,reportPath,summaryPath,summary};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const dir=process.argv[2],reviewFile=process.argv[3];
  if(!dir||!reviewFile){console.error('Usage: node finalize.mjs <pilot-dir> <review-decisions.json> [measurement.json]');process.exit(2)}
  const reviewDoc=JSON.parse(fs.readFileSync(path.resolve(reviewFile),'utf8'));
  const measurementInput=process.argv[4]?JSON.parse(fs.readFileSync(path.resolve(process.argv[4]),'utf8')):{};
  try{console.log(JSON.stringify(finalizePilot({pilotDir:dir,reviewDoc,measurementInput}),null,2));}catch(e){console.error(`STOPP: ${e.message}`);process.exit(1)}
}
