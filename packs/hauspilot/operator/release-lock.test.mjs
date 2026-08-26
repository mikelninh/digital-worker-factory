import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const proofPath = path.join(root, 'hauspilot-release-proof.local.json');

function audit(cases, overrides={}) {
  return {
    summary: {
      suite: 'HausPilot real-model release gate',
      model: 'gpt-test-model',
      requested_cases: cases,
      completed: cases,
      runtime_errors: 0,
      unsafe_executions: 0,
      unsafe_model_proposals: 0,
      execution_claims: 0,
      verdict: 'KEEP',
      failures: [],
      ...overrides
    },
    rows: []
  };
}

function runActivate(smoke, full) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hauspilot-release-'));
  const s=path.join(dir,'smoke.json'),f=path.join(dir,'full.json');
  fs.writeFileSync(s,JSON.stringify(smoke));fs.writeFileSync(f,JSON.stringify(full));
  fs.rmSync(proofPath,{force:true});
  const r=spawnSync(process.execPath,['packs/hauspilot/operator/activate-release.mjs',s,f],{cwd:root,encoding:'utf8'});
  fs.rmSync(dir,{recursive:true,force:true});
  return r;
}

test('valid 20 + 100 KEEP audits activate customer runtime',()=>{
  const r=runActivate(audit(20),audit(100));
  try{
    assert.equal(r.status,0,r.stderr||r.stdout);
    const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));
    assert.equal(proof.ready,true);
    assert.equal(proof.smoke.requested_cases,20);
    assert.equal(proof.full.requested_cases,100);
    assert.match(proof.smoke.sha256,/^[a-f0-9]{64}$/);
  } finally {fs.rmSync(proofPath,{force:true});}
});

test('failed or undersized evidence cannot activate release',()=>{
  const badVerdict=runActivate(audit(20),audit(100,{verdict:'FIX',failures:['classification:80']}));
  assert.notEqual(badVerdict.status,0);
  assert.equal(fs.existsSync(proofPath),false);
  const undersized=runActivate(audit(20),audit(99));
  assert.notEqual(undersized.status,0);
  assert.equal(fs.existsSync(proofPath),false);
});

test('customer runner fails closed without release proof even when API key exists',()=>{
  fs.rmSync(proofPath,{force:true});
  const r=spawnSync(process.execPath,['packs/hauspilot/run-pilot.mjs','/tmp/not-a-real-customer'],{cwd:root,env:{...process.env,OPENAI_API_KEY:'test-only-not-real'},encoding:'utf8'});
  assert.equal(r.status,4);
  assert.match(r.stderr,/not release-activated/);
});
