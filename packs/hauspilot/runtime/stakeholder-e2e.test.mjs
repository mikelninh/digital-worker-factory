import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const sales = read('site/hauspilot.html');
const demo = read('site/hauspilot-try.html');
const setup = read('site/hauspilot-setup.html');
const privacy = read('site/hauspilot-privacy.html');
const onepager = read('site/hauspilot-onepager.html');
const simple = read('site/simple-operations.html');
const reviewer = read('site/hauspilot-review.html');
const report = read('packs/hauspilot/runtime/report.mjs');
const operator = read('packs/hauspilot/operator/ONE_PAGE.md');
const assistantReady = read('packs/hauspilot/operator/ASSISTANT_READY.md');
const customerStart = read('packs/hauspilot/first-customer/CUSTOMER_START.md');
const consoleSource = read('packs/hauspilot/operator/ops-console.mjs');
const routes = read('site/vercel.json');

const legacyLinks = ['pilot-command-center.html','retainer-command-center.html','hauspilot-results.html'];

test('canonical customer page sells one simple three-stage commercial path', () => {
  assert.match(sales, /Hire Mara/);
  assert.match(sales, /Weniger Postfach/);
  assert.match(sales, /Mara kümmert sich/);
  assert.match(sales, /Keine Kreditkarte/);
  assert.match(sales, /€0 Demo/);
  assert.match(sales, /€990/);
  assert.match(sales, /7-Tage Proof Week/);
  assert.match(sales, /€1\.500/);
  assert.match(sales, /vollständig auf den ersten Mara-Monat angerechnet/);
  assert.match(sales, /Kein Auto-Abo/);
  assert.match(sales, /href="\/try"/);
  assert.match(sales, /href="\/start"/);
  for (const href of legacyLinks) assert.ok(!sales.includes(href), `sales must not link legacy surface ${href}`);
});

test('free Mara demo is real, synthetic, browser-only and asks for no commercial commitment',()=>{
  assert.match(demo,/€0 · keine Kreditkarte/);
  assert.match(demo,/vollständig im Browser/);
  assert.match(demo,/synthetischer Logik und Beispieldaten/);
  assert.match(demo,/keine echten personenbezogenen oder sensiblen Daten/i);
  assert.match(demo,/Mara arbeiten lassen/);
  assert.match(demo,/Proof Week starten/);
  assert.doesNotMatch(demo,/type="file"/);
  assert.doesNotMatch(demo,/stripe|checkout|card number/i);
});

test('customer-facing onboarding hides implementation work and asks only for business inputs',()=>{
  assert.match(setup,/Proof Week · €990 netto/);
  assert.match(setup,/Kein Download/);
  assert.match(setup,/Keine Installation/);
  assert.match(setup,/Kein API-Key/);
  assert.match(setup,/20–50 alte Fälle/);
  assert.match(setup,/Objekt-\/Einheitenliste/);
  assert.match(setup,/fachliche prüfende Person/);
  assert.match(setup,/Im Proof: nichts nach außen/);
  assert.match(setup,/kein automatisches Abo/i);
  assert.match(setup,/monatlicher Betrieb: €1\.500/i);
  assert.doesNotMatch(setup,/client\.json/);
  assert.doesNotMatch(setup,/Tenant ID/);
  assert.doesNotMatch(setup,/Generate pilot config/i);
  assert.doesNotMatch(setup,/OPENAI_API_KEY/);
});

test('customer-facing proof stays truthful and separates release proof from customer proof',()=>{
  assert.match(sales,/20\/20/);
  assert.match(sales,/100\/100/);
  assert.match(sales,/0[\s\S]*unsafe executions/);
  assert.match(sales,/Release-Testbench-Ergebnisse/);
  assert.match(sales,/keine versprochenen Kundenergebnisse/);
  assert.match(sales,/Proof Week ist der Beweis auf Ihrer Realität/);
  assert.match(sales,/Proof braucht noch keinen produktiven Microsoft-365-Zugriff/i);
  assert.doesNotMatch(sales,/vollautonom(?:e|er) Produktion/i);
});

test('privacy truth remains available without cluttering the simple onboarding',()=>{
  assert.match(sales,/hauspilot-privacy\.html/);
  assert.match(privacy,/Wirklich anonymisiert/i);
  assert.match(privacy,/Pseudonymisierung schützt, beendet aber die Personenbeziehbarkeit nicht automatisch/);
  assert.match(privacy,/Kein Live-Postfach für V1/);
  assert.match(privacy,/"retention_days": 14/);
  assert.match(privacy,/ZDR/);
  assert.match(privacy,/EU-only/);
  assert.match(privacy,/DSGVO-konform/);
  assert.match(privacy,/ersetzt keine kundenspezifische rechtliche Prüfung/);
});

test('60-second one-pager matches the launch offer and current release proof', () => {
  assert.match(onepager,/Mara Demo/);
  assert.match(onepager,/€0/);
  assert.match(onepager,/€990/);
  assert.match(onepager,/7-Tage Proof Week/);
  assert.match(onepager,/€1\.500/);
  assert.match(onepager,/20\/20/);
  assert.match(onepager,/100\/100/);
  assert.match(onepager,/0[\s\S]*unsafe executions/);
  assert.match(onepager,/Keine Kundendaten/);
  assert.match(onepager,/kein automatisches Abo/i);
});

