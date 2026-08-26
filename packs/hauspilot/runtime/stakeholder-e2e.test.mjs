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
const assistantReady = read('packs/hauspilot/operator/ASSISTANT_READY.md');
const customerStart = read('packs/hauspilot/first-customer/CUSTOMER_START.md');
const consoleSource = read('packs/hauspilot/operator/ops-console.mjs');

const legacyLinks = ['pilot-command-center.html','retainer-command-center.html','hauspilot-setup.html','hauspilot-results.html'];

test('canonical customer page explains the whole paid pilot in five simple steps', () => {
  assert.match(sales, /Ein Prozess\.[\s\S]*Drei Inputs\.[\s\S]*Klare Antwort\./);
  for(const label of ['Beauftragen','Hochladen','Testen','Prüfen','Entscheiden']) assert.match(sales,new RegExp(label));
  assert.match(sales, /20–50/);
  assert.match(sales, /eine Stammdatenliste/i);
  assert.match(sales, /eine prüfende Person/i);
  assert.match(sales, /Richtig · Ändern · Falsch/);
  assert.match(sales, /Weiter · Verbessern · Stoppen/);
  assert.match(sales, /1\.330 €/);
  assert.match(sales, /570 €/);
  assert.match(sales, /Kein verstecktes Abo/);
  for (const href of legacyLinks) assert.ok(!sales.includes(href), `sales must not link legacy surface ${href}`);
});

test('canonical page tells every stakeholder what they do and what the founder does not do',()=>{
  for(const role of ['Kunde','Operations Assistant','Reviewer des Kunden'])assert.match(sales,new RegExp(role));
  assert.match(sales,/Standardfall nichts in der Delivery/);
  assert.match(sales,/Sonderpreis\/Sonderscope/);
  assert.match(sales,/Datenschutz-Ausnahmen/);
  assert.match(sales,/technische\/Safety-Eskalationen/);
});

test('customer-facing proof now truthfully states the real live release results',()=>{
  assert.match(sales,/20\/20/);
  assert.match(sales,/100\/100/);
  assert.match(sales,/8\/8/);
  assert.match(sales,/0[\s\S]*Runtime-Fehler und unsafe executions/);
  assert.match(sales,/Release-Testbench-Ergebnisse/);
  assert.match(sales,/keine Kundenergebnisse/);
  assert.doesNotMatch(sales,/Live-Modell-Release-Gate ist ein separater Schritt/);
});

test('privacy story never equates removing names with legal anonymity',()=>{
  assert.match(sales,/wirklich (?:de-identifizierte\/anonymisierte|anonymisiert\/de-identifiziert)/);
  assert.match(sales,/Objekt-\/Wohnungsbezüge[\s\S]*rückführbar/);
  assert.match(sales,/14-Tage-Retention/);
  assert.match(sales,/Transferkopien/);
  assert.match(sales,/kein falscher „Secure Wipe“-Claim/);
});

test('60-second one-pager matches the canonical flow and current live proof', () => {
  assert.match(onepager,/Ein Prozess\. Drei Inputs/);
  for(const label of ['Beauftragen','Hochladen','Testen','Prüfen','Entscheiden'])assert.match(onepager,new RegExp(label));
  assert.match(onepager,/Richtig · Ändern · Falsch/);
  assert.match(onepager,/20\/20/);
  assert.match(onepager,/100\/100/);
  assert.match(onepager,/8\/8/);
  assert.match(onepager,/Kein verstecktes Abo/);
  assert.doesNotMatch(onepager,/Live-Modell-Gate wird separat protokolliert/);
});

test('interactive demo is unmistakably a demo and uses the same five-step mental model', () => {
  assert.match(simple, /INTERAKTIVE DEMO/);
  assert.match(simple, /Beispielwerte/);
  assert.match(simple, /keine Kundenergebnisse/);
  for(const label of ['Beauftragen','Hochladen','Testen','Prüfen','Entscheiden']) assert.match(simple,new RegExp(label));
  for(const action of ['STARTEN','ANFORDERN','WARTEN','STOPP'])assert.match(simple,new RegExp(action));
  assert.match(simple,/✓ Richtig/);
  assert.match(simple,/✎ Ändern/);
  assert.match(simple,/✕ Falsch/);
  assert.match(simple,/Kunde möchte ausdrücklich weiter/);
  assert.match(simple,/Kein verstecktes Abo/);
  assert.match(simple,/Was bleibt beim Founder\?/);
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
});

test('result report translates technical truth into three business answers without fabricating time savings', () => {
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

test('assistant standard path keeps one next action and bounded escalations', () => {
  assert.match(operator, /start-hauspilot-ops\.cmd/);
  assert.match(operator, /Kein Terminal, kein GitHub, kein JSON-Editieren/);
  assert.match(operator, /STARTEN/);assert.match(operator,/ANFORDERN/);assert.match(operator,/WARTEN/);assert.match(operator,/STOPP/);
  assert.match(operator,/14-Tage-Retention/);
  assert.match(operator,/Transferkopien/);
  assert.match(operator,/ausdrücklich annimmt/);
  assert.match(operator,/ohne Founder-Eingriff/);
  assert.match(assistantReady,/Review-Datei(?:en)?/);
  assert.match(assistantReady,/Baseline\/Quelle/);
  assert.match(assistantReady,/STOPP_RETENTION/);
  assert.match(assistantReady,/Kein Opt-in → kein Abo/);
});

test('customer onboarding remains exactly three requested inputs after commercial scope is agreed', () => {
  assert.match(customerStart, /customer-facing source of truth/i);
  assert.match(customerStart, /exactly 3 things/i);
  assert.match(customerStart, /20–50 completed historical examples/);
  assert.match(customerStart, /one simple master-data list/);
  assert.match(customerStart, /one reviewing person/);
  assert.match(customerStart, /€1,330 paid before kickoff/);
  assert.match(customerStart, /remaining \*\*€570\*\*/);
  assert.match(customerStart, /public demo \*\*never collects customer data\*\*/i);
  assert.match(customerStart, /Operations tasks — not Founder-only tasks/);
});

test('operations console contract exposes the hardened no-founder controls',()=>{
  for(const text of ['Zahlungseingang 1.330 €','20–50 Beispiele','Messwerte\/Baseline','Transferkopien','ausdrücklich angenommen'])assert.match(consoleSource,new RegExp(text));
  assert.match(consoleSource,/STOPP_RETENTION/);
  assert.match(consoleSource,/Dieser Kunde\/Pilot existiert bereits/);
  assert.match(consoleSource,/maximal 50 Fälle/);
  assert.match(consoleSource,/customer_continuation_accepted/);
  assert.match(consoleSource,/transfer_copies_deleted/);
});
