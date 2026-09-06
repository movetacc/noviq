let state=null;
let pendingAuthPrompt=false;

// ── On-page toast + modal (replaces native alert/prompt, which are unreliable
// on mobile Safari — easy to miss, and blocked entirely in some Home Screen /
// standalone contexts). Every action now shows a visible on-page result. ──
function toast(msg,kind=''){
 const t=document.querySelector('#toast');
 t.textContent=msg;
 t.className='toast'+(kind?' '+kind:'');
 t.hidden=false;
 clearTimeout(t._timer);
 if(kind!=='busy') t._timer=setTimeout(()=>{t.hidden=true},7000);
}
function hideToast(){ const t=document.querySelector('#toast'); t.hidden=true; }
function modalPrompt(title,defaultValue=''){
 return new Promise(resolve=>{
  const overlay=document.querySelector('#modal-overlay');
  const input=document.querySelector('#modal-input');
  document.querySelector('#modal-title').textContent=title;
  input.value=defaultValue;
  overlay.hidden=false;
  setTimeout(()=>input.focus(),50);
  const ok=document.querySelector('#modal-ok'), cancel=document.querySelector('#modal-cancel');
  const cleanup=(val)=>{ overlay.hidden=true; ok.onclick=null; cancel.onclick=null; input.onkeydown=null; resolve(val); };
  ok.onclick=()=>cleanup(input.value);
  cancel.onclick=()=>cleanup(null);
  input.onkeydown=(e)=>{ if(e.key==='Enter') cleanup(input.value); if(e.key==='Escape') cleanup(null); };
 });
}

async function api(u,o={}){
 const r=await fetch(u,{headers:{'Content-Type':'application/json',...(o.headers||{})},...o});
 if(r.status===401){
  if(pendingAuthPrompt) throw new Error('Login required');
  pendingAuthPrompt=true;
  try{ await login(); }finally{ pendingAuthPrompt=false; }
  return api(u,o);
 }
 if(r.status===429){ toast('Too many requests — slow down and try again shortly.','error'); throw new Error('rate_limited'); }
 return r.json();
}
async function login(){
 const p=await modalPrompt('NOVIQ owner password');
 if(p===null) throw new Error('Login cancelled');
 let body={password:p};
 const t=await modalPrompt('2FA code (leave blank if not enabled)');
 if(t) body.totp=t;
 const x=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!x.ok){ const e=await x.json().catch(()=>({})); throw new Error(e.error||'Login failed'); }
}
async function logout(){ await fetch('/api/logout',{method:'POST'}); location.reload(); }

// Wrap every button action so network errors, cold starts, and API-level
// {error:...} responses all surface as a visible toast instead of silence.
function withStatus(fn,busyMsg='Working…'){
 return async(...args)=>{
  toast(busyMsg,'busy');
  try{
   const r=await fn(...args);
   return r;
  }catch(e){
   toast(String(e.message||e),'error');
  }
 };
}

