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
const POOL_MULT={all:1,p90:0.9,p06:0.8};
const POOLS={all:{n:"All-time",y:0},p90:{n:"Post-1990",y:1990},p06:{n:"Post-2006",y:2006}};
const DRAFT_MODES={
  classic:{n:"Classic",d:"all "+SQUADS.length+" squads"},
  era:{n:"Era Tour",d:"a new decade each spin"},
  dynasty:{n:"Dynasty",d:"one nation, all eras"},
  cap:{n:"Wage Cap",d:"budget 946 — spend wisely"}
};
const ERAS=[[1950,1959],[1960,1969],[1970,1979],[1980,1989],[1990,1999],[2000,2009],[2010,2019],[2020,2029]];
const CAP_BUDGET=946, CAP_FLOOR=75;

/* featured challenge of the day — deterministic rotation, ×1.15 bonus when your
   daily run matches it (mirrored in api/_shared.js — keep in sync) */
const FEATURED=[
  {n:"Legend Day",draft:"classic",diff:"legend",pool:"all",form:"4-3-3"},
  {n:"Modern Masters",draft:"classic",diff:"hard",pool:"p90",form:"4-2-3-1"},
  {n:"Samba Dynasty",draft:"dynasty",dyn:"Brazil",diff:"classic",pool:"all",form:"4-2-3-1"},
  {n:"Time Traveller",draft:"era",diff:"classic",pool:"all",form:"4-4-2"},
  {n:"Moneyball",draft:"cap",diff:"classic",pool:"all",form:"4-4-2"},
  {n:"New School",draft:"classic",diff:"classic",pool:"p06",form:"4-3-3"},
  {n:"Catenaccio Night",draft:"classic",diff:"hard",pool:"all",form:"4-5-1"},
  {n:"Three Lions… er, Dynasty",draft:"dynasty",dyn:"England",diff:"classic",pool:"all",form:"4-4-2"},
  {n:"Era Tour: Hard Mode",draft:"era",diff:"hard",pool:"all",form:"4-3-3"},
  {n:"Wing-back Wednesday-ish",draft:"classic",diff:"classic",pool:"all",form:"3-5-2"}
];
function featuredFor(day){
  let h=0;for(let i=0;i<day.length;i++){h=(h*31+day.charCodeAt(i))>>>0;}
  return FEATURED[h%FEATURED.length];
}
const FEAT_MULT=1.15;
function matchesFeatured(flags,day){
  const f=featuredFor(day||utcDay());
  return !!flags.daily&&flags.draft===f.draft&&flags.diff===f.diff&&flags.pool===f.pool
    &&flags.form===f.form&&(f.dyn?flags.dyn===f.dyn:true);
}
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
  const feat=matchesFeatured(flags,flags.day);
  const mult=(DIFF_MULT[flags.diff]||1)*(DRAFT_MULT[flags.draft]||1)*(POOL_MULT[flags.pool]??1)
    *(flags.daily?1.1:1)*(feat?FEAT_MULT:1);
  return{pts:Math.round(pts*mult),champion,perfect,base:pts,mult,feat};
}

/* =========================================================
   STATE + STORAGE
========================================================= */
let S={};
let RUN_SEED=null;   // set before resetState to replay a challenge's wheel
let pref={form:"4-3-3",draft:"classic",diff:"classic",dyn:null,pool:"all"};
const utcDay=()=>new Date().toISOString().slice(0,10);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

function resetState(daily){
  // daily is now fully configurable (still seeded + free + ×1.1 + one/day)
  const draft=pref.draft, form=pref.form, diff=pref.diff;
  const poolMode=draft==="dynasty"?"all":pref.pool;
  const F=FORMATIONS[form];
  const slots=[];F.rows.forEach(r=>r.forEach(id=>slots.push({id,cat:F.cats[id],player:null})));
  // every run is seeded so it can be shared as a "beat my run" challenge —
  // same seed + same rules = same wheel
  const seed=RUN_SEED!=null?RUN_SEED:((Math.random()*4294967296)>>>0);
  RUN_SEED=null;
  S={form,draft,diff,poolMode,daily:!!daily,dyn:draft==="dynasty"?pref.dyn:null,
     slots,lastSquad:-1,spinning:false,wheelRot:0,picked:new Set(),
     respins:1,captain:null,goals:{},assists:{},era:0,budget:CAP_BUDGET,token:null,submitted:false,
     seed,rng:mulberry32(seed),
     pool:[],wheelIdx:[],
     cup:{stage:0,record:{w:0,d:0,l:0,gf:0,ga:0},group:null,knock:[],out:false,outAt:null,
          champion:false,perfect:false,regWins:0,cleanSheets:0,gridResults:[],matches:[]}};
  // Era Tour: start on the first era that actually overlaps the chosen pool
  // (e.g. Post-1990 has no 1950s squads), so the opening reel is never empty
  if(draft==="era"){
    const minY=(POOLS[poolMode]||POOLS.all).y;
    for(let k=0;k<ERAS.length;k++){const[a,b]=ERAS[k];if(SQUADS.some(s=>s.y>=Math.max(a,minY)&&s.y<=b)){S.era=k;break;}}
  }
  // S.token (playtime anti-cheat token) is set by startRun from /api/token;
  // anonymous/offline play falls back to a free token there.
}
const R=()=>S.rng();
const rnd=n=>Math.floor(R()*n);
const pickFrom=a=>a[rnd(a.length)];

