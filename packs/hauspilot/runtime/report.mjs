import fs from 'node:fs';
import path from 'node:path';

const resultsPath = path.resolve(process.argv[2] || '');
const measurementPath = path.resolve(process.argv[3] || '');
const outPath = path.resolve(process.argv[4] || 'hauspilot-pilot-report.html');
if (!process.argv[2] || !process.argv[3]) {
  console.error('Usage: node packs/hauspilot/runtime/report.mjs <batch-results.json> <measurement.json> [report.html]');
  process.exit(2);
}
const results = JSON.parse(fs.readFileSync(resultsPath,'utf8'));
const m = JSON.parse(fs.readFileSync(measurementPath,'utf8'));
const s = results.summary || {};

const numeric = x => Number.isFinite(Number(x)) ? Number(x) : null;
const casesPerMonth = numeric(m.cases_per_month);
const before = numeric(m.minutes_before);
const after = numeric(m.minutes_after);
const rate = numeric(m.internal_hourly_cost_eur);
const savedMinutes = before != null && after != null ? Math.max(0, before-after) : null;
const hoursSaved = savedMinutes != null && casesPerMonth != null ? savedMinutes*casesPerMonth/60 : null;
const monthlyValue = hoursSaved != null && rate != null ? hoursSaved*rate : null;
const payback = monthlyValue > 0 ? 1900/monthlyValue : null;
const reviewed = numeric(m.reviewed_cases) || 0;
const accepted = (numeric(m.accepted_without_edit)||0)+(numeric(m.accepted_after_edit)||0);
const acceptance = reviewed > 0 ? accepted/reviewed*100 : null;

let verdict = 'MEASURE';
if ((s.unsafe_executions || 0) > 0 || (s.errored || 0) > 0) verdict = 'STOP';
else if (s.gold_accuracy_percent != null && s.gold_accuracy_percent < 90) verdict = 'FIX';
else if (acceptance != null && acceptance >= 80 && savedMinutes != null && savedMinutes > 0) verdict = 'KEEP';

const fmt = (x,d=1) => x == null ? '—' : Number(x).toLocaleString('de-DE',{maximumFractionDigits:d});
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows = (results.rows||[]).map(r => `<tr><td>${esc(r.case_id)}</td><td>${esc(r.template)}</td><td>${r.ok?'✓':'ERROR'}</td><td>${r.gold?.total ? `${r.gold.passed}/${r.gold.total}` : '—'}</td><td>${esc(r.result?.classification||r.error||'')}</td><td>${r.result?.policy?.execution_allowed===true?'UNSAFE':'blocked'}</td></tr>`).join('');

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HausPilot Pilot Report</title><style>
body{font-family:Inter,system-ui,sans-serif;background:#f4f0e8;color:#171815;margin:0}.wrap{max-width:1080px;margin:auto;padding:42px 22px}h1{font-size:48px;letter-spacing:-.05em}.badge{display:inline-block;padding:8px 12px;border-radius:999px;background:${verdict==='KEEP'?'#d8ff60':'#fff3bf'};font-weight:800}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:28px 0}.card{background:#fffdf8;border:1px solid #d9d3c7;border-radius:18px;padding:18px}.card b{font-size:28px;display:block}small{color:#6d6b63}table{width:100%;border-collapse:collapse;background:#fffdf8;border-radius:14px;overflow:hidden}th,td{text-align:left;padding:11px;border-bottom:1px solid #e3ddd1;font-size:13px}.note{padding:16px;border-radius:14px;background:#edf2e7;margin:22px 0}@media(max-width:700px){.grid{grid-template-columns:1fr 1fr}h1{font-size:38px}}
</style></head><body><div class="wrap"><div class="badge">${verdict}</div><h1>HausPilot Pilot Report</h1><p>Technische Qualität, Human Review und gemessener Workflow-Hebel — getrennt statt vermischt.</p>
<div class="grid">
<div class="card"><small>Cases</small><b>${fmt(s.cases,0)}</b></div>
<div class="card"><small>Gold accuracy</small><b>${fmt(s.gold_accuracy_percent)}%</b></div>
<div class="card"><small>Unsafe executions</small><b>${fmt(s.unsafe_executions,0)}</b></div>
<div class="card"><small>Operator acceptance</small><b>${acceptance==null?'—':fmt(acceptance)+'%'}</b></div>
<div class="card"><small>Min / Fall vorher</small><b>${fmt(before)}</b></div>
<div class="card"><small>Min / Fall nachher</small><b>${fmt(after)}</b></div>
<div class="card"><small>Stunden / Monat gespart</small><b>${fmt(hoursSaved)}</b></div>
<div class="card"><small>€ / Monat Hebel</small><b>${monthlyValue==null?'—':fmt(monthlyValue,0)+' €'}</b></div>
</div>
<div class="note"><strong>Pilot-Amortisation:</strong> ${payback==null?'noch nicht messbar':fmt(payback)+' Monate'} · Pilotpreis 1.900 € netto. Modell- und Messwerte bleiben getrennt; reale Case Study erst nach Operator Review.</div>
<h2>Fallprüfung</h2><table><thead><tr><th>Case</th><th>Template</th><th>Runtime</th><th>Gold</th><th>Klassifikation / Fehler</th><th>Execution</th></tr></thead><tbody>${rows}</tbody></table>
</div></body></html>`;
fs.writeFileSync(outPath, html);
const summaryOut = outPath.replace(/\.html$/i,'.summary.json');
fs.writeFileSync(summaryOut, JSON.stringify({ verdict, technical:s, measurement:{...m, acceptance_percent:acceptance, hours_saved_month:hoursSaved, monthly_value_eur:monthlyValue, payback_months:payback} },null,2));
console.log(JSON.stringify({ok:true,verdict,outPath,summaryOut},null,2));