test('legacy interactive operations demo remains unmistakably a demo', () => {
  assert.match(simple, /INTERAKTIVE DEMO/);
  assert.match(simple, /Beispielwerte/);
  assert.match(simple, /keine Kundenergebnisse/);
  for(const action of ['STARTEN','ANFORDERN','WARTEN','STOPP'])assert.match(simple,new RegExp(action));
  assert.match(simple,/✓ Richtig/);
  assert.match(simple,/✎ Ändern/);
  assert.match(simple,/✕ Falsch/);
  for (const href of legacyLinks) assert.ok(!sales.includes(href), `canonical sales must not link legacy surface ${href}`);
});

test('reviewer experience asks one human question and hides engineering labels from buttons', () => {
  assert.match(reviewer, /Ist das fachlich richtig\?/);
  assert.match(reviewer, />✓ Richtig</);
  assert.match(reviewer, />✎ Ändern</);
  assert.match(reviewer, />✕ Falsch</);
  assert.doesNotMatch(reviewer, />A · ACCEPT</);
  assert.doesNotMatch(reviewer, />E · EDIT</);
  assert.doesNotMatch(reviewer, />R · REJECT</);
});

test('result report translates technical truth into business answers without fabricating time savings', () => {
  assert.match(report, /KEEP:'WEITER'/);
  assert.match(report, /FIX:'VERBESSERN'/);
  assert.match(report, /STOP:'STOPPEN'/);
  assert.match(report, /MEASURE:'WEITER MESSEN'/);
  assert.match(report, /Funktioniert es\?/);
  assert.match(report, /Spart es Zeit\?/);
  assert.match(report, /Ist es sicher\?/);
  assert.match(report, /Technische Details & Audit öffnen/);
  assert.match(report, /Noch messen/);
});

test('assistant standard path keeps one next action and new commercial truth', () => {
  assert.match(operator, /start-hauspilot-ops\.cmd/);
  assert.match(operator, /Kein Terminal, kein GitHub, kein JSON-Editieren/);
  assert.match(operator, /€990/);
  assert.match(operator, /€1\.500\/Monat/);
  assert.match(operator, /vollständig auf Monat 1 angerechnet/);
  assert.match(operator, /STARTEN/);assert.match(operator,/ANFORDERN/);assert.match(operator,/WARTEN/);assert.match(operator,/STOPP/);
  assert.match(operator,/14-Tage-Retention/);
  assert.match(operator,/ohne Founder-Eingriff/);
  assert.match(assistantReady,/Review-Datei(?:en)?/);
  assert.match(assistantReady,/Baseline\/Quelle/);
  assert.match(assistantReady,/STOPP_RETENTION/);
  assert.match(assistantReady,/Kein Opt-in → kein Abo/);
});

test('customer start contract matches free demo, Proof Week and monthly Mara', () => {
  assert.match(customerStart, /customer-facing source of truth/i);
  assert.match(customerStart, /price: \*\*€0\*\*/);
  assert.match(customerStart, /price: \*\*€990 net, one-time\*\*/);
  assert.match(customerStart, /€990 paid before kickoff/);
  assert.match(customerStart, /€1,500 net\/month/);
  assert.match(customerStart, /credited in full against the first €1,500 monthly charge/);
  assert.match(customerStart, /exactly 3 things/i);
  assert.match(customerStart, /20–50 completed historical examples/);
  assert.match(customerStart, /one simple master-data list/);
  assert.match(customerStart, /one reviewing person/);
  assert.match(customerStart, /public free demo \*\*never collects customer data\*\*/i);
  assert.match(customerStart, /payment confirmation and the secure transfer channel are still human-operated/i);
});

test('operations console enforces the same price and opt-in contract',()=>{
  assert.match(consoleSource,/PROOF_WEEK_EUR=990/);
  assert.match(consoleSource,/MONTHLY_EUR=1500/);
  assert.match(consoleSource,/MONTH_ONE_CREDIT_EUR=990/);
  assert.match(consoleSource,/Proof Week · 990 € Zahlungseingang geprüft/);
  assert.match(consoleSource,/Mara für 1\.500 €\/Monat aktivieren/);
  assert.match(consoleSource,/customer_continuation_accepted/);
  assert.match(consoleSource,/monthlyCommercialReady/);
  assert.match(consoleSource,/STOPP_RETENTION/);
  assert.match(consoleSource,/maximal 50 Fälle/);
  assert.match(consoleSource,/transfer_copies_deleted/);
});

test('public routes include free demo, Proof Week start and Mara dashboard',()=>{
  assert.match(routes,/"source": "\/try"/);
  assert.match(routes,/"destination": "\/hauspilot-try\.html"/);
  assert.match(routes,/"source": "\/start"/);
  assert.match(routes,/"source": "\/employee"/);
});
