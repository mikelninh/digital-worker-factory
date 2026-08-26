import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const sales = read('site/hauspilot.html');
const onepager = read('site/hauspilot-onepager.html');
const simple = read('site/simple-operations.html');
const reviewer = read('site/hauspilot-review.html');
const report = read('packs/hauspilot/runtime/report.mjs');
const operator = read('packs/hauspilot/operator/ONE_PAGE.md');
const customerStart = read('packs/hauspilot/first-customer/CUSTOMER_START.md');

const legacyLinks = [
  'pilot-command-center.html',
  'retainer-command-center.html',
  'hauspilot-setup.html',
  'hauspilot-results.html'
];

test('customer sales story is four simple steps and makes no unsupported live-model claim', () => {
  assert.match(sales, /Vier Schritte\. Fertig\./);
  assert.match(sales, /20–50 Beispiele/);
  assert.match(sales, /Sieht richtig aus/);
  assert.match(sales, /weiter, verbessern oder stoppen/i);
  assert.doesNotMatch(sales, /echte Modellfälle/i);
  assert.match(sales, /Live-Modell-Release-Gate ist ein separater Schritt/);
  for (const href of legacyLinks) assert.ok(!sales.includes(href), `sales must not link legacy surface ${href}`);
});

test('60-second one-pager uses the same simple language', () => {
  assert.match(onepager, /Geben Sie uns alte Fälle/);
  assert.match(onepager, /Richtig · Ändern · Falsch/);
  assert.match(onepager, /Weiter · Verbessern · Stoppen/);
  assert.doesNotMatch(onepager, /ACCEPT \/ EDIT \/ REJECT/);
  assert.doesNotMatch(onepager, /KEEP · FIX · STOP/);
  assert.doesNotMatch(onepager, /Live Modellfälle/);
  assert.match(onepager, /Live-Modell-Gate wird separat protokolliert/);
});

test('interactive demo is unmistakably a demo and exposes only one next action per role', () => {
  assert.match(simple, /INTERAKTIVE DEMO/);
  assert.match(simple, /Beispielwerte/);
  assert.match(simple, /keine Kundenergebnisse/);
  assert.match(simple, /3 DINGE/);
  assert.match(simple, /STARTEN/);
  assert.match(simple, /ANFORDERN/);
  assert.match(simple, /WARTEN/);
  assert.match(simple, /STOPP/);
  assert.match(simple, /Sieht richtig aus/);
  assert.match(simple, /Bitte ändern/);
  assert.match(simple, /Falsch/);
  assert.match(simple, /WEITER/);
  assert.match(simple, /Monatlich weiter/);
  for (const href of legacyLinks) assert.ok(!simple.includes(href), `simple flow must not link legacy surface ${href}`);
});

test('reviewer experience asks one human question and hides engineering labels from buttons', () => {
  assert.match(reviewer, /Ist das fachlich richtig\?/);
  assert.match(reviewer, />✓ Richtig</);
  assert.match(reviewer, />✎ Ändern</);
  assert.match(reviewer, />✕ Falsch</);
  assert.doesNotMatch(reviewer, />A · ACCEPT</);
  assert.doesNotMatch(reviewer, />E · EDIT</);
  assert.doesNotMatch(reviewer, />R · REJECT</);
  assert.doesNotMatch(reviewer, /risk \$\{/i);
  assert.match(reviewer, /Interner Operator: Pilot laden \/ Ergebnis exportieren/);
});

test('result report preserves internal verdicts but translates the visible decision', () => {
  assert.match(report, /KEEP:'WEITER'/);
  assert.match(report, /FIX:'VERBESSERN'/);
  assert.match(report, /STOP:'STOPPEN'/);
  assert.match(report, /MEASURE:'WEITER MESSEN'/);
  assert.match(report, /Funktioniert es\?/);
  assert.match(report, /Spart es Zeit\?/);
  assert.match(report, /Ist es sicher\?/);
  assert.match(report, /Technische Details & Audit öffnen/);
});

test('operator standard path is the prepared browser console with only bounded escalations', () => {
  assert.match(operator, /start-hauspilot-ops\.cmd/);
  assert.match(operator, /Kein Terminal, kein GitHub, kein JSON-Editieren/);
  assert.match(operator, /20-Case Live-Smoke/);
  assert.match(operator, /100-Case Live-Gate/);
  assert.match(operator, /STARTEN.*ANFORDERN.*WARTEN.*STOPP/s);
  assert.match(operator, /Datenschutz/);
  assert.match(operator, /Technik/);
  assert.match(operator, /Kommerziell/);
  assert.match(operator, /ohne Founder-Eingriff/);
});

test('customer onboarding has exactly three requested inputs after commercial scope is agreed', () => {
  assert.match(customerStart, /customer-facing source of truth/i);
  assert.match(customerStart, /exactly 3 things/i);
  assert.match(customerStart, /20–50 completed examples/);
  assert.match(customerStart, /one simple master-data list/);
  assert.match(customerStart, /one reviewing person/);
  assert.match(customerStart, /€1,330 paid before kickoff/);
  assert.match(customerStart, /remaining \*\*€570\*\*/);
  assert.match(customerStart, /public demo \*\*never collects customer data\*\*/i);
  assert.match(customerStart, /pseudonymised or personal data leaves the standard path/i);
  assert.match(customerStart, /Operations tasks — not Founder-only tasks/);
});
