import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const benchmarkPath = path.join(here, 'routing-benchmark.json');
const templatePath = path.join(here, 'routing-results.template.json');
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

function pct(n) { return (100*n).toFixed(1) + '%'; }
function normUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
    u.hash = '';
    if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) u.port = '';
    return u.href.replace(/\/$/, '');
  } catch { return value.trim().replace(/\/$/, ''); }
}

function validateDataset() {
  const ids = new Set();
  if (benchmark.cases.length !== 20) throw new Error(`Expected exactly 20 routing cases, found ${benchmark.cases.length}`);
  for (const c of benchmark.cases) {
    if (!c.id || ids.has(c.id)) throw new Error(`Missing or duplicate case id: ${c.id}`);
    ids.add(c.id);
    if (!Array.isArray(c.turns) || !c.turns.length) throw new Error(`${c.id}: turns must be non-empty`);
    if (typeof c.should_call !== 'boolean') throw new Error(`${c.id}: should_call must be boolean`);
    if (c.should_call && c.expected_tool !== benchmark.tool) throw new Error(`${c.id}: positive case must expect ${benchmark.tool}`);
    if (!c.should_call && c.expected_tool !== null) throw new Error(`${c.id}: negative/boundary case must not expect a tool`);
  }

  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  const templateIds = template.cases.map(c => c.id);
  if (templateIds.length !== benchmark.cases.length || templateIds.some((id,i) => id !== benchmark.cases[i].id)) {
    throw new Error('routing-results.template.json is out of sync with routing-benchmark.json');
  }

  const counts = benchmark.cases.reduce((acc,c) => ((acc[c.kind]=(acc[c.kind]||0)+1),acc),{});
  const positives = benchmark.cases.filter(c => c.should_call).length;
  const negatives = benchmark.cases.length - positives;
  console.log('Routing dataset valid:', { total: benchmark.cases.length, positives, negatives, by_kind: counts });
}

function score(resultsPath) {
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const actualById = new Map((results.cases || []).map(c => [c.id, c]));
  let TP=0, FP=0, TN=0, FN=0, argCorrect=0, argTotal=0, useful=0, usefulTotal=0, boundaryViolations=0;
  const misses=[];

  for (const expected of benchmark.cases) {
    const actual = actualById.get(expected.id);
    if (!actual) throw new Error(`Missing result for ${expected.id}`);
    const completed = actual.actual_tool !== null || actual.useful_result !== null || actual.component_rendered !== null || (actual.notes||'').trim();
    if (!completed) throw new Error(`Result ${expected.id} is still blank`);

    const called = actual.actual_tool === benchmark.tool;
    if (expected.should_call && called) TP++;
    else if (expected.should_call && !called) { FN++; misses.push({id:expected.id,type:'FN',prompt:expected.turns.at(-1),actual_tool:actual.actual_tool}); }
    else if (!expected.should_call && called) {
      FP++;
      misses.push({id:expected.id,type:'FP',prompt:expected.turns.at(-1),actual_tool:actual.actual_tool});
      if (expected.kind === 'boundary') boundaryViolations++;
    } else TN++;

    if (expected.should_call && called) {
      argTotal++;
      const actualUrl = actual.actual_args?.url ?? null;
      if (normUrl(actualUrl) === normUrl(expected.expected_url)) argCorrect++;
      else misses.push({id:expected.id,type:'ARG',expected_url:expected.expected_url,actual_url:actualUrl});
      usefulTotal++;
      if (actual.useful_result === true) useful++;
      else if (actual.useful_result === false) misses.push({id:expected.id,type:'USEFULNESS',prompt:expected.turns.at(-1)});
    }
  }

  const precision = TP + FP ? TP/(TP+FP) : 0;
  const recall = TP + FN ? TP/(TP+FN) : 0;
  const specificity = TN + FP ? TN/(TN+FP) : 0;
  const f1 = precision + recall ? 2*precision*recall/(precision+recall) : 0;
  const argAccuracy = argTotal ? argCorrect/argTotal : 0;
  const usefulCompletion = usefulTotal ? useful/usefulTotal : 0;

  const t = benchmark.release_targets;
  const pass = precision >= t.precision_min &&
    recall >= t.recall_min &&
    specificity >= t.negative_specificity_min &&
    argAccuracy >= t.argument_accuracy_min &&
    usefulCompletion >= t.useful_completion_min &&
    boundaryViolations <= t.max_boundary_violations;

  console.log('\nLaunchCheck routing gauntlet');
  console.log('============================');
  console.log(`TP ${TP} | FP ${FP} | TN ${TN} | FN ${FN}`);
  console.log(`Precision:           ${pct(precision)}   target >= ${pct(t.precision_min)}`);
  console.log(`Recall:              ${pct(recall)}   target >= ${pct(t.recall_min)}`);
  console.log(`Negative specificity:${pct(specificity)}   target >= ${pct(t.negative_specificity_min)}`);
  console.log(`F1:                  ${pct(f1)}`);
  console.log(`Argument accuracy:   ${pct(argAccuracy)}   target >= ${pct(t.argument_accuracy_min)}`);
  console.log(`Useful completion:   ${pct(usefulCompletion)}   target >= ${pct(t.useful_completion_min)}`);
  console.log(`Boundary violations: ${boundaryViolations}       target <= ${t.max_boundary_violations}`);
  console.log(`\nRELEASE GATE: ${pass ? 'PASS' : 'FAIL'}`);

  if (misses.length) {
    console.log('\nFailures to inspect:');
    for (const m of misses) console.log('-', JSON.stringify(m));
  }
  process.exitCode = pass ? 0 : 1;
}

validateDataset();

const arg = process.argv[2];
if (arg && arg !== '--validate-only') score(path.resolve(process.cwd(), arg));
