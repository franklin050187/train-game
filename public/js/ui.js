/* Rail Run — UI rendering: tab panels, journey animation, result screen */

/* ---------- header HUD (money · level/xp · next unlock) ---------- */
function hudNextUnlock(){
  const lv=LV(), m=money(), best=bestEngineIdx();
  const nextE=best<ENGINES.length-1?ENGINES[best+1]:null;
  const un=WAGONS.filter(w=>w.price>0&&!ownedCount(w.id)).sort((a,b)=>unlockCost(a)-unlockCost(b))[0];
  let cand=[];
  if(nextE){
    const need=lv<nextE.lv?{k:"lv",have:lv,need:nextE.lv,label:t("eg_"+nextE.id)}
                        :{k:"€",have:m,need:nextE.price,label:t("eg_"+nextE.id)};
    cand.push({label:t("eg_"+nextE.id),kind:need.k,have:need.have,need:need.need});
  }
  if(un){
    const need=lv<un.lv?{have:lv,need:un.lv}:{have:m,need:unlockCost(un)};
    cand.push({label:un.ic+" "+t("wc_"+un.id),kind:lv<un.lv?"lv":"€",have:need.have,need:need.need});
  }
  cand.sort((a,b)=>a.need-a.need);
  const g=cand[0];
  if(!g) return `<span class="hud-done">${t("hud_done")}</span>`;
  const ready=g.kind==="€"?m>=g.need:lv>=g.need;
  const note=g.kind==="€"?(ready?t("goal_ready"):fmt("eur_to_go",{x:g.need-g.have}))
                       :fmt("lv_goal",{a:g.have,b:g.need});
  return `${fmt("hud_next",{n:g.label})} <span class="hud-note ${ready?"ok":""}">${note}</span>`;
}
function hud(){
  const lv=LV(), lvI=lvNow();
  const pct=lvNow()>=XP.length-1?100:Math.round((state.tx-XP[lvI])/(XP[lvI+1]-XP[lvI])*100);
  return `<span class="hud-seg hud-lv">${fmt("hud_lv",{l:lv})} <span class="hud-xp">${state.tx} XP</span> <span class="hud-bar"><span style="width:${pct}%"></span></span></span><span class="hud-sep">·</span><span class="hud-seg">${hudNextUnlock()}</span>`;
}

let showShop=false;
function toggleShop(){ showShop=!showShop; trainTab(); }

