import test from 'node:test';
import assert from 'node:assert/strict';
import {activateRetainer,newCycle,advanceCycle,validateRetainerActivation} from './state.mjs';

const base={
  retainer_id:'demo',customer:'Demo GmbH',pilot_verdict:'KEEP',workflow:'repair_intake',
  customer_reviewer:'Anna',operations_owner:'Ops 1',cadence:'monthly',data_mode:'anonymised',
  privacy_scope_confirmed:true,retention_confirmed:true,status:'DRAFT'
};

test('activation fails closed without required gates',()=>{
  const gate=validateRetainerActivation({...base,privacy_scope_confirmed:false});
  assert.equal(gate.ok,false);
  assert.ok(gate.errors.includes('privacy_scope_confirmed_required'));
  assert.throws(()=>activateRetainer({...base,pilot_verdict:'FIX'}),/blocked/);
});

test('KEEP retainer activates only with named owners and privacy scope',()=>{
  const r=activateRetainer(base);
  assert.equal(r.status,'ACTIVE_MANAGED_OPS');
  assert.ok(r.activated_at);
});

test('new cycle requires active retainer',()=>{
  assert.throws(()=>newCycle(base,'2026-09'),/not_active/);
  const c=newCycle(activateRetainer(base),'2026-09');
  assert.equal(c.status,'RECEIVED');
  assert.equal(c.workflow,'repair_intake');
});

test('happy path is received to KEEP',()=>{
  let c=newCycle(activateRetainer(base),'2026-09');
  for (const s of ['PREFLIGHT','RUNNING','REVIEW','PROOF','KEEP']) c=advanceCycle(c,s);
  assert.equal(c.status,'KEEP');
  assert.equal(c.history.length,5);
});

test('invalid authority-skipping transitions are rejected',()=>{
  let c=newCycle(activateRetainer(base),'2026-09');
  assert.throws(()=>advanceCycle(c,'RUNNING'),/invalid transition/);
  c=advanceCycle(c,'PREFLIGHT');
  assert.throws(()=>advanceCycle(c,'PROOF'),/invalid transition/);
});

test('any pre-proof operational stage can fail closed to BLOCKED',()=>{
  let c=newCycle(activateRetainer(base),'2026-09');
  c=advanceCycle(c,'BLOCKED','privacy gate failed');
  assert.equal(c.status,'BLOCKED');
  assert.throws(()=>advanceCycle(c,'RUNNING'),/invalid transition/);
});
