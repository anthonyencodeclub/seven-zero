/* =========================================================
   MATCH ENGINE v2 — live minute-by-minute with tactics
========================================================= */
function legendBoost(){return S.diff==="legend"?3:0;}
function poisson(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=R();}while(p>L);return k-1;}

const C_OURCH=["{p} curls one inches wide.","{p} rattles the crossbar!","Brilliant save denies {p}.","{p} dances through but drags it wide.","{p} heads over from six yards.","{p} stings the keeper's palms from distance.","{p} clips the outside of the post!"];
const C_THCH=["{o} hit the post — let off!","Your keeper claws one out of the top corner.","{o} break in numbers but the shot is smothered.","Last-ditch block keeps {o} out.","{o} flash one across the face of goal."];
const C_OURGOAL=["What a finish!","The stadium erupts!","Cool as you like.","An absolute thunderbolt!","They simply could not live with that.","Vintage.","Sheer class."];
const C_THGOAL=["Disaster at the back.","Sucker punch.","They'd been threatening.","A hammer blow.","Silence falls."];

const TACTICS={keep:{f:1,a:1,n:"Keep shape"},push:{f:1.45,a:1.5,n:"Push forward"},park:{f:.55,a:.5,n:"Park the bus"}};

/* the greatest hits — dropped in as fun asides */
const FAMOUS_GOAL=[
 ["\u201cOh, you have to say that's magnificent.\u201d","Barry Davies, Italia '90"],
 ["\u201cDennis Bergkamp! Dennis Bergkamp! DENNIS BERGKAMP!\u201d","Jack van Gelder, France '98"],
 ["\u201cGOL DI GROSSO! GOL DI GROSSO!\u201d","Fabio Caressa, 2006"],
 ["\u201c¡Iniesta de mi vida!\u201d","Spanish radio, Soccer City 2010"],
 ["\u201cGenius! Genius! Genius!\u201d","Bryon Butler, Mexico '86"],
 ["\u201cGOOOOOOOOOL! GOL GOL GOL!\u201d","every South American radio, forever"],
 ["\u201cA goal worthy of winning any match, anywhere, any time.\u201d","the commentary box, in awe"]
];
const FAMOUS_LATE=[
 ["\u201cSome people are on the pitch… they think it's all over — IT IS NOW!\u201d","Kenneth Wolstenholme, 1966"],
 ["\u201cAGUEROOOOO! I swear you'll never see anything like this ever again!\u201d","Martin Tyler, 2012"],
 ["\u201cIt's up for grabs now…!\u201d","Brian Moore, 1989"]
];
const FAMOUS_TITLE=[
 ["\u201cIt's only twelve inches high, it's solid gold — and it means you are champions of the world.\u201d","after Kenneth Wolstenholme, 1966"],
 ["\u201c¡CAMPEONES DEL MUNDO!\u201d","every commentator who ever lived this moment"]
];
const fcom=([q,who])=>`<div class="fcom">${q} <span>— ${who}</span></div>`;
let ticker=null;

function runLive(opp,knockout,done){
  $("btn-next").disabled=true;$("btn-skip").style.display="block";
  const st=strengths(),diff=st.overall-(opp.r+legendBoost());
  const xf=clamp(1.45+diff*0.085+(st.att-80)*0.012,0.25,4.8);
  const xa=clamp(1.22-diff*0.075-(st.def-80)*0.012,0.10,3.2);
  let mf=1,ma=1,min=0,end=90,et=false,halt=false,fast=false,finished=false;
  const ourGoals=[],theirMin=[];

  const card=document.createElement("div");card.className="match live";
  card.innerHTML=`<div class="ln">
      <div class="team"><span class="f">🏆</span> Your XI</div>
      <div class="score mono" id="live-score">0 – 0</div>
      <div class="team" style="justify-content:flex-end"><span style="text-align:right">${opp.n}</span> <span class="f">${opp.f}</span></div>
    </div>
    <div class="minute" id="live-min">0'</div>
    <div class="log" id="live-log"></div>
    <div id="live-tac"></div>`;
  $("cup-feed").appendChild(card);
  card.scrollIntoView({behavior:"smooth",block:"end"});
  const addLog=h=>{const d=document.createElement("div");d.innerHTML=h;$("live-log").prepend(d);};
  const paint=()=>{$("live-score").textContent=ourGoals.length+" – "+theirMin.length;$("live-min").textContent=min+"'";};
  addLog(`<span class="big">Kick-off.</span> ${opp.f} ${opp.n} await.`);

  function pauseTactics(label){
    if(fast)return; // skipping: keep current shape, play on
    halt=true;
    const box=$("live-tac");
    let left=7;
    box.innerHTML=`<div class="tactics">
        <button class="tbtn" data-t="park">Park the bus<small>protect the result</small></button>
        <button class="tbtn sel" data-t="keep">Keep shape<small>as you were</small></button>
        <button class="tbtn" data-t="push">Push forward<small>chase the game</small></button>
      </div><div class="tacnote">${label} — auto-continue in <b id="tac-n">7</b>s</div>`;
    const iv=setInterval(()=>{left--;const n=$("tac-n");if(n)n.textContent=left;if(left<=0)choose("keep");},1000);
    const choose=t=>{clearInterval(iv);mf=TACTICS[t].f;ma=TACTICS[t].a;box.innerHTML="";
      if(t!=="keep")addLog(`<span class="big">Tactical switch: ${TACTICS[t].n}.</span>`);
      halt=false;};
    box.querySelectorAll(".tbtn").forEach(b=>b.onclick=()=>{SFX.pick();choose(b.dataset.t);});
  }

  function minute(silent){
    min++;
    const boost=min>90?1.05:1;
    if(R()<xf/90*mf*boost){
      const n=scorerName();ourGoals.push([n,min]);
      addLog(`<span class="goalus">⚽ GOAL! ${n} ${min}'</span> — ${pickFrom(C_OURGOAL)}`);
      const ahead=ourGoals.length===theirMin.length+1;
      if(min>=85&&ahead&&R()<.55)addLog(fcom(pickFrom(FAMOUS_LATE)));
      else if(R()<.16)addLog(fcom(pickFrom(FAMOUS_GOAL)));
      if(!silent)SFX.goalUs();
    }else if(R()<xa/90*ma*boost){
      theirMin.push(min);
      addLog(`<span class="goalthem">⚽ ${opp.n} score ${min}'</span> — ${pickFrom(C_THGOAL)}`);
      if(!silent)SFX.goalThem();
    }else if(R()<.05){
      addLog(R()<.55?C_OURCH[rnd(C_OURCH.length)].replace("{p}",scorerName()):C_THCH[rnd(C_THCH.length)].replace("{o}",opp.n));
    }
    paint();
    if(min===45){addLog(`<span class="big">Half-time.</span>`);if(!silent)SFX.whistle(1);pauseTactics("Second half");return;}
    if(min===90){
      if(knockout&&ourGoals.length===theirMin.length){
        et=true;end=120;
        addLog(`<span class="big">Full-time — level. Extra time.</span>`);
        if(!silent)SFX.whistle(2);
        pauseTactics("Extra time");return;
      }
      finish();return;
    }
    if(min>=end)finish();
  }

  function finish(){
    if(finished)return;finished=true;
    clearInterval(ticker);ticker=null;
    const gf=ourGoals.length,ga=theirMin.length;
    let pens=null;
    if(knockout&&gf===ga)pens=penShootout(diff);
    addLog(`<span class="big">${pens?"Still level — penalties!":"The final whistle."}</span>`);
    SFX.whistle(3);
    const res={gf,ga,et,pens,
      scorers:ourGoals.slice().sort((a,b)=>a[1]-b[1]),
      theirMin:theirMin.slice().sort((a,b)=>a-b),
      poss:Math.round(clamp(50+diff*0.9+(R()*10-5),30,72)),
      shots:gf*2+4+rnd(7),shotsA:ga*2+3+rnd(6)};
    setTimeout(()=>{card.remove();
      if(res.pens)runPens(opp,res,()=>done(res));else done(res);
    },fast?60:650);
  }

  $("btn-skip").onclick=()=>{
    fast=true;halt=false;
    clearInterval(ticker);ticker=null;
    while(!finished)minute(true);
  };
  ticker=setInterval(()=>{if(!halt)minute(false);},65);
}

