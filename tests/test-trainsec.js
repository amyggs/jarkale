// Järkäle Tracking v2.18.149 – Kirjaa: salitreenipäivänä Treeni-osio ei toista salitreeniä (Salitreeni-nappi, ei treenityyppiä),
// päivän rasitus ja kulku näkyvät salitreenikortissa
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'dark',tracking:{training:true,recovery:true},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(500);
  const sec=()=>p.evaluate(()=>{ const el=document.getElementById('training-section'); return {txt:el.innerText.replace(/\s+/g,' '), btn:el.querySelector('.tr-tg')?.textContent.trim(), src:el.querySelector('.tr-gymsrc')?.innerText||'', card:document.getElementById('gym-card')?.innerText.replace(/\s+/g,' ')||''}; });
  // ilman salitreeniä: käsin kirjattava treeni kuten ennen
  await p.evaluate(()=>{ setTab('log'); toggleTraining('done'); });
  let v=await sec();
  ok(v.btn==='✓ Treeni'&&/Treenityyppi/.test(v.txt)&&!v.src,'ilman salitreeniä: Treeni-nappi ja treenityyppi: '+v.btn);
  await p.evaluate(()=>toggleTraining('done'));
  // salitreeni tänään (keksitty)
  await p.evaluate(async()=>{ const pr=newProgram('Testi'); pr.days[0].name='Selkä ja hauikset'; pr.days[0].exercises.push(newEx({name:'Ylätalja',sets:2,repsMin:10})); touchProg(pr); G.curProgramId=pr.id; gymSave();
    await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.exercises[0].sets.forEach(r=>{ r.kg=50; r.reps=10; r.done=true; }); finishSession(true);
    setTab('log'); loadDayIntoForm(S.date); renderLog(); });
  await p.waitForTimeout(200);
  v=await sec();
  ok(/^✓ Salitreeni · lisää kulku ›$/.test(v.btn)&&!/Rasitustaso/.test(v.txt),'v2.18.150: salitreenipäivänä yksi rivi: '+v.btn);
  ok(/Cardio/.test(v.txt)&&!/Treenityyppi/.test(v.txt),'Cardio säilyy, treenityyppi ei näy');
  ok(/Selkä ja hauikset/.test(v.card),'treenin nimi kortissa');
  await p.locator('#training-section .tr-sumbtn').click(); await p.waitForTimeout(100);
  v=await sec();
  ok(v.btn==='✓ Salitreeni'&&/Rasitustaso/.test(v.txt)&&/Treenin kulku/.test(v.txt)&&/\+ Treenihuomio/.test(v.txt)&&!/Treenityyppi/.test(v.txt),'napautus avaa kentät; huomio linkin takana');
  await p.evaluate(()=>setTrainingLoad(4)); await p.locator('#training-section button',{hasText:'Normaalisti'}).click(); await p.waitForTimeout(150);
  v=await sec();
  ok(/1 liikettä · 2 sarjaa · .*min · rasitus 4 · normaalisti/.test(v.card),'kortissa rasitus ja kulku: '+v.card);
  await p.evaluate(()=>{ TR_OPEN=null; renderTrainingSection(); }); v=await sec();
  ok(v.btn==='✓ Salitreeni · rasitus 4 · normaalisti ›','suljettu rivi kertoo rasituksen ja kulun: '+v.btn);
  await p.evaluate(()=>flushPendingAutoSave&&flushPendingAutoSave());
  const e=await p.evaluate(()=>{ const x=S.entries[today()]; return {l:x.training_load,o:x.training_outcome,d:x.training_done}; });
  ok(e.l===4&&e.o==='normal'&&e.d===true,'tallentuu päivän kirjaukseen: '+JSON.stringify(e));
  await p.evaluate(()=>{ TR_OPEN=S.date; renderTrainingSection(); toggleTraining('done'); }); v=await sec();
  ok(v.btn==='✓ Salitreeni','salitreenin merkintää ei voi poistaa napista');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth)<=360,'mahtuu 360 px leveyteen');
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
