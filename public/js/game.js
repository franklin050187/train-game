/* Rail Run — core game logic: state, math, contracts, events, journey */
const XP=[0,700,1500,2600,3900,5400,7000];
const RT=[100,300,600,1000];
const ACH=[
 {id:"courier",n:"Courier I",d:"Deliver 10 mail or passenger contracts.",c:()=>state.stats.premDel>=10,perk:()=>{state.perkCourier=true},rw:180},
 {id:"freight",n:"Freight King",d:"Haul 1,000 cargo units.",c:()=>state.stats.cargo>=1000,perk:()=>{state.perkFreight=true},rw:250},
 {id:"express",n:"Express Driver",d:"5 on-time deliveries in a row.",c:()=>state.stats.streak>=5,perk:()=>{state.perkExpress=true},rw:200},
 {id:"longhaul",n:"Long Haul",d:"Deliver a distance-3 contract.",c:()=>state.stats.long>=1,perk:()=>{state.perkLonghaul=true},rw:300},
 {id:"explorer",n:"Pathfinder",d:"Discover every city.",c:()=>CITIES.every((_,i)=>state.discovered[i]),rw:1000}
];
const CH=[
 {t:"Connect 5 towns",c:()=>CITIES.filter((_,i)=>state.discovered[i]).length>=5,rw:300,rep:40},
 {t:"Reach the northern capital",c:()=>state.discovered[5],rw:500,rep:60},
 {t:"A cross-region trade route",c:()=>state.stats.cross>=3,rw:800,rep:80},
 {t:"Deliver the legendary contract",c:()=>state.stats.legend>=1,rw:1200,rep:100},
 {t:"Railway Empire",c:()=>CITIES.every((_,i)=>state.discovered[i]),rw:2000,rep:150}
];

function fresh(){
  return {v:2, money:600, city:0, engineIdx:0, ownedEngines:[], owned:{}, equip:[],
   rep:0, tx:0, ach:[], perkCourier:false, perkFreight:false, perkExpress:false, perkLonghaul:false,
   chapter:0, result:null, active:null, trip:null, pickRisk:"normal",
    contracts:[], contract:null, log:[], rerolls:0, rerollTimer:30,
    discovered:[true,true,true,false,false,false,false,false,false,false,false,false], cx:[0,0,0,0,0,0,0,0,0,0,0,0],
    special:null, specialSel:false,
    stats:{deliv:0,cargo:0,premDel:0,streak:0,best:0,long:0,cross:0,legend:0},
    tutorial:0};
}
let state=fresh();
let _sv=null;
try{const _s=JSON.parse(localStorage.getItem("railrun_v3")||"null"); if(_s){_sv=_s; state=Object.assign(fresh(),_s);} }catch(e){}

/* ---------- tutorial ---------- */
const TUT_STEPS=["pick_lang","welcome","buy_engine","buy_wagon","pick_contract","pick_risk","go","event","done"];
function inTutorial(){ return state.tutorial<TUT_STEPS.length; }
function tutDone(){ return state.tutorial>=TUT_STEPS.length-1; }
function tutStep(){ return TUT_STEPS[state.tutorial]||"done"; }
function nextTutorialStep(){ state.tutorial++; }

