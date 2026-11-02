// Järkäle Tracking v2.18.142 – napautusmittari: tavallinen treeni oikeilla napautuksilla (periaate: nopeampi kuin
// muistiinpanot, Strong, Hevy ja SmartReps). Jokainen click() lasketaan; testi kaatuu, jos perustilanne vaatii enemmän napautuksia.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'dark',gym:{enabled:true},tracking:{}})); });
  await p.reload(); await p.waitForTimeout(400);
  // ohjelma: yksi treenipäivä, kolme liikettä × 3 sarjaa; edellinen kerta kirjattu
  await p.evaluate(()=>{ const pr=newProgram('Ohjelma'); pr.days[0].name='Rinta';
    [['Penkkipunnerrus',80],['Vinopenkki',30],['Ojentajat taljassa',25]].forEach(([n])=>pr.days[0].exercises.push(newEx({name:n,sets:3,repsMin:8,repsMax:10})));
    touchProg(pr); G.curProgramId=pr.id; const t=Date.now()-3*864e5;
    G.sessions.push({id:'prev',programId:pr.id,dayId:pr.days[0].id,date:new Date(t).toISOString().slice(0,10),startedAt:t,endedAt:t+3e6,dayName:'Rinta',
      exercises:pr.days[0].exercises.map((e,i)=>({id:gid(),key:e.key,name:e.name,sets:[0,1,2].map(()=>({kg:[80,30,25][i],reps:8,done:true}))}))});
    gymSave(); setTab('treeni'); GU.mode='home'; renderGym(); });
  await p.waitForTimeout(250);
  let taps=0; const tap=async loc=>{ await loc.first().click(); taps++; await p.waitForTimeout(120); };
  const row=(ei,ri)=>p.locator(`[data-set="${ei}-${ri}"]`);

  console.log('\nAloitus');
  await tap(p.locator('#view-treeni .tr-next .tr-go'));
  ok(taps===1&&await p.evaluate(()=>!!activeSession()&&GU.mode==='session'),'treeni alkaa 1 napautuksella (Seuraavana-rivin Aloita)');

  console.log('\nSarjat');
  let t0=taps; await tap(row(0,0).locator('.ck'));
  ok(taps-t0===1&&await p.evaluate(()=>{ const r=activeSession().exercises[0].sets[0]; return r.done&&r.kg===80&&r.reps===8; }),'sama kuin viime kerralla: 1 napautus (80 × 8 tallentuu)');
  t0=taps; await tap(row(0,1).locator('.kgb[aria-label^="Paino +"]')); await tap(row(0,1).locator('.ck'));
  ok(taps-t0===2&&await p.evaluate(()=>{ const r=activeSession().exercises[0].sets[1]; return r.done&&r.kg===81.25&&r.reps===8; }),'painoa yksi askel lisää: 2 napautusta');
  t0=taps; await tap(row(0,2).locator('.kgb[aria-label^="Toistot +"]')); await tap(row(0,2).locator('.ck'));
  ok(taps-t0===2&&await p.evaluate(()=>{ const r=activeSession().exercises[0].sets[2]; return r.done&&r.reps===9; }),'toisto lisää: 2 napautusta');
  // väärin kuitatun sarjan korjaus: peru, korjaa, kuittaa
  t0=taps; await tap(row(0,0).locator('.ck')); await tap(row(0,0).locator('.kgb[aria-label^="Toistot +"]')); await tap(row(0,0).locator('.ck'));
  ok(taps-t0===3&&await p.evaluate(()=>{ const r=activeSession().exercises[0].sets[0]; return r.done&&r.reps===9; }),'väärin kuitatun sarjan korjaus: 3 napautusta');
  // loput liikkeet samalla tavalla kuin viimeksi
  t0=taps; for(const ei of [1,2]) for(const ri of [0,1,2]) await tap(row(ei,ri).locator('.ck'));
  ok(taps-t0===6&&await p.evaluate(()=>activeSession().exercises.slice(1).every(e=>e.sets.every(r=>r.done&&r.reps===8))),'kaksi liikettä × 3 sarjaa kuten viimeksi: 6 napautusta');

  console.log('\nLopetus');
  t0=taps; await tap(p.getByRole('button',{name:'Lopeta',exact:true})); await tap(p.getByRole('button',{name:'Tallenna treeni'}));
  ok(taps-t0===2&&await p.evaluate(()=>!G.activeId&&G.sessions.filter(s=>s.endedAt).length===2),'lopetus ja tallennus: 2 napautusta');
  const total=taps;
  ok(total===17,`koko treeni (3 liikettä × 3 sarjaa, yksi painonnosto, yksi toistonlisäys, yksi korjaus): ${total} napautusta`);
  console.log(`  (tavallinen treeni ilman muutoksia: 1 + sarjat + 2 napautusta)`);

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