async function load(){
 try{
  state=await api('/api/state');
  const m=await api('/api/metrics');
  document.querySelector('#status').innerHTML=state.stopped?'🛑 STOPPED':'🟢 ONLINE';
  const counts=Object.fromEntries(state.tasks.map(x=>[x.status,x.c]));
  document.querySelector('#cards').innerHTML=[
   ['Revenue',`$${Number(m.revenue).toFixed(2)}`],['Profit',`$${Number(m.profit).toFixed(2)}`],
   ['Leads',m.leads],['Emails Sent',m.sent],['Replies',m.replied],['Payments',m.payments],
   ['Queued',counts.queued||0],['Failed',counts.failed||0]
  ].map(x=>`<div class="card"><small>${x[0]}</small><div class="big">${x[1]}</div></div>`).join('');
  document.querySelector('#agents').innerHTML=state.agents.map(a=>`<div class="agent"><b>${a.name}</b><br><span class="pill">${a.role} · ${a.level}</span><p>XP ${a.xp} · Tasks ${a.tasks} · Success ${a.successes}</p><small>${a.last_action||'idle'}</small></div>`).join('');

  const academy=await api('/api/academy');
  document.querySelector('#academy').innerHTML=academy.map(a=>{
   const skills=Object.entries(a.skill_matrix||{});
   const bars=skills.length?skills.map(([sk,v])=>`<div class="skillrow"><small>${sk}</small><div class="skillbar"><div class="skillfill" style="width:${v}%"></div></div><small>${v}</small></div>`).join(''):'<small>No graded tasks yet.</small>';
   return `<div class="agent"><b>${a.name}</b><br><span class="pill">${a.department} · ${a.academy_rank}</span><p>Overall ${a.academy_score}/100 · Tasks ${a.tasks}</p>${bars}</div>`;
  }).join('');

  const intel=await api('/api/intelligence');
  document.querySelector('#intelligence').innerHTML=intel.length?intel.map(i=>`<div class="decision"><b>${(i.category||'trend').toUpperCase()}</b>${i.department?` · ${i.department}`:''} · <span class="pill">${i.impact} impact</span>${i.skill_update?' <span class="pill">⚠️ curriculum update</span>':''}<br>${i.signal}<br><small>${new Date(i.created_at).toLocaleString()}</small></div>`).join(''):'No signals yet — click SCAN TRENDS NOW.';

  const offersList=await api('/api/offers');
  document.querySelector('#offers').innerHTML='<pre>'+JSON.stringify(offersList,null,2)+'</pre>';
  const kpis=await api('/api/kpis');
  document.querySelector('#kpis').innerHTML=kpis.map(k=>`<div class="card"><small>${k.offerName}</small><div class="big">$${k.price}</div><p>Margin ${k.grossMarginPct}% · Close ${(k.closeRate*100).toFixed(1)}%<br>Sent ${k.sent} · Paid ${k.paid} · Rev $${k.revenue.toFixed(2)}</p></div>`).join('');
  const decisions=await api('/api/sales-decisions');
  document.querySelector('#decisions').innerHTML=decisions.length?decisions.map(d=>`<div class="decision"><b>${d.action.toUpperCase()}</b> on ${d.offer_id}${d.discount_pct?` · ${d.discount_pct}% off`:''}${d.target_offer_id?` · → ${d.target_offer_id}`:''}<br>${d.reasoning||''}<br><small>${new Date(d.created_at).toLocaleString()}</small></div>`).join(''):'No sales director decisions yet — run PREPARE OUTREACH to trigger one.';

  document.querySelector('#approvals').innerHTML=await approvals();
  document.querySelector('#log').textContent=JSON.stringify(state.events.slice(0,30),null,2);
 }catch(e){ document.querySelector('#log').textContent=String(e); }
}