if(Array.isArray(state.owned)){
  const migrated={};
  state.owned.forEach(id=>migrated[id]=(migrated[id]||0)+1);
  state.owned=migrated;
}
state.owned=state.owned||{box:1};
state.equip=state.equip||["box"];
if(typeof state.tutorial!=="number") state.tutorial=0;
const tutPrep=["pick_lang","welcome","buy_engine","buy_wagon"].includes(tutStep());
if(!tutPrep){
 if(!state.ownedEngines||!state.ownedEngines.length) state.ownedEngines=[0];
 if(state.engineIdx>=0&&state.ownedEngines.indexOf(state.engineIdx)<0) state.ownedEngines.push(state.engineIdx);
}
if(!state.ownedEngines||!state.ownedEngines.length) state.ownedEngines=[];
state.ownedEngines.sort((a,b)=>a-b);
if(typeof state.rerolls!=="number"||state.rerolls<0) state.rerolls=0;
if(!Array.isArray(state.discovered)||state.discovered.length<12){
  state.discovered=[true,...Array(11).fill(false)];
}
const firstLocked=state.discovered.indexOf(false);
if(firstLocked>=0&&firstLocked<3){
  for(let i=firstLocked;i<3;i++) state.discovered[i]=true;
}
if(typeof state.specialSel!=="boolean") state.specialSel=false;
if(!state.special) state.special=null;
if(!Array.isArray(state.cx)||state.cx.length<12){
  state.cx=[...state.cx,...Array(12-state.cx.length).fill(0)];
}
if(typeof state.tutorial!=="number") state.tutorial=0;
if(_sv&&_sv.v!==2&&typeof _sv.tutorial==="number"){
  state.tutorial=_sv.tutorial<8?_sv.tutorial+1:9;
}

/* ---------- globals for backward compat (smoke test, inline handlers) ---------- */
const panel=document.getElementById("panel");

/* ---------- train math ---------- */
const eq=()=>state.equip.map(id=>WAGONS.find(w=>w.id===id));
const hasW=(id)=>state.equip.includes(id);
const ownedCount=(id)=>state.owned[id]||0;
const eng=()=>ENGINES[state.engineIdx];
function speed(){ let s=eng().sp; eq().forEach(w=>s+=w.sp); if(state.perkExpress)s+=1; return s; }
function effSpeed(){ let s=speed(), w=weight(); if(eng().pull<w) s*=eng().pull/ w; return Math.round(s*100)/100; }
function capNow(){ let c=0; eq().forEach(w=>c+=w.cap); if(state.perkFreight)c+=5; return c; }
function weight(){ let w=0; eq().forEach(wg=>w+=wg.w); return Math.round(w*10)/10; }
function pullNow(){ return eng().pull; }
function overPull(){ return weight()>pullNow(); }
function opCost(){ let c=eng().run; eq().forEach(w=>(c+=w.cost)); return c; }
function ownsE(i){ return state.ownedEngines.indexOf(i)>=0; }
function bestEngineIdx(){ let b=state.ownedEngines[0]; if(b===undefined) return -1; state.ownedEngines.forEach(i=>{if(i>b)b=i;}); return b; }
function lvNow(){ let l=0; while(l<XP.length-1&&state.tx>=XP[l+1]) l++; return l; }
function LV(){ return lvNow()+1; }
function slots(){ return Math.min(7,2+lvNow()); }
function repTier(){ let t=0; while(t<RT.length&&state.rep>=RT[t]) t++; return t; }
function nextRep(){ return RT[repTier()]; }
function repLabel(t){ return ["Outsider","Connected","Respected","Trusted","Legendary"][t]; }
function repPct(){
 const t=repTier(); if(t>=4) return 100;
 const prev=t===0?0:RT[t-1]; return Math.min(100,Math.round((state.rep-prev)/(RT[t]-prev)*100));
}
function cityLevel(i){ let l=0; while(l<CITYX.length&&state.cx[i]>=CITYX[l]) l++; return l; }
function travelH(dist){ return Math.round(dist*6/Math.max(0.1,effSpeed())*10)/10; }

/* ---------- persistence / ui ---------- */
function save(){ localStorage.setItem("railrun_v3",JSON.stringify(state)); }
function money(){ return state.money; }
function update(){
 const m=document.getElementById("money"); if(m) m.textContent=money();
 const h=document.getElementById("hud"); if(h&&typeof hud==="function") h.innerHTML=hud();
}
function log(m){ state.log.push(m); if(state.log.length>40)state.log.shift(); }
function showTab(i){ clearResultTimer();
 if(!tutDone()&&inTutorial()){
  const allowed={pick_lang:0,welcome:0,buy_engine:0,buy_wagon:0,pick_contract:1,pick_risk:2,go:2,event:2,done:null};
  const a=allowed[tutStep()];
  if(a!==null&&a!==undefined&&i!==a)return;
 }
 if(state.result&&cur===2&&i!==2){ const r=state.result; afterRun={net:r.net,rep:r.repChange}; state.result=null; save(); }
 cur=i;
 const tabs=[...document.querySelectorAll(".tab[data-tab]")];
 tabs.forEach((x,n)=>x.classList.toggle("active",n===i));
 const panel=document.getElementById("panel");
 i===0?trainTab():i===1?contractTab():i===2?mapTab():progressTab();
 if(panel.classList&&typeof panel.classList.remove==="function"){ panel.classList.remove("enter"); void panel.offsetWidth; panel.classList.add("enter"); }
 if(typeof renderTutorial==="function")renderTutorial(); }
