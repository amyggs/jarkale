// Järkäle Tracking v2.18.114 – treeni ensin: aloitusnäkymä ja seuraava treeni Kirjaa-näkymässä
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  const fresh=async()=>{ await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400); };
  const reload=async()=>{ await p.reload(); await p.waitForTimeout(500); };
  const mkProg=()=>p.evaluate(()=>{ const pr=newProgram('Ohjelma'); pr.days[0].name='Rinta'; pr.days[0].exercises.push(newEx({name:'Penkki',sets:3,repsMin:8}));
    const d2={id:gid(),name:'Jalat',exercises:[newEx({name:'Kyykky',sets:3,repsMin:6})]}; pr.days.push(d2); touchProg(pr); G.curProgramId=pr.id; gymSave(); return pr.id; });

  console.log('\nAloitusnäkymä');
  await fresh();
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(300);
  await reload();
  ok(await p.evaluate(()=>S.tab==='treeni'),'pelkkää treeniä kirjaava aloittaa Treeni-välilehdeltä');

  await fresh();
  await p.locator('.su-choice',{hasText:'Molempia'}).click(); await p.waitForTimeout(200);
  await p.locator('.su-go').click(); await p.waitForTimeout(300);
  await reload();
  ok(await p.evaluate(()=>S.tab==='log'),'molempia kirjaava aloittaa Kirjaa-näkymästä (ei treeniä kesken)');
  await mkProg();
  await p.evaluate(async()=>{ const pr=G.programs[0]; await startSession(pr.id,pr.days[0].id); });
  await reload();
  ok(await p.evaluate(()=>S.tab==='treeni'&&GU.mode==='session'&&GU.sessionId===G.activeId),'kesken oleva treeni avautuu suoraan');
  ok(!(await p.evaluate(()=>{ const e=document.getElementById('nav'); return !!e&&getComputedStyle(e).display!=='none'; })),'treenitila: alapalkki piilossa');
  await p.evaluate(()=>{ const s=activeSession(); s.exercises[0].sets[0].kg=60; s.exercises[0].sets[0].reps=8; s.exercises[0].sets[0].done=true; finishSession(true); });

  console.log('\nSeuraava treeni Kirjaa-näkymässä');
  const dow=await p.evaluate(()=>new Date().getDay());
  await p.evaluate(()=>{ S.settings.goals={...(S.settings.goals||{}),trainingDays:null}; saveAll(); setTab('log'); renderLog(); }); await p.waitForTimeout(150);
  ok(!/Seuraavana kierrossa/.test(await p.locator('#gym-card').innerText().catch(()=>'')),'ilman viikkorytmiä ei riviä');
  await p.evaluate(d=>{ S.settings.goals={...(S.settings.goals||{}),trainingDays:[(d+1)%7]}; saveAll(); renderLog(); },dow); await p.waitForTimeout(150);
  ok(!/Seuraavana kierrossa/.test(await p.locator('#gym-card').innerText().catch(()=>'')),'lepopäivänä ei riviä');
  // tänään jo tehty treeni → yhteenvetorivi, ei Aloita-riviä
  await p.evaluate(d=>{ S.settings.goals={...(S.settings.goals||{}),trainingDays:[d]}; saveAll(); renderLog(); },dow); await p.waitForTimeout(150);
  ok(!/Seuraavana kierrossa/.test(await p.locator('#gym-card').innerText().catch(()=>'')),'tänään jo treenattu: ei Aloita-riviä');
  await p.evaluate(()=>{ G.sessions=G.sessions.map(s=>({...s,date:'2026-01-01'})); gymSave(); renderLog(); }); await p.waitForTimeout(150);
  const card=await p.locator('#gym-card').innerText().catch(()=>'');
  ok(/Jalat/.test(card)&&/Seuraavana kierrossa · 1\u00a0liike/.test(card),'treenipäivänä seuraava kierrossa (Rinta tehty → Jalat): '+card.replace(/\n/g,' | '));
  await p.locator('#gym-card button',{hasText:'Aloita'}).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>{ const s=activeSession(); return !!s&&s.dayName==='Jalat'&&S.tab==='treeni'; }),'Aloita käynnistää seuraavan treenin');
  await p.evaluate(()=>{ finishSession(true); });

  console.log('\nTekstit');
  ok(await p.evaluate(()=>document.title==='Järkäle'&&SHARE_FOOT==='Järkäle · treenipäiväkirja'),'otsikko ja jakokuvan alatunniste');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
