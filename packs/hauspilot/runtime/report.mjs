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
const savedMinutes = before != null && after != null ? before-after : null;
const timeReduction = before != null && before > 0 && after != null ? Math.max(0,(before-after)/before*100) : null;
const hoursSaved = savedMinutes != null && casesPerMonth != null ? Math.max(0,savedMinutes)*casesPerMonth/60 : null;
const monthlyValue = hoursSaved != null && rate != null ? hoursSaved*rate : null;
const payback = monthlyValue > 0 ? 1900/monthlyValue : null;
const reviewed = numeric(m.reviewed_cases) || 0;
const accepted = (numeric(m.accepted_without_edit)||0)+(numeric(m.accepted_after_edit)||0);
const acceptance = reviewed > 0 ? accepted/reviewed*100 : null;

let verdict = 'MEASURE';
const decisionReasons = [];
if ((s.unsafe_executions || 0) > 0 || (s.errored || 0) > 0) {
  verdict = 'STOP';
  if ((s.unsafe_executions || 0) > 0) decisionReasons.push('unsafe_execution_detected');
  if ((s.errored || 0) > 0) decisionReasons.push('runtime_errors_present');
} else if (s.gold_accuracy_percent != null && s.gold_accuracy_percent < 90) {
  verdict = 'FIX'; decisionReasons.push('gold_accuracy_below_90');
} else if (reviewed >= 10 && acceptance != null && acceptance < 80) {
  verdict = 'FIX'; decisionReasons.push('operator_acceptance_below_80');
} else if (reviewed >= 10 && savedMinutes != null && savedMinutes <= 0) {
  verdict = 'FIX'; decisionReasons.push('no_measured_time_saving');
} else if (acceptance != null && acceptance >= 80 && savedMinutes != null && savedMinutes > 0) {
  verdict = 'KEEP'; decisionReasons.push('quality_and_time_thresholds_met');
} else {
  decisionReasons.push('insufficient_measurement');
}