let resTimer=null, afterRun=null;
function clearResultTimer(){ if(resTimer!=null){ clearTimeout(resTimer); resTimer=null; } }
function continueFromResult(){ clearResultTimer(); if(!state.result||cur!==2)return;
 const r=state.result; afterRun={net:r.net,rep:r.repChange}; state.result=null; save(); showTab(3); }
function leaveRun(i){ afterRun=null; showTab(i); }

/* ---------- goals ("one more run") ---------- */
function goals(list,max){
  const out=[], m=money(), lv=LV(), lvI=lvNow(), best=bestEngineIdx();
  if(best<ENGINES.length-1){
   const nt=ENGINES[best+1];
   out.push(lv<nt.lv?{t:fmt("elv_g",{l:nt.lv,n:t("eg_"+nt.id)}),kind:"lv",have:lv,need:nt.lv}
                   :{t:fmt("eig_g",{n:t("eg_"+nt.id)}),kind:"€",have:m,need:nt.price});
  }
  const un=WAGONS.filter(w=>w.price>0&&!ownedCount(w.id)).sort((a,b)=>unlockCost(a)-unlockCost(b))[0];
  if(un) out.push(lv<un.lv?{t:fmt("wlv_g",{l:un.lv,n:t("wc_"+un.id)}),kind:"lv",have:lv,need:un.lv}
                       :{t:fmt("wig_g",{i:un.ic,n:t("wc_"+un.id)}),kind:"€",have:m,need:unlockCost(un)});
  if(slots()<7) out.push({t:fmt("slot_g",{s:slots()+1}),kind:"xp",have:state.tx,need:XP[lvI+1]});
  if(repTier()<4) out.push({t:fmt("rep_g",{n:t("rp_"+(repTier()+1))}),kind:"rep",have:state.rep,need:nextRep()});
  return (list?list(out):out).slice(0,max||3);
}
function goalHTML(g){
  let val="";
  if(g.kind==="€"){ val = state.money>=g.need ? t("goal_ready") : fmt("eur_to_go",{x:g.need-g.have});}
  else if(g.kind==="xp")val=fmt("xp_to_go",{x:g.need-g.have>0?g.need-g.have:"0"});
  else if(g.kind==="rep")val=fmt("rep_to_go",{x:g.need-g.have>0?g.need-g.have:"0"});
  else val=fmt("lv_goal",{a:g.have,b:g.need});
  return `<div class="goal"><div class="lab">${g.t}</div><div class="val" style="color:${state.money>=g.need&&g.kind==="€"?"#2f7d43":""}">${val}</div></div>`;
}