const STORE_KEY="seven_zero_stats_v3";
const STORE_DEF={runs:0,titles:0,perfects:0,bestW:0,bestPts:0,goals:0,topScorers:{},
  badges:{},streak:0,lastDaily:"",lastRun:"",playerName:"",playerCountry:"",playerEmail:"",optin:false,emailSent:0,albumSquads:{},albumPlayers:{}};
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
const apiPost=(p,body)=>fetch(p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})})
  .then(async r=>{let j={};try{j=await r.json();}catch(e){}return j;});

/* =========================================================
   No credits / no wallet — pure free play. Invite = social share.
========================================================= */
const SITE_URL="https://seven-zero-navy.vercel.app";
function toast(msg){
  const t=$("toast");if(!t)return;
  t.textContent=msg;t.classList.add("on");
  clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("on"),2600);
}
function openInvite(){
  if($("inv-link"))$("inv-link").value=SITE_URL;
  $("invite-bg").classList.add("on");
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
   JERSEYS — national shirt + squad number per player
========================================================= */
const KIT={
 Brazil:["#ffdc26","#1aa053","#1a6b46"],Argentina:["#9fd4f0","#ffffff","#1d3c6e"],
 Germany:["#f5f5f0","#1a1a1a","#1a1a1a"],"West Germany":["#f5f5f0","#1a1a1a","#1a1a1a"],
 Italy:["#1c52a4","#ffffff","#ffffff"],France:["#1e3f8f","#ffffff","#ffffff"],
 England:["#f5f5f0","#1d2f5e","#1d2f5e"],Netherlands:["#f08020","#ffffff","#ffffff"],
 Spain:["#c8261e","#f2c14e","#f2c14e"],Portugal:["#a31322","#1c6b50","#f2c14e"],
 Uruguay:["#7ab4dd","#ffffff","#1d3c6e"],Hungary:["#c8261e","#ffffff","#ffffff"],
 Poland:["#f5f5f0","#cc2233","#cc2233"],Sweden:["#f2c829","#1c5aa0","#1c5aa0"],
 Denmark:["#c8261e","#ffffff","#ffffff"],Austria:["#f5f5f0","#cc2233","#cc2233"],
 Scotland:["#1d2a5e","#ffffff","#ffffff"],"Northern Ireland":["#1a8a4a","#ffffff","#ffffff"],
 Ireland:["#1a8a4a","#f5a623","#ffffff"],"Soviet Union":["#c8261e","#ffffff","#ffffff"],
 Croatia:["#e63946","#ffffff","#1d3c6e"],Belgium:["#c8261e","#1a1a1a","#f2c14e"],
 Mexico:["#1a7a44","#ffffff","#ffffff"],"United States":["#f5f5f0","#1d2f5e","#1d2f5e"],
 Colombia:["#f2c829","#1c5aa0","#1c5aa0"],Chile:["#c8261e","#1d2f5e","#ffffff"],
 Peru:["#f5f5f0","#cc2233","#cc2233"],Cameroon:["#1a7a44","#cc2233","#f2c829"],
 Nigeria:["#1a9a55","#ffffff","#ffffff"],Senegal:["#f5f5f0","#1a8a4a","#1a8a4a"],
 Morocco:["#c8261e","#1a7a44","#1a7a44"],Ghana:["#f5f5f0","#1a1a1a","#cc2233"],
 Algeria:["#f5f5f0","#1a8a4a","#1a8a4a"],Japan:["#1c3f8f","#ffffff","#ffffff"],
 "South Korea":["#c8261e","#1d2f5e","#ffffff"],"Saudi Arabia":["#f5f5f0","#1a8a4a","#1a8a4a"],
 Australia:["#f2c829","#1a7a44","#1a7a44"],"Costa Rica":["#c8261e","#1c5aa0","#ffffff"],
 "Türkiye":["#c8261e","#ffffff","#ffffff"],Bulgaria:["#f5f5f0","#1a8a4a","#1a8a4a"],
 Romania:["#f2c829","#1c5aa0","#1c5aa0"],_d:["#0f4030","#f3ecd9","#f3ecd9"]};
function jersey(team,num,size){
  const k=KIT[team]||KIT._d;
  return `<svg class="jsy" style="width:${size||24}px;height:${size||24}px" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M8 7 L15 3.5 Q20 8 25 3.5 L32 7 L38 14 L31.5 18.5 L31.5 36.5 L8.5 36.5 L8.5 18.5 L2 14 Z" fill="${k[0]}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <path d="M2 14 L8 7 L8.5 18.5 Z" fill="${k[1]}"/><path d="M38 14 L32 7 L31.5 18.5 Z" fill="${k[1]}"/>
    <path d="M15 3.5 Q20 8 25 3.5 L23.5 6.5 Q20 9.5 16.5 6.5 Z" fill="${k[1]}"/>
    <text x="20" y="28" text-anchor="middle" font-size="15" font-weight="900" fill="${k[2]}">${num}</text>
  </svg>`;
}

/* =========================================================
   LEADERSHIP — hidden captain stat (4–10)
========================================================= */
const LEAD={
 "Bobby Moore":10,"Franz Beckenbauer":10,"Obdulio Varela":10,
 "Daniel Passarella":9,"Diego Maradona":9,"Lothar Matthäus":9,"Fabio Cannavaro":9,"Franco Baresi":9,
 "Dino Zoff":9,"Lev Yashin":9,"Fritz Walter":9,"Didier Deschamps":9,"Dunga":9,"Cafu":9,
 "Carles Puyol":9,"Steven Gerrard":9,"Philipp Lahm":9,"Vincent Kompany":9,"Diego Godín":9,
 "Luka Modrić":9,"Hong Myung-bo":9,"Graeme Souness":9,"Billy Bremner":9,"Peter Schmeichel":9,
 "Gianluigi Buffon":9,"Stephen Appiah":9,"Roger Milla":9,
 "Paolo Maldini":8,"Sergio Ramos":8,"Iker Casillas":8,"Xavi":8,"Fernando Hierro":8,"John Terry":8,
 "Bryan Robson":8,"Jay-Jay Okocha":8,"Javier Mascherano":8,"Thiago Silva":8,"Diego Forlán":8,
 "Carlos Valderrama":8,"Gheorghe Hagi":8,"Kalidou Koulibaly":8,"Manuel Neuer":8,
 "Bastian Schweinsteiger":8,"Ferenc Puskás":8,"Bobby Charlton":8,"Zinedine Zidane":8,
 "Lionel Messi":8,"Cristiano Ronaldo":8,"Rinat Dasayev":8,"Mick McCarthy":8,"Paul McGrath":8,
 "Harry Kane":7,"Hristo Stoichkov":7,"Luis Suárez":7,"Wayne Rooney":7,"Neymar":7,"Eden Hazard":7
};
function leadership(p){return LEAD[p.name]!=null?LEAD[p.name]:4+hashStr(p.name)%5;}
function capLead(){const s=S.slots.find(x=>x.id===S.captain);return s&&s.player?leadership(s.player):0;}
function leadWord(l){return l>=9?"a colossal leader":l>=7?"a strong voice":"a quiet captain";}

/* =========================================================
   WHEEL v3 — RAF spin, pointer kicks, decade-tinted segments,
   gold tick ring, up to three flag rings, landing flash + flag pop
========================================================= */
function poolBase(){
  const minY=(POOLS[S.poolMode]||POOLS.all).y;
  return SQUADS.map((_,i)=>i).filter(i=>SQUADS[i].y>=minY);
}
function wheelPool(){
  if(S.draft==="dynasty"&&S.dyn){
    const idxs=(DYNASTIES.find(([k])=>k===S.dyn)||[null,[]])[1];
    return idxs.slice();
  }
  const base=poolBase();
  if(S.draft==="era"){
    const[e0,e1]=ERAS[S.era%ERAS.length];
    return base.filter(i=>SQUADS[i].y>=e0&&SQUADS[i].y<=e1);
  }
  return base;
}
/* one tint pair per decade — a clear progression from warm 1950s greens
   through teal to cool 2020s blues, so the disc reads as 8 era zones */
const DEC_TINT={
  195:["#1b3a24","#214529"],196:["#173c28","#1d472f"],197:["#123f2d","#184b37"],
  198:["#0f4336","#13503f"],199:["#0c463f","#10514a"],200:["#0b4350","#0e4d5d"],
  201:["#0c3f59","#104a67"],202:["#103a5e","#13446b"]};
function cardHTML(si){
  const sq=SQUADS[si];if(!sq)return"";
  const dec=Math.floor(sq.y/10), pair=DEC_TINT[dec]||["#123f2d","#184b37"];
  return `<div class="reel-card" style="background:linear-gradient(180deg,${pair[0]},${pair[1]})">`
    +`<div class="cf">${sq.f}</div><div class="cn">${sq.t}</div><div class="cy">${sq.y}</div></div>`;
}
// true cell width (card + margins) measured from the DOM — card size varies by breakpoint
function cellW(track){
  if(track.children.length>1){
    const d=track.children[1].getBoundingClientRect().left-track.children[0].getBoundingClientRect().left;
    if(d>10)return d;
  }
  return 96;
}
// idle strip so the reel isn't empty before the first draw
function buildReel(){
  S.pool=wheelPool();
  const track=$("reel-track");if(!track)return;
  if(!S.pool.length){track.innerHTML="";return;}   // never crash on an empty pool
  const vw=$("reel").clientWidth||320;
  let html="",seen=-1;
  const k=Math.ceil(vw/80)+4;
  for(let i=0;i<k;i++){let si;do{si=pickFrom(S.pool);}while(si===seen&&S.pool.length>1);seen=si;html+=cardHTML(si);}
  track.innerHTML=html;
  track.style.transition="none";
  const cell=cellW(track);
  track.style.transform=`translateX(${vw/2-Math.floor(k/2)*cell-cell/2}px)`;
}
let spinRAF=null;
function spinReel(pos,done){
  const winner=S.pool[pos], track=$("reel-track"), reel=$("reel");
  const vw=reel.clientWidth||320;
  const N=46, L=40; // winner sits at index 40 with a few trailing cards
  const arr=[]; let prev=-1;
  for(let i=0;i<N;i++){
    if(i===L){arr.push(winner);prev=winner;continue;}
    let si;do{si=pickFrom(S.pool);}while((si===prev||si===winner)&&S.pool.length>2);
    prev=si;arr.push(si);
  }
  track.innerHTML=arr.map(cardHTML).join("");
  const cell=cellW(track);
  const startTx=vw/2-cell/2;
  const jitter=(rnd(2)?1:-1)*rnd(cell*0.32);
  const finalTx=vw/2-(L*cell+cell/2)+jitter;
  track.style.transition="none";track.style.transform=`translateX(${startTx}px)`;void track.offsetWidth;
  const dur=reducedMotion?0:3600+rnd(500);
  const settle=()=>{track.style.transform=`translateX(${finalTx}px)`;
    const wc=track.children[L];if(wc){wc.classList.remove("win");void wc.offsetWidth;wc.classList.add("win");}done();};
  if(dur===0){settle();return;}
  const t0=performance.now();let lastC=-1;
  function frame(now){
    const t=Math.min(1,(now-t0)/dur);
    const tx=startTx+(finalTx-startTx)*(1-Math.pow(1-t,4));
    track.style.transform=`translateX(${tx}px)`;
    const c=Math.round((vw/2-tx-cell/2)/cell);
    if(c!==lastC){lastC=c;SFX.tick();}
    if(t<1)spinRAF=requestAnimationFrame(frame);
    else{spinRAF=null;settle();}
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
    buildReel();
    paintDraftMeta();
  }
  S.spinning=true;$("btn-spin").disabled=true;
  $("landed").classList.remove("pop");$("landed").innerHTML=`<span class="prompt">Drawing…</span>`;
  let pos;
  do{pos=rnd(S.pool.length);}while(S.pool[pos]===S.lastSquad&&S.pool.length>1);
  const si=S.pool[pos];
  S.lastSquad=si;
  spinReel(pos,()=>{
    S.spinning=false;
    const sq=SQUADS[si];
    SFX.land();
    const fl=$("reel-flash");if(fl){fl.classList.remove("on");void fl.offsetWidth;fl.classList.add("on");}
    const l=$("landed");
    l.innerHTML=`<span class="reveal"><span class="fl">${sq.f}</span> <b>${sq.t} ${sq.y}</b></span>`;
    l.classList.remove("pop");void l.offsetWidth;l.classList.add("pop");
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
  const ab=$("btn-restart-draft");
  if(ab)ab.textContent="Abandon run · no retry today";
}
function openSquad(i){
  const sq=SQUADS[i];
  $("m-title").innerHTML=`${sq.f} ${sq.t} <span class="yr">${sq.y}</span>`;
  $("m-lore").textContent=sq.l||"";
  renderSquadList(i);
  $("modal-bg").classList.add("on");
}
function renderSquadList(i){
  const sq=SQUADS[i];
  const open=openCats();
  const counts={GK:0,DEF:0,MID:0,FWD:0};
  S.slots.forEach(x=>{if(!x.player)counts[x.cat]++;});
  const needs=$("m-needs");
  needs.style.display="flex";
  needs.innerHTML='<span class="npill" style="border:0;padding-left:0;opacity:.7">Still to fill</span>'+
    ["GK","DEF","MID","FWD"].map(c=>
      `<span class="npill${counts[c]?"":" done"}">${c} ${counts[c]?"<b>×"+counts[c]+"</b>":"✓"}</span>`).join("");
  const list=$("m-list");list.innerHTML="";
  let anyFit=false;
  sq.p.forEach((pl,idx)=>{
    const key=i+":"+idx;
    const fits=!S.picked.has(key)&&capOK(pl[2])&&picksLeft()>0;
    if(fits)anyFit=true;
    const sp=pl[3]||pl[1];
    const natOpen=S.slots.some(x=>!x.player&&(ROLE_OF_SLOT[x.id]||x.cat)===sp);
    const b=document.createElement("button");
    b.className="pl";b.disabled=!fits;
    const t=hidden()?"plain":tier(pl[2]);
    b.innerHTML=`${jersey(sq.t,idx+1,26)}<span class="pos ${natOpen?"open":"oop"}" title="${natOpen?"natural slot open":"only out-of-position slots left"}">${sp}</span><span class="pname">${pl[0]}</span><span class="rt t-${t}">${hidden()?"??":pl[2]}</span>`;
    b.onclick=()=>renderPlacement(i,idx,key);
    list.appendChild(b);
  });
  $("m-hint").textContent=anyFit
    ?(S.draft==="cap"?`Pick a player, then place them. Green position = natural slot open, amber = out-of-position only. Budget left: ${S.budget}.`:"Pick a player, then place them. Green position = natural slot open, amber = out-of-position only.")
    :(S.draft==="cap"?"Everyone here is already taken or beyond your budget — spin again for free.":"Everyone in this squad is already in your XI — spin again for free.");
  const r=$("btn-respin");
  if(!anyFit){r.style.display="block";r.disabled=false;r.textContent="Spin again (free)";r.dataset.free=1;}
  else if(S.respins>0){r.style.display="block";r.disabled=false;r.textContent=`Use a re-spin (${S.respins} left)`;delete r.dataset.free;}
  else{r.style.display="none";}
}
function renderPlacement(si,pi,key){
  $("m-needs").style.display="none";
  const pl=SQUADS[si].p[pi];
  $("m-hint").innerHTML=`Place <b>${pl[0]}</b> — natural <b>${pl[1]}</b>${hidden()?"":" · "+pl[2]}. Out of position drops the rating.`;
  const list=$("m-list");list.innerHTML="";
  const back=document.createElement("button");
  back.className="backlink";back.textContent="← Back to squad";
  back.onclick=()=>renderSquadList(si);
  list.appendChild(back);
  // preview the candidate's chemistry per slot, using the same bond() as the live model
  const cand={sq:si,team:SQUADS[si].t,year:SQUADS[si].y,name:pl[0],cat:pl[1],sp:pl[3]||pl[1]};
  let bestBond=0,linkN=0;
  S.slots.forEach(x=>{if(x.player){const bd=bond(cand,x.player);if(bd>0){if(bd>bestBond)bestBond=bd;if(bd>=CHEM.decade)linkN++;}}});
  const volBonus=Math.min(CHEM.volCap,linkN*CHEM.volPer);
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
        const pen=oopPenalty(s,{cat:pl[1],sp:pl[3]||pl[1]});
        const eff=Math.max(40,pl[2]-pen);
        b.classList.add(pen===0?"nat":pen<=4?"sli":"maj");
        const posFit=pen===0?CHEM.posExact:(s.cat===pl[1]?CHEM.posLine:0);
        const chemBits=Math.round((posFit+bestBond+volBonus)*CHEM.mult);
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
  slot.player={name:pl[0],rating:pl[2],team:SQUADS[si].t,year:SQUADS[si].y,flag:SQUADS[si].f,cat:pl[1],sp:pl[3]||pl[1],num:pi+1,sq:si};
  S.picked.add(key);
  // album: remember every squad drafted from and every legend fielded
  {const st=store.get();
   st.albumSquads=st.albumSquads||{};st.albumPlayers=st.albumPlayers||{};
   st.albumSquads[SQUADS[si].t+"|"+SQUADS[si].y]=(st.albumSquads[SQUADS[si].t+"|"+SQUADS[si].y]||0)+1;
   st.albumPlayers[pl[0]+"|"+SQUADS[si].y]=(st.albumPlayers[pl[0]+"|"+SQUADS[si].y]||0)+1;
   store.set(st);}
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
    $("landed").classList.remove("pop");$("landed").innerHTML=`<span class="reveal"><b>Your XI is complete ✓</b></span>`;
  }else{
    if(S.draft==="era"||S.draft==="dynasty")buildReel();
    $("btn-spin").disabled=false;
  }
}
/* positional fit, FIFA-style: related roles are interchangeable (no penalty) —
   LM↔LW, RM↔RW, CM↔AM↔DM, full-back↔wing-back↔wide-mid. Wrong-side or near
   roles cost a little; only a real misfit (a striker at the back, anyone in
   goal) costs big. */
const ROLE_OF_SLOT={GK:"GK",LB:"LB",RB:"RB",LCB:"CB",RCB:"CB",CB:"CB",LWB:"LB",RWB:"RB",
  LDM:"DM",RDM:"DM",CDM:"DM",LCM:"CM",CM:"CM",RCM:"CM",LM:"LM",RM:"RM",
  LAM:"AM",CAM:"AM",RAM:"AM",LW:"LW",RW:"RW",ST:"ST",ST1:"ST",ST2:"ST"};
const LINE_OF_ROLE={GK:0,CB:1,RB:1,LB:1,DM:2,CM:2,AM:2,RM:2,LM:2,RW:3,LW:3,ST:3};
const POS_ZERO=new Set(["LM|LW","RM|RW","LB|LM","RB|RM","CM|DM","AM|CM"]);          // interchangeable
const POS_CHEAP=new Set(["LB|LW","RB|RW","CB|DM","CB|RB","CB|LB","AM|ST","RW|ST",   // related, −2
  "LW|ST","AM|RW","AM|LW","CM|RM","CM|LM","AM|DM","LB|RB","LM|RM","LW|RW"]);
const pk=(a,b)=>a<b?a+"|"+b:b+"|"+a;
function rolePenalty(role,sp){
  if(role===sp)return 0;
  if(role==="GK"||sp==="GK")return 12;
  const k=pk(role,sp);
  if(POS_ZERO.has(k))return 0;
  if(POS_CHEAP.has(k))return 2;
  const d=Math.abs(LINE_OF_ROLE[role]-LINE_OF_ROLE[sp]);
  return d===0?3:d===1?4:8;
}
function oopPenalty(slot,pl){ return rolePenalty(ROLE_OF_SLOT[slot.id]||slot.cat, pl.sp||pl.cat); }
function effRating(s){return s.player?Math.max(40,s.player.rating-oopPenalty(s,s.player)):0;}

/* =========================================================
   CHEMISTRY v4 — generous: rewards correct position, same club,
   same World Cup squad, same nation, same decade, same continent.
   Tuned so a normally-assembled XI sits around ~16.
========================================================= */
const CONT={Brazil:"SA",Argentina:"SA",Uruguay:"SA",Chile:"SA",Peru:"SA",Colombia:"SA",
  Mexico:"NA","United States":"NA","Costa Rica":"NA",
  Cameroon:"AF",Nigeria:"AF",Senegal:"AF",Morocco:"AF",Ghana:"AF",Algeria:"AF",
  Japan:"AS","South Korea":"AS","Saudi Arabia":"AS",Australia:"AS"};
const contOf=t=>CONT[t]||"EU";
const decOf=y=>Math.floor(y/10);
/* curated club allegiances for marquee players — lets cross-nation club
   legends link up (Messi+Suárez = Barça, Ronaldo+Modrić = Real…).
   Coverage is the famous cases, not all 1,608 players. */
const CLUB=(()=>{const m={},add=(c,...ns)=>ns.forEach(n=>m[n]=c);
  add("Real Madrid","Cristiano Ronaldo","Zinedine Zidane","Sergio Ramos","Iker Casillas","Raúl","Luka Modrić","Roberto Carlos","Toni Kroos","Raphaël Varane","Fernando Hierro","Emilio Butragueño","Hugo Sánchez","Pepe");
  add("Barcelona","Lionel Messi","Xavi","Andrés Iniesta","Carles Puyol","Gerard Piqué","Sergio Busquets","Luis Suárez","Ronaldinho","Rivaldo","Romário","Hristo Stoichkov","Pep Guardiola","David Villa","Pedro","Neymar");
  add("Bayern Munich","Franz Beckenbauer","Gerd Müller","Sepp Maier","Paul Breitner","Lothar Matthäus","Philipp Lahm","Bastian Schweinsteiger","Thomas Müller","Manuel Neuer","Arjen Robben","Franck Ribéry","Robert Lewandowski");
  add("Manchester United","Bobby Charlton","David Beckham","Wayne Rooney","Gary Neville","Paul Scholes","Rio Ferdinand","Jaap Stam","Bryan Robson");
  add("Liverpool","Steven Gerrard","Kenny Dalglish","Sadio Mané","Alisson");
  add("AC Milan","Paolo Maldini","Franco Baresi","Gennaro Gattuso","Alessandro Nesta","Kaká");
  add("Juventus","Gianluigi Buffon","Alessandro Del Piero","Michel Platini","Marco Tardelli","Antonio Cabrini","Dino Zoff","Gaetano Scirea","Paolo Rossi","Claudio Gentile");
  add("Ajax","Johan Cruyff","Johan Neeskens","Ruud Krol","Johnny Rep","Frank de Boer","Edwin van der Sar");
  // 2026-era club cores (cross-nation chemistry for current stars)
  add("Real Madrid","Kylian Mbappé","Jude Bellingham","Vinícius Júnior","Rodrygo","Éder Militão","Aurélien Tchouaméni","Eduardo Camavinga","Dani Carvajal","Federico Valverde","Endrick","Antonio Rüdiger","Thibaut Courtois");
  add("Barcelona","Lamine Yamal","Pedri","Pau Cubarsí","Frenkie de Jong","Marc-André ter Stegen","Ronald Araújo","Jules Koundé","Raphinha","Dani Olmo","Robert Lewandowski");
  add("Manchester City","Rodri","Phil Foden","Bernardo Silva","Rúben Dias","Joško Gvardiol","Jérémy Doku","John Stones");
  add("Paris Saint-Germain","Achraf Hakimi","Nuno Mendes","Marquinhos","Vitinha","João Neves","Fabián Ruiz","Ousmane Dembélé");
  add("Arsenal","Bukayo Saka","Declan Rice","William Saliba","Gabriel Magalhães","Kai Havertz","Leandro Trossard","Jurriën Timber");
  add("Bayern Munich","Harry Kane","Joshua Kimmich","Jamal Musiala","Serge Gnabry","Dayot Upamecano");
  add("Liverpool","Virgil van Dijk","Cody Gakpo","Ryan Gravenberch","Ibrahima Konaté");
  add("Inter","Lautaro Martínez","Marcus Thuram","Denzel Dumfries");
  return m;})();
function sameClub(a,b){const x=CLUB[a.name];return !!x&&x===CLUB[b.name];}
const CHEM={posExact:1.6,posLine:0.7,club:2,squad:1.4,nation:1,decade:0.6,cont:0.3,volPer:0.2,volCap:1.4,mult:0.66,scale:0.09,boostCap:4};
function bond(a,b){
  if(sameClub(a,b))return CHEM.club;
  if(a.sq===b.sq)return CHEM.squad;
  if(DYN_ALIAS(a.team)===DYN_ALIAS(b.team))return CHEM.nation;
  if(decOf(a.year)===decOf(b.year))return CHEM.decade;
  if(contOf(a.team)===contOf(b.team))return CHEM.cont;
  return 0;
}
/* per-player chem: position fit + strongest historical bond + a volume bonus
   for being linked to many teammates (themed sides) */
function playerChem(s){
  if(!s.player)return 0;
  const pen=oopPenalty(s,s.player);
  let c=pen===0?CHEM.posExact:(s.cat===s.player.cat?CHEM.posLine:0);
  let best=0,n=0;
  S.slots.forEach(x=>{if(x.player&&x!==s){const b=bond(s.player,x.player);if(b>0){if(b>best)best=b;if(b>=CHEM.decade)n++;}}});
  return (c+best+Math.min(CHEM.volCap,n*CHEM.volPer))*CHEM.mult;
}
function chemistry(){
  const total=S.slots.reduce((a,s)=>a+playerChem(s),0);
  return{total:Math.round(total),boost:Math.min(CHEM.boostCap,total*CHEM.scale)};
}
function renderPitch(justId){
  const F=FORMATIONS[S.form];
  const p=$("pitch");p.innerHTML="";
  F.rows.forEach(r=>{
    const row=document.createElement("div");row.className="row";
    r.forEach(id=>{
      const s=S.slots.find(x=>x.id===id);
      const d=document.createElement("div");
      const eff=effRating(s),pen=s.player?oopPenalty(s,s.player):0;
      const t=s.player?(hidden()?"plain":tier(eff)):"";
      d.className="slot"+(s.player?" filled t-"+t:"")+(justId===id?" justin":"");
      d.innerHTML=s.player
        ?`${S.captain===s.id?'<div class="cap">C</div>':""}<div class="jwrap">${jersey(s.player.team,s.player.num,20)}</div><div class="ptag">${s.id}</div><div class="nm">${s.player.name}</div><div class="meta">${s.player.flag} ${s.player.year}${hidden()?"":" · "+eff}${pen?"▾":""} · ⚡${Math.round(playerChem(s))}</div>`
        :`<div class="ptag">${s.id}</div><div class="nm" style="color:var(--chalk-dim)">—</div>`;
      row.appendChild(d);
    });
    p.appendChild(row);
  });
  const c=chemistry();
  $("chem-n").textContent=c.total;
  $("chem-b").textContent="+"+c.boost.toFixed(1);
}
function openCaptain(){
  const list=$("cap-list");list.innerHTML="";
  S.slots.forEach(s=>{
    const b=document.createElement("button");
    b.className="pl";
    const eff=effRating(s);
    const t=hidden()?"plain":tier(eff);
    b.innerHTML=`${jersey(s.player.team,s.player.num,26)}<span class="pos">${s.id}</span><span class="pname">${s.player.name} <span style="color:var(--chalk-dim)">⚡${Math.round(playerChem(s))}</span></span><span class="rt t-${t}">${hidden()?"??":eff}</span>`;
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
  const bonus=chemistry().boost+(S.captain?0.4+capLead()*0.16:0);
  const att=avg(by("FWD"))*0.6+avg(by("MID"))*0.4+F.mod.att+bonus;
  const def=avg(by("DEF"))*0.7+by("GK")[0]*0.3+F.mod.def+bonus;
  return{att,def,overall:(att+def)/2};
}
function scorerName(){
  const pool=[];
  S.slots.forEach(s=>{
    const e=effRating(s);
    let w=s.cat==="FWD"?e*1.7:s.cat==="MID"?e*0.9:s.cat==="DEF"?e*0.22:0;
    if(S.captain===s.id)w*=1.15+capLead()*0.04;
    if(w>0)pool.push([s.player.name,w]);
  });
  let tot=pool.reduce((a,b)=>a+b[1],0),r=R()*tot;
  for(const[n,w]of pool){r-=w;if(r<=0)return n;}
  return pool[0][0];
}
/* ~70% of goals get an assist, weighted to creators (MID/wide FWD), never the scorer */
function assistName(scorer){
  if(R()<0.3)return null;
  const pool=[];
  S.slots.forEach(s=>{
    if(s.player.name===scorer)return;
    const e=effRating(s);
    let w=s.cat==="MID"?e*1.6:s.cat==="FWD"?e*1.1:s.cat==="DEF"?e*0.3:0;
    if(S.captain===s.id)w*=1.2;
    if(w>0)pool.push([s.player.name,w]);
  });
  if(!pool.length)return null;
  let tot=pool.reduce((a,b)=>a+b[1],0),r=R()*tot;
  for(const[n,w]of pool){r-=w;if(r<=0)return n;}
  return pool[0][0];
}
