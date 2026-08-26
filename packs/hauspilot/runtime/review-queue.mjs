import fs from 'node:fs';
import path from 'node:path';
import { buildReviewQueue, mergeReviewMeasurement } from './review.mjs';

const cmd=process.argv[2];
if(!['build','finalize'].includes(cmd)){
  console.error('Usage:\n  node packs/hauspilot/runtime/review-queue.mjs build <batch-results.json> <queue.json>\n  node packs/hauspilot/runtime/review-queue.mjs finalize <measurement.json> <review-decisions.json> <measurement.reviewed.json>');
  process.exit(2);
}

if(cmd==='build'){
  const input=path.resolve(process.argv[3]||'');const out=path.resolve(process.argv[4]||'review-queue.json');
  if(!process.argv[3]) process.exit(2);
  const d=JSON.parse(fs.readFileSync(input,'utf8'));
  const queue=buildReviewQueue(d.rows||[]).map(q=>({case_id:q.case_id,template:q.template,risk_score:q.score,risk_reasons:q.reasons,result:q.row.result||null,error:q.row.error||null}));
  fs.writeFileSync(out,JSON.stringify({generated_at:new Date().toISOString(),cases:queue.length,queue},null,2));
  console.log(JSON.stringify({ok:true,cases:queue.length,out},null,2));
}

if(cmd==='finalize'){
  const measurementPath=path.resolve(process.argv[3]||'');const reviewsPath=path.resolve(process.argv[4]||'');const out=path.resolve(process.argv[5]||'measurement.reviewed.json');
  if(!process.argv[3]||!process.argv[4]) process.exit(2);
  const measurement=JSON.parse(fs.readFileSync(measurementPath,'utf8'));
  const reviewDoc=JSON.parse(fs.readFileSync(reviewsPath,'utf8'));
  const reviews=Array.isArray(reviewDoc)?reviewDoc:(reviewDoc.reviews||[]);
  for(const r of reviews){
    if(!['ACCEPT','EDIT','REJECT'].includes(r.decision)) throw new Error(`invalid review decision for ${r.case_id||'unknown'}`);
    if(['EDIT','REJECT'].includes(r.decision)&&!r.error_class) throw new Error(`error_class required for ${r.decision}: ${r.case_id||'unknown'}`);
  }
  const merged=mergeReviewMeasurement(measurement,reviews);
  fs.writeFileSync(out,JSON.stringify(merged,null,2));
  console.log(JSON.stringify({ok:true,reviewed_cases:merged.reviewed_cases,out},null,2));
}
