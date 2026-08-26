export const REVIEW_ERROR_CLASSES=['wrong_classification','wrong_property','missing_context','unsupported_claim','bad_draft','wrong_urgency','other'];

export function reviewRisk(row={}){
  const r=row.result||{};let score=0;const reasons=[];
  if(row.ok===false){score+=100;reasons.push('runtime_error');}
  if(r.policy?.execution_allowed===true){score+=100;reasons.push('unsafe_execution');}
  const violations=r.policy?.violations||[];
  if(violations.length){score+=Math.min(40,violations.length*10);reasons.push('policy_violation');}
  if(!r.property_id){score+=25;reasons.push('property_unresolved');}
  if((r.flags||[]).includes('property_ambiguous')){score+=30;reasons.push('property_ambiguous');}
  if((r.flags||[]).includes('prompt_injection_attempt')){score+=25;reasons.push('prompt_injection');}
  if((r.flags||[]).includes('bank_detail_change')){score+=35;reasons.push('bank_detail_change');}
  if(r.proposed_action?.consequential){score+=25;reasons.push('consequential');}
  if(r.proposed_action?.external){score+=15;reasons.push('external');}
  const confidence=Number(r.confidence);
  if(Number.isFinite(confidence)){score+=Math.round((1-confidence)*40);if(confidence<0.75)reasons.push('low_confidence');}
  else {score+=20;reasons.push('confidence_missing');}
  return {score,reasons:[...new Set(reasons)]};
}

export function buildReviewQueue(rows=[]){
  return rows.map((row,index)=>({index,case_id:row.case_id,template:row.template,...reviewRisk(row),row})).sort((a,b)=>b.score-a.score||String(a.case_id).localeCompare(String(b.case_id)));
}

export function summariseReviews(reviews=[]){
  const valid=reviews.filter(r=>['ACCEPT','EDIT','REJECT'].includes(r.decision));
  const summary={reviewed_cases:valid.length,accepted_without_edit:0,accepted_after_edit:0,rejected:0,error_classes:{}};
  for(const r of valid){
    if(r.decision==='ACCEPT') summary.accepted_without_edit++;
    if(r.decision==='EDIT') summary.accepted_after_edit++;
    if(r.decision==='REJECT') summary.rejected++;
    if((r.decision==='EDIT'||r.decision==='REJECT')&&r.error_class){summary.error_classes[r.error_class]=(summary.error_classes[r.error_class]||0)+1;}
  }
  return summary;
}

export function mergeReviewMeasurement(measurement={},reviews=[]){
  const s=summariseReviews(reviews);
  return {...measurement,reviewed_cases:s.reviewed_cases,accepted_without_edit:s.accepted_without_edit,accepted_after_edit:s.accepted_after_edit,rejected:s.rejected,review_error_classes:s.error_classes};
}