function penShootout(diff){
  const pUs=clamp(0.76+diff*0.005,0.55,0.92);
  const pTh=clamp(0.76-diff*0.005,0.55,0.92);
  const us=[],th=[];let su=0,st_=0;
  for(let k=0;k<5;k++){
    const a=R()<pUs;us.push(a);if(a)su++;
    const b=R()<pTh;th.push(b);if(b)st_++;
    const remU=5-us.length,remT=5-th.length;
    if(su>st_+remT||st_>su+remU)break;
  }
  while(su===st_){
    const a=R()<pUs,b=R()<pTh;
    us.push(a);th.push(b);if(a)su++;if(b)st_++;
    if(us.length>20)break;
  }
  return{us,th,win:su>st_,score:su+"–"+st_};
}
function runPens(opp,res,done){
  const card=document.createElement("div");card.className="match";
  card.innerHTML=`<div class="ln"><div class="team">Penalty shootout</div></div>
    <div class="penrow"><span class="who">You</span><span id="pen-us"></span></div>
    <div class="penrow"><span class="who">${opp.n}</span><span id="pen-th"></span></div>`;
  $("cup-feed").appendChild(card);
  card.scrollIntoView({behavior:"smooth",block:"end"});
  const p=res.pens;let i=0,pdone=false;
  function pfin(){
    if(pdone)return;pdone=true;
    const d=document.createElement("div");d.className="pens";
    d.textContent=(p.win?"You win the shootout ":"You lose the shootout ")+p.score;
    card.appendChild(d);
    setTimeout(done,700);
  }
  const iv=setInterval(()=>{
    if(i<p.us.length){$("pen-us").textContent+=p.us[i]?"⚽":"❌";SFX[p.us[i]?"penGoal":"penMiss"]();}
    if(i<p.th.length)$("pen-th").textContent+=p.th[i]?"⚽":"❌";
    i++;
    if(i>=Math.max(p.us.length,p.th.length)){clearInterval(iv);pfin();}
  },430);
  $("btn-skip").onclick=()=>{clearInterval(iv);
    $("pen-us").textContent=p.us.map(x=>x?"⚽":"❌").join("");
    $("pen-th").textContent=p.th.map(x=>x?"⚽":"❌").join("");
    pfin();};
}

/* =========================================================
   TOURNAMENT
========================================================= */
const ROUNDS=["Group game 1","Group game 2","Group game 3","Round of 16","Quarter-final","Semi-final","Final"];
const PILLS=["GRP","R16","QF","SF","FINAL"];