function trainTab(){
  const s=speed(),es=effSpeed(),c=capNow(),w=weight(),oc=opCost(),max=slots(),lv=LV();
  const drag=overPull();
  const panel=document.getElementById("panel");
const slotHTML=state.equip.map((id,idx)=>{const wg=WAGONS.find(x=>x.id===id);
    return `<div class="wagon-slot"><span>${wg.ic} ${t("wc_"+id)}</span><span class="muted">⚡${wg.sp>=0?"+":""}${wg.sp} · ${wg.cap}t ·€${wg.cost}</span>
     ${state.equip.length>1?`<button class="remove" onclick="unequip(${idx})">${t("remove")}</button>`:""}</div>`;}).join("");
  const ownedIds=Object.keys(state.owned);
  const parkHTML=ownedIds.filter(id=>ownedCount(id)>state.equip.filter(e=>e===id).length).map(id=>{const wg=WAGONS.find(x=>x.id===id);
    const available=ownedCount(id)-state.equip.filter(e=>e===id).length;
    return `<div class="wagon-slot"><span>${wg.ic} ${t("wc_"+id)} ×${available}</span><span class="muted">⚡${wg.sp>=0?"+":""}${wg.sp} · ${wg.cap}t ·€${wg.cost}/run</span>
     <button class="remove" style="background:#2f7d43" onclick="equipOwned('${id}')">${t("hitch")}</button></div>`;}).join("");
  const nextE=ENGINES.findIndex((e,i)=>!ownsE(i));
  const engHTML=ENGINES.map((e,i)=>{
   const owned=ownsE(i), cur=owned&&i===state.engineIdx;
   let act=cur?`<span class="badge" style="background:#d9a441;color:#241a06">${t("in_use")}</span>`
    :owned?`<button class="small" onclick="setEngine(${i})">${t("use")}</button>`
    :i===nextE?(lv>=e.lv&&state.money>=e.price?`<button class="small" id="${i===0&&inTutorial()?`tut-buy-engine`:""}" onclick="buyEngine(${i})">${fmt("buy_btn",{p:e.price})}</button>`
    :`<div class="muted" style="font-size:12px">${lv<e.lv?fmt("lv_needed",{l:e.lv}):`€${e.price}`}</div>`):'';
   return `<div class="eng ${cur?"sel":owned?"own":""}">
    <b>${t("eg_"+e.id)}</b> <span class="badge">⚡ ${e.sp}</span><span class="badge">${fmt("pull_badge",{p:e.pull})}</span>
    ${act}</div>`;}).join("");
  const showBox=(inTutorial()&&!tutDone()&&tutStep()==="buy_wagon");
  let avHTML=WAGONS.filter(w=>w.price>0||(showBox&&w.id==="box")).map(w=>{
    const cost=unlockCost(w), firstCopy=ownedCount(w.id)===0;
    const afford=state.money>=cost&&lv>=w.lv;
    return `<div class="card"><span class="rarity r-${rClass(w.spec)}">${t("sp_"+w.id)}</span><b>${w.ic} ${t("wc_"+w.id)}</b>
     <p class="muted" style="font-size:14px;margin:4px 0">⚡${w.sp>=0?"+":""}${w.sp} · ${w.cap}t · ${w.w}t · €${w.cost}/run</p>
     ${afford?`<button class="action" id="${w.id==="box"&&inTutorial()?`tut-buy-box`:""}" onclick="buy('${w.id}')">${firstCopy?fmt("buy_wag_unlock",{p:cost}):fmt("buy_wag",{p:cost})}</button>`
     :`<div class="muted" style="font-size:12px;margin-top:10px">${lv<w.lv?fmt("lock_lv",{l:w.lv}):firstCopy?fmt("buy_wag_unlock",{p:cost}):fmt("buy_wag",{p:cost})}</div>`}</div>`;}).join("");
  const unW=WAGONS.filter(w=>w.price>0&&!ownedCount(w.id)).sort((a,b)=>unlockCost(a)-unlockCost(b))[0];
  const featE=ENGINES.findIndex((e,i)=>!ownsE(i));
  let feats=[];
  if(featE>=0&&featE<ENGINES.length){
    const e=ENGINES[featE], afford=lv>=e.lv&&state.money>=e.price;
    feats.push(`<div class="eng ${afford?"own":""}"><b>${t("eg_"+e.id)}</b> <span class="badge">⚡ ${e.sp}</span><span class="badge">${fmt("pull_badge",{p:e.pull})}</span>
      ${afford?`<button class="small" id="${featE===0&&inTutorial()?`tut-buy-engine`:""}" onclick="buyEngine(${featE})">${fmt("buy_btn",{p:e.price})}</button>`
        :`<div class="muted" style="font-size:12px">${lv<e.lv?fmt("lv_needed",{l:e.lv}):`€${e.price}`}</div>`}</div>`);
  }
  if(unW){
    const cost=unlockCost(unW), firstCopy=ownedCount(unW.id)===0, afford=state.money>=cost&&lv>=unW.lv;
    feats.push(`<div class="card"><span class="rarity r-${rClass(unW.spec)}">${t("sp_"+unW.id)}</span><b>${unW.ic} ${t("wc_"+unW.id)}</b>
      <p class="muted" style="font-size:14px;margin:4px 0">⚡${unW.sp>=0?"+":""}${unW.sp} · ${unW.cap}t · €${unW.cost}/run</p>
      ${afford?`<button class="action" id="${unW.id==="box"&&inTutorial()?`tut-buy-box`:""}" onclick="buy('${unW.id}')">${firstCopy?fmt("buy_wag_unlock",{p:cost}):fmt("buy_wag",{p:cost})}</button>`
        :`<div class="muted" style="font-size:12px;margin-top:10px">${lv<unW.lv?fmt("lock_lv",{l:unW.lv}):fmt("buy_wag_unlock",{p:cost})}</div>`}</div>`);
  }
  const featPanel=feats.length?`<h3 style="margin:14px 0 6px">${t("h_next_unlock")}</h3><div class="grid2">${feats.join("")}</div>`:"";
  panel.innerHTML=`<h2>${t("tab_train")} <span class="muted" style="font-size:13px">Lv ${lv}</span></h2>
  <div style="display:flex;gap:10px;margin-bottom:12px">
   <button class="flowbtn gold" onclick="showTab(1)">${t("tab1_cta")}</button>
  </div>
  <div class="stats">
   <div class="stat">⚡ ${t("stat_speed")} <b>${s}</b>${drag?` <span style="color:#c2453a">→ ${es}</span>`:""}</div>
   <div class="stat">📦 ${t("stat_cap")} <b>${c}t</b></div>
   <div class="stat">💰 ${t("stat_runcost")} <b>€${oc}</b><br><span class="muted" style="font-size:11px">${fmt("runcost_meta",{r:eng().run})}</span></div>
  </div>
  ${pixHTML("pix")}
  ${featPanel}
  <h3 style="margin:16px 0 6px">${t("h_consist")} (${state.equip.length}/${max})</h3>
  <div style="width:100%">${slotHTML}</div>
  <button class="flowbtn ${showShop?"gold":""}" style="margin:10px 0" onclick="toggleShop()">${showShop?t("hide_carts"):t("show_carts")}</button>
  ${parkHTML?`<details class="collapsible" ${showShop?"open":""}><summary>${t("h_depot")} <span class="muted" style="font-size:12px">${t("depot_sub")}</span></summary><div style="width:100%">${parkHTML}</div></details>`:""}
  <details class="collapsible" ${(showShop||showBox)?"open":""}><summary>${t("h_avail")}</summary><div class="grid">${avHTML}</div></details>
  <details class="collapsible" style="margin:12px 0"><summary>${t("h_upgrades")}</summary><div class="grid">${goals().map(goalHTML).join("")}</div></details>
  <h3 style="margin:14px 0 6px">${t("h_engine")}</h3>
  <div class="grid2">${engHTML}</div>

  <div class="xpbar" style="margin-top:14px"><div class="fill" style="width:${lvNow()>=XP.length-1?100:Math.round((state.tx-XP[lvNow()])/(XP[lvNow()+1]-XP[lvNow()])*100)}%"></div></div>
  <p class="muted" style="font-size:12px">${fmt("train_level",{l:lv,x:state.tx,next:lvNow()<XP.length-1?fmt("next_lv",{l:lv+1,x:XP[lvNow()+1]}):""})}</p>`;
  pixCanvas("pix",4);
}
function buy(i){
  let tutBuy=false;
  if(!tutDone()&&inTutorial()){ if(tutStep()==="buy_wagon"&&i==="box")tutBuy=true; else return; }
  const w=WAGONS.find(x=>x.id===i);
  if(!w) return;
  const cost=unlockCost(w);
  if(state.money<cost){alert(fmt("buy_no_money",{p:cost}));return;}
  if(LV()<w.lv){alert(fmt("buy_lv",{l:w.lv}));return;}
  state.money-=cost; state.owned[w.id]=(state.owned[w.id]||0)+1;
  if(state.equip.length<slots()) state.equip.push(w.id);
  log(fmt("log_bought",{n:t("wc_"+w.id)})); save(); update();
  if(tutBuy){ nextTutorialStep(); save(); state.contracts=makeContracts(); showTab(1); } else trainTab();
}
function equipOwned(id){
  if(ownedCount(id)<=0){alert(fmt("need_note",{n:t("wc_"+id)})); return;}
  if(state.equip.length>=slots()){alert(fmt("max_slots",{n:slots()})); trainTab(); return;}
  state.owned[id]=(state.owned[id]||1)-1;
  state.equip.push(id); log(fmt("log_hitched",{n:t("wc_"+id)})); save(); update(); trainTab();
}
function unequip(idx){ if(state.equip.length<=1)return; const wg=WAGONS.find(x=>x.id===state.equip[idx]); state.equip.splice(idx,1); state.owned[wg.id]=(state.owned[wg.id]||0)+1; log(fmt("log_stored",{n:t("wc_"+wg.id)})); save(); update(); trainTab(); }
function buyEngine(i){
  let tutBuy=false;
  if(!tutDone()&&inTutorial()){ if(tutStep()==="buy_engine"&&i===0)tutBuy=true; else return; }
  const e=ENGINES[i]; if(ownsE(i)||i!==ENGINES.findIndex((x,k)=>!ownsE(k))) return;
  if(LV()<e.lv){alert(fmt("buy_lv",{l:e.lv}));return;}
  if(state.money<e.price){alert(fmt("buy_no_money",{p:e.price}));return;}
  state.money-=e.price; state.ownedEngines.push(i); state.ownedEngines.sort((a,b)=>a-b);
  state.engineIdx=i; log(fmt("log_mounted",{n:t("eg_"+e.id)})); save(); update();
  if(tutBuy){ nextTutorialStep(); save(); showTab(0); } else trainTab();
}
function setEngine(i){
  if(!ownsE(i))return;
  if(state.engineIdx===i)return;
  if(weight()>ENGINES[i].pull){alert(fmt("setEngine_pull",{e:t("eg_"+ENGINES[i].id),p:ENGINES[i].pull,w:weight()})); return;}
  state.engineIdx=i; log(fmt("log_mounted",{n:t("eg_"+ENGINES[i].id).toLowerCase()})); save(); update(); trainTab();
}

