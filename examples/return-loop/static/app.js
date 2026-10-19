/* RETURN LOOP: no framework, no build step, no external mutation. */
const $ = (id) => document.getElementById(id);
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selected = 'TK-1047';
let ticketCache = [];
let toastTimer;

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
async function api(path, opts={}) {
  const r = await fetch('/api'+path, {headers:{'Content-Type':'application/json'},...opts});
  let data;
  try { data = await r.json(); } catch(e) { throw new Error('Unexpected API response'); }
  if(!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
  return data;
}
const statusLabel = (t) => t.sent_at ? 'Simulated sent' : t.approved_at ? 'Approved' : t.status === 'READY_FOR_REVIEW' ? 'Ready to review' : t.status === 'SECURITY_REVIEW' ? 'Security review' : t.status === 'NEEDS_VERIFICATION' ? 'Needs verification' : t.status ? t.status : 'Unanalysed';
const shortCategory = t => t.intent || (t.subject.toLowerCase().includes('hole')?'quality': '');

async function refreshOverview(){
  const o=await api('/overview');
  const items=[
    {label:'INCOMING TICKETS',value:o.total_tickets,detail:'Fictional support cases'},
    {label:'ANALYSED',value:o.analysed,detail:'Saved classification traces'},
    {label:'APPROVED',value:o.approved,detail:'Manual demo decisions'},
    {label:'QUALITY ALERTS',value:o.quality_alerts,detail:'SQL signal · not a verdict'},
  ];
  $('kpis').innerHTML=items.map(o=>`<div class="kpi"><div class="kpi-label">${safe(o.label)}</div><div class="kpi-value">${safe(o.value).padStart?.(2,'0') ?? safe(o.value)}</div><div class="kpi-detail">${safe(o.detail)}</div></div>`).join('');
}
function renderTickets(){
  $('ticket-total').textContent=String(ticketCache.length).padStart(2,'0');
  $('case-list').innerHTML=ticketCache.map(t=>`<button type="button" class="case ${t.id===selected?'active':''}" data-ticket="${safe(t.id)}" aria-pressed="${t.id===selected}">
      <div class="case-top"><span class="case-id">${safe(t.id)}</span><span class="case-id">${safe(t.customer)}</span></div>
      <div class="case-subject">${safe(t.subject)}</div>
      <div class="case-bottom"><span><i class="mini-dot ${safe(shortCategory(t))}"></i>${safe(t.product_name || 'Unknown order')}</span><span>↗</span></div>
  </button>`).join('');
  document.querySelectorAll('[data-ticket]').forEach(btn=>btn.addEventListener('click',()=>{
    selected=btn.dataset.ticket;
    renderTickets(); loadDetail();
  }));
}
async function loadTickets(){ticketCache=await api('/tickets');renderTickets()}
const eCard = e => `<div class="evidence-item"><span class="micro">${safe(e.id)} · ${safe(e.label)}</span><strong>${safe(e.value)}</strong></div>`;
const actionPill = text => `<span class="chip">${safe(text)}</span>`;
function renderAnalysis(d){
 const {analysis:a,review:r,outbox:x,audit:log,signal}=d;
 if(!a) return `<div class="flowline">TICKET <i></i> ORDER <i></i> AGENT <i></i> REVIEW</div><div class="empty-analysis"><div class="empty-icon">↗</div><h4>What would the agent do?</h4><p>Analyse this ticket against a mock order, product catalogue and service policy. No LLM or customer data is needed.</p><button type="button" class="primary-btn" id="analyse">Analyse case <span>↗</span></button></div>`;
 let ready=a.status==='READY_FOR_REVIEW', pending=!r?.approved_at;
 let badge=a.status==='READY_FOR_REVIEW'?['READY FOR REVIEW','']:
           a.status==='SECURITY_REVIEW'?['SECURITY REVIEW','block']:
           ['NEEDS VERIFICATION','warn'];
 let sources=a.evidence.map(eCard).join('');
 let qualitySignal=signal?.alert && a.intent==='quality' ? `<div class="insight-banner"><span class="spark">✳</span><div><strong>Cross-team quality signal: ${safe(signal.sku)}</strong><br>${safe(signal.quality_reports)} annotated complaints across ${safe(signal.units_30d)} synthetic units / 30d (${safe(signal.complaints_per_1k)} per 1,000). Flag for investigation, not proof of a defect.</div></div>`:'';
 let warnings=a.risks.map(w=>`<div class="risk-banner">⚠ ${safe(w)}</div>`).join('');
 let actions=a.actions.map(actionPill).join('');
 let details=`${safe(a.source)} · ${safe(a.elapsed_ms)} ms processing · ${a.prompt_tokens===null?'no model call':safe(a.prompt_tokens)+' prompt tokens'}`;
 let feedback=`<div class="feedback-row"><span>REVIEWER FEEDBACK</span><button type="button" data-feedback="helpful">Helpful ✓</button><button type="button" data-feedback="needs_correction">Needs correction ↺</button><button type="button" data-feedback="incorrect">Incorrect ×</button></div>`;
 let approvalNote=r?.approved_at?`<span class="state-tag">Approved by ${safe(r.reviewer)}</span>`:'';
 let timeline=log.length ? log.map(l=>`<div class="audit-line"><span>●</span><div><strong>${safe(l.event)}</strong> · ${safe(l.detail)}</div></div>`).join(''):'<div class="notice">No recorded effects.</div>';
 return `
 <div class="flowline">VERIFIED FACTS <i></i> INTENT <i></i> REVIEW <i></i> SIMULATED WRITE</div>
 <div class="box-title"><span>AGENT PROPOSAL / ${safe(a.intent.toUpperCase())}</span><span class="state-tag ${badge[1]}">${badge[0]}</span></div>
 ${qualitySignal}${warnings}
 <div class="box-title">NEXT ACTIONS <span>policy-bounded</span></div><div class="context-chips">${actions}</div>
 <div class="box-title">DRAFTED RESPONSE <span>editable by reviewer</span></div>
 <div class="draft-box"><div class="draft-top"><span>TO ${safe(d.ticket.customer)} · SUPPORT DRAFT</span><span>NOT SENT</span></div><textarea id="reply" class="reply-input" aria-label="Customer reply draft" ${x?'disabled':''}>${safe(r?.edited_reply || a.suggested_reply)}</textarea></div>
 <div class="actions"><button type="button" class="action dark" id="approve" ${!ready||Boolean(x)?'disabled':''}>${r?.approved_at?'Update approval':'Approve draft'} →</button><button type="button" class="action" id="send" ${!ready||pending?'disabled':''}>Simulate send ↗</button><button type="button" class="action" id="trace">View evidence ↓</button></div>
 <div class="notice">${x?'✓ Written to local SQLite outbox only. No external message sent.':'A simulated send requires explicit review; no Zendesk, email or refund API is connected.'} <span>${approvalNote}</span></div>
 ${feedback}
 <div id="trace-panel" class="trace-panel"><div class="box-title"><span>PROVENANCE / VERIFIED MOCK RECORDS</span><span>${safe(details)}</span></div><div class="evidence-list">${sources}</div><div class="box-title">REPLAYABLE AUDIT <span>${log.length} events</span></div><div class="audit-list">${timeline}</div></div>
 `;
}
async function loadDetail(){
  const id=selected;
  $('work-area').innerHTML='<div class="loading">Resolving order and evidence…</div>';
  try{
    const d=await api('/tickets/'+id);
    if(selected!==id)return;
    const {ticket:t,order:o,product:p}=d;
    const chips=[o?`<span class="chip">✓ Order ${safe(o.order_id)}</span>`:'<span class="chip unknown">? Order not verified</span>',
      p?`<span class="chip">${safe(p.name)} · ${safe(p.sku)}</span>`:'',
      o?`<span class="chip">Shipment: ${safe(o.state)}</span>`:''];
    $('work-area').innerHTML=`
      <div class="work-head"><div><div class="eyebrow">CURRENT CASE / ${safe(t.id)}</div><h3>${safe(t.subject)}</h3></div><span class="case-pill">${safe(d.analysis?.intent || 'UNCLASSIFIED')}</span></div>
      <div class="ticket-message"><div class="speaker"><span>FROM ${safe(t.customer.toUpperCase())} · MOCK CUSTOMER SERVICE</span><span>${safe(t.id)}</span></div><p>${safe(t.body)}</p></div>
      <div class="context-chips">${chips.filter(Boolean).join('')}</div>
      <div class="analysis-panel">${renderAnalysis(d)}</div>`;
    bindDetailButtons();
  }catch(e){ $('work-area').innerHTML=`<div class="risk-banner">Could not load case: ${safe(e.message)}</div>` }
}
function bindDetailButtons(){
  $('analyse')?.addEventListener('click',()=>mutate('/tickets/'+selected+'/analyse'));
  $('approve')?.addEventListener('click',()=>{const value=$('reply')?.value || '';const reviewer='Demo reviewer';mutate('/tickets/'+selected+'/approve',{reviewer,edited_reply:value})});
  $('send')?.addEventListener('click',()=>mutate('/tickets/'+selected+'/simulate-send'));
  $('trace')?.addEventListener('click',()=>{$('trace-panel').scrollIntoView({behavior:'smooth',block:'center'});});
  document.querySelectorAll('[data-feedback]').forEach(b=>b.addEventListener('click',()=>mutate('/tickets/'+selected+'/feedback',{reviewer:'Demo reviewer',feedback:b.dataset.feedback})));
}
async function mutate(endpoint,data){
  try{
    let r=await api(endpoint,{method:'POST',...(data?{body:JSON.stringify(data)}:{})});
    toast(r.status==='SIMULATED_SENT'?'Local outbox updated — no external message':r.stored?'Feedback stored':r.status==='APPROVED'?'Approved in demo':r.replayed?'Existing analysis reused':'Completed. Check evidence below.');
    await Promise.all([refreshOverview(),loadTickets()]); await loadDetail();
  } catch(e){toast('Blocked: '+e.message)}
}
async function showSignals(){
 const div=$('signal-detail');div.innerHTML='<div class="loading">Running SQL query…</div>';
 try{
  const result=await api('/signals');let s=result.items;let top=s.find(x=>x.alert)||s[0];
  div.innerHTML=`<div class="signal-grid"><div class="signal-highlight"><div class="eyebrow">↗ POSSIBLE QUALITY CLUSTER · INVESTIGATE</div><h3>${safe(top.name)}<br>${safe(top.sku)}</h3><div class="big-number">${safe(top.complaints_per_1k)}<small style="font-size:14px;letter-spacing:0"> / 1k</small></div><p>${safe(top.quality_reports)} distinct synthetic reports / ${safe(top.units_30d)} synthetic units sold in 30 days. This is a review trigger, not a production diagnosis.</p></div><div><div class="number-tag">THRESHOLD</div><h3 style="font-weight:500;font-size:24px;margin:15px 0">${safe(result.threshold.min_reports)}+ complaints<br><span style="color:#66917d">AND</span> ${safe(result.threshold.min_per_1k)}+/1k</h3><p style="font-size:13px;line-height:1.8;color:#7c8a7d">A query joins orders with annotated support tickets, groups by SKU and normalises by a synthetic 30-day sales denominator.</p><div class="context-chips"><span class="chip">SQL aggregation</span><span class="chip">No LLM guess</span><span class="chip">Human validation</span></div></div></div>
  <table class="signal-table"><thead><tr><th>SKU / PRODUCT</th><th>REPORTS</th><th>UNITS / 30D</th><th>PER 1,000</th><th>STATUS</th></tr></thead><tbody>${s.map(item=>`<tr><td><strong>${safe(item.sku)}</strong><br>${safe(item.name)}</td><td>${safe(item.quality_reports)}</td><td>${safe(item.units_30d)}</td><td><div class="bar-track"><div class="bar-fill ${item.alert?'alert':''}" style="width:${Math.min(100,item.complaints_per_1k/80*100)}%"></div></div><span class="micro">${safe(item.complaints_per_1k)}</span></td><td>${item.alert?'<span class="state-tag warn">Investigate</span>':'<span class="state-tag">Within demo threshold</span>'}</td></tr>`).join('')}</tbody></table><p class="notice" style="margin-top:16px">${safe(result.limitations)}</p>`;
 }catch(e){div.textContent='Error: '+e.message;}
}
async function runEvals(){
  $('run-evals').disabled=true;
  $('eval-heading').textContent='Running repeatable checks…';
  try{
    const r=await api('/evals/run',{method:'POST'});
    $('eval-heading').textContent=`${r.passed} / ${r.total} synthetic checks passed`;
    $('eval-subtitle').textContent=`${r.duration_ms} ms · ${r.model_calls} model calls · ${r.scope}`;
    $('eval-table').innerHTML='<div class="eval-row"><strong>CONTRACT</strong><strong>EXPECTED</strong><strong>RESULT</strong></div>'+r.checks.map(x=>`<div class="eval-row"><span>${safe(x.name)}</span><span>${safe(x.expected)}</span><span class="${x.pass?'eval-result':'state-tag block'}">${x.pass?'PASS ✓':'FAIL ×'}</span></div>`).join('');
    toast(`${r.passed}/${r.total} synthetic regression checks passed`);
  } catch(e){toast(e.message)} finally{$('run-evals').disabled=false}
}
function switchView(name){
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));
 document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('current',b.dataset.view===name));
 if(name==='signals')showSignals();
 window.scrollTo({top:0,behavior:'smooth'});
}
function setup(){
 document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
 $('run-evals').addEventListener('click',runEvals);
 $('demo-start').addEventListener('click',()=>{$('workbench').scrollIntoView({behavior:'smooth',block:'start'});});
 $('reset').addEventListener('click',async()=>{
  if(!confirm('Reset all synthetic analyses, decisions and feedback stored in this demo?'))return;
  try{await api('/demo/reset',{method:'POST'});selected='TK-1047';await Promise.all([refreshOverview(),loadTickets()]);await loadDetail();toast('Demo reset. Synthetic fixtures preserved.');switchView('overview')}catch(e){toast(e.message)}
 });
 Promise.all([refreshOverview(),loadTickets()]).then(loadDetail).catch(e=>toast('API unavailable: '+e.message));
}
window.addEventListener('DOMContentLoaded',setup);
