// Järkäle Tracking v2.18.94/v2.18.104 – Vaihda liike kesken treenin: tehdyt sarjat jäävät vanhalle liikkeelle, uusi liike tyhjänä
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
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1');
    localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(500);
  // historia: "Cable press" 25 kg; ohjelmassa "Penkkipunnerrus" tavoite 3 × 6–10, 80 kg
  await p.evaluate(()=>{
    const pr=newProgram('T'); pr.days[0].exercises.push(newEx({name:'Cable press',sets:2,repsMin:8,repsMax:12}));
    touchProg(pr); startSession(pr.id,pr.days[0].id);
    const s=gSession(G.activeId); s.date=new Date(Date.now()-864e5).toISOString().slice(0,10); s.startedAt=Date.now()-864e5;
    s.exercises[0].sets.forEach(x=>{x.kg=25;x.reps=10;x.done=true;}); finishSession(true);
    const pr2=newProgram('U'); pr2.days[0].exercises.push(newEx({name:'Penkkipunnerrus',sets:3,repsMin:6,repsMax:10,weight:80}));
    touchProg(pr2); startSession(pr2.id,pr2.days[0].id); setTab('treeni');
  }); await p.waitForTimeout(300);
  const ex=()=>p.evaluate(()=>{ const e=gSession(G.activeId).exercises[0]; return {name:e.name,goalW:e.goal.weight,kgs:e.sets.map(x=>x.kg),done:e.sets.map(x=>x.done),reps:e.goal.repsMin}; });
  const ph=i=>p.locator(`[data-set="0-${i}"] input[data-f="kg"]`).getAttribute('placeholder');

  console.log('\nLähtötilanne');
  ok((await ph(0))==='80','ehdotus on ohjelman tavoitepaino 80');
  await p.fill('[data-set="0-0"] input[data-f="kg"]','82,5');
  await p.fill('[data-set="0-0"] input[data-f="reps"]','8'); await p.locator('[data-set="0-0"] .ck').click(); await p.waitForTimeout(100);
  await p.fill('[data-set="0-1"] input[data-f="kg"]','85');
  const before=await ex(); ok(before.kgs[0]===82.5&&before.kgs[1]===85&&before.done[0]&&!before.done[1],'sarja 1 tehty 82,5, sarjaan 2 kirjoitettu 85 (ei tehty)');

  console.log('\nSama liike, eri kirjoitusasu: painot säilyvät');
  await p.evaluate(()=>{ const e=gSession(G.activeId).exercises[0]; GU.rename=e.id; renderGym(); });
  await p.fill('#g-rename','penkkipunnerrus'); await p.evaluate(()=>gRenameEx(G.activeId,0)); await p.waitForTimeout(100);
  const same=await ex(); ok(same.goalW===80&&same.kgs[1]===85,'avain ei muuttunut: tavoitepaino 80 ja kirjoitettu 85 säilyvät');

  console.log('\nEri liike, kun vanhalla on jo tehty sarja');
  await p.evaluate(()=>{ const e=gSession(G.activeId).exercises[0]; GU.rename=e.id; renderGym(); });
  await p.fill('#g-rename','Käsipainopunnerrus'); await p.evaluate(()=>gRenameEx(G.activeId,0)); await p.waitForTimeout(150);
  const all=await p.evaluate(()=>gSession(G.activeId).exercises.map(e=>({name:e.name,sets:e.sets.map(x=>[x.kg,x.reps,x.done]),goal:e.goal})));
  ok(all.length===2&&all[0].name.toLowerCase()==='penkkipunnerrus'&&all[0].sets.length===1&&all[0].sets[0][0]===82.5&&all[0].sets[0][2],'tehty sarja jää Penkkipunnerrukselle (82,5 × 8)');
  ok(all[1].name==='Käsipainopunnerrus'&&all[1].sets.length===2&&all[1].sets.every(x=>x[0]===null&&x[1]===null&&!x[2]),'uusi liike perään 2 tyhjällä sarjalla');
  ok(all[1].goal.weight===null&&all[1].goal.repsMin===null&&all[1].goal.sets===2,'uudella liikkeellä ei vanhaa tavoitepainoa eikä toistotavoitetta');
  ok((await p.locator('[data-set="1-0"] input[data-f="kg"]').getAttribute('placeholder'))==='–'&&(await p.locator('[data-set="1-0"] input[data-f="reps"]').getAttribute('placeholder'))==='–','uuden liikkeen kentissä ei vanhoja ehdotuksia');
  ok(/Tavoite 2 sarjaa/.test(await p.locator('#view-treeni').innerText()),'tavoiterivi "2 sarjaa" (ei "× null")');
  const hist=await p.evaluate(()=>exerciseHistory(exKey('Penkkipunnerrus')).length+'|'+exerciseHistory(exKey('Cable press')).length);
  ok(hist==='0|1','aiempien treenien historia ennallaan');

  console.log('\nEri liike ennen yhtään tehtyä sarjaa: vaihtuu paikallaan, tyhjänä');
  await p.evaluate(()=>{ const e=gSession(G.activeId).exercises[1]; e.sets[0].reps=9; GU.rename=e.id; renderGym(); });
  await p.fill('#g-rename','Cable press'); await p.evaluate(()=>gRenameEx(G.activeId,1)); await p.waitForTimeout(150);
  const c=await p.evaluate(()=>{ const s=gSession(G.activeId); return {n:s.exercises.length,e:s.exercises[1]}; });
  ok(c.n===2&&c.e.name==='Cable press'&&c.e.sets.every(x=>x.kg===null&&x.reps===null),'vaihtuu paikallaan, kirjoitetut toistot tyhjennetty');
  ok((await p.locator('[data-set="1-0"] input[data-f="kg"]').getAttribute('placeholder'))==='25','ehdotus Cable pressin viimeisestä kerrasta (25)');

  console.log('\nKopioituminen seuraaville sarjoille');
  await p.fill('[data-set="1-0"] input[data-f="kg"]','30'); await p.fill('[data-set="1-0"] input[data-f="reps"]','12'); await p.waitForTimeout(80);
  ok((await p.locator('[data-set="1-1"] input[data-f="kg"]').getAttribute('placeholder'))==='30'&&(await p.locator('[data-set="1-1"] input[data-f="reps"]').getAttribute('placeholder'))==='12','kirjoitettu 30 × 12 näkyy heti seuraavan sarjan ehdotuksena');
  await p.locator('[data-set="1-0"] .ck').click(); await p.waitForTimeout(100);
  await p.locator('[data-set="1-1"] .kgb').nth(1).click(); await p.waitForTimeout(60);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[1].sets[1].kg===31.25),'+ lähtee kopioidusta painosta (30 → 31,25)');
  await p.locator('[data-set="1-1"] .ck').click(); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>{ const r=gSession(G.activeId).exercises[1].sets[1]; return r.done&&r.reps===12; }),'kuittaus ilman kirjoittamista tallentaa kopioidut toistot (12)');
  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
