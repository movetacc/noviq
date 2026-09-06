let state=null;
let pendingAuthPrompt=false;

async function api(u,o={}){
 const r=await fetch(u,{headers:{'Content-Type':'application/json',...(o.headers||{})},...o});
 if(r.status===401){
  if(pendingAuthPrompt) throw new Error('Login required');
  pendingAuthPrompt=true;
  try{ await login(); }finally{ pendingAuthPrompt=false; }
  return api(u,o);
 }
 if(r.status===429){ alert('Too many requests — slow down and try again shortly.'); throw new Error('rate_limited'); }
 return r.json();
}
async function login(){
 const p=prompt('NOVIQ owner password');
 if(p===null) throw new Error('Login cancelled');
 let body={password:p};
 const t=prompt('2FA code (leave blank if not enabled)');
 if(t) body.totp=t;
 const x=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!x.ok){ const e=await x.json().catch(()=>({})); throw new Error(e.error||'Login failed'); }
}
async function logout(){ await fetch('/api/logout',{method:'POST'}); location.reload(); }

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
async function decide(id,d){ await api('/api/approvals/'+id,{method:'POST',body:JSON.stringify({decision:d})}); load(); }
async function control(a){ await api('/api/control',{method:'POST',body:JSON.stringify({action:a})}); load(); }
async function goal(){
 const g=prompt('CEO goal','Generate $1,000 in legitimate revenue from the service offer in the next 30 days.');
 if(g) await api('/api/goals',{method:'POST',body:JSON.stringify({goal:g})});
 load();
}
async function importLeads(){
 const s=prompt('Paste a JSON array of leads.');
 if(!s) return;
 await api('/api/leads/import',{method:'POST',body:JSON.stringify({leads:JSON.parse(s)})});
 load();
}
async function discover(){
 const q=prompt('Business search query','roofing companies in my area');
 if(!q) return;
 const r=await api('/api/discover',{method:'POST',body:JSON.stringify({query:q})});
 alert(JSON.stringify(r));
 load();
}
async function moneyStart(){
 const q=prompt('Target businesses','roofing companies in my area');
 const r=await api('/api/money/start',{method:'POST',body:JSON.stringify({query:q})});
 alert(r.ok?'Money engine queued. NOVIQ will discover → enrich → prepare → follow up.':r.error);
 load();
}
async function campaign(){
 const offers=await api('/api/offers');
 const r=await api('/api/outreach/prepare',{method:'POST',body:JSON.stringify({offer_id:offers[0].id})});
 alert(JSON.stringify(r));
 load();
}
async function payment(){
 const offers=await api('/api/offers');
 const leads=await api('/api/leads');
 const lid=leads.find(x=>x.email)?.id;
 if(!lid){ alert('Need a lead with an email first.'); return; }
 const r=await api('/api/payment-link',{method:'POST',body:JSON.stringify({offer_id:offers[0].id,lead_id:lid})});
 alert(r.url||r.error);
 load();
}
async function testConnections(){
 const r=await api('/api/test-connections');
 document.querySelector('#connections').textContent=JSON.stringify(r,null,2);
}
async function scanIntelligence(){
 const r=await api('/api/intelligence/scan',{method:'POST'});
 alert(r.ok?`Scan complete — ${r.signalCount||0} new signal(s) logged.`:r.error);
 load();
}

const ACTIONS={moneyStart,discover,goal,importLeads,campaign,payment,testConnections,scanIntelligence,logout,
 stop:()=>control('stop'), resume:()=>control('resume'), cycle:()=>control('cycle'),
 decide:(el)=>decide(el.dataset.id,el.dataset.decision)};

document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');
 if(!el) return;
 const fn=ACTIONS[el.dataset.action];
 if(fn) fn(el);
});

load();
setInterval(load,5000);
