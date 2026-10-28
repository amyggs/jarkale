// Järkäle Tracking v2.18.126 – rivitys: sanat eivät katkea keskeltä missään näkymässä (pitkät ohjelma-, päivä- ja liikenimet), 360 px
// Teemat: Järkäle (oletus), Teksti-TV ja Kuusnelonen (leveimmät fontit). Yhdysmerkin tai ajatusviivan kohdalta katkeaminen sallitaan.
const { chromium, devices } = require('playwright');
const fs=require('fs');
const URL='http://localhost:8765/index.html';
const PAL=(process.env.PAL||'ampiainen,tekstitv,kuusnelonen').split(',');
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
const W=+(process.env.W||360);
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:W,height:800},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'dark',profile:{height:190,age:42},
      tracking:{weight:true,sleep:true,recovery:true,motivation:true,training:true,notes:true,injury:true,cardio:true},gym:{enabled:true,autoRest:true},goals:{sleepHours:7.5,workoutsPerWeek:4,trainingDays:[0,1,2,3,4,5,6]}}));
    const E={}, now=new Date().toISOString();
    for(let i=1;i<=30;i++){ const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10);
      E[d]={date:d,weight:90+Math.sin(i/3),sleep:6.5+((i*7)%10)/10,recovery:1+(i%5),motivation:1+((i+2)%5),notes:i%5?'':'Hyvä päivä, jalat tuntuivat raskailta',created_at:now,updated_at:now}; }
    localStorage.setItem('seuranta-entries',JSON.stringify(E)); });
  await p.reload(); await p.waitForTimeout(600);
  const TXT=`1 Rinta, olkapäät ja ojentajat
Vinopenkkipunnerrus laitteessa 1 * 6 - 10 & 1 * 8 - 12 + R/P + DS
Vipunostolaite sivuille 3 * 6 - 10 & 1 * 6 - 10 + R/P + DS
Ristikkäistalja ylätaljasta yhdellä kädellä 3 * 10 - 12
Ojentajapunnerrus taljassa köydellä (pidä kyynärpäät kiinni kyljissä) 3 * 10 - 15

2 Selkä, takaolkapäät ja hauikset
Kulmasoutu tangolla myötäotteella 4 * 6 - 8
Hauiskääntö vinopenkillä käsipainoilla 3 * 8 - 12

3 Jalat ja keskivartalo
Smith-kyykky (Smith Machine Squat) 3 * 6 - 8
Pakaraprässi laitteessa 3 * 10 - 12`;
  await p.evaluate(async t=>{ const pr=newProgram('Treeniohjelma Aku 6 / 2026'); pr.days=gMatchImport(parseProgramText(t)).map(({include,rest,raw,...d})=>({...d,exercises:d.exercises.map(({unparsed,match,...e})=>e)})); touchProg(pr); G.curProgramId=pr.id; gymSave();
    for(let k=0;k<2;k++){ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-(3+k*3)*864e5).toISOString().slice(0,10);
      s.exercises.forEach(ex=>ex.sets.forEach(r=>{ r.kg=60+k*2.5; r.reps=8; r.done=true; })); finishSession(true); }
    await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.exercises[0].sets[0].kg=65; s.exercises[0].sets[0].reps=8; s.exercises[0].sets[0].done=true; gymSave(); },TXT);

  const audit=()=>{ const out=[]; const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const vis=el=>{ for(let e=el;e&&e.nodeType===1;e=e.parentElement){ const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden') return false; } return true; };
    while(tw.nextNode()){ const t=tw.currentNode, s=t.textContent; if(!s.trim()) continue; const el=t.parentElement; if(!el||el.closest('script,style,svg,#theme-boot')||!vis(el)) continue;
      const re=/[A-Za-zÅÄÖåäö0-9][A-Za-zÅÄÖåäö0-9\-–'’]{3,}/g; let m;
      while((m=re.exec(s))){ const rg=document.createRange(); rg.setStart(t,m.index); rg.setEnd(t,m.index+m[0].length);
        const tops=new Set([...rg.getClientRects()].filter(r=>r.width>0).map(r=>Math.round(r.top/4)));
        if(tops.size>1){ const w=m[0]; // tavuviiva- tai viivakatko sanan sisällä on hyväksyttävä
          const path=(()=>{ const a=[]; let e=el; for(let i=0;i<3&&e&&e!==document.body;i++){ a.unshift(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList.length?'.'+[...e.classList].slice(0,2).join('.'):'')); e=e.parentElement; } return a.join('>'); })();
          out.push({w,hyph:/[-–]/.test(w),path}); } } }
    const ov=[]; document.querySelectorAll('body *').forEach(e=>{ if(!vis(e)) return; const cs=getComputedStyle(e); if(e.scrollWidth>e.clientWidth+2&&cs.overflowX==='visible'&&e.clientWidth>0&&e.children.length===0&&e.textContent.trim()) ov.push(e.tagName.toLowerCase()+'.'+[...e.classList].join('.')+': '+e.textContent.trim().slice(0,30)); });
    return {out,ov,sw:document.documentElement.scrollWidth}; };
  const VIEWS={
    'Kirjaa':()=>{ GU.mode='home'; setTab('log'); },
    'Trendit':()=>setTab('trendit'),
    'Mitat':()=>setTab('historia'),
    'Asetukset':()=>{ setTab('asetukset'); document.querySelectorAll('#view-asetukset details').forEach(d=>d.open=true); document.querySelectorAll('#view-asetukset [id^="stgl-"] button').forEach(b=>{ try{ if(b.getAttribute('aria-expanded')==='false') b.click(); }catch(_){} }); },
    'Treeni':()=>{ setTab('treeni'); GU.mode='home'; GU.sessionId=null; GU.progOpen=true; renderGym(); },
    'Treeni käynnissä':()=>{ setTab('treeni'); GU.mode='session'; GU.sessionId=G.activeId; renderGym(); },
    'Yhteenveto':()=>{ setTab('treeni'); GU.mode='session'; GU.sessionId=G.sessions.find(s=>s.endedAt).id; renderGym(); },
    'Muokkaa':()=>{ setTab('treeni'); gOpenEdit(G.curProgramId,false); },
    'Liikehistoria':()=>{ setTab('treeni'); const k=G.sessions.find(s=>s.endedAt).exercises[1].key; GU.mode='exercise'; GU.exKey=k; renderGym(); },
    'Treenin asetukset':()=>{ setTab('treeni'); openGymSettings(); },
    'Tuonti':()=>{ setTab('treeni'); GU.mode='import'; GU.importText=''; GU.importPreview=null; renderGym(); },
  };
  for(const pal of PAL){
    await p.evaluate(pal=>{ S.settings.palette=pal; document.documentElement.setAttribute('data-palette',pal); },pal);
    console.log('\n'+pal);
    for(const [v,fn] of Object.entries(VIEWS)){
      await p.evaluate(`(${fn.toString()})()`); await p.waitForTimeout(250);
      if(v==='Tuonti'){ await p.locator('#g-import').fill(TXT); await p.locator('button',{hasText:'Esikatsele'}).click(); await p.waitForTimeout(250); }
      const r=await p.evaluate(audit); const bad=[...new Set(r.out.filter(x=>!x.hyph).map(x=>`"${x.w}" (${x.path.split('>').pop()})`))];
      ok(!bad.length&&r.sw<=W+1,`${v}: ei keskeltä katkenneita sanoja${r.sw>W+1?', vaakaylivuoto '+r.sw+' px':''}${bad.length?': '+bad.slice(0,4).join(', '):''}`);
    }
  }
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
