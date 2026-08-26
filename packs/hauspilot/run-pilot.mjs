import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const pilotDir = path.resolve(process.argv[2] || '');
if (!process.argv[2]) {
  console.error('Usage: node packs/hauspilot/run-pilot.mjs <pilot-directory>');
  process.exit(2);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('STOP: OPENAI_API_KEY is not configured in this runtime. Do not place it in the repository.');
  process.exit(3);
}
const releaseProofPath = path.resolve('hauspilot-release-proof.local.json');
let releaseProof = null;
try { releaseProof = JSON.parse(fs.readFileSync(releaseProofPath, 'utf8')); } catch {}
if (releaseProof?.ready !== true || Number(releaseProof?.smoke?.requested_cases) < 20 || Number(releaseProof?.full?.requested_cases) < 100 || releaseProof?.smoke?.verdict !== 'KEEP' || releaseProof?.full?.verdict !== 'KEEP') {
  console.error('STOP: HausPilot customer runtime is not release-activated. Admin must first run the real 20-case smoke + 100-case full gates, then activate them with packs/hauspilot/operator/activate-release.mjs.');
  process.exit(4);
}
function run(args) {
  const r = spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const client = path.join(pilotDir,'client.json');
const cases = path.join(pilotDir,'cases.json');
const measurement = path.join(pilotDir,'measurement.json');
const privacyManifest = path.join(pilotDir,'privacy-manifest.json');
const results = path.join(pilotDir,'batch-results.local.json');
const report = path.join(pilotDir,'pilot-report.local.html');

run(['packs/hauspilot/runtime/preflight.mjs',pilotDir]);
run(['packs/hauspilot/privacy/manifest.mjs',pilotDir,privacyManifest]);
run(['packs/hauspilot/compile.mjs',client]);
run(['packs/hauspilot/runtime/batch.mjs',cases,client,results]);
run(['packs/hauspilot/runtime/report.mjs',results,measurement,report]);

console.log(`\nHausPilot complete.\nRelease: ${releaseProof.model || 'verified'}\nPrivacy: ${privacyManifest}\nResults: ${results}\nReport:  ${report}\nNext: human review → measurement.json → rerun report → KEEP / FIX / STOP`);