/* ---------- contract tab ---------- */
function contractTab(){
 if(!state.contracts.length) state.contracts=makeContracts();
 refreshSpecial();
 const i=state.city, cl=cityLevel(i);
 const cap=capNow();
 const panel=document.getElementById("panel");
let spHTML="";
   const sp=state.special;
   if(sp){ const lockedLv=LV()<sp.lv;
      const lockedDeliv=state.stats.deliv<sp.deliv;
      const haveNeed=sp.need.k==="w"?hasW(sp.need.id):ownsE(sp.need.idx);
      const haveAll=haveNeed&&!lockedLv&&!lockedDeliv;
      const nm=specialNeedName(sp);
      if(haveAll||state.specialSel){
      const act=`<button class="small" style="background:#d9a441;color:#241a06" onclick="selectSpecial()">${state.contract!==null?t("sp_all"):state.specialSel?t("sp_sel"):t("sp_view")}</button>`;
      const openLbl=sp.open.map(o=>CITIES[o].n).join(" · ");
      spHTML=`<div class="card contract ${state.specialSel?"sel":""} sp-card" onclick="selectSpecial()">
       <span class="rarity r-special">${t("sp_badge")}</span>
       <span class="badge">${CITIES[i].i} → ${CITIES[sp.to].n}</span>
       ${sp.deliv?`<span class="badge" style="background:#7a4a8a;color:#fdf9ee">${fmt("sp_deliv_b",{d:sp.deliv})}</span>`:""}
       <h3 style="margin:8px 0 4px">${t("cg_"+sp.cargo)} <span class="muted">×${sp.amount}</span></h3>
       <div class="muted" style="font-size:13px">🔑 ${fmt("sp_newline",{n:openLbl})} · ${sp.need.k==="w"?fmt("sp_need_w",{i:nm.i,n:nm.n}):fmt("sp_need_e",{n:nm.n})}</div>
       <div class="reward" style="font-weight:800;font-size:19px;margin-top:6px">€${sp.reward} <span style="font-size:12px;color:#8a7f6b">${t("city_new")}</span></div>
       ${act}
      </div>`;
      } else {
      const reason=lockedLv?fmt("sp_lv",{l:sp.lv}):lockedDeliv?fmt("sp_deliv",{d:sp.deliv}):fmt(sp.need.k==="w"?"sp_need_w":"sp_need_e", sp.need.k==="w"?{i:nm.i,n:nm.n}:{n:nm.n});
      spHTML=`<div class="card sp-card locked" style="display:flex;align-items:center;gap:8px"><span class="rarity r-special">${t("sp_badge")}</span><span class="badge">${CITIES[i].i} → ${CITIES[sp.to].n}</span><span class="badge">€${sp.reward}</span><b style="margin-left:auto">${reason}</b></div>`;
      }
   }
const rows=state.contracts.map((c,idx)=>{
   const oc=overCap(c);
   const lack=c.need&&!hasW(c.need);
   const locked=oc||lack;
   const tH=travelH(c.dist), late=c.deadline!=null&&tH>=c.deadline+0.05;
   const clk=locked?"":`select(${idx})`;
   const needW=c.need?WAGONS.find(w=>w.id===c.need):null;
   const btnId=idx===0&&inTutorial()?` id="tut-contract-0"`:"";
    return `<div class="card contract ${state.contract===idx?"sel":""} ${oc?"over-cap":""} ${lack?"locked":""}">
    <span class="rarity r-${c.rarity}">${t("ra_"+c.rarity)}</span><span class="badge">${CITIES[i].i}${CITIES[i].n} → ${CITIES[c.to].n}</span>
    ${c.need?`<span class="badge" style="background:#7a4a8a;color:#fdf9ee">${fmt("requires",{i:needW.ic,n:t("wc_"+c.need)})}</span>`:""}
    <h3 style="margin:8px 0 4px">📦 ${t("cg_"+c.cargo)} <span class="muted">×${c.amount}</span></h3>
    ${c.deadline?`<div class="muted" style="font-size:14px">⏰ ${fmt("deadline_by",{h:c.deadline,t:tH})}</div>`:""}
    <div class="reward" style="font-weight:800;font-size:24px;margin:6px 0 2px">€${c.reward} ${c.deadline?`<span style="font-size:12px;color:#8a7f6b">${late?t("will_late"):t("ontrack")}</span>`:""}</div>
    ${oc?`<div class="muted" style="margin-top:2px">${fmt("over_cap_note",{a:c.amount,b:cap})}</div>`:lack?`<div class="muted" style="margin-top:2px">${fmt("need_note",{n:t("wc_"+c.need)})}</div>`:""}
    <button class="action"${btnId} onclick="${clk}" ${locked?'disabled':''}>${t("take_job")}</button>
   </div>`;}).join("");
  panel.innerHTML=`<h2>${t("contracts_h")}${CITIES[i].i} ${CITIES[i].n}</h2>
   <div class="stats">
    <div class="stat">⭐ ${t("stat_rep")} <b>${state.rep}</b> <span class="muted">${t("rp_"+repTier())}</span></div>
    <div class="stat">📦 ${t("stat_cap")} <b>${cap}t</b></div>
    <button class="small" style="margin:0 0 0 auto;background:#d9a441;color:#241a06;font-size:14px" onclick="reroll()" ${(state.contract!==null||state.specialSel)?"disabled":""}>${fmt("reroll",{c:rerollCost()})}</button>
   </div>
    <button class="flowbtn ${state.contract!==null?"gold":""}" style="margin:0 0 12px" onclick="showTab(2)" ${(state.contract===null&&!state.specialSel)?'disabled':''}>${(state.contract===null&&!state.specialSel)?t("need_select"):t("review_route")}</button>
    ${spHTML}
    <div class="grid">${rows||`<p class="muted">${t("no_contracts")}</p>`}</div>`;
}
function select(idx){
 const c=state.contracts[idx];
 if(!c)return;
 let tutPick=false;
 if(!tutDone()&&inTutorial()){ if(tutStep()==="pick_contract"&&idx===0)tutPick=true; else return; }
 if(c.need&&!hasW(c.need)){alert(fmt("sel_need",{i:WAGONS.find(w=>w.id===c.need).ic,n:t("wc_"+c.need)}));return;}
 if(overCap(c)){alert(fmt("sel_cap",{a:c.amount,b:capNow()}));return;}
 state.contract=idx; state.specialSel=false; save();
 if(tutPick){ nextTutorialStep(); save(); showTab(2); } else contractTab();
}
function selectSpecial(){
  const sp=state.special; if(!sp) return;
  if(state.contract!==null){alert(t("sp_all"));return;}
  const nm=specialNeedName(sp);
  if(LV()<sp.lv){alert(fmt("sp_lv",{l:sp.lv}));return;}
  if(state.stats.deliv<sp.deliv){alert(fmt("sp_deliv",{d:sp.deliv}));return;}
  if(sp.need.k==="w"&&!hasW(sp.need.id)){alert(fmt("sp_need_w",{i:nm.i,n:nm.n}));return;}
  if(sp.need.k==="e"&&!ownsE(sp.need.idx)){alert(fmt("sp_need_e",{n:nm.n}));return;}
  state.specialSel=true; state.contract=null; save(); contractTab();
}
function cancelSpecial(){ state.specialSel=false; state.special=null; save(); contractTab(); }

