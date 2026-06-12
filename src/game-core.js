/* =========================================================
   FORMATIONS
========================================================= */
const FORMATIONS={
 "4-3-3":{rows:[["LW","ST","RW"],["LCM","CM","RCM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{LW:"FWD",ST:"FWD",RW:"FWD",LCM:"MID",CM:"MID",RCM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:0.6,def:0},blurb:"front-foot"},
 "4-4-2":{rows:[["ST1","ST2"],["LM","LCM","RCM","RM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{ST1:"FWD",ST2:"FWD",LM:"MID",LCM:"MID",RCM:"MID",RM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:0,def:0.6},blurb:"two banks"},
 "4-2-3-1":{rows:[["ST"],["LAM","CAM","RAM"],["LDM","RDM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{ST:"FWD",LAM:"MID",CAM:"MID",RAM:"MID",LDM:"MID",RDM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:-0.2,def:0.9},blurb:"double pivot"},
 "3-5-2":{rows:[["ST1","ST2"],["LCM","CM","RCM"],["LWB","LCB","CB","RCB","RWB"],["GK"]],
   cats:{ST1:"FWD",ST2:"FWD",LCM:"MID",CM:"MID",RCM:"MID",LWB:"DEF",LCB:"DEF",CB:"DEF",RCB:"DEF",RWB:"DEF",GK:"GK"},
   mod:{att:1.0,def:-0.7},blurb:"wing-backs fly"},
 "4-1-2-1-2":{rows:[["ST1","ST2"],["CAM"],["LCM","RCM"],["CDM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{ST1:"FWD",ST2:"FWD",CAM:"MID",LCM:"MID",RCM:"MID",CDM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:0.5,def:0.2},blurb:"diamond"},
 "4-5-1":{rows:[["ST"],["LM","LCM","CM","RCM","RM"],["LB","LCB","RCB","RB"],["GK"]],
   cats:{ST:"FWD",LM:"MID",LCM:"MID",CM:"MID",RCM:"MID",RM:"MID",LB:"DEF",LCB:"DEF",RCB:"DEF",RB:"DEF",GK:"GK"},
   mod:{att:-0.4,def:1.0},blurb:"midfield swarm"}
};

/* =========================================================
   MODES + SCORING (scoring mirrored in api/_shared.js — keep in sync)
========================================================= */
const DIFF_MULT={classic:1,hard:1.3,legend:1.7};
const DRAFT_MULT={classic:1,era:1.15,dynasty:1.2,cap:1.3};
const DRAFT_MODES={
  classic:{n:"Classic",d:"all 64 squads"},
  era:{n:"Era Tour",d:"a new decade each spin"},
  dynasty:{n:"Dynasty",d:"one nation, all eras"},
  cap:{n:"Wage Cap",d:"budget 946 — spend wisely"}
};
const ERAS=[[1950,1959],[1960,1969],[1970,1979],[1980,1989],[1990,1999],[2000,2009],[2010,2019],[2020,2029]];
const CAP_BUDGET=946, CAP_FLOOR=75;
const DYN_ALIAS=t=>t==="West Germany"?"Germany":t;
const DYNASTIES=(()=>{const m={};SQUADS.forEach((s,i)=>{const k=DYN_ALIAS(s.t);(m[k]=m[k]||[]).push(i);});
  return Object.entries(m).filter(([,v])=>v.length>=4).sort((a,b)=>b[1].length-a[1].length);})();

function scoreRun(matches,flags){
  let pts=0,reg=0;
  matches.forEach((x,i)=>{
    const knock=i>=3;
    if(x.gf>x.ga){pts+=x.et?85:100;if(!x.et)reg++;}
    else if(x.gf===x.ga){pts+=knock?(x.pw?70:25):40;}
    pts+=x.gf*4-x.ga*2;
  });
  const last=matches[matches.length-1];
  const lastWon=last&&(last.gf>last.ga||(last.gf===last.ga&&last.pw===true));
  const champion=matches.length===7&&lastWon;
  if(champion)pts+=200;
  const perfect=champion&&reg===7&&matches.every(x=>x.gf>x.ga&&!x.et);
  if(perfect)pts+=300;
  pts=Math.max(0,pts);
  const mult=(DIFF_MULT[flags.diff]||1)*(DRAFT_MULT[flags.draft]||1)*(flags.daily?1.1:1);
  return{pts:Math.round(pts*mult),champion,perfect,base:pts,mult};
}

/* =========================================================
   STATE + STORAGE
========================================================= */
let S={};
let pref={form:"4-3-3",draft:"classic",diff:"classic",dyn:null};
const utcDay=()=>new Date().toISOString().slice(0,10);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

function resetState(daily){
  const draft=daily?"classic":pref.draft, form=daily?"4-3-3":pref.form, diff=daily?"classic":pref.diff;
  const F=FORMATIONS[form];
  const slots=[];F.rows.forEach(r=>r.forEach(id=>slots.push({id,cat:F.cats[id],player:null})));
  S={form,draft,diff,daily:!!daily,dyn:draft==="dynasty"?pref.dyn:null,
     slots,lastSquad:-1,spinning:false,wheelRot:0,picked:new Set(),
     respins:2,captain:null,goals:{},era:0,budget:CAP_BUDGET,token:null,submitted:false,
     rng:daily?mulberry32(hashStr("7-0:"+utcDay())):Math.random,
     pool:[],wheelIdx:[],
     cup:{stage:0,record:{w:0,d:0,l:0,gf:0,ga:0},group:null,knock:[],out:false,outAt:null,
          champion:false,perfect:false,regWins:0,gridResults:[],matches:[]}};
  fetchToken();
}
const R=()=>S.rng();
const rnd=n=>Math.floor(R()*n);
const pickFrom=a=>a[rnd(a.length)];

const STORE_KEY="seven_zero_stats_v3";
const STORE_DEF={runs:0,titles:0,perfects:0,bestW:0,bestPts:0,goals:0,topScorers:{},
  badges:{},streak:0,lastDaily:"",playerName:"",playerCountry:""};
const store={
  get(){
    try{
      let v=JSON.parse(localStorage.getItem(STORE_KEY));
      if(!v){const old=JSON.parse(localStorage.getItem("seven_zero_stats_v2"));if(old)v=old;}
      return Object.assign({},STORE_DEF,v||{});
    }catch(e){return Object.assign({},STORE_DEF);}
  },
  set(v){try{localStorage.setItem(STORE_KEY,JSON.stringify(v));}catch(e){}}
};

/* =========================================================
   HELPERS
========================================================= */
const $=id=>document.getElementById(id);
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));$(id).classList.add("on");window.scrollTo(0,0);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function tier(r){return r>=95?"icon":r>=90?"gold":r>=85?"silver":"bronze";}
function hidden(){return S.diff==="hard"||S.diff==="legend";}
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const API=p=>fetch(p,{headers:{accept:"application/json"}}).then(r=>r.ok?r.json():Promise.reject(r.status));
function fetchToken(){
  try{API("/api/token").then(t=>{S.token=t;}).catch(()=>{});}catch(e){}
}

/* =========================================================
   AUDIO — tiny synthesized kit, mute persisted
========================================================= */
const AU={ctx:null,muted:localStorage.getItem("seven_zero_muted")==="1",last:0};
function audioCtx(){
  if(AU.muted)return null;
  if(!AU.ctx){try{AU.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}
  if(AU.ctx.state==="suspended")AU.ctx.resume();
  return AU.ctx;
}
function tone(f0,f1,dur,type,vol,when){
  const c=audioCtx();if(!c)return;
  const t=c.currentTime+(when||0);
  const o=c.createOscillator(),g=c.createGain();
  o.type=type||"square";o.frequency.setValueAtTime(f0,t);
  if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(vol||.06,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(c.destination);o.start(t);o.stop(t+dur+.02);
}
const SFX={
  tick(){const n=performance.now();if(n-AU.last<36)return;AU.last=n;tone(1900,null,.025,"square",.035);},
  pick(){tone(620,930,.09,"triangle",.08);},
  land(){tone(392,523,.16,"triangle",.09);tone(784,null,.1,"square",.04,.12);},
  goalUs(){tone(523,784,.14,"triangle",.1);tone(1046,null,.12,"square",.05,.1);},
  goalThem(){tone(233,155,.22,"sawtooth",.08);},
  whistle(n){for(let i=0;i<(n||1);i++)tone(2093,2093,.12,"square",.05,i*.18);},
  fanfare(){[523,659,784,1046].forEach((f,i)=>tone(f,null,.32,"triangle",.09,i*.13));},
  penGoal(){tone(660,880,.1,"triangle",.09);},
  penMiss(){tone(180,120,.2,"sawtooth",.09);}
};
function wireMute(){
  const b=$("mute");
  const paint=()=>{b.textContent=AU.muted?"🔇":"🔊";};
  paint();
  b.onclick=()=>{AU.muted=!AU.muted;localStorage.setItem("seven_zero_muted",AU.muted?"1":"0");paint();if(!AU.muted)SFX.pick();};
}

/* =========================================================
   WHEEL v2 — RAF spin, pointer kicks, two flag rings, landing flash
========================================================= */
function wheelPool(){
  if(S.draft==="dynasty"&&S.dyn){
    const idxs=(DYNASTIES.find(([k])=>k===S.dyn)||[null,[]])[1];
    return idxs.slice();
  }
  if(S.draft==="era"){
    const[e0,e1]=ERAS[S.era%ERAS.length];
    return SQUADS.map((s,i)=>s.y>=e0&&s.y<=e1?i:-1).filter(i=>i>=0);
  }
  return SQUADS.map((_,i)=>i);
}
function buildWheel(){
  S.pool=wheelPool();
  const w=$("wheel");
  const n=S.pool.length, seg=360/n;
  let stops=[];
  for(let i=0;i<n;i++){
    const c=i%2?"var(--pitch-2)":"var(--pitch)";
    stops.push(`${c} ${i*seg}deg ${(i+1)*seg}deg`);
  }
  w.style.background=`conic-gradient(from ${-seg/2}deg, ${stops.join(",")})`;
  w.innerHTML="";
  const wrapW=w.parentElement.getBoundingClientRect().width||320;
  S.pool.forEach((si,i)=>{
    const e=document.createElement("div");
    e.className="seg-flag"+(n>40&&i%2?" dim":"");
    e.textContent=SQUADS[si].f;
    const radius=n>40?(i%2?0.665:0.86):0.78;
    e.style.transform=`rotate(${i*seg}deg) translate(-50%,-50%) translateY(${-wrapW/2*radius}px)`;
    w.appendChild(e);
  });
  w.style.transform=`rotate(${S.wheelRot}deg)`;
}
let spinRAF=null;
function spinTo(poolPos,done){
  const n=S.pool.length, seg=360/n;
  const target=(360-poolPos*seg)%360;
  const from=S.wheelRot;
  const delta=(4+rnd(3))*360+((target-(from%360)+720)%360);
  const to=from+delta;
  const dur=reducedMotion?0:4300+rnd(700);
  const w=$("wheel"),ptr=$("pointer");
  if(dur===0){S.wheelRot=to;w.style.transform=`rotate(${to}deg)`;done();return;}
  const t0=performance.now();
  let lastSeg=Math.floor(((from%360)+360)%360/seg);
  function frame(now){
    const t=Math.min(1,(now-t0)/dur);
    const ease=1-Math.pow(1-t,4.1);
    const rot=from+delta*ease;
    S.wheelRot=rot;
    w.style.transform=`rotate(${rot}deg)`;
    const segNow=Math.floor(((rot%360)+360)%360/seg);
    if(segNow!==lastSeg){
      lastSeg=segNow;
      SFX.tick();
      const kick=clamp(16*(1-t*0.75),5,16);
      ptr.style.transform=`rotate(${-kick}deg)`;
      setTimeout(()=>{ptr.style.transform="rotate(0deg)";},70);
    }
    if(t<1)spinRAF=requestAnimationFrame(frame);
    else{spinRAF=null;S.wheelRot=to;w.style.transform=`rotate(${to}deg)`;done();}
  }
  spinRAF=requestAnimationFrame(frame);
}
function spin(){
  if(S.spinning)return;
  // era tour: hop decades until one still has a draftable player
  if(S.draft==="era"){
    let guard=0;
    while(guard++<ERAS.length){
      const pool=wheelPool();
      const fits=pool.some(si=>SQUADS[si].p.some((pl,pi)=>!S.picked.has(si+":"+pi)&&capOK(pl[2])));
      if(fits)break;
      S.era++;
    }
    buildWheel();
    paintDraftMeta();
  }
  S.spinning=true;$("btn-spin").disabled=true;$("landed").textContent="…";
  let pos;
  do{pos=rnd(S.pool.length);}while(S.pool[pos]===S.lastSquad&&S.pool.length>1);
  const si=S.pool[pos];
  S.lastSquad=si;
  spinTo(pos,()=>{
    S.spinning=false;
    const sq=SQUADS[si];
    SFX.land();
    $("wheelflash").classList.remove("on");void $("wheelflash").offsetWidth;$("wheelflash").classList.add("on");
    $("landed").innerHTML=`${sq.f} <span>${sq.t} ${sq.y}</span>`;
    openSquad(si);
  });
}

/* =========================================================
   DRAFT
========================================================= */
function openCats(){const c=new Set();S.slots.forEach(s=>{if(!s.player)c.add(s.cat);});return c;}
function picksLeft(){return S.slots.filter(s=>!s.player).length;}
function capOK(rating){
  if(S.draft!=="cap")return true;
  return rating<=S.budget-(picksLeft()-1)*CAP_FLOOR;
}
function paintDraftMeta(){
  const bits=[S.form];
  if(S.draft!=="classic")bits.push(DRAFT_MODES[S.draft].n+(S.dyn?" · "+S.dyn:""));
  if(S.diff!=="classic")bits.push(S.diff.toUpperCase());
  if(S.daily)bits.push("DAILY");
  $("dm-form").textContent=bits.join(" · ");
  let extra="";
  if(S.draft==="era")extra=`Era: <b>${ERAS[S.era%ERAS.length][0]}s</b>`;
  if(S.draft==="cap")extra=`Budget left: <b>${S.budget}</b>`;
  $("dm-extra").innerHTML=extra;
  $("dm-respins").textContent=S.respins;
}
function openSquad(i){
  const sq=SQUADS[i];
  $("m-title").innerHTML=`${sq.f} ${sq.t} <span class="yr">${sq.y}</span>`;
  renderSquadList(i);
  $("modal-bg").classList.add("on");
}
function renderSquadList(i){
  const sq=SQUADS[i];
  const list=$("m-list");list.innerHTML="";
  let anyFit=false;
  sq.p.forEach((pl,idx)=>{
    const key=i+":"+idx;
    const fits=!S.picked.has(key)&&capOK(pl[2])&&picksLeft()>0;
    if(fits)anyFit=true;
    const b=document.createElement("button");
    b.className="pl";b.disabled=!fits;
    const t=hidden()?"plain":tier(pl[2]);
    b.innerHTML=`<span class="pos">${pl[1]}</span><span class="pname">${pl[0]}</span><span class="rt t-${t}">${hidden()?"??":pl[2]}</span>`;
    b.onclick=()=>renderPlacement(i,idx,key);
    list.appendChild(b);
  });
  $("m-hint").textContent=anyFit
    ?(S.draft==="cap"?`Pick a player, then choose where they play. Budget left: ${S.budget}.`:"Pick a player, then choose where they play.")
    :(S.draft==="cap"?"Everyone here is already taken or beyond your budget — spin again for free.":"Everyone in this squad is already in your XI — spin again for free.");
  const r=$("btn-respin");
  if(!anyFit){r.style.display="block";r.disabled=false;r.textContent="Spin again (free)";r.dataset.free=1;}
  else if(S.respins>0){r.style.display="block";r.disabled=false;r.textContent=`Use a re-spin (${S.respins} left)`;delete r.dataset.free;}
  else{r.style.display="none";}
}
function renderPlacement(si,pi,key){
  const pl=SQUADS[si].p[pi];
  $("m-hint").innerHTML=`Place <b>${pl[0]}</b> — natural <b>${pl[1]}</b>${hidden()?"":" · "+pl[2]}. Out of position drops the rating.`;
  const list=$("m-list");list.innerHTML="";
  const back=document.createElement("button");
  back.className="backlink";back.textContent="← Back to squad";
  back.onclick=()=>renderSquadList(si);
  list.appendChild(back);
  const mates=S.slots.filter(x=>x.player&&x.player.sq===si).length;
  const grid=document.createElement("div");grid.className="placegrid";
  FORMATIONS[S.form].rows.forEach(r=>{
    const row=document.createElement("div");row.className="prow";
    r.forEach(id=>{
      const s=S.slots.find(x=>x.id===id);
      const b=document.createElement("button");b.className="pslot";
      if(s.player){
        b.disabled=true;
        b.innerHTML=`<div class="pid">${id}</div><div class="pe" style="font-size:11px">${s.player.name.split(" ").pop()}</div>`;
      }else{
        const pen=oopPenalty(s.cat,pl[1]);
        const eff=Math.max(40,pl[2]-pen);
        b.classList.add(pen===0?"nat":pen<=4?"sli":"maj");
        const chemBits=(pen===0?1:0)+Math.min(2,mates);
        b.innerHTML=`<div class="pid">${id}</div>
          <div class="pe">${hidden()?(pen===0?"OK":pen<=4?"–":"– –"):eff}</div>
          <div class="pc">${pen?(hidden()?"out of position":"−"+pen+" OOP"):"natural"}${chemBits?" · ⚡"+chemBits:""}</div>`;
        b.onclick=()=>draft(si,pi,key,id);
      }
      row.appendChild(b);
    });
    grid.appendChild(row);
  });
  list.appendChild(grid);
  $("btn-respin").style.display="none";
}
function draft(si,pi,key,slotId){
  const pl=SQUADS[si].p[pi];
  const slot=slotId?S.slots.find(s=>s.id===slotId&&!s.player):S.slots.find(s=>!s.player&&s.cat===pl[1]);
  if(!slot)return;
  slot.player={name:pl[0],rating:pl[2],team:SQUADS[si].t,year:SQUADS[si].y,flag:SQUADS[si].f,cat:pl[1],sq:si};
  S.picked.add(key);
  if(S.draft==="cap")S.budget-=pl[2];
  if(S.draft==="era")S.era++;
  SFX.pick();
  $("modal-bg").classList.remove("on");
  renderPitch(slot.id);
  paintDraftMeta();
  $("picks-n").textContent=picksLeft();
  if(picksLeft()===0){
    $("btn-spin").textContent="Name your captain →";
    $("btn-spin").onclick=openCaptain;
    $("btn-spin").disabled=false;
    $("landed").innerHTML=`<span>Your XI is complete.</span>`;
  }else{
    if(S.draft==="era"||S.draft==="dynasty")buildWheel();
    $("btn-spin").disabled=false;
  }
}
/* positional fit: 0 natural · −4 one line out · −9 two lines · −15 anything with GK */
const LINE={GK:0,DEF:1,MID:2,FWD:3};
function oopPenalty(slotCat,playerPos){
  if(slotCat===playerPos)return 0;
  if(slotCat==="GK"||playerPos==="GK")return 15;
  return Math.abs(LINE[slotCat]-LINE[playerPos])===1?4:9;
}
function effRating(s){return s.player?Math.max(40,s.player.rating-oopPenalty(s.cat,s.player.cat)):0;}
/* per-player chemistry 0–3⚡: natural position +1, same-squad teammates +1 each (max +2) */
function playerChem(s){
  if(!s.player)return 0;
  let c=s.cat===s.player.cat?1:0;
  const mates=S.slots.filter(x=>x.player&&x!==s&&x.player.sq===s.player.sq).length;
  return c+Math.min(2,mates);
}
function chemistry(){
  const total=S.slots.reduce((a,s)=>a+playerChem(s),0);
  const max=S.slots.length*3;
  return{total,max,boost:Math.min(3,total*0.09)};
}
function renderPitch(justId){
  const F=FORMATIONS[S.form];
  const p=$("pitch");p.innerHTML="";
  F.rows.forEach(r=>{
    const row=document.createElement("div");row.className="row";
    r.forEach(id=>{
      const s=S.slots.find(x=>x.id===id);
      const d=document.createElement("div");
      const eff=effRating(s),pen=s.player?oopPenalty(s.cat,s.player.cat):0;
      const t=s.player?(hidden()?"plain":tier(eff)):"";
      d.className="slot"+(s.player?" filled t-"+t:"")+(justId===id?" justin":"");
      d.innerHTML=s.player
        ?`${S.captain===s.id?'<div class="cap">C</div>':""}<div class="ptag">${s.id}</div><div class="nm">${s.player.name}</div><div class="meta">${s.player.flag} ${s.player.year}${hidden()?"":" · "+eff}${pen?"▾":""} · ⚡${playerChem(s)}</div>`
        :`<div class="ptag">${s.id}</div><div class="nm" style="color:var(--chalk-dim)">—</div>`;
      row.appendChild(d);
    });
    p.appendChild(row);
  });
  const c=chemistry();
  $("chem-n").textContent=c.total+"/"+c.max;
  $("chem-b").textContent="+"+c.boost.toFixed(1);
}
function openCaptain(){
  const list=$("cap-list");list.innerHTML="";
  S.slots.forEach(s=>{
    const b=document.createElement("button");
    b.className="pl";
    const eff=effRating(s);
    const t=hidden()?"plain":tier(eff);
    b.innerHTML=`<span class="pos">${s.id}</span><span class="pname">${s.player.name} <span style="color:var(--chalk-dim)">⚡${playerChem(s)}</span></span><span class="rt t-${t}">${hidden()?"??":eff}</span>`;
    b.onclick=()=>{S.captain=s.id;$("cap-bg").classList.remove("on");SFX.fanfare();renderPitch();startCup();};
    list.appendChild(b);
  });
  $("cap-bg").classList.add("on");
}

/* =========================================================
   TEAM STRENGTH
========================================================= */
function avg(a){return a.reduce((x,y)=>x+y,0)/a.length;}
function strengths(){
  const by=c=>S.slots.filter(s=>s.cat===c).map(s=>effRating(s));
  const F=FORMATIONS[S.form];
  const bonus=chemistry().boost+(S.captain?1.0:0);
  const att=avg(by("FWD"))*0.6+avg(by("MID"))*0.4+F.mod.att+bonus;
  const def=avg(by("DEF"))*0.7+by("GK")[0]*0.3+F.mod.def+bonus;
  return{att,def,overall:(att+def)/2};
}
function scorerName(){
  const pool=[];
  S.slots.forEach(s=>{
    const e=effRating(s);
    let w=s.cat==="FWD"?e*1.7:s.cat==="MID"?e*0.9:s.cat==="DEF"?e*0.22:0;
    if(S.captain===s.id)w*=1.35;
    if(w>0)pool.push([s.player.name,w]);
  });
  let tot=pool.reduce((a,b)=>a+b[1],0),r=R()*tot;
  for(const[n,w]of pool){r-=w;if(r<=0)return n;}
  return pool[0][0];
}