async function approvals(){
 const a=await api('/api/approvals');
 return a.length?a.map(x=>`<div class="card"><b>${x.action}</b> — ${x.title}<br><button data-action="decide" data-id="${x.id}" data-decision="approve">APPROVE</button> <button data-action="decide" data-id="${x.id}" data-decision="reject">REJECT</button></div>`).join(''):'No pending approvals.';
}
async function decide(id,d){
 const r=await api('/api/approvals/'+id,{method:'POST',body:JSON.stringify({decision:d})});
 toast(r.error?r.error:`Decision recorded: ${d}`,r.error?'error':'');
 load();
}
async function control(a){
 const r=await api('/api/control',{method:'POST',body:JSON.stringify({action:a})});
 toast(r.error?r.error:`${a.toUpperCase()} complete.`,r.error?'error':'');
 load();
}
async function goal(){
 const g=await modalPrompt('CEO goal','Generate $1,000 in legitimate revenue from the service offer in the next 30 days.');
 if(!g) return;
 const r=await api('/api/goals',{method:'POST',body:JSON.stringify({goal:g})});
 toast(r.error?r.error:'Goal set.',r.error?'error':'');
 load();
}
async function importLeads(){
 const s=await modalPrompt('Paste a JSON array of leads.');
 if(!s) return;
 let parsed;
 try{ parsed=JSON.parse(s); }catch{ toast('That wasn\u2019t valid JSON — check the format and try again.','error'); return; }
 const r=await api('/api/leads/import',{method:'POST',body:JSON.stringify({leads:parsed})});
 toast(r.error?r.error:'Leads imported.',r.error?'error':'');
 load();
}
async function discover(){
 const q=await modalPrompt('Business search query','roofing companies in my area');
 if(!q) return;
 const r=await api('/api/discover',{method:'POST',body:JSON.stringify({query:q})});
 toast(r.error?r.error:`Found ${r.found||0}, added ${r.added||0} new lead(s).`,r.error?'error':'');
 load();
}
async function moneyStart(){
 const q=await modalPrompt('Target businesses','roofing companies in my area');
 if(q===null) return;
 const r=await api('/api/money/start',{method:'POST',body:JSON.stringify({query:q})});
 toast(r.ok?'Money engine queued. NOVIQ will discover → enrich → prepare → follow up.':(r.error||'Failed to start.'),r.ok?'':'error');
 load();
}
async function campaign(){
 const offers=await api('/api/offers');
 if(!offers.length){ toast('No offers configured yet.','error'); return; }
 const r=await api('/api/outreach/prepare',{method:'POST',body:JSON.stringify({offer_id:offers[0].id})});
 toast(r.error?r.error:`Outreach scheduled for ${r.scheduled??0} lead(s) (${r.enriched??0} enriched).`,r.error?'error':'');
 load();
}
async function payment(){
 const offers=await api('/api/offers');
 if(!offers.length){ toast('No offers configured yet.','error'); return; }
 const leads=await api('/api/leads');
 const lid=leads.find(x=>x.email)?.id;
 if(!lid){ toast('Need a lead with an email first.','error'); return; }
 const r=await api('/api/payment-link',{method:'POST',body:JSON.stringify({offer_id:offers[0].id,lead_id:lid})});
 toast(r.url||r.error||'Failed to create link.',r.url?'':'error');
 load();
}
async function testConnections(){
 const r=await api('/api/test-connections');
 document.querySelector('#connections').textContent=JSON.stringify(r,null,2);
 const missing=Object.entries(r).filter(([,v])=>!v).map(([k])=>k);
 toast(missing.length?`Not yet configured: ${missing.join(', ')}`:'All connections configured.',missing.length?'error':'');
}
async function scanIntelligence(){
 const r=await api('/api/intelligence/scan',{method:'POST'});
 toast(r.ok?`Scan complete — ${r.signalCount||0} new signal(s) logged.`:(r.error||'Scan failed.'),r.ok?'':'error');
 load();
}

const ACTIONS={
 moneyStart:withStatus(moneyStart,'Starting money engine…'),
 discover:withStatus(discover,'Searching for leads…'),
 goal:withStatus(goal,'Setting goal…'),
 importLeads:withStatus(importLeads,'Importing leads…'),
 campaign:withStatus(campaign,'Preparing outreach…'),
 payment:withStatus(payment,'Creating payment link…'),
 testConnections:withStatus(testConnections,'Testing connections…'),
 scanIntelligence:withStatus(scanIntelligence,'Scanning for trends…'),
 logout,
 stop:withStatus(()=>control('stop'),'Stopping…'),
 resume:withStatus(()=>control('resume'),'Resuming…'),
 cycle:withStatus(()=>control('cycle'),'Running cycle — this can take up to a minute…'),
 decide:withStatus((el)=>decide(el.dataset.id,el.dataset.decision),'Recording decision…')
};

document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');
 if(!el) return;
 const fn=ACTIONS[el.dataset.action];
 if(fn) fn(el);
});

load();
setInterval(load,5000);