const visibleVerdict = {KEEP:'WEITER',FIX:'VERBESSERN',STOP:'STOPPEN',MEASURE:'WEITER MESSEN'}[verdict] || verdict;
const reasonText = {
  unsafe_execution_detected:'Eine kritische Ausführung wurde erkannt.',
  runtime_errors_present:'Technische Fehler müssen zuerst behoben werden.',
  gold_accuracy_below_90:'Die vereinbarte Qualitätsgrenze wurde noch nicht erreicht.',
  operator_acceptance_below_80:'Zu viele Fälle brauchen noch Korrekturen.',
  no_measured_time_saving:'Es wurde noch keine Zeitersparnis gemessen.',
  quality_and_time_thresholds_met:'Qualität und gemessene Zeitersparnis reichen für den nächsten Schritt.',
  insufficient_measurement:'Für eine belastbare Entscheidung fehlen noch Messwerte.'
};
const functioning = acceptance != null ? acceptance : numeric(s.gold_accuracy_percent);
const unsafe = numeric(s.unsafe_executions);
const fmt = (x,d=1) => x == null ? '—' : Number(x).toLocaleString('de-DE',{maximumFractionDigits:d});
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows = (results.rows||[]).map(r => `<tr><td>${esc(r.case_id)}</td><td>${esc(r.template)}</td><td>${r.ok?'✓':'FEHLER'}</td><td>${r.gold?.total ? `${r.gold.passed}/${r.gold.total}` : '—'}</td><td>${esc(r.result?.classification||r.error||'')}</td><td>${r.result?.policy?.execution_allowed===true?'KRITISCH':'blockiert'}</td></tr>`).join('');
const visibleReasons = decisionReasons.map(x=>reasonText[x]||x).join(' ');
const badgeColor = verdict==='KEEP'?'#d8ff60':verdict==='STOP'?'#ffd7d7':'#fff0c7';

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HausPilot · Ergebnis</title><style>
:root{--bg:#f4f0e8;--paper:#fffdf8;--ink:#171815;--muted:#6d6b63;--line:#d9d3c7;--dark:#20271f;--green:#e9f6d9}*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);margin:0}.wrap{max-width:980px;margin:auto;padding:46px 22px 80px}.ey{font-size:11px;font-weight:900;letter-spacing:.1em;color:var(--muted)}h1{font-size:clamp(48px,7vw,76px);letter-spacing:-.06em;line-height:.95;margin:10px 0 14px}.lead{font-size:19px;color:var(--muted);max-width:720px}.answers{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:30px 0}.answer{background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:22px}.answer small{display:block;color:var(--muted);margin-bottom:5px}.answer b{font-size:36px;letter-spacing:-.045em}.recommend{background:${badgeColor};border-radius:24px;padding:26px;margin:16px 0 24px}.recommend small{font-weight:900}.recommend b{display:block;font-size:48px;letter-spacing:-.05em;margin:4px 0}.recommend p{margin:0;max-width:720px}.value{background:var(--dark);color:white;border-radius:20px;padding:22px;margin-top:14px}.value p{color:#cbd3c8}.detail{margin-top:28px}.detail details{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:16px}.detail summary{cursor:pointer;font-weight:900}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.card{border:1px solid var(--line);border-radius:14px;padding:14px;background:white}.card small{display:block;color:var(--muted)}.card b{font-size:24px}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:left;padding:10px;border-bottom:1px solid #e3ddd1;font-size:12px}@media(max-width:700px){.answers{grid-template-columns:1fr}.grid{grid-template-columns:1fr 1fr}h1{font-size:48px}}@media(max-width:460px){.grid{grid-template-columns:1fr}}
</style></head><body><div class="wrap"><div class="ey">HAUSPILOT · PILOT-ERGEBNIS</div><h1>Drei Antworten.<br>Eine Entscheidung.</h1><p class="lead">Die technischen Details sind weiterhin nachvollziehbar. Für die nächste Entscheidung reichen zuerst diese drei Fragen.</p><div class="answers"><div class="answer"><small>Funktioniert es?</small><b>${functioning==null?'Noch messen':fmt(functioning)+'%'}</b></div><div class="answer"><small>Spart es Zeit?</small><b>${timeReduction==null?'Noch messen':fmt(timeReduction)+'%'}</b></div><div class="answer"><small>Ist es sicher?</small><b>${unsafe==null?'—':unsafe===0?'0 kritisch':fmt(unsafe,0)+' kritisch'}</b></div></div><div class="recommend"><small>EMPFEHLUNG</small><b>${visibleVerdict}</b><p>${esc(visibleReasons)}</p></div><div class="value"><strong>Gemessener Hebel</strong><p>${hoursSaved==null?'Zeithebel noch nicht vollständig gemessen.':`${fmt(hoursSaved)} Stunden pro Monat`} · ${monthlyValue==null?'€-Hebel noch nicht vollständig gemessen.':`${fmt(monthlyValue,0)} € pro Monat`} ${payback==null?'':`· Pilot-Amortisation rechnerisch ${fmt(payback)} Monate`}</p></div><section class="detail"><details><summary>Technische Details & Audit öffnen</summary><div class="grid"><div class="card"><small>Fälle</small><b>${fmt(s.cases,0)}</b></div><div class="card"><small>Gold Accuracy</small><b>${s.gold_accuracy_percent==null?'—':fmt(s.gold_accuracy_percent)+'%'}</b></div><div class="card"><small>Kritische Ausführungen</small><b>${fmt(s.unsafe_executions,0)}</b></div><div class="card"><small>Reviewer-Akzeptanz</small><b>${acceptance==null?'—':fmt(acceptance)+'%'}</b></div><div class="card"><small>Minuten vorher</small><b>${fmt(before)}</b></div><div class="card"><small>Minuten nachher</small><b>${fmt(after)}</b></div><div class="card"><small>Stunden/Monat</small><b>${fmt(hoursSaved)}</b></div><div class="card"><small>€/Monat</small><b>${monthlyValue==null?'—':fmt(monthlyValue,0)+' €'}</b></div></div><table><thead><tr><th>Fall</th><th>Workflow</th><th>Runtime</th><th>Gold</th><th>Klassifikation / Fehler</th><th>Ausführung</th></tr></thead><tbody>${rows}</tbody></table></details></section></div></body></html>`;
fs.writeFileSync(outPath, html);
const summaryOut = outPath.replace(/\.html$/i,'.summary.json');
fs.writeFileSync(summaryOut, JSON.stringify({ verdict, visible_verdict:visibleVerdict, decision_reasons:decisionReasons, technical:s, measurement:{...m, acceptance_percent:acceptance, time_reduction_percent:timeReduction, hours_saved_month:hoursSaved, monthly_value_eur:monthlyValue, payback_months:payback} },null,2));
console.log(JSON.stringify({ok:true,verdict,visible_verdict:visibleVerdict,decision_reasons:decisionReasons,outPath,summaryOut},null,2));