/* ---------- contracts ---------- */
function destOf(i,dx){ const d=i+dx; return d>=0&&d<CITIES.length?d:null; }
function rClass(x){ return (x||"common").toLowerCase().replace(/[^a-z]/g,""); }
function repGainFor(c){ return Math.round(Math.max(1,c.dist*1.5)); }
function cxGainFor(c){ return Math.round(c.dist*2+6); }
function rerollCost(){ return Math.round(120*Math.pow(2,state.rerolls)); }
function pickRiskLabel(){ return ta("risk"+(state.pickRisk==="rush"?1:state.pickRisk==="danger"?2:0))[0]; }
function reroll(){
  if(!tutDone()&&inTutorial())return;
  if(state.contract!==null||state.specialSel){alert(t("reroll_impossible"));return;}
  const cost=rerollCost();
  if(state.money<cost){alert(fmt("reroll_broke",{c:cost}));return;}
  state.money-=cost;
  state.rerolls++; state.contracts=makeContracts();
  log(fmt("newroute",{c:cost})); save(); update(); contractTab();
}
function clearRoute(){ if(!tutDone()&&inTutorial())return; state.contract=null; state.specialSel=false; state.special=null; save(); log(t("route_dropped")); showTab(2); }
function rarityFor(cg){
 if(cg.prem) return cg.v>=280?"epic":"rare";
 if(cg.risky) return "rare";
 if(cg.v>=240) return "rare";
 if(cg.v>=120) return "uncommon";
 return "common";
}
function makeContracts(){
  const i=state.city, cap=capNow(), pool=[]; let used=new Set();
  const cl=cityLevel(i), tier=repTier();
  const cityMult=CITIES[i].mult||1;
  const cands=[];
  [1,-1,2,-2,3,-3,4,-4].forEach(dx=>{const d=destOf(i,dx); if(d!=null&&routeOpen(i,d))cands.push(d);});
  const sh=a=>a.slice().sort(()=>Math.random()-.5);
  CITIES[i].prod.forEach(p=>{
   const cg=CARGOES[p];
   if(!cands.length) return;
   const shuffle=sh(cands);
   const d=shuffle.find(x=>!used.has(x));
   if(d==null||d===i) return;
   used.add(d); const dist=Math.abs(d-i);
   const baseAmt=(cg.bulk?6:cg.perp?2.5:3)+Math.random()*2.5;
   const headroom=cl>=1&&cg.bulk?24:0;
   const amount=Math.max(1,Math.min(cap+headroom,Math.round(baseAmt*(1+(cg.bulk?0.9:0.3)*cl)*cityMult)));
   let need=null;
   if(cg.risky&&tier>=2&&Math.random()<0.5) need="tanker";
   if(p==="mail"&&tier>=2&&Math.random()<0.5) need="mailcar";
   const rarity=rarityFor(cg);
   const tierMult={common:1,uncommon:1.15,rare:1.35,epic:1.6,legendary:2}[rarity];
   const reward=Math.round(cg.v*amount*(1+dist*0.6)*(1+cl*0.12)*tierMult*cityMult);
   const deadline=(cg.prem||cg.risky||rarity==="epic"||rarity==="legendary")?Math.max(1,Math.round(travelH(dist)*0.82*10)/10):null;
   pool.push({cargo:p,to:d,dist,amount,reward,rarity,deadline,riskdist:dist,need});
  });
  if(tier>=2){
   const prem=CITIES[i].prod.filter(p=>CARGOES[p].prem||CARGOES[p].v>=240);
   if(prem.length){
    const p=prem[Math.floor(Math.random()*prem.length)], cg=CARGOES[p];
    const d=sh([destOf(i,2),destOf(i,1),destOf(i,-1)]).find(x=>x!=null&&!used.has(x)&&x!==i);
    if(d!=null){used.add(d);const dist=Math.abs(d-i);
     const amount=Math.max(1,Math.min(cap+14,2+Math.floor(Math.random()*2)+cl));
     const reward=Math.round(cg.v*amount*(1+dist*0.7)*1.35*(1+cl*0.12)*cityMult);
     pool.push({cargo:p,to:d,dist,amount,reward,rarity:"rare",deadline:Math.max(1,Math.round(travelH(dist)*0.8*10)/10),riskdist:dist,need:null});}
   }
  }
  if(tier>=3&&!used.has(3)){
   const d=destOf(i,2)||destOf(i,1)||destOf(i,3);
   if(d!=null&&!used.has(d)){used.add(d);const dist=Math.abs(d-i);
    const amount=Math.max(1,Math.min(cap+10,5+cl));
    const reward=Math.round(CARGOES.luxury.v*amount*(1+dist*0.7)*1.6*(1+cl*0.12)*cityMult);
    pool.push({cargo:"luxury",to:d,dist,amount,reward,rarity:"epic",deadline:Math.max(1,Math.round(travelH(dist)*0.8*10)/10),riskdist:dist,need:"armored"});}
  }
  if((tier>=4||cl>=3)&&cap>=2){
   const p="luxury",cg=CARGOES.luxury;
   const d=destOf(i,3); if(d!=null&&!used.has(d)){used.add(d);
    const amount=Math.max(2,Math.min(cap,3+Math.floor(cl/2)));
    const reward=Math.round(cg.v*amount*(1+3*0.7)*2*cityMult);
    pool.push({cargo:p,to:d,dist:3,amount,reward,rarity:"legendary",deadline:Math.max(1,Math.round(travelH(3)*0.8*10)/10),riskdist:3,need:null});}
  }
  if(cl>=3&&tier>=2){
   const highVal=["electronics","machinery","luxury","passengers"].filter(p=>CITIES[i].prod.includes(p));
   if(highVal.length){
    const p=highVal[Math.floor(Math.random()*highVal.length)], cg=CARGOES[p];
    const d=sh([destOf(i,3),destOf(i,4)]).find(x=>x!=null&&!used.has(x)&&x!==i);
    if(d!=null){used.add(d);const dist=Math.abs(d-i);
     const amount=Math.max(1,Math.min(cap+6,2+Math.floor(Math.random()*2)));
     const reward=Math.round(cg.v*amount*(1+dist*0.8)*1.8*cityMult);
     pool.push({cargo:p,to:d,dist,amount,reward,rarity:"legendary",deadline:Math.max(1,Math.round(travelH(dist)*0.75*10)/10),riskdist:dist,need:null});}
   }
  }
  pool.sort((a,b)=>b.reward-a.reward);
  return pool.slice(0,7);
}
function overCap(c){ return c.amount>capNow(); }