/* ---------- map tab ---------- */
const markers=["🌧️","⚠️","⚡","🚧","🌪️","🦹"];
function routeHTML(from,to){
  const icons=CITIES.map((ct,ix)=>ix===from?'🚂':ix===to?'🏁':"·");
  const marks={};
  if(Math.abs(to-from)>=1){const mid=(from<to?from+1:to+1); marks[mid]=markers[(from*7+to*13+mid*5)%markers.length];}
  if(Math.abs(to-from)>=2){const mid2=(from<to?to-1:from-1); marks[mid2]=markers[(from*11+to*17+2)%markers.length];}
  const minI=Math.min(from,to), maxI=Math.max(from,to);
  const showAll=typeof window!=="undefined"&&window.innerWidth>600;
  let indices;
  if(showAll){
    indices=CITIES.map((_,ix)=>ix);
  }else{
    const set=new Set([from,to,Math.floor((from+to)/2),minI+Math.max(1,Math.floor((maxI-minI)/3)),maxI-Math.max(1,Math.floor((maxI-minI)/3))]);
    indices=[...set].filter(i=>i>=0&&i<CITIES.length).sort((a,b)=>a-b);
  }
  let html='<div class="route" style="overflow-x:auto"><div class="line"></div>';
  for(const ix of indices){
    const mk=marks[ix]?'<span class="marker" style="left:'+((ix+.5)/CITIES.length*100)+'%">'+marks[ix]+'</span>':"";
    html+=mk+'<div class="city '+(ix===from?"current":ix===to?"dest":"")+'"><div class="dot">'+icons[ix]+'</div><div class="city-name">'+CITIES[ix].i+CITIES[ix].n+'</div></div>';
  }
  html+='</div>';
  return html;
}
function riskRow(){
  const opts=[["normal",...ta("risk0")],["rush",...ta("risk1")],["danger",...ta("risk2")]];
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">${opts.map(o=>`<div class="risk ${state.pickRisk===o[0]?"sel":""}" ${o[0]==="normal"&&inTutorial()?`id="tut-risk-normal"`:""} onclick="risk('${o[0]}')"><b>${o[1]}</b><span class="muted" style="font-size:11px">${o[2]}</span></div>`).join("")}</div>`;
}
function risk(r){
 if(!tutDone()&&inTutorial()){ if(tutStep()==="pick_risk"&&r==="normal")nextTutorialStep(); else return; }
 state.pickRisk=r; save(); showTab(2); }
function riskOutlook(c){
  const mult=state.pickRisk==="rush"?1.25:state.pickRisk==="danger"?1.75:1;
  const base=Math.round(c.reward*mult*cargoBonus(c));
  const rp={"common":1,"uncommon":1.3,"rare":1.7,"epic":2.5,"legendary":4}[c.rarity]||1;
  const salvage=Math.max(0,Math.round(base*0.1*rp));
  const latePen=c.deadline!=null?Math.round(base*0.3):0;
  return {deliver:base, worst:salvage-latePen};
}
function mapTab(){
 if(state.result){ renderResult(); return; }
 if(!state.active){ renderDepart(); return; }
 renderJourney();
}

