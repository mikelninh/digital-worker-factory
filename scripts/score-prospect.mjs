#!/usr/bin/env node

/**
 * HausPilot prospect scorer
 *
 * Usage:
 *   node scripts/score-prospect.mjs '{"company":"Example","pain":2,"volume":2,"repetition":2,"dataAccess":1,"humanBoundary":2,"economicValue":2,"buyerAccess":1,"urgency":2}'
 *
 * Each dimension is 0..2. See sales/PLAYBOOK.md.
 */

const raw = process.argv[2];
if (!raw) {
  console.error('Pass one JSON object as the first argument.');
  process.exit(1);
}

let p;
try { p = JSON.parse(raw); }
catch { console.error('Invalid JSON.'); process.exit(1); }

const dims = ['pain','volume','repetition','dataAccess','humanBoundary','economicValue','buyerAccess','urgency'];
for (const d of dims) {
  if (!Number.isInteger(p[d]) || p[d] < 0 || p[d] > 2) {
    console.error(`${d} must be an integer from 0 to 2.`);
    process.exit(1);
  }
}

const score = dims.reduce((sum,d)=>sum+p[d],0);
const bucket = score >= 12 ? 'PRIORITY OUTREACH' : score >= 8 ? 'RESEARCH / NURTURE' : 'BACKLOG';

const result = {
  company: p.company || 'Unnamed account',
  score,
  maxScore: 16,
  bucket,
  dimensions: Object.fromEntries(dims.map(d=>[d,p[d]]))
};

console.log(JSON.stringify(result,null,2));