/* ---------- special delivery (line-unlock, the "big win") ---------- */
function specialReady(){
  const k=nextLockedLine(); if(k<0) return null;
  const u=LINEUNLOCK[k]; if(!u) return null;
  const open=LINE[k].filter(i=>!state.discovered[i]);
  if(!open.length) return null;
  const lo=LINE[k][0], hi=LINE[k][LINE[k].length-1];
  const need=u.k==="w"?{k:"w",id:u.id}:{k:"e",idx:u.idx};
  return {line:k,to:hi,from:lo,open,need,lv:u.lv,deliv:u.deliv||0};
}
function buildSpecial(){
  const r=specialReady(); if(!r) return null;
  const u=r.need, loc=u.k==="w"?WAGONS.find(w=>w.id===u.id):ENGINES[u.idx];
  const reward=Math.round((u.k==="w"?loc.up:loc.price)*(r.open.length*0.9+0.5));
  const nextLine=r.line;
  return {line:r.line,to:r.to,from:r.from,open:r.open,cargo:"gold",amount:Math.max(2,Math.round(loc.cap||10)*0.2),reward,dist:Math.max(3,r.to-r.from+1),need:{k:u.k,idx:u.idx,id:u.k==="w"?u.id:ENGINES[u.idx].id},idx:u.idx,lv:r.lv,deliv:r.deliv};
}
function refreshSpecial(){
  if(state.specialSel) return;
  state.special=buildSpecial();
}
function specialNeedName(sp){
  const u=sp.need;
  if(u.k==="e"){ const E=ENGINES[u.idx]; return {i:"🚂",n:t("eg_"+(E?E.id:"std"))}; }
  const w=WAGONS.find(x=>x.id===u.id);
  return {i:w?w.ic:"?",n:w?t("wc_"+u.id):String(u.id)};
}