function drawOpps(min,max,n,exclude){
  const pool=OPP.filter(o=>o[2]>=min&&o[2]<=max&&!exclude.has(o[0]));
  const out=[];
  while(out.length<n&&pool.length){out.push(...pool.splice(rnd(pool.length),1));}
  return out.map(o=>({n:o[0],f:o[1],r:o[2]}));
}
function startCup(){
  const used=new Set();
  const L=S.diff==="legend";
  S.cup.group={opps:drawOpps(L?82:78,L?92:88,3,used),results:[]};
  S.cup.group.opps.forEach(o=>used.add(o.n));
  S.cup.knock=[
    pickFrom(drawOpps(84,90,4,used)),
    pickFrom(drawOpps(86,92,4,used)),
    pickFrom(drawOpps(88,93,4,used)),
    pickFrom(drawOpps(L?92:90,94,4,used))
  ];
  const feed=$("cup-feed");feed.innerHTML="";delete feed.dataset.knock;
  renderBracket();
  feedRound("Group stage");
  const st=strengths();
  const intro=document.createElement("div");intro.className="match";
  intro.innerHTML=`<div class="ln"><div class="team">Squad report</div>
      <div class="score mono w">${Math.round(st.overall)}</div></div>
    <div class="scorers">Attack ${Math.round(st.att)} · Defence ${Math.round(st.def)} · ${S.form} · Captain: <b style="color:var(--gold)">${capName()}</b>${S.diff==="legend"?" · <b style='color:var(--loss)'>LEGEND DRAW</b>":""}${S.daily?" · <b style='color:var(--gold)'>DAILY</b>":""}</div>
    <div class="scorers" style="margin-top:4px">Your group: ${S.cup.group.opps.map(o=>o.f+" "+o.n).join(" · ")}</div>`;
  feed.appendChild(intro);
  updateRecord();
  $("btn-next").textContent="Kick off — Group game 1";
  $("btn-next").onclick=playNext;$("btn-next").disabled=false;
  show("cup");
}
function capName(){const s=S.slots.find(x=>x.id===S.captain);return s?s.player.name:"—";}
function renderBracket(){
  const b=$("bracket");b.innerHTML="";
  const cur=S.cup.stage<3?0:S.cup.stage-2;
  PILLS.forEach((p,i)=>{
    const d=document.createElement("div");d.className="bpill";
    if(S.cup.champion)d.classList.add("won");
    else if(S.cup.out){if(i<S.cup.lostPill)d.classList.add("won");else if(i===S.cup.lostPill)d.classList.add("lost");}
    else{if(i<cur)d.classList.add("won");else if(i===cur)d.classList.add("now");}
    d.textContent=p;b.appendChild(d);
  });
}
function feedRound(t){const d=document.createElement("div");d.className="roundlabel";d.textContent=t;$("cup-feed").appendChild(d);}
function updateRecord(){
  const r=S.cup.record;
  $("cup-record").textContent=`W${r.w} D${r.d} L${r.l} · ${r.gf}–${r.ga}`;
}
function book(res,isGroup){
  const r=S.cup.record;
  r.gf+=res.gf;r.ga+=res.ga;
  let g;
  if(res.gf>res.ga){r.w++;if(!res.et)S.cup.regWins++;g="🟩";}
  else if(res.gf<res.ga){r.l++;g="🟥";}
  else{
    if(res.pens){res.pens.win?r.w++:r.l++;g=res.pens.win?"🟨":"🟥";}
    else{r.d++;g="🟨";}
  }
  S.cup.gridResults.push(g);
  S.cup.matches.push({gf:res.gf,ga:res.ga,et:isGroup?false:!!res.et,pw:(!isGroup&&res.pens)?!!res.pens.win:null});
  res.scorers.forEach(([n])=>{S.goals[n]=(S.goals[n]||0)+1;});
}
function playNext(){
  const st=S.cup.stage;
  const isGroup=st<3;
  const opp=isGroup?S.cup.group.opps[st]:S.cup.knock[st-3];
  if(!isGroup){
    if(st===3&&!$("cup-feed").dataset.knock){feedRound("Knockout rounds");$("cup-feed").dataset.knock=1;}
    feedRound(ROUNDS[st]+" — the draw: "+opp.f+" "+opp.n);
  }
  runLive(opp,!isGroup,res=>finalizeMatch(opp,res,isGroup));
}
function finalizeMatch(opp,res,isGroup){
  $("btn-skip").style.display="none";
  book(res,isGroup);
  const won=res.gf>res.ga||(res.pens&&res.pens.win);
  const cls=res.gf>res.ga?"w":res.gf<res.ga?"l":(res.pens?(res.pens.win?"w":"l"):"d");
  const d=document.createElement("div");d.className="match";
  d.innerHTML=`<div class="ln">
      <div class="team"><span class="f">🏆</span> Your XI</div>
      <div class="score mono ${cls}">${res.gf} – ${res.ga}${res.et?" aet":""}</div>
      <div class="team" style="justify-content:flex-end"><span style="text-align:right">${opp.n}</span> <span class="f">${opp.f}</span></div>
    </div>
    ${res.scorers.length?`<div class="scorers">⚽ ${res.scorers.map(s=>s[0]+" "+s[1]+"'").join(", ")}</div>`:""}
    ${res.pens?`<div class="pens">${res.pens.win?"Won":"Lost"} ${res.pens.score} on penalties</div>`:""}
    <div class="fstats"><span>Possession ${res.poss}%</span><span>Shots ${res.shots}–${res.shotsA}</span></div>`;
  $("cup-feed").appendChild(d);
  d.scrollIntoView({behavior:"smooth",block:"end"});
  updateRecord();
  if(isGroup){
    S.cup.group.results.push({opp,res});
    S.cup.stage++;
    renderBracket();
    if(S.cup.stage===3){groupTable();}
    else{$("btn-next").textContent="Kick off — "+ROUNDS[S.cup.stage];$("btn-next").disabled=false;}
  }else{
    const lost=!won&&(res.gf<res.ga||res.pens);
    if(lost){S.cup.out=true;S.cup.outAt=ROUNDS[S.cup.stage];S.cup.lostPill=S.cup.stage-2;renderBracket();finish_();return;}
    S.cup.stage++;
    renderBracket();
    if(S.cup.stage===7){
      S.cup.champion=true;renderBracket();
      const fq=document.createElement("div");fq.className="match";
      fq.innerHTML=fcom(pickFrom(FAMOUS_TITLE));
      $("cup-feed").appendChild(fq);fq.scrollIntoView({behavior:"smooth",block:"end"});
      finish_();return;
    }
    $("btn-next").textContent="Kick off — "+ROUNDS[S.cup.stage];$("btn-next").disabled=false;
  }
}
function groupTable(){
  const o=S.cup.group.opps;
  const rows={you:{n:"Your XI",f:"🏆",p:0,gf:0,ga:0,you:true}};
  o.forEach(x=>rows[x.n]={n:x.n,f:x.f,p:0,gf:0,ga:0});
  S.cup.group.results.forEach(({opp,res})=>{
    rows.you.gf+=res.gf;rows.you.ga+=res.ga;rows[opp.n].gf+=res.ga;rows[opp.n].ga+=res.gf;
    if(res.gf>res.ga)rows.you.p+=3;else if(res.gf<res.ga)rows[opp.n].p+=3;else{rows.you.p++;rows[opp.n].p++;}
  });
  [[0,1],[0,2],[1,2]].forEach(([a,b])=>{
    const d=o[a].r-o[b].r;
    const ga_=poisson(clamp(1.3+d*0.08,0.2,3.5)),gb_=poisson(clamp(1.3-d*0.08,0.2,3.5));
    rows[o[a].n].gf+=ga_;rows[o[a].n].ga+=gb_;rows[o[b].n].gf+=gb_;rows[o[b].n].ga+=ga_;
    if(ga_>gb_)rows[o[a].n].p+=3;else if(gb_>ga_)rows[o[b].n].p+=3;else{rows[o[a].n].p++;rows[o[b].n].p++;}
  });
  const sorted=Object.values(rows).sort((x,y)=>y.p-x.p||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf);
  const tbl=document.createElement("div");tbl.className="match";
  tbl.innerHTML=`<table class="table"><tr><th>Team</th><th>Pts</th><th>GD</th><th>GF</th></tr>
    ${sorted.map(r=>`<tr class="${r.you?"you":""}"><td>${r.f} ${r.n}</td><td class="mono">${r.p}</td><td class="mono">${r.gf-r.ga>0?"+":""}${r.gf-r.ga}</td><td class="mono">${r.gf}</td></tr>`).join("")}
  </table>`;
  $("cup-feed").appendChild(tbl);
  const place=sorted.findIndex(r=>r.you)+1;
  const d=document.createElement("div");d.className="match";
  if(place>2){
    S.cup.out=true;S.cup.outAt="the group stage";S.cup.lostPill=0;renderBracket();
    d.innerHTML=`<div class="ln"><div class="team">Finished ${place===3?"3rd":"4th"} — out at the group stage.</div></div>`;
    $("cup-feed").appendChild(d);finish_();return;
  }
  d.innerHTML=`<div class="ln"><div class="team">Through in ${place===1?"1st":"2nd"} place ✅</div></div>`;
  $("cup-feed").appendChild(d);
  $("btn-next").textContent="Kick off — Round of 16";$("btn-next").disabled=false;
}
function finish_(){
  $("btn-next").textContent="See full result →";
  $("btn-next").onclick=showResult;$("btn-next").disabled=false;
  updateRecord();
}

