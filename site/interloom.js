const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const consoleEl = $('#console');

function traceRows(steps){
  return steps.map(([name,detail,state]) => `<div class="trace-row ${state}"><span>${state==='pass'?'✓':state==='fail'?'×':'!'}</span><div><b>${esc(name)}</b><small>${esc(detail)}</small></div><em>${state}</em></div>`).join('');
}
function evidenceRows(items){
  return items.map(([name,detail,state]) => `<div class="evidence-row"><span class="state ${state}">${state==='verified'?'✓':'!'}</span><div><b>${esc(name)}</b><small>${esc(detail)}</small></div></div>`).join('');
}
function metric(label,val){return `<div class="metric"><span><b>${label}</b><strong>${val}%</strong></span><i><em style="width:${val}%"></em></i></div>`}

async function run(replay=false){
  consoleEl.innerHTML = `<div class="console-top"><span><i></i> Factory runtime</span><b>RUNNING</b></div><div class="console-empty"><div class="pulse">…</div><h3>Executing the reliability contract</h3><p>context → tools → evidence → completion gate</p></div>`;
  try{
    const res = await fetch('/api/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({demo:'interloom',replay})});
    if(!res.ok) throw new Error('runtime returned '+res.status);
    const d = await res.json();
    render(d);
  }catch(err){
    consoleEl.innerHTML = `<div class="console-top"><span><i class="bad"></i> Factory runtime</span><b>ERROR</b></div><div class="console-empty"><div class="pulse">!</div><h3>Demo API unavailable</h3><p>${esc(err.message)}. The source remains inspectable on GitHub.</p><button class="btn primary light" id="retryBtn">Retry →</button></div>`;
    $('#retryBtn')?.addEventListener('click',()=>run(false));
  }
}

function render(d){
  const blocked = d.status === 'blocked';
  consoleEl.innerHTML = `
    <div class="console-top"><span><i class="${blocked?'bad':''}"></i> ${esc(d.worker)}</span><b>${blocked?'BLOCKED':'REPLAY PASSED'}</b></div>
    <div class="run-grid">
      <section class="trace"><header><span>EXECUTION TRACE</span><code>${esc(d.runId)}</code></header>${traceRows(d.steps)}</section>
      <aside class="evidence"><header><span>COMPLETION EVIDENCE</span><b>${d.evidence.length} checks</b></header>${evidenceRows(d.evidence)}</aside>
    </div>
    <div class="finding ${blocked?'blocked':''}"><div><small>${blocked?'DETERMINISTIC COMPLETION GATE':'REPLAY RESULT'}</small><h3>${esc(d.finding)}</h3></div><span>${blocked?'FAIL':'PASS'}</span></div>
    <div class="proposal"><div><small>${blocked?'NEXT ENGINEERING MOVE':'REGRESSION CASE READY'}</small><h3>${blocked?'Turn this failure into a replayable eval, revise the procedure, and try again.':'The revised trace now satisfies every completion requirement.'}</h3><p>${esc(d.gate)}</p></div><div>${blocked?'<button class="btn primary" id="replayBtn">Add eval + replay revised procedure ↻</button>':'<button class="btn primary" id="againBtn">Run failure again ↺</button>'}</div></div>
    <div class="reliability"><header><span>RELIABILITY SIGNALS</span><b>synthetic demo</b></header><div class="metrics">${metric('Completion',d.reliability.completion)}${metric('Tools',d.reliability.tools)}${metric('Evidence',d.reliability.evidence)}${metric('Escalation',d.reliability.escalation)}</div></div>`;
  $('#replayBtn')?.addEventListener('click',()=>run(true));
  $('#againBtn')?.addEventListener('click',()=>run(false));
}

$('#runBtn')?.addEventListener('click',()=>run(false));
