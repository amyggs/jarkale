// Järkäle Tracking v2.18.94 – Vaihda liike kesken treenin tyhjentää vanhan liikkeen painot
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

  console.log('\nEri liike, jolla ei ole historiaa');
  await p.evaluate(()=>{ const e=gSession(G.activeId).exercises[0]; GU.rename=e.id; renderGym(); });
  await p.fill('#g-rename','Käsipainopunnerrus'); await p.evaluate(()=>gRenameEx(G.activeId,0)); await p.waitForTimeout(150);
  const sw=await ex();
  ok(sw.name==='Käsipainopunnerrus'&&sw.goalW===null,'tavoitepaino tyhjennetty');
  ok(sw.kgs[1]===null&&sw.kgs[2]===null,'tekemättömiin sarjoihin kirjoitetut kilot tyhjennetty');
  ok(sw.kgs[0]===82.5&&sw.done[0],'tehty sarja säilyy');
  ok(sw.reps===6,'toistotavoite säilyy');
  ok((await ph(1))==='–','kg-kentässä ei vanhaa ehdotusta (–)');

  console.log('\nEri liike, jolla on historia: ehdotus sen omasta historiasta');
  await p.evaluate(()=>{ const e=gSession(G.activeId).exercises[0]; GU.rename=e.id; renderGym(); });
  await p.fill('#g-rename','Cable press'); await p.evaluate(()=>gRenameEx(G.activeId,0)); await p.waitForTimeout(150);
  ok((await ph(1))==='25','ehdotus Cable pressin viimeisestä kerrasta (25)');
  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