/* =========================================================
   BADGES
========================================================= */
const BADGES={
  champ:["🏆","Champion"],perfect:["✦","Perfect 7-0"],legend:["💀","Legend title"],
  dynasty:["👑","Dynasty title"],era:["⏳","Era Tour title"],cap:["💰","Wage Cap title"],
  boot6:["🥇","6-goal striker"],daily:["⚡","Daily player"],runs10:["🎟","10 runs"],top10:["🌍","World top 10"]
};
function earnBadges(st){
  const got=[];
  const give=k=>{if(!st.badges[k]){st.badges[k]=1;got.push(k);}};
  if(S.cup.champion)give("champ");
  if(S.cup.perfect)give("perfect");
  if(S.cup.champion&&S.diff==="legend")give("legend");
  if(S.cup.champion&&S.draft==="dynasty")give("dynasty");
  if(S.cup.champion&&S.draft==="era")give("era");
  if(S.cup.champion&&S.draft==="cap")give("cap");
  if(Object.values(S.goals).some(g=>g>=6))give("boot6");
  if(S.daily)give("daily");
  if(st.runs>=10)give("runs10");
  return got;
}
function renderBadges(st){
  $("badges").innerHTML=Object.entries(BADGES).map(([k,[e,n]])=>
    `<div class="badge${st.badges[k]?" got":""}"><div class="be">${e}</div><div class="bn">${n}</div></div>`).join("");
}