/* ---------- events ---------- */
const sh2=a=>a.slice().sort(()=>Math.random()-.5);
function buildEvents(dist, cargoId){
  const danger=state.pickRisk, fast=speed()>=12, hvy=weight()>=16, cap=capNow();
  const riskMult={"normal":1,"rush":1.35,"danger":1.8}[danger]||1;
  const cnt=1+(danger!=="normal"?1:0)+(dist>=2?1:0);
  const evs=[];
 const templates=[
   ()=>{ // storm
    if(fast)return {t:t("ev_storm_fast_n"),d:t("ev_storm_fast_d"),
     o:[{l:t("ev_storm_fast_a"),g:0},{l:t("ev_storm_fast_b"),g:200,f:-240,odds:Math.min(0.9,0.55*riskMult)}]};
return {t:t("ev_storm_n"),d:t("ev_storm_d"),
      o:[{l:t("ev_storm_a"),g:0},{l:t("ev_storm_b"),g:160,f:-180,odds:Math.min(0.9,0.7*riskMult)}]};
    },  // closes storm block
    ()=>{ // mountain
    if(hvy)return {t:t("ev_mtn_hvy_n"),d:t("ev_mtn_hvy_d"),
     o:[{l:t("ev_mtn_hvy_a"),g:0},{l:t("ev_mtn_hvy_b"),g:280,f:-300,odds:Math.min(0.9,0.5*riskMult)}]};
return {t:t("ev_mtn_n"),d:t("ev_mtn_d"),
      o:[{l:t("ev_mtn_a"),g:0},{l:t("ev_mtn_b"),g:200,f:-210,odds:Math.min(0.9,0.7*riskMult)}]};
    },  // closes mountain block
    ()=>{ // bandits
    const arm=hasW("armored"), odds=(danger==="danger"?0.35:0.6)*riskMult+(arm?0.3:0);
    const loss=arm?60:150;
    return {t:t("ev_band_n"),d:arm?t("ev_band_arm_d"):t("ev_band_d"),
     o:[{l:t("ev_band_a"),g:100,f:-loss,odds},{l:t("ev_band_b"),g:-90}]};},
   ()=>{ // mechanical
    return {t:t("ev_mech_n"),d:t("ev_mech_d"),
     o:[{l:t("ev_mech_a"),g:-100},{l:t("ev_mech_b"),g:40,f:-240,odds:Math.min(0.9,0.6*riskMult)}]};},
   ()=>{ // shortcut
    if(fast)return {t:t("ev_fav_n"),d:t("ev_fav_d"),
     o:[{l:t("ev_fav_a"),g:250},{l:t("ev_fav_b"),g:0}]};
    return {t:t("ev_clear_n"),d:t("ev_clear_d"),
     o:[{l:t("ev_clear_a"),g:150},{l:t("ev_clear_b"),g:0}]};},
   ()=>{ // extra cargo
    const gain=Math.round(60+cap*2.5);
    return {t:t("ev_over_n"),d:t("ev_over_d"),
     o:[{l:t("ev_over_a"),g:gain},{l:t("ev_over_b"),g:0}]};},
   ()=>{ // passenger
    const prem=hasW("mailcar")||hasW("express");
    return {t:t("ev_pax_n"),d:prem?t("ev_pax_prem_d"):t("ev_pax_d"),
     o:[{l:t("ev_pax_a"),g:prem?230:130,f:-90,odds:Math.min(0.9,0.8*riskMult)},{l:t("ev_pax_b"),g:0}]};},
   ()=>{ // chemicals
    if(hasW("tanker"))return {t:t("ev_valve_n"),d:t("ev_valve_d"),
     o:[{l:t("ev_valve_a"),g:0},{l:t("ev_valve_b"),g:-40}]};
return {t:t("ev_stench_n"),d:t("ev_stench_d"),
      o:[{l:t("ev_stench_a"),g:-130},{l:t("ev_stench_b"),g:0,f:-320,odds:Math.min(0.9,0.55*riskMult)}]};
    },  // closes chemicals block
    ()=>{ // perishable
    const perp=cargoId&&CARGOES[cargoId].perp;
    if(perp&&hasW("reefer"))return {t:t("ev_cold_n"),d:t("ev_cold_d"),
     o:[{l:t("ev_cold_a"),g:0},{l:t("ev_cold_b"),g:80}]};
    if(perp)return {t:t("ev_melt_n"),d:t("ev_melt_d"),
     o:[{l:t("ev_melt_a"),g:-85},{l:t("ev_melt_b"),g:140,f:-280,odds:Math.min(0.9,0.6*riskMult)}]};
    return null;},
   ()=>{ // blizzard
    if(danger!=="normal")return {t:t("ev_blizz_n"),d:danger==="danger"?t("ev_blizz_d_hard"):t("ev_blizz_d_mild"),
     o:[{l:t("ev_blizz_a"),g:-60},{l:t("ev_blizz_b"),g:320,f:-420,odds:Math.min(0.9,(danger==="danger"?0.45:0.6)*riskMult)}]};
    return null;}
  ];
 const pool=sh2(templates);
 let n=0; for(const t of pool){ if(evs.length>=cnt)break; const e=t(); if(e)evs.push(e); n++;
   if(evs.length<cnt&&n>templates.length*2)break;}
 return evs.slice(0,cnt);
}

