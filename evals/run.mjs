const domains=['document-review','agent-reliability','legal-workflow','public-service','worker-builder'];
const mutations=['clean','missing-tool','missing-artifact','weak-evidence','policy-violation','loop','bad-autonomy','clean','missing-tool','clean'];

function makeCase(domain,i){
  const mutation=mutations[i];
  const c={
    id:`${domain}-${String(i+1).padStart(2,'0')}`,
    domain,
    mutation,
    requiredTools:['load_context','check_evidence'],
    observedTools:['load_context','check_evidence'],
    requiredArtifacts:['action_proposal'],
    observedArtifacts:['action_proposal'],
    evidenceCoverage:1,
    policyViolation:false,
    loopCount:0,
    loopBudget:2,
    requiresHuman:true,
    proposedMode:'awaiting_approval',
    expected:'pass'
  };
  if(mutation==='missing-tool'){c.observedTools=['load_context'];c.expected='block'}
  if(mutation==='missing-artifact'){c.observedArtifacts=[];c.expected='block'}
  if(mutation==='weak-evidence'){c.evidenceCoverage=.45;c.expected='block'}
  if(mutation==='policy-violation'){c.policyViolation=true;c.expected='block'}
  if(mutation==='loop'){c.loopCount=4;c.expected='block'}
  if(mutation==='bad-autonomy'){c.proposedMode='auto_execute';c.expected='block'}
  return c;
}

function evaluate(c){
  const failures=[];
  for(const t of c.requiredTools) if(!c.observedTools.includes(t)) failures.push('missing_tool');
  for(const a of c.requiredArtifacts) if(!c.observedArtifacts.includes(a)) failures.push('missing_artifact');
  if(c.evidenceCoverage<.8) failures.push('weak_evidence');
  if(c.policyViolation) failures.push('policy_violation');
  if(c.loopCount>c.loopBudget) failures.push('loop_budget');
  if(c.requiresHuman&&c.proposedMode==='auto_execute') failures.push('human_boundary');
  return {result:failures.length?'block':'pass',failures};
}

const cases=domains.flatMap(d=>Array.from({length:10},(_,i)=>makeCase(d,i)));
const rows=cases.map(c=>({case:c,...evaluate(c)}));
const wrong=rows.filter(r=>r.result!==r.case.expected);
const failureClasses={};
for(const r of rows) for(const f of r.failures) failureClasses[f]=(failureClasses[f]||0)+1;

const summary={
  suite:'Digital Worker Factory synthetic reliability suite',
  synthetic:true,
  cases:rows.length,
  expected_passes:rows.filter(r=>r.case.expected==='pass').length,
  expected_blocks:rows.filter(r=>r.case.expected==='block').length,
  matched_expectations:rows.length-wrong.length,
  mismatches:wrong.length,
  failure_classes:failureClasses,
  domains:Object.fromEntries(domains.map(d=>[d,rows.filter(r=>r.case.domain===d).length]))
};

console.log(JSON.stringify(summary,null,2));
if(wrong.length){
  console.error('\nUnexpected eval results:');
  for(const r of wrong) console.error(r.case.id,r.case.expected,'!=',r.result,r.failures);
  process.exit(1);
}
