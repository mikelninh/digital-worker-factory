import test from 'node:test';
import assert from 'node:assert/strict';
import { nextAction } from './next-action.mjs';

test('green preflight becomes STARTEN', () => {
  assert.deepEqual(nextAction({ok:true,errors:[]}), {
    action:'STARTEN',
    message:'Alles vorhanden. Pilot kann gestartet werden.'
  });
});

test('missing cases becomes ANFORDERN', () => {
  assert.equal(nextAction({ok:false,errors:['too_few_cases:12:minimum_20']}).action,'ANFORDERN');
});

test('missing master data becomes ANFORDERN', () => {
  assert.equal(nextAction({ok:false,errors:['missing_file:properties.csv']}).action,'ANFORDERN');
});

test('missing reviewer becomes ANFORDERN', () => {
  assert.equal(nextAction({ok:false,errors:['approval_gate_false:operator_named']}).action,'ANFORDERN');
});

test('ordinary approval gate becomes WARTEN', () => {
  assert.equal(nextAction({ok:false,errors:['approval_gate_false:data_authorised']}).action,'WARTEN');
});

test('privacy or secret risk becomes STOPP', () => {
  assert.equal(nextAction({ok:false,errors:['personal_data_requires_gate:processor_terms_reviewed']}).action,'STOPP');
  assert.equal(nextAction({ok:false,errors:['secret_detected:cases.json:x:openai_key_like_secret']}).action,'STOPP');
});

test('unknown internal failure fails closed', () => {
  assert.equal(nextAction({ok:false,errors:['something_unexpected']}).action,'STOPP');
});