/* ---------- journey ---------- */
function go(){
 if(!tutDone()&&inTutorial()&&tutStep()==="go"){nextTutorialStep();} else if(!tutDone()&&inTutorial())return;
 const sp=state.specialSel&&state.special;
 if(!sp){ if(state.contract===null)return; }
 const c=sp?sp:(state.contracts[state.contract]);
 if(!c)return;
 if(!sp){
  if(c.need&&!hasW(c.need)){alert(fmt("go_need",{i:WAGONS.find(w=>w.id===c.need).ic,n:t("wc_"+c.need)}));return;}
  if(overCap(c)){alert(t("go_cap"));return;}
 }
 if(overPull()){alert(fmt("go_pull",{a:weight(),e:t("eg_"+eng().id),b:pullNow()}));return;}
 if(state.money<opCost()){alert(fmt("go_cash",{c:opCost()}));return;}
  state.money-=opCost();
  const mult=sp?1:(state.pickRisk==="rush"?1.25:state.pickRisk==="danger"?1.75:1);
   const cc=sp?{to:c.to,dist:c.dist,deadline:null,cargo:c.cargo,amount:c.amount,reward:c.reward,open:c.open,need:c.need.k==="w"?c.need.id:null}:c;
 const evList=inTutorial()&&tutStep()==="event"?
  [{t:t("ev_mech_n"),d:t("ev_mech_d"),o:[{l:t("ev_mech_a"),g:-100},{l:t("ev_mech_b"),g:40,f:-240,odds:0.5}]}]
  :buildEvents(cc.dist,cc.cargo);
 state.active={contract:cc,mult,evs:evList,idx:0,deadlineH:cc.deadline,travelH:travelH(cc.dist),late:false,special:!!sp};
 state.trip={gain:0,rep:0,failed:false,handled:0};
 state.outcome=null; state.departed=true; save(); update(); showTab(2);
}
function pick(i){
 if(!tutDone()&&inTutorial()&&tutStep()==="event"){ if(i!==0)return; nextTutorialStep(); }
 const j=state.active, e=j.evs[j.idx], o=e.o[i];
 const r={out:"calm",g:0,it:0};
 if(o.odds==null){ r.g=o.g; r.out=o.g>0?"bonus":o.g<0?"paid":"calm"; }
 else{ r.it=Math.random()<o.odds?1:0; if(r.it){r.g=o.g; r.out=o.g>0?"bonus":"calm";} else {r.g=o.f; r.out="loss"; state.trip.failed=true; } }
 state.trip.gain+=r.g; state.trip.handled++;
 state.outcome=r; save(); showTab(2);
}
function step(){
 const j=state.active; j.idx++;
 if(j.idx>=j.evs.length){ arrive(); } else { state.outcome=null; save(); showTab(2); }
}
function arrive(){
  const j=state.active, special=!!j.special, c=j.contract, trip=state.trip, from=state.city;
  const good=special?!trip.failed:!(trip.failed||j.late), mult=j.mult;
  const base=special?c.reward:Math.round(c.reward*mult*cargoBonus(c));
  const oldCl=cityLevel(c.to);
  state.cx[c.to]+=Math.round((c.dist*2+(good?6:0))*mult);
  const latePen=good?0:Math.round(base*0.3);
  const rarityPenalty={"common":1,"uncommon":1.3,"rare":1.7,"epic":2.5,"legendary":4}[c.rarity]||1;
  const failBaseMult=good?1:special?0.6:0.1;
  const net=good?base+trip.gain:Math.max(0,Math.round(base*failBaseMult*(special?1:rarityPenalty)))-latePen+Math.max(0,trip.gain);
  state.money+=net;
  const repCh=good?Math.round(c.dist*1.2*mult):-Math.max(2,Math.round((c.dist*1.5+3)*rarityPenalty));
  state.rep=Math.max(0,state.rep+repCh);
 const xpGain=special?Math.round(c.dist*30):Math.round(c.reward/10)+c.dist*4;
 const txBefore=state.tx, lvBefore=lvNow();
 state.tx+=xpGain;
 const st=state.stats; st.deliv++; st.cargo+=c.amount;
 const cg=CARGOES[c.cargo];
 if(cg&&cg.prem)st.premDel++;
 if(c.dist>=3)st.long++;
 if((from<=2&&c.to>=3)||(from>=3&&c.to<=2))st.cross++;
 if(c.rarity==="legendary")st.legend++;
 if(!j.late&&good)st.streak++; else st.streak=0; st.best=Math.max(st.best,st.streak);
  const newCities=special?(c.open||[]).filter(k=>!state.discovered[k]):(!state.discovered[c.to]?[c.to]:[]);
  newCities.forEach(k=>state.discovered[k]=true);
  state.city=c.to;
  const townUp=cityLevel(c.to)>oldCl;
 let news=[];
  if(newCities.length)news.push(fmt("g_newline",{n:newCities.map(k=>CITIES[k].i+" "+CITIES[k].n).join(" · ")}));
  if(townUp)news.push(fmt("g_grow",{n:CITIES[c.to].n,l:["Ⅰ","Ⅱ","Ⅲ"][cityLevel(c.to)]}));
  ACH.forEach(a=>{ if(!state.ach.includes(a.id)&&a.c()){state.ach.push(a.id); if(a.perk)a.perk(); state.money+=a.rw; news.push(fmt("g0",{n:t("ach_"+a.id),r:a.rw})); }});
  CH.forEach((ch,i)=>{ if(i===state.chapter&&ch.c()){state.chapter=i+1; state.money+=ch.rw; state.rep+=ch.rep; news.push(fmt("g_chap",{t:t("ch_"+i)})); }});
  log(fmt(good?"log_good":"log_part",{c:t("cg_"+c.cargo),a:c.amount,to:CITIES[c.to].n,n:net,r:(repCh>=0?"+":"")+repCh}));
  state.result={good,cargo:t("cg_"+c.cargo)+" ×"+c.amount,to:CITIES[c.to].n,dist:c.dist,base,bonus:special?1:cargoBonus(c),routeMult:j.mult,gain:trip.gain,handled:trip.handled,net,repChange:repCh,rep:state.rep,late:j.late,news,special,xpGain,lvBefore,txBefore,leveledUp:lvNow()>lvBefore,newLv:LV()};
  state.contract=null; state.active=null; state.trip=null; state.pickRisk="normal"; state.outcome=null; state.rerolls=0;
  if(special){ state.specialSel=false; state.special=null; }
  state.contracts=makeContracts();
  save(); update(); showTab(2);
}
function clearResult(){ clearResultTimer(); state.result=null; save(); update(); showTab(2); }

function cargoBonus(c){
 const cg=CARGOES[c.cargo]; let m=1;
 eq().forEach(w=>{
  if(w.b=== "bulk"&&cg.bulk)m+=0.25;
  if(w.b==="prem"&&cg.prem)m+=0.30;
  if(w.b==="perp"&&cg.perp)m+=0.30;
  if(w.b==="risky"&&cg.risky)m+=0.25;
 });
 if(cg.prem&&state.perkCourier)m+=0.10;
 return m;
}