/* =========================================================
   RESULT + AWARDS + CABINET
========================================================= */
function awards(){
  const entries=Object.entries(S.goals).sort((a,b)=>b[1]-a[1]);
  const boot=entries[0]||null;
  let pott=null,best=-1;
  S.slots.forEach(s=>{
    const g=S.goals[s.player.name]||0;
    const sc=g*3+effRating(s)*0.05+(S.captain===s.id?0.5:0);
    if(sc>best){best=sc;pott=s.player;}
  });
  return{boot,pott};
}
function countUp(el,to,suffix){
  const t0=performance.now(),dur=reducedMotion?0:850;
  function f(now){
    const t=dur?Math.min(1,(now-t0)/dur):1;
    el.innerHTML=Math.round(to*(1-Math.pow(1-t,3)))+suffix;
    if(t<1)requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
}
function showResult(){
  const r=S.cup.record;
  const sc=scoreRun(S.cup.matches,{draft:S.draft,diff:S.diff,daily:S.daily});
  S.cup.perfect=sc.perfect;S.pts=sc;
  $("r-icon").textContent=S.cup.champion?"🏆":"📉";
  $("r-icon").className="trophy"+(S.cup.champion?" win":"");
  $("r-verdict").textContent=S.cup.champion?"World champions":"Knocked out";
  $("r-verdict").className="verdict display "+(S.cup.champion?"gold":"red");
  countUp($("r-pts"),sc.pts,' <small>PTS</small>');
  let matchPts=0,goalPts=0;
  S.cup.matches.forEach((x,i)=>{
    const knock=i>=3;
    if(x.gf>x.ga)matchPts+=x.et?85:100;
    else if(x.gf===x.ga)matchPts+=knock?(x.pw?70:25):40;
    goalPts+=x.gf*4-x.ga*2;
  });
  const multBits=[];
  if(S.draft!=="classic")multBits.push(DRAFT_MODES[S.draft].n);
  if(S.diff!=="classic")multBits.push(S.diff);
  if(S.daily)multBits.push("daily");
  $("r-break").innerHTML=`Matches <b>${matchPts}</b> · Goals <b>${goalPts>=0?"+":""}${goalPts}</b>`+
    (S.cup.champion?` · Champion <b>+200</b>`:"")+(sc.perfect?` · Perfect <b>+300</b>`:"")+
    `<br>Multiplier <b>×${sc.mult.toFixed(2)}</b>${multBits.length?" ("+multBits.join(" · ")+")":""}`;
  $("r-record").innerHTML=S.cup.champion
    ?`Record: <b>W${r.w} D${r.d} L${r.l}</b> · Goals <b>${r.gf}–${r.ga}</b>`
    :`Out at <b>${S.cup.outAt}</b> · W${r.w} D${r.d} L${r.l} · Goals ${r.gf}–${r.ga}`;
  $("r-grid").textContent=S.cup.gridResults.join("");
  $("r-perfect").innerHTML=sc.perfect?`<div class="perfect">✦ Perfect 7-0 ✦</div>`
    :(S.cup.champion?`<div class="record" style="margin-top:10px">Champions — but not the perfect seven. Run it back?</div>`:"");
  const a=awards();
  $("r-boot").textContent=a.boot?a.boot[0]:"No goals";
  $("r-boot2").textContent=a.boot?a.boot[1]+(a.boot[1]===1?" goal":" goals"):"";
  $("r-pott").textContent=a.pott?a.pott.name:"—";
  $("r-pott2").textContent=a.pott?a.pott.flag+" "+a.pott.year:"";
  const ch=chemistry();
  $("r-xi").innerHTML=`<h4>Your XI · ${S.form} · Chem ⚡${ch.total}/${ch.max} (+${ch.boost.toFixed(1)})</h4>`+S.slots.map(s=>{
    const pen=oopPenalty(s.cat,s.player.cat),eff=effRating(s);
    return `<div class="li"><span><b>${s.player.name}${S.captain===s.id?" ©":""}</b> · ${s.id}${(S.goals[s.player.name]||0)?" · ⚽"+S.goals[s.player.name]:""}</span><span>${s.player.flag} ${s.player.year} · ${pen?s.player.rating+"→"+eff:s.player.rating}</span></div>`;
  }).join("");
  // persist career
  const st=store.get();
  st.runs++;st.goals+=r.gf;
  if(S.cup.champion)st.titles++;
  if(sc.perfect)st.perfects++;
  st.bestW=Math.max(st.bestW,r.w);
  st.bestPts=Math.max(st.bestPts,sc.pts);
  Object.entries(S.goals).forEach(([n,g])=>{st.topScorers[n]=(st.topScorers[n]||0)+g;});
  if(S.daily){
    const today=utcDay();
    if(st.lastDaily!==today){
      const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
      st.streak=st.lastDaily===y?st.streak+1:1;
      st.lastDaily=today;
    }
  }
  const newB=earnBadges(st);
  store.set(st);
  $("r-badges").innerHTML=newB.map(k=>`<span class="rbadge">${BADGES[k][0]} ${BADGES[k][1]} unlocked</span>`).join("");
  $("r-foot").textContent="Career: "+st.titles+" title"+(st.titles===1?"":"s")+" · "+st.perfects+" perfect run"+(st.perfects===1?"":"s")+" · best "+st.bestPts+" pts · "+st.runs+" run"+(st.runs===1?"":"s");
  $("copied").textContent="";
  S.submitted=false;
  $("btn-save").style.display="none";
  show("result");
  autoSubmit();
  if(S.cup.champion){confetti();SFX.fanfare();}
}

/* =========================================================
   SAVE SCORE + LEADERBOARD
========================================================= */
const COUNTRIES=["GB","US","AR","BR","FR","DE","IT","ES","PT","NL","BE","HR","UY","MX","CO","CL","PE","EC","PY","CA","AU","NZ","JP","KR","CN","IN","TR","GR","RS","PL","CZ","SK","HU","RO","BG","UA","SE","NO","DK","FI","IS","IE","CH","AT","MA","DZ","TN","EG","SN","NG","GH","CM","CI","ZA","KE","SA","AE","QA","IL","TH","VN","ID","MY","SG","PH"];
const flagOf=c=>c?String.fromCodePoint(...[...c.toUpperCase()].map(ch=>127397+ch.charCodeAt(0))):"🌍";
let regionName=c=>c;
try{const dn=new Intl.DisplayNames(["en"],{type:"region"});regionName=c=>dn.of(c)||c;}catch(e){}

function buildCountrySelect(){
  const sel=$("sv-country");
  const st=store.get();
  const guess=st.playerCountry||(navigator.language.split("-")[1]||"").toUpperCase();
  const opts=COUNTRIES.map(c=>[c,regionName(c)]).sort((a,b)=>a[1].localeCompare(b[1]));
  sel.innerHTML=`<option value="">🌍 Prefer not to say</option>`+
    opts.map(([c,n])=>`<option value="${c}"${c===guess?" selected":""}>${flagOf(c)} ${n}</option>`).join("");
}
let PENDING_START=null,PENDING_SUBMIT=false;
function openProfile(opts){
  const st=store.get();
  $("sv-name").value=st.playerName||"";
  buildCountrySelect();
  $("sv-email").value=st.playerEmail||"";
  $("sv-optin").checked=!!st.optin;
  $("sv-hint").innerHTML=opts&&opts.onboard
    ?"Before your first spin: your name and country go on the <b>world leaderboard</b>, and every finished run is <b>saved automatically</b>."
    :"Your name and country appear on the world leaderboard — every finished run is <b>saved automatically</b>.";
  $("btn-submit-score").textContent=opts&&opts.onboard?"Save & play →":"Save profile";
  $("sv-msg").textContent="";$("sv-msg").className="savemsg";
  $("save-bg").classList.add("on");
}
function saveProfile(){
  const msg=$("sv-msg");
  const name=$("sv-name").value.trim();
  if(name.length<2){msg.textContent="Pick a nickname (2–20 characters).";msg.className="savemsg err";return;}
  const email=$("sv-email").value.trim();
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){msg.textContent="That email doesn't look right — fix it or leave it empty.";msg.className="savemsg err";return;}
  const st=store.get();
  if(email!==st.playerEmail)st.emailSent=0;
  st.playerName=name;
  st.playerCountry=$("sv-country").value;
  st.playerEmail=email;
  st.optin=$("sv-optin").checked&&!!email;
  store.set(st);
  $("save-bg").classList.remove("on");
  paintProfile();
  if(PENDING_START!=null){const d=PENDING_START;PENDING_START=null;startRun(d);}
  else if(PENDING_SUBMIT){PENDING_SUBMIT=false;autoSubmit();}
}
async function autoSubmit(){
  if(S.submitted)return;
  const st=store.get(),el=$("r-saved"),sv=$("btn-save");
  if(!st.playerName){
    el.textContent="";sv.style.display="block";sv.disabled=false;
    sv.textContent="🌍 Save to world leaderboard";
    sv.onclick=()=>{PENDING_SUBMIT=true;openProfile({});};
    return;
  }
  el.className="savemsg";el.textContent="Posting to the world leaderboard…";
  sv.style.display="none";
  if(!S.token){try{S.token=await API("/api/token");}catch(e){}}
  const sendEmail=!!(st.optin&&st.playerEmail&&!st.emailSent);
  const body={
    token:S.token,name:st.playerName,country:st.playerCountry,
    email:sendEmail?st.playerEmail:"",optin:sendEmail,web:$("sv-web").value,
    matches:S.cup.matches,grid:S.cup.gridResults.join(""),
    draft:S.draft,diff:S.diff,daily:S.daily,dyn:S.dyn||"",form:S.form,pts:S.pts.pts,
    xi:S.slots.map(s=>[s.player.name,s.player.year,s.player.flag])
  };
  try{
    const r=await fetch("/api/score",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw j.err||r.status;
    if(sendEmail){const s2=store.get();s2.emailSent=1;store.set(s2);}
    if(j.rank&&j.rank<=10){const s2=store.get();if(!s2.badges.top10){s2.badges.top10=1;store.set(s2);}}
    S.submitted=true;
    el.textContent=j.rank
      ?`🌍 Saved — world #${j.rank} of ${j.count} run${j.count===1?"":"s"}`+(j.rankDaily?` · today #${j.rankDaily}`:"")
      :`🌍 Saved — outside the top 100 of ${j.count} runs`;
    sv.style.display="block";sv.disabled=false;
    sv.textContent="🌍 View leaderboard →";
    sv.onclick=()=>{show("board");loadBoard(S.daily?"daily":"all",true);};
    SFX.pick();
  }catch(err){
    el.className="savemsg err";
    sv.style.display="block";sv.disabled=false;
    if(err==="name"){
      el.textContent="The leaderboard rejected that nickname — edit your profile and retry.";
      sv.textContent="Edit profile";sv.onclick=()=>{PENDING_SUBMIT=true;openProfile({});};
    }else if(err==="token"||err==="token-age"){
      el.textContent="Couldn't verify this run yet — give it a minute.";
      sv.textContent="Retry save";sv.onclick=autoSubmit;
    }else{
      el.textContent="Couldn't reach the leaderboard — run kept locally.";
      sv.textContent="Retry save";sv.onclick=autoSubmit;
    }
  }
}
function paintProfile(){
  const st=store.get();
  $("playas").innerHTML=st.playerName
    ?`Managing as <b>${st.playerName}</b> ${flagOf(st.playerCountry)} · <span class="edit" id="edit-profile">edit profile</span>`
    :"Your first run sets up your manager profile.";
  const e=$("edit-profile");if(e)e.onclick=()=>openProfile({});
}

const BOARD={tab:"all",timer:null};
function fmtAgo(ms){const s=Math.max(1,Math.round(ms/1000));return s<60?s+"s ago":Math.round(s/60)+"m ago";}
function boardRow(e,i,st){
  const you=st.playerName&&e.n===st.playerName&&(e.c||"")===(st.playerCountry||"");
  const xi=(e.xi||[]).map(p=>`${p[0]} ’${String(p[1]).slice(2)}`).join(" · ");
  return `<div class="brow r${i+1}${you?" you":""}" data-i="${i}">
    <div class="l1"><span class="rank">${i+1}</span><span>${flagOf(e.c)}</span>
      <span class="bn">${e.n}${e.pf?" ✦":e.ch?" 🏆":""}</span>
      <span class="bp mono">${e.p}</span></div>
    <div class="l2"><span>${e.g||""}</span><span>${(e.m||"").replace(/·/g," · ")} · ${e.f||""}</span></div>
    ${xi?`<div class="xi">${xi}</div>`:""}
  </div>`;
}
async function loadBoard(tab,bust){
  BOARD.tab=tab||BOARD.tab;
  $("tab-all").classList.toggle("sel",BOARD.tab==="all");
  $("tab-daily").classList.toggle("sel",BOARD.tab==="daily");
  const list=$("board-list");
  try{
    const j=await API("/api/leaderboard?board="+(BOARD.tab==="daily"?"daily":"alltime")+(bust?"&cb="+Date.now():""));
    const st=store.get();
    $("board-count").textContent=j.count?j.count+" runs":"";
    $("board-status").innerHTML=`<span class="livedot"></span> LIVE · world top ${Math.min(50,j.top.length)}${j.updated?` · updated ${fmtAgo(j.now-j.updated)}`:""}`;
    list.innerHTML=j.top.length
      ?j.top.map((e,i)=>boardRow(e,i,st)).join("")
      :`<div class="bempty">${BOARD.tab==="daily"?"Nobody has posted a run today — the first spot is yours.":"No runs posted yet — be the first name on the board."}</div>`;
    list.querySelectorAll(".brow").forEach(b=>b.onclick=()=>b.classList.toggle("open"));
  }catch(e){
    list.innerHTML=`<div class="bempty">Leaderboard unreachable — check your connection.</div>`;
    $("board-status").textContent="";
  }
}
function boardPolling(){
  clearInterval(BOARD.timer);
  BOARD.timer=setInterval(()=>{
    if($("board").classList.contains("on")&&document.visibilityState==="visible")loadBoard();
  },30000);
}
async function homeBoardPreview(){
  try{
    const j=await API("/api/leaderboard?board=alltime");
    $("home-board-rows").innerHTML=j.top.length
      ?j.top.slice(0,5).map((e,i)=>`<div class="row3"><span style="width:20px;font-weight:900;color:${i===0?"var(--gold)":"var(--chalk-dim)"}">${i+1}</span><span>${flagOf(e.c)}</span><b>${e.n}</b>${e.pf?" ✦":""}<span class="pts mono">${e.p}</span></div>`).join("")
      :`<div class="empty">No runs posted yet — be the first name on the board.</div>`;
  }catch(e){
    $("home-board-rows").innerHTML=`<div class="empty">Leaderboard offline — scores still save locally.</div>`;
  }
}

/* =========================================================
   SHARE + CONFETTI
========================================================= */
const SITE="https://seven-zero-navy.vercel.app";
function shareText(){
  const r=S.cup.record;
  const head=S.cup.champion?(S.cup.perfect?"PERFECT 7-0 🏆":"WORLD CHAMPIONS 🏆"):"Knocked out at "+S.cup.outAt+" 📉";
  const modeBits=[S.form];
  if(S.draft!=="classic")modeBits.push(DRAFT_MODES[S.draft].n);
  if(S.diff!=="classic")modeBits.push(S.diff.toUpperCase());
  if(S.daily)modeBits.push("DAILY "+utcDay());
  return "7-0 — The World Cup Draft\n"+head+"\n"+S.cup.gridResults.join("")+"\n"
    +S.pts.pts+" pts · W"+r.w+" D"+r.d+" L"+r.l+" · "+modeBits.join(" · ")
    +"\nXI: "+S.slots.map(s=>s.player.name+(S.captain===s.id?" ©":"")).join(", ")
    +"\n"+SITE;
}
async function doShare(){
  const txt=shareText();
  if(navigator.share){try{await navigator.share({text:txt});return;}catch(e){}}
  try{await navigator.clipboard.writeText(txt);$("copied").textContent="Copied — paste it anywhere.";}
  catch(e){$("copied").textContent=txt;}
}
function renderCabinet(){
  const st=store.get();
  renderBadges(st);
  if(!st.runs){$("cabinet").style.display="none";return;}
  $("cabinet").style.display="block";
  const top=Object.entries(st.topScorers).sort((a,b)=>b[1]-a[1])[0];
  $("cabinet-rows").innerHTML=
    `<div class="row2"><span>World titles</span><b class="gold">🏆 ${st.titles}</b></div>
     <div class="row2"><span>Perfect 7-0 runs</span><b class="gold">✦ ${st.perfects}</b></div>
     <div class="row2"><span>Best score</span><b class="gold">${st.bestPts} pts</b></div>
     <div class="row2"><span>Runs played</span><b>${st.runs}</b></div>
     <div class="row2"><span>Most wins in a run</span><b>${st.bestW}</b></div>
     <div class="row2"><span>Daily streak</span><b>🔥 ${st.streak||0}</b></div>
     <div class="row2"><span>All-time top scorer</span><b>${top?top[0]+" ("+top[1]+")":"—"}</b></div>`;
}
function confetti(){
  const cv=$("confetti"),ctx=cv.getContext("2d");
  cv.width=innerWidth;cv.height=innerHeight;
  const cols=["#e3b34c","#f3ecd9","#ffe9a8","#b8862c","#0f8a5f"];
  const ps=Array.from({length:150},()=>({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*0.5,
    vy:2+Math.random()*3.5,vx:(Math.random()-0.5)*1.6,s:4+Math.random()*5,r:Math.random()*Math.PI,
    vr:(Math.random()-0.5)*0.2,c:cols[Math.floor(Math.random()*cols.length)]}));
  let t=0;
  function frame(){
    ctx.clearRect(0,0,cv.width,cv.height);
    ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;
      ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6);ctx.restore();});
    t++;
    if(t<260)requestAnimationFrame(frame);else ctx.clearRect(0,0,cv.width,cv.height);
  }
  frame();
}