/* ---------- journey animation ---------- */
let jiv=null;
function kancel(){ if(jiv!=null&&typeof cancelAnimationFrame==="function")cancelAnimationFrame(jiv); jiv=null; }
function trackW(dist){ return Math.max(300,270+dist*72); }
function leadIcon(t){ const m=(t||"").match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u); return m?m[1]:"❗"; }
function drawScene(p,phase){
 const cv=pixA("jcan"); if(!cv)return;
 const jj=state.active; if(!jj)return;
 const scale=2, tr=trainRows(), dist=jj.contract.dist, n=jj.evs.length;
 const TW=trackW(dist), tTop=26, trainH=tr.H;
 const pad=12, range=TW-pad*2-tr.W*scale;
 const xT=Math.round(pad+p*range);
 const hillsY=tTop+trainH+1, railY=hillsY+11, H=railY+4;
 cv.width=TW*scale; cv.height=H*scale;
 const x=cv.getContext("2d"); if(!x||typeof x.fillRect!=="function")return;
 x.fillStyle="#0e1428"; x.fillRect(0,0,TW*scale,cv.height);
 x.fillStyle="#131a30"; x.fillRect(0,0,TW*scale,13*scale);
 x.fillStyle="#192038"; x.fillRect(0,13*scale,TW*scale,(hillsY-13)*scale);
 x.fillStyle="#e5eaf6"; for(let i=0;i<48;i++){ if(i%3===0)continue; const sx=(i*97+37)%TW, sy=(i*83+(i*17)%5)%11; x.fillRect(sx*scale,sy*scale,scale,scale); }
 const drift=Math.floor(phase*12)%TW;
 for(let j=0;j<3;j++){
  const cy=5+j*4, base=((j*173+drift*3)%TW);
  x.fillStyle="rgba(128,141,163,0.28)";
  for(let c2=0;c2<3;c2++) x.fillRect(((base+c2*3)%TW)*scale,(cy+(c2%2))*scale,(c2===1?5:3)*scale,scale);
 }
 for(let wx=0;wx<TW;wx++){
  const bump=(((wx+Math.floor(phase*14))%9)<2?2:0);
  x.fillStyle="#232c48"; x.fillRect(wx*scale,hillsY*scale,scale,(5+bump)*scale);
 }
 x.fillStyle="#1b2338"; x.fillRect(0,(hillsY+6)*scale,TW*scale,3*scale);
 for(let k=0;k<=n;k++){
  const mx=Math.round((k+1)/(n+1)*TW);
  const isPending=!state.outcome&&k===jj.idx;
  const isDone=state.outcome?k<=jj.idx:k<jj.idx;
  x.fillStyle="#465166"; x.fillRect(mx*scale,(railY-3)*scale,Math.max(1,Math.round(scale/2)),4*scale);
  x.fillStyle=isDone?"#43a047":isPending?(Math.floor(phase)%2?"#f5d742":"#8a6d1a"):"#3a4352";
  x.fillRect(mx*scale-1,(railY-4)*scale,3*scale,2*scale);
 }
 if(state.outcome){ // burst at the last resolved marker
  const o=state.outcome, mx=Math.round((jj.idx+1)/(n+1)*TW), my=railY*scale;
  x.fillStyle=o.out==="loss"?"#c62828":o.out==="bonus"?"#67d17e":"#b0bec5";
  x.fillRect(mx*scale-2*scale,my,5*scale,2*scale); x.fillRect(mx*scale,my-2*scale,2*scale,5*scale);
 }
 const bob=Math.floor(phase)%2;
 for(let y=0;y<trainH;y++)for(let c=0;c<tr.W;c++){ if(!tr.g[y][c])continue; x.fillStyle=tr.g[y][c]; x.fillRect((c*scale+xT),(y+tTop+bob)*scale,scale,scale); }
 const cabX=xT+(tr.W-18+3)*scale;
 for(let i=0;i<8;i++){ const s=Math.floor(phase*2.2+i*1.4)%11; const px=cabX+i*2*scale+Math.floor(Math.sin(i+phase*6)*2)*scale; const py=(tTop-1-s)*scale; const sz=Math.max(scale,6-s); x.fillStyle=i===0?"#c6ccd4":"rgba(143,152,163,0.9)"; x.fillRect(px,py,sz,sz); }
 x.fillStyle="#0e1217"; x.fillRect(0,railY*scale,TW*scale,scale);
 x.fillStyle="#232a33"; x.fillRect(0,(railY+1)*scale,TW*scale,scale);
 x.fillStyle="#39414c"; for(let i=0;i<TW;i++){ if(i%2)x.fillRect(i*scale,(railY+1)*scale,scale,Math.floor(scale*0.7)); }
 x.fillStyle="#141a24"; x.fillRect(0,(railY+2)*scale,TW*scale,(H-(railY+2))*scale);
}
function animateScene(){
 const jj=state.active; if(!jj)return;
 if(state.outcome){ drawScene(1,3); return; }
 const n=jj.evs.length;
 const legStart=jj.idx===0?0:(jj.idx)/(n+1);
 const legEnd=(jj.idx+1)/(n+1);
 const dur=Math.max(2.4,Math.min(5.4,2.4+jj.contract.dist*0.9));
 const t0=(typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();
 function tick(){
  if(!state.active){ kancel(); return; }
  const now=(typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();
  const p=Math.min(1,(now-t0)/(dur*1000));
  const phase=Math.floor(p*dur*6);
  drawScene(legStart+p*(legEnd-legStart),phase);
  if(p>=1){ kancel(); const el=document.getElementById("jbubble"); if(el&&document.body&&typeof el.classList!=="undefined")el.classList.add("arrived"); return; }
  if(typeof requestAnimationFrame==="function")jiv=requestAnimationFrame(tick);
 }
 if(typeof requestAnimationFrame==="function"){ jiv=requestAnimationFrame(tick); } else { drawScene(1,3); }
}
function renderJourney(){
 kancel();
 const jj=state.active, e=jj.evs[jj.idx], o=state.outcome, n=jj.evs.length;
 const icon=leadIcon(e.t);
 const fx=k=>(k+1)/(n+1);
 const bb=o?`<div class="jbubble done" style="left:${fx(jj.idx)*100}%">${icon}<span class="mark">${o.out==="loss"?"✗":o.out==="bonus"?"+€"+o.g:"•"}</span></div>`
          :`<div class="jbubble" id="jbubble" style="left:${fx(jj.idx)*100}%">${icon}<span class="mark">?</span></div>`;
let card;
  if(o){
   const cls=o.out==="loss"?"loss":o.out==="bonus"?"good":"calm";
   const lbl=o.out==="loss"?t("out_badhand"):o.out==="bonus"?t("out_score"):t("out_calm");
   card=`<div class="out-banner ${cls}">${lbl} — ${o.g>=0?"+":""}€${o.g}</div>
    <button class="action" onclick="step()">${jj.idx+1>=n?t("arrive_btn"):t("continue_btn")}</button>`;
}else{
    const ctr=jj.contract;
    const hasDeadline=ctr.deadline!=null;
    const riskLate=ctr.deadline!=null&&travelH(ctr.dist)>=ctr.deadline-0.5;
    card=`<div class="event"><h3>${e.t}</h3><p class="muted">${e.d}</p><div class="choices">${e.o.map((o,i)=>`<button class="action" id="${i===0&&inTutorial()?`tut-event-0`:""}" onclick="pick(${i})">${o.l}${hasDeadline&&o.f&&o.f>0?` <span class="badge" style="background:#f6e2dc;color:#b6452e;font-size:10px;padding:1px 6px">${t("risk_late")}</span>`:""}</button>`).join("")}</div></div>`;
  }
  const panel=document.getElementById("panel");
  panel.innerHTML=`<h2>${fmt("on_the_line",{c:CITIES[jj.contract.to].i+CITIES[jj.contract.to].n})}</h2>
   ${state.departed?`<div class="departing">💨 ${fmt("departing",{c:CITIES[jj.contract.to].i+CITIES[jj.contract.to].n})}</div>`:""}
   <div class="jscene">
    <span class="jcity jstart">${CITIES[state.city].i}${CITIES[state.city].n}</span>
    <span class="jcity jend">${CITIES[jj.contract.to].i}${CITIES[jj.contract.to].n}</span>
    ${bb}
    <canvas id="jcan" class="jcan"></canvas>
   </div>
   <div class="muted" style="font-size:12px;margin:6px 0">${fmt("leg_meta",{a:jj.idx+1,n,d:jj.contract.dist,hops:jj.contract.dist===1?t("hop"):t("hops"),m:jj.mult})}</div>
   ${card}`;
  state.departed=false;
  animateScene();
}
function renderDepart(){
  const special=state.specialSel&&state.special;
  const c=special?special:(state.contracts[state.contract]);
  const panel=document.getElementById("panel");
  if(!c){ panel.innerHTML=`<h2>${t("tab_map")}</h2><p class="muted">${t("pick_first")}</p><button class="action" onclick="showTab(1)">${t("to_contracts")}</button>`; return; }
  if(special&&overPull()){
   panel.innerHTML=`<h2>${t("route_blocked")}</h2>
    <div class="result-screen bad"><div class="icon">🪨</div><h2>${t("too_heavy")}</h2>
    <p>${fmt("too_heavy_msg",{a:weight(),e:t("eg_"+eng().id),b:pullNow()})}</p>
    <button class="action" onclick="showTab(0)">${t("gov_train")}</button></div>
    ${historyHTML()}`; return; }
  if(!special&&c.need&&!hasW(c.need)){
   const needW=WAGONS.find(w=>w.id===c.need);
   panel.innerHTML=`<h2>${t("route_blocked")}</h2>
    <div class="result-screen bad"><div class="icon">🛠️</div><h2>${fmt("needs_wag",{n:t("wc_"+c.need)})}</h2>
    <p>${fmt("needs_wag_msg",{i:needW.ic,n:t("wc_"+c.need)})}</p>
    <button class="action" onclick="showTab(0)">${t("gov_train")}</button></div>
    ${historyHTML()}`; return; }
  if(!special&&overCap(c)){
   panel.innerHTML=`<h2>${t("route_blocked")}</h2>
    <div class="result-screen bad"><div class="icon">🚧</div><h2>${fmt("cannot_carry",{a:c.amount})}</h2>
    <p>${fmt("cannot_carry_msg",{a:c.amount,b:capNow()})}</p>
    <button class="action" onclick="showTab(0)">${t("gov_train")}</button></div>
    ${historyHTML()}`; return; }
  if(overPull()){
   panel.innerHTML=`<h2>${t("route_blocked")}</h2>
    <div class="result-screen bad"><div class="icon">🪨</div><h2>${t("too_heavy")}</h2>
    <p>${fmt("too_heavy_msg",{a:weight(),e:t("eg_"+eng().id),b:pullNow()})}</p>
    <button class="action" onclick="showTab(0)">${t("gov_train")}</button></div>
    ${historyHTML()}`; return; }
  const tH=special?travelH(c.dist):travelH(c.dist), late=!special&&c.deadline!=null&&tH>=c.deadline+0.05;
  const mult=state.pickRisk==="rush"?1.25:state.pickRisk==="danger"?1.75:1;
  const o=special?{deliver:c.reward,worst:Math.round(c.reward*0.6)}:riskOutlook(c);
  const needLbl=special?(sp=>{const nm=specialNeedName(sp);return sp.need.k==="w"?fmt("sp_need_w",{i:nm.i,n:nm.n}):fmt("sp_need_e",{n:nm.n});})(c):"";
  const openLbl=special?(c.open||[]).map(o=>CITIES[o].n).join(" · "):"";
  panel.innerHTML=`<h2>${t("tab_map")} · ${CITIES[state.city].i}${CITIES[state.city].n} → ${CITIES[c.to].n} <span class="muted" style="font-size:13px">${special?t("sp_badge"):`€${o.deliver}`}</span></h2>
   ${special?`<div class="hint">🔑 ${fmt("sp_newline",{n:openLbl})} · ${needLbl} · ${t("city_new")}</div>`:`<h4 style="margin:10px 0 6px">${t("risk_heading")}</h4>`}
   ${special?"":riskRow()}
<div class="outlook" style="display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 12px">
     <span class="badge" style="background:#e2f0e5;color:#2f7d43;border:1px solid #2f7d43">${fmt("exp_deliver",{a:o.deliver})}</span>
     <span class="badge" style="background:#f6e2dc;color:#b6452e;border:1px solid #b6452e">${fmt("exp_fail",{v:"−€"+Math.abs(o.worst)})}</span>
    </div>
<div style="display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 14px">
      <button class="action" id="${state.contract!==null&&inTutorial()?`tut-go`:""}" style="margin:0;flex:1;min-width:160px" onclick="go()">${special?fmt("go_btn",{c:opCost()}):fmt("go_btn",{c:opCost()})}</button>
     <button class="small" style="flex:1;min-width:120px;width:auto;margin:0;background:#b6452e;color:#fff" onclick="clearRoute()">${t("clear_route")}</button>
    </div>
   <div class="stats">
    <div class="stat">🚂 ${t("eg_"+eng().id)} <span class="muted" style="font-size:11px">${fmt("runcost_stat",{c:eng().run})}</span></div>
    <div class="stat">⚡ ${speed()}${overPull()?`→${effSpeed()}`:""} <span class="muted">(${tH}h)</span></div>
    <div class="stat">📦 ${special?c.amount+" / "+t("sp_cargo"):c.amount+"/"+capNow()+"t"}</div>
    <div class="stat">🔗 ${weight()}/${pullNow()}t</div>
    <div class="stat">💸 ${t("stat_runcost")} <b>€${opCost()}</b></div>
    <div class="stat">${special?`🎁 ${t("sp_no_risk")}`:`🎁 ×${mult} ${pickRiskLabel()}`}</div>
   </div>
   <div class="hint">${special?fmt("risk_gains",{r:Math.round(c.dist*1.2),x:Math.round(c.dist*2+6)}):fmt("risk_gains",{r:Math.round(repGainFor(c)*mult),x:Math.round(cxGainFor(c)*mult)})} ${!special&&c.deadline?`· ${fmt("deadline_meta",{t:tH,d:c.deadline,ok:t(late?"late_mark":"ok_mark")})}`:`· ${t("no_deadline")}`}</div>
   ${routeHTML(state.city,c.to)}

  <div class="event" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
   <div><b>${t("cg_"+c.cargo)} ×${c.amount}</b> <span class="muted">· ${c.dist} ${c.dist===1?t("hop"):t("hops")}</span></div>
   ${special?`<button class="small" onclick="cancelSpecial()">${t("cancel_sp")}</button>`:""}
  </div>
   ${pixHTML("pix")}
   ${historyHTML()}`;
  pixCanvas("pix",2);
}
function historyHTML(){
  return state.log.length?`<h3 style="margin-top:16px">${t("run_log")}</h3><div class="log">${state.log.slice(-8).reverse().join("<br>")}</div>`:"";
}
function xpFillPct(tx){ let l=0; while(l<XP.length-1&&tx>=XP[l+1]) l++; if(l>=XP.length-1) return 100; return Math.round((tx-XP[l])/(XP[l+1]-XP[l])*100); }
function maxLvReached(){ return lvNow()>=XP.length-1; }
function resultXpHTML(r){
  const maxLv=XP.length;
  const fromLv=Math.min(maxLv,Math.max(1,r.lvBefore+1));
  const toLv=Math.min(maxLv,LV());
  const fromPct=xpFillPct(r.txBefore), toPct=xpFillPct(state.tx);
  const finalBar=maxLvReached()?100:toPct;
  const lvlup=toLv>fromLv;
  const maxTxt=toLv>=maxLv?` <span class="xp-max">${fmt("xp_max",{l:maxLv})}</span>`:` → ${toLv}`;
  return `<div class="result-xp">
    <div class="xp-row"><span>${fmt("xp_label",{l:fromLv})}${lvlup?` → <b>${toLv}</b> <span class="lvlup">${t("xp_levelup")}</span>`:maxTxt}</span>
      <span class="xp-gain">+${r.xpGain} XP</span></div>
    <div class="xpbar" style="margin:8px 0 2px"><div id="rxpf" class="fill${fromPct<100?" xp-fill-anim":""}" style="width:${fromPct}%"></div></div>
    <div class="xp-row"><span class="muted">${maxLvReached()?t("xp_max_done"):fmt("xp_to_next",{a:state.tx-XP[Math.min(lvNow(),XP.length-1)],b:XP[Math.min(lvNow()+1,XP.length-1)]-XP[Math.min(lvNow(),XP.length-1)]})}</span></div>
   </div>`;
}
function animateResultXp(r){
  const bar=document.getElementById("rxpf"); if(!bar) return;
  const to=maxLvReached()?100:xpFillPct(state.tx);
  const step=()=>{ requestAnimationFrame(()=>{ bar.style.width=to+"%"; }); };
  step();
}
function renderResult(){
  const r=state.result;
  const details=[
   {l:t("d_cargo"),v:r.cargo},{l:t("d_dist"),v:r.dist+" "+(r.dist===1?t("hop"):t("hops"))},
   {l:t("d_rep"),v:(r.repChange>=0?"+":"")+r.repChange},{l:t("d_net"),v:"€"+r.net}
  ].map(d=>`<div class="detail"><div class="label">${d.l}</div><div class="value">${d.v}</div></div>`).join("");
const panel=document.getElementById("panel");
panel.innerHTML=`<h2>${t("arrived")}${r.to}</h2>
   ${pixHTML("pix")}
   <div class="result-screen ${r.good?"good":"bad"} result-in">
     ${resultXpHTML(r)}
    <div class="icon">${r.good?"🚂✅":"🚂❌"}</div>
    <h2>${r.good?r.late?t("late_title"):t("good_title"):t("bad_title")}</h2>
    <div class="details">${details}</div>
     ${r.late?`<p class="muted">${t("late_note")}</p>`:""}
     ${r.news.length?`<div style="margin:10px 0">${r.news.map(n=>`<span class="badge" style="background:#e2f0e5;color:#2f7d43;border:1px solid #2f7d43;margin:2px">${n}</span>`).join(" ")}</div>`:""}
     <button class="action gold" onclick="continueFromResult()">${t("result_continue")}</button>
    </div>
    ${historyHTML()}`;
  pixCanvas("pix",3);
  animateResultXp(r);
}

/* ---------- progress tab ---------- */
function progressTab(){
  const st=state.stats, lv=LV(), lvI=lvNow();
  const totalOwned=Object.values(state.owned).reduce((s,n)=>s+n,0);
  const panel=document.getElementById("panel");
  const achHTML=ACH.map(a=>`<div class="achrow ${state.ach.includes(a.id)?"done":""}"><div><b>${t("ach_"+a.id)}</b> <span class="muted" style="font-size:12px">— ${t("achd_"+a.id)}</span></div><div class="val">${state.ach.includes(a.id)?"✓ +€"+a.rw:"−"}</div></div>`).join("");
  const chHTML=CH.map((c,i)=>{ const done=state.chapter>i; return `<div class="achrow ${done?"done":""}"><div><b>${t("ch_"+i)}</b>${i===state.chapter?`<span class="badge" style="margin-left:8px">${t("next")}</span>`:""}</div><div class="val">${done?"✓":""}</div></div>`;}).join("");
  const cityHTML=CITIES.map((ct,i)=>`<div class="card" style="padding:10px"><div><b>${ct.i} ${ct.n}</b> · Lv ${cityLevel(i)+1} ${state.discovered[i]?"":"🔒"}</div>
<div class="cbar"><div class="fill" style="width:${Math.min(100,Math.round(state.cx[i]/CITYX[cityLevel(i)]*100))}%"></div></div>
    <span class="muted" style="font-size:11px">${fmt("town_xp",{x:state.cx[i]})}</span> <span class="chip">${ct.prod.map(p=>t("cg_"+p)).join(" · ")}</span></div>`).join("");
  panel.innerHTML=`<h2>${t("progress_h")}</h2>
   ${afterRun?`<div class="runbanner"><div class="runbanner-title">💐 ${t("run_done")} +€${afterRun.net}</div>
    <div class="muted" style="margin:4px 0 10px">${fmt("run_done_sub",{n:afterRun.net,r:(afterRun.rep>=0?"+":"")+afterRun.rep})}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">${goals().map(goalHTML).join("")||`<p class="muted">${t("all_unlocked")}</p>`}</div>
    <div style="display:flex;gap:10px;margin-top:12px">
     <button class="flowbtn" onclick="leaveRun(0)">${t("to_train_btn")}</button>
     <button class="flowbtn gold" onclick="leaveRun(1)">${t("to_contracts_btn")}</button>
    </div></div>`:""}
   <div class="grid2" style="margin-bottom:6px">
    <div class="card"><b>${fmt("train_card",{l:lv})}</b> ${state.tx} XP ${slots()} ${t("stat_slots")}
     <div class="xpbar"><div class="fill" style="width:${lvI>=XP.length-1?100:Math.round((state.tx-XP[lvI])/(XP[lvI+1]-XP[lvI])*100)}%"></div></div>
     <span class="muted" style="font-size:12px">${fmt("wagons_line",{a:totalOwned,b:WAGONS.length,e:t("eg_"+ENGINES[state.engineIdx].id)})}</span>
     ${pixHTML("pix")}</div>
    <div class="card"><b>${fmt("rep_card",{r:state.rep})}</b> ${t("rp_"+repTier())}
     <div class="rep-bar"><div class="fill" style="width:${repPct()}%"></div></div>
     <span class="muted" style="font-size:12px">${fmt("next_tier",{a:repTier()<4?fmt("at_rep",{x:nextRep()}):t("max_t")})}</span></div>
   </div>
   <div class="hint">${fmt("stats_line",{d:st.deliv,c:st.cargo,s:st.best,p:st.premDel})}</div>
   <details class="collapsible"><summary>${t("chapters")}</summary>${chHTML}</details>
   <details class="collapsible"><summary>${t("ach_h")} <span class="muted" style="font-size:12px">${state.ach.length}/${ACH.length}</span></summary>${achHTML}</details>
   <details class="collapsible"><summary>${t("cities")}</summary>
   <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${cityHTML}</div></details>
   <button class="small" style="width:100%;margin-top:18px;background:#b6452e;color:#fff" onclick="resetGame()">${t("reset_save")}</button>`;
  pixCanvas("pix",2);
}
function resetGame(){ kancel(); localStorage.removeItem("railrun_v3"); state=fresh(); save(); showTab(0); }

/* ---------- tutorial overlay ---------- */
function skipTutorial(){ nextTutorialStep(); while(!tutDone()) nextTutorialStep(); save(); langBtn(); showTab(cur); }
 function tutDisplayTip(step){
  const map={
   pick_lang:{t:t("lang_title"),d:t("lang_sub"),open:true,pickLang:true},
   welcome:{t:t("tut_welcome_title"),d:t("tut_welcome"),btn:t("tut_welcome_next"),open:true},
   buy_engine:{t:t("tut_engine_title"),d:t("tut_engine"),spot:"tut-buy-engine",act:{fn:"tutBuyEngine()",lbl:t("tut_engine_act")}},
   buy_wagon:{t:t("tut_buy_title"),d:t("tut_buy"),spot:"tut-buy-box",act:{fn:"tutBuyBox()",lbl:t("tut_buy_act")}},
   pick_contract:{t:t("tut_contract_title"),d:t("tut_contract"),spot:"tut-contract-0",act:{fn:"tutPickContract()",lbl:t("tut_contract_act")}},
   pick_risk:{t:t("tut_risk_title"),d:t("tut_risk"),spot:"tut-risk-normal",act:{fn:"tutRiskNormal()",lbl:t("tut_risk_act")}},
   go:{t:t("tut_go_title"),d:t("tut_go"),spot:"tut-go",act:{fn:"tutGo()",lbl:t("tut_go_act")}},
   event:{t:t("tut_event_title"),d:t("tut_event"),spot:"tut-event-0",act:{fn:"tutEventSafe()",lbl:t("tut_event_act")}},
   done:{t:t("tut_arrive_title"),d:t("tut_arrive"),btn:t("tut_arrive_next"),open:true}
  };
  return map[step];
 }
let tutTargetRef=null, tutSpotRef=null, tutTipRef=null, tutArrowRef=null, tutMaxW=340;
function placeTutorTip(){
 const tgt=tutTargetRef, tip=tutTipRef, spot=tutSpotRef, arrow=tutArrowRef;
 if(!tgt||!tip||!spot)return;
 const r=tgt.getBoundingClientRect();
 const vw=window.innerWidth||0, vh=window.innerHeight||0, pad=12;
 const maxW=Math.min(tutMaxW,vw?vw-pad*2:tutMaxW);
 tip.style.maxWidth=maxW+"px";
 const tw=tip.offsetWidth||maxW, th=tip.offsetHeight||0;
 const below=!vh||r.bottom+th+pad<=vh;
 let top=below?r.bottom+pad:Math.max(pad,r.top-th-pad);
 if(!below&&vh&&top+th>vh-pad) top=Math.max(pad,vh-th-pad);
 let left=pad;
 if(vw){
  left=Math.max(pad,Math.min(r.right+pad,vw-tw-pad));
  if(left+tw>vw-pad) left=Math.max(0,vw-tw-pad);
 }
 tip.style.left=left+"px"; tip.style.top=top+"px";
 const room=(below?vh-(r.bottom+pad):r.top-top)-pad;
 tip.style.maxHeight=Math.max(70,room)+"px"; tip.style.overflowY="auto";
 spot.style.left=(r.left-4)+"px"; spot.style.top=(r.top-4)+"px";
 spot.style.width=(r.width+8)+"px"; spot.style.height=(r.height+8)+"px";
 if(arrow){
  arrow.style.left=(r.left+r.width/2-12)+"px";
  arrow.style.top=(below?(r.bottom-6):(r.top-28))+"px";
  arrow.textContent=below?"⬇":"⬆";
 }
}
function renderTutorial(){
 const o=document.getElementById("tut-overlay"); if(o&&typeof o.remove==="function")o.remove();
 if(!inTutorial())return;
 const info=tutDisplayTip(tutStep());
 const headless=typeof document.body.appendChild!=="function"||!info;
 if(headless)return;
 const overlay=document.createElement("div");
 overlay.id="tut-overlay"; overlay.className="tut-overlay"; overlay.classList.add("active");
 document.body.appendChild(overlay);
 overlay.innerHTML=`<div class="tut-dim"></div><button class="tut-skip" onclick="skipTutorial()">${t("tut_skip")}</button>`;
 const pad=12;
 tutMaxW=info.pickLang?460:340;
 tutTargetRef=info.spot?document.getElementById(info.spot):null;
 if(tutTargetRef){
  const vh=window.innerHeight||0, rb=tutTargetRef.getBoundingClientRect();
  if(vh&&(rb.top<0||rb.bottom>vh)&&typeof window.scrollTo==="function"){
   const y=rb.top+(window.pageYOffset||0)+rb.height/2-vh/2;
   window.scrollTo(0,Math.max(0,y));
  }
  const r=tutTargetRef.getBoundingClientRect();
  tutSpotRef=document.createElement("div");
  tutSpotRef.className="tut-spot";
  tutSpotRef.style.left=(r.left-4)+"px"; tutSpotRef.style.top=(r.top-4)+"px";
  tutSpotRef.style.width=(r.width+8)+"px"; tutSpotRef.style.height=(r.height+8)+"px";
  overlay.appendChild(tutSpotRef);
 }
 let tipHtml=`<h3>${info.t}</h3><p>${info.d}</p>`;
 if(info.pickLang){
  const btns=LANG_ORDER.map(l=>`<button class="tut-btn lang" onclick="pickLang('${l}')">${LANG_FLAGS[l]} ${NATIVE_LANG[l]}</button>`).join("");
  tipHtml+=`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px">${btns}</div>`;
 } else if(info.act) tipHtml+=`<button class="tut-btn" onclick="${info.act.fn}">${info.act.lbl}</button>`;
 else if(info.btn) tipHtml+=`<button class="tut-btn" onclick="tutNext()">${info.btn}</button>`;
 const tip=document.createElement("div");
 tip.className="tut-tip"; tip.innerHTML=tipHtml;
 overlay.appendChild(tip);
 tutTipRef=tip;
 if(tutTargetRef){
  tutArrowRef=document.createElement("div"); tutArrowRef.className="tut-arrow";
  overlay.appendChild(tutArrowRef);
  placeTutorTip();
  if(typeof requestAnimationFrame==="function"){
   requestAnimationFrame(()=>{ if(tutTargetRef) placeTutorTip(); });
   requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(tutTargetRef) placeTutorTip(); }));
  }
  if(typeof setTimeout==="function") setTimeout(()=>{ if(tutTargetRef) placeTutorTip(); },450);
 } else {
  tutArrowRef=null;
  const vw=window.innerWidth||0;
  if(vw) tip.style.maxWidth=Math.min(tutMaxW,vw-pad*2)+"px";
  tip.style.left="50%"; tip.style.top=(window.innerHeight?120:0)+"px";
  tip.style.transform="translateX(-50%)"; tip.style.textAlign="center";
 }
 if(typeof window.addEventListener==="function"&&!window.__tutBound){
  window.__tutBound=true;
  window.addEventListener("resize",placeTutorTip);
  if(typeof document.addEventListener==="function"){
   document.addEventListener("scroll",()=>{ if(tutTargetRef) placeTutorTip(); },true);
  }
 }
}
function pickLang(code){
 setLang(code);
 if(tutStep()==="pick_lang"){ nextTutorialStep(); }
 save(); showTab(cur);
}
function tutNext(){
 if(tutStep()==="welcome"||tutStep()==="done"){ nextTutorialStep(); save(); showTab(cur); }
 else if(tutStep()==="buy_wagon"){ clearTutorialOverlay(); }
}
function tutBuyEngine(){ buyEngine(0); }
function tutBuyBox(){ buy("box"); }
function tutPickContract(){ select(0); }
function tutRiskNormal(){ risk("normal"); }
function tutGo(){ go(); }
function tutEventSafe(){ if(state.active&&state.active.evs&&state.active.evs[0])pick(0); }
function clearTutorialOverlay(){ const o=document.getElementById("tut-overlay"); if(o&&typeof o.remove==="function")o.remove(); }



