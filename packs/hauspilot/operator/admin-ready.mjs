import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

function loadLocalEnv() {
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadLocalEnv();

const problems = [];
const major = Number(process.versions.node.split('.')[0]);
if (!Number.isFinite(major) || major < 22) problems.push('Node.js 22+ fehlt.');
if (!process.env.OPENAI_API_KEY) problems.push('OPENAI_API_KEY ist auf diesem Operations-Rechner nicht konfiguriert.');

let proof = null;
try { proof = JSON.parse(fs.readFileSync(path.join(root, 'hauspilot-release-proof.local.json'), 'utf8')); } catch {}
if (proof?.ready !== true || proof?.smoke?.verdict !== 'KEEP' || proof?.full?.verdict !== 'KEEP' || Number(proof?.smoke?.requested_cases) < 20 || Number(proof?.full?.requested_cases) < 100) {
  problems.push('Live Release ist nicht aktiviert (20-Case Smoke + 100-Case Full fehlen oder sind nicht KEEP).');
}

for (const rel of [
  'packs/hauspilot/first-customer/templates/repair-cases.csv',
  'packs/hauspilot/first-customer/templates/inbox-cases.csv',
  'packs/hauspilot/first-customer/templates/invoice-cases.csv',
  'packs/hauspilot/first-customer/templates/properties.csv',
  'packs/hauspilot/operator/ops-console.mjs'
]) if (!fs.existsSync(path.join(root, rel))) problems.push(`Installationsdatei fehlt: ${rel}`);

if (problems.length) {
  console.error('\nSTOPP · Operations-Rechner noch nicht freigegeben\n');
  for (const p of problems) console.error(`- ${p}`);
  console.error('\nNicht improvisieren. Admin/Engineering behebt das einmalig.\n');
  process.exit(1);
}

console.log(`READY · Operations Console freigegeben · ${proof.model || 'Live-Gate verifiziert'} · Smoke ${proof.smoke.requested_cases} · Full ${proof.full.requested_cases}`);