/* =========================================================
   WIRES
========================================================= */
function multline(){
  const m=(DIFF_MULT[pref.diff]||1)*(DRAFT_MULT[pref.draft]||1);
  $("multline").textContent="×"+m.toFixed(2).replace(/0$/,"")+(pref.draft==="dynasty"&&pref.dyn?" · "+pref.dyn:"");
}
function buildFormChips(){
  const c=$("formchips");c.innerHTML="";
  Object.keys(FORMATIONS).forEach(k=>{
    const b=document.createElement("button");
    b.className="chip"+(pref.form===k?" sel":"");
    b.innerHTML=k+"<small>"+FORMATIONS[k].blurb+"</small>";
    b.onclick=()=>{pref.form=k;buildFormChips();};
    c.appendChild(b);
  });
}
function buildDraftChips(){
  const c=$("draftchips");c.innerHTML="";
  Object.entries(DRAFT_MODES).forEach(([k,v])=>{
    const b=document.createElement("button");
    b.className="chip"+(pref.draft===k?" sel":"");
    b.innerHTML=v.n+"<small>"+v.d+"</small>";
    b.onclick=()=>{pref.draft=k;buildDraftChips();multline();};
    c.appendChild(b);
  });
  const dc=$("dynastychips");
  if(pref.draft==="dynasty"){
    if(!pref.dyn)pref.dyn=DYNASTIES[0][0];
    dc.style.display="flex";dc.innerHTML="";
    DYNASTIES.forEach(([k,v])=>{
      const b=document.createElement("button");
      b.className="chip"+(pref.dyn===k?" sel":"");
      b.innerHTML=`${SQUADS[v[0]].f} ${k}<small>${v.length} squads</small>`;
      b.onclick=()=>{pref.dyn=k;buildDraftChips();multline();};
      dc.appendChild(b);
    });
  }else dc.style.display="none";
}
function wireDiffChips(){
  document.querySelectorAll("#diffchips .chip").forEach(b=>{
    b.onclick=()=>{pref.diff=b.dataset.m;
      document.querySelectorAll("#diffchips .chip").forEach(x=>x.classList.toggle("sel",x===b));
      multline();};
  });
}
function nextRunMs(){return Date.parse(utcDay()+"T00:00:00Z")+864e5-Date.now();}
function fmtCountdown(ms){const h=Math.floor(ms/36e5),m=Math.max(1,Math.ceil((ms%36e5)/6e4));return(h?h+"h ":"")+m+"m";}
function paintLock(){
  const st=store.get();
  const locked=st.lastRun===utcDay();
  const bs=$("btn-start");
  bs.disabled=locked;
  bs.textContent=locked?"✓ Today's run played — next in "+fmtCountdown(nextRunMs()):"Start today's run →";
  const db=$("btn-daily");
  const dailyPlayed=st.lastDaily===utcDay();
  db.disabled=dailyPlayed||locked;
  db.textContent=dailyPlayed?"✓ Played today — back at midnight UTC"
    :locked?"Today's run already used":"Play today's challenge";
}
function paintDaily(){
  const st=store.get();
  const d=new Date();
  $("daily-date").textContent=d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})+" (UTC)";
  const active=st.lastDaily===utcDay()||st.lastDaily===new Date(Date.now()-864e5).toISOString().slice(0,10);
  $("daily-streak").textContent=active&&st.streak?"🔥 "+st.streak+"-day streak":"";
  paintLock();
}
function startRun(daily){
  const st=store.get();
  if(!st.playerName){PENDING_START=!!daily;openProfile({onboard:true});return;}
  if(st.lastRun===utcDay()){goHome();return;}
  if(daily&&st.lastDaily===utcDay()){goHome();return;}
  st.lastRun=utcDay();store.set(st);
  resetState(daily);
  buildWheel();renderPitch();
  $("picks-n").textContent=S.slots.length;
  paintDraftMeta();
  $("landed").textContent="Spin to draw your first squad";
  $("btn-spin").textContent="Spin the wheel";
  $("btn-spin").onclick=spin;$("btn-spin").disabled=false;
  show("draft");
}
function goHome(){
  renderCabinet();paintDaily();paintProfile();homeBoardPreview();show("home");
}
$("btn-start").onclick=()=>startRun(false);
$("btn-daily").onclick=()=>startRun(true);
$("btn-respin").onclick=()=>{
  if(!$("btn-respin").dataset.free){
    if(S.respins<=0)return;
    S.respins--;paintDraftMeta();
  }
  $("modal-bg").classList.remove("on");
  spin();
};
$("btn-restart-draft").onclick=goHome;
$("btn-again").onclick=goHome;
$("btn-share").onclick=doShare;
$("btn-submit-score").onclick=saveProfile;
$("btn-cancel-save").onclick=()=>{PENDING_START=null;PENDING_SUBMIT=false;$("save-bg").classList.remove("on");};
$("btn-board-home").onclick=()=>{show("board");loadBoard("all",true);};
$("btn-board-back").onclick=goHome;
$("btn-board-play").onclick=()=>startRun(false);
$("tab-all").onclick=()=>loadBoard("all",true);
$("tab-daily").onclick=()=>loadBoard("daily",true);

$("stat-squads").textContent=SQUADS.length;
$("stat-players").textContent=SQUADS.reduce((a,s)=>a+s.p.length,0)+"";
wireMute();
buildFormChips();buildDraftChips();wireDiffChips();multline();
renderCabinet();paintDaily();paintProfile();homeBoardPreview();boardPolling();
setInterval(()=>{if($("home").classList.contains("on"))paintLock();},30000);
let rsT=null;
addEventListener("resize",()=>{clearTimeout(rsT);rsT=setTimeout(()=>{
  if(S&&S.slots&&$("draft").classList.contains("on")&&!S.spinning)buildWheel();
},250);});
