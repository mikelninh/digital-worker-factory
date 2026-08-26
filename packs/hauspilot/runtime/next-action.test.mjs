import test from 'node:test';
import assert from 'node:assert/strict';
import { nextAction } from './next-action.mjs';

test('green preflight becomes STARTEN', () => {
  assert.deepEqual(nextAction({ok:true,errors:[]}), {
    action:'STARTEN',
    message:'Alles vorhanden. Pilot kann gestartet werden.'
  });
});

test('too few cases becomes ANFORDERN', () => {
  assert.equal(nextAction({ok:false,errors:['too_few_cases:12:minimum_20']}).action,'ANFORDERN');
});

test('more than 50 cases becomes founder scope STOPP', () => {
  const r=nextAction({ok:false,errors:['too_many_cases:51:standard_max_50']});
  assert.equal(r.action,'STOPP');
  assert.match(r.message,/Sales\/Founder/);
});

test('missing or invalid master data becomes ANFORDERN', () => {
  for(const error of ['missing_file:properties.csv','properties_csv_missing_header:unit','property_row_invalid:2','duplicate_property_id:P-1']){
    assert.equal(nextAction({ok:false,errors:[error]}).action,'ANFORDERN');
  }
});

test('missing customer reviewer becomes ANFORDERN', () => {
  const r=nextAction({ok:false,errors:['approval_gate_false:reviewer_named']});
  assert.equal(r.action,'ANFORDERN');
  assert.match(r.message,/fachlich prüfende Person/);
});

test('missing internal operator becomes STOPP without burdening customer', () => {
  const r=nextAction({ok:false,errors:['approval_gate_false:operator_named']});
  assert.equal(r.action,'STOPP');
  assert.match(r.message,/Intern zuweisen/);
});

test('ordinary approval gate becomes WARTEN', () => {
  assert.equal(nextAction({ok:false,errors:['approval_gate_false:data_authorised']}).action,'WARTEN');
});

test('privacy confirmation or direct identifiers become STOPP', () => {
  for(const error of ['personal_data_requires_gate:processor_terms_reviewed','anonymised_data_requires_anonymisation_confirmation','anonymised_mode_direct_identifier:cases[0].message:email']){
    assert.equal(nextAction({ok:false,errors:[error]}).action,'STOPP');
  }
});

test('secret risk becomes STOPP', () => {
  assert.equal(nextAction({ok:false,errors:['secret_detected:cases.json:x:openai_key_like_secret']}).action,'STOPP');
});

test('duplicate or malformed cases are engineering STOPP', () => {
  for(const error of ['duplicate_case_id:c-1','case_missing_id','case_template_mismatch:c-2','invalid_json:cases.json:x']){
    assert.equal(nextAction({ok:false,errors:[error]}).action,'STOPP');
  }
});

test('unknown internal failure fails closed', () => {
  assert.equal(nextAction({ok:false,errors:['something_unexpected']}).action,'STOPP');
});
