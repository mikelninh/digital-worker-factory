import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewQueue, mergeReviewMeasurement, reviewRisk } from './review.mjs';

test('risk queue prioritises ambiguous consequential cases',()=>{
  const rows=[
    {case_id:'safe',template:'tenant_inbox',ok:true,result:{property_id:'OBJ-1',confidence:.98,flags:[],proposed_action:{external:false,consequential:false},policy:{execution_allowed:false,violations:[]}}},
    {case_id:'risky',template:'invoice_review',ok:true,result:{property_id:null,confidence:.55,flags:['property_ambiguous','bank_detail_change'],proposed_action:{external:false,consequential:true},policy:{execution_allowed:false,violations:['human_approval:payment']}}}
  ];
  const q=buildReviewQueue(rows);assert.equal(q[0].case_id,'risky');assert.ok(q[0].score>q[1].score);assert.equal(reviewRisk(rows[1]).reasons.includes('bank_detail_change'),true);
});

test('50-case review summary feeds measurement without JSON editing',()=>{
  const reviews=Array.from({length:50},(_,i)=>({case_id:`c-${i+1}`,decision:i<42?'ACCEPT':i<47?'EDIT':'REJECT',error_class:i<42?null:'other'}));
  const m=mergeReviewMeasurement({cases_per_month:850,minutes_before:8.5,minutes_after:3.8,internal_hourly_cost_eur:40},reviews);
  assert.equal(m.reviewed_cases,50);assert.equal(m.accepted_without_edit,42);assert.equal(m.accepted_after_edit,5);assert.equal(m.rejected,3);assert.equal(m.review_error_classes.other,8);
});
