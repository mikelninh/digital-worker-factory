import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mergeReviewMeasurement } from '../runtime/review.mjs';

export function finalizePilot({pilotDir,reviewDoc,measurementInput={}}){
  const dir=path.resolve(pilotDir);
  const resultsPath=path.join(dir,'batch-results.local.json');
  const measurementPath=path.join(dir,'measurement.json');
  if(!fs.existsSync(resultsPath))throw new Error('Pilot-Ergebnisse fehlen. Zuerst den Pilot starten.');
  const batch=JSON.parse(fs.readFileSync(resultsPath,'utf8'));
  const reviews=Array.isArray(reviewDoc)?reviewDoc:(reviewDoc?.reviews||[]);
  const expected=(batch.rows||[]).filter(r=>r.ok!==false).length;
  const unique=new Set(reviews.map(r=>r.case_id));
  if(unique.size!==expected)throw new Error(`Review unvollständig: ${unique.size}/${expected} Fälle geprüft.`);
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
  return {ok:true,reviewed:unique.size,reportPath,summaryPath,summary};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const dir=process.argv[2],reviewFile=process.argv[3];
  if(!dir||!reviewFile){console.error('Usage: node finalize.mjs <pilot-dir> <review-decisions.json> [measurement.json]');process.exit(2)}
  const reviewDoc=JSON.parse(fs.readFileSync(path.resolve(reviewFile),'utf8'));
  const measurementInput=process.argv[4]?JSON.parse(fs.readFileSync(path.resolve(process.argv[4]),'utf8')):{};
  try{console.log(JSON.stringify(finalizePilot({pilotDir:dir,reviewDoc,measurementInput}),null,2));}catch(e){console.error(`STOPP: ${e.message}`);process.exit(1)}
}
