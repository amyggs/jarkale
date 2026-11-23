// v2.18.185: liikkeen yhdistäminen toiseen liikkeeseen ja peruminen
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const p=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));localStorage.setItem('jarkale-news-seen','["x"]');localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{training:true},gym:{enabled:true}}));});
  await p.reload(); await p.waitForFunction(()=>typeof gMergeEx==='function'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{
    const a=newProgram('A'); a.days[0].name='Rinta'; [['Vinopenkkipunnerruslaite',2],['Kapea penkki',2]].forEach(([n,c])=>a.days[0].exercises.push(newEx({name:n,sets:c}))); touchProg(a);
    const b=newProgram('B'); b.days[0].name='Rinta 2'; [['Vinopenkki Smith',2]].forEach(([n,c])=>b.days[0].exercises.push(newEx({name:n,sets:c}))); touchProg(b); gymSave();
    const run=async(pr,d,kg)=>{ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-d*864e5).toISOString().slice(0,10); s.exercises.forEach(e=>e.sets.forEach(r=>{r.kg=kg;r.reps=8;r.done=true;})); finishSession(true); };
    await run(a,20,80); await run(a,15,85); await run(a,10,90); await run(b,3,95);
  });
  const k=await p.evaluate(()=>({lai:exKey('Vinopenkkipunnerruslaite'),smi:exKey('Vinopenkki Smith'),kap:exKey('Kapea penkki')}));
  const c=await p.evaluate(k=>gMergeCands(k.lai).map(o=>o.key),k);
  ok(c[0]===k.smi,'Vinopenkki Smith tarjotaan ensimmäisenä (yhteinen nimen alku)');
  ok(!c.includes(k.kap),'samassa treenissä oleva Kapea penkki ei tarjolla');
  // näkymä
  const ui=await p.evaluate(k=>{ setTab('treeni'); gOpenEx(k.lai); const btn=[...document.querySelectorAll('#view-treeni button')].find(x=>/Yhdistä toiseen liikkeeseen/.test(x.textContent)); btn.click(); return document.getElementById('view-treeni').innerText; },k);
  ok(/Yhdistä toiseen liikkeeseen/.test(ui)&&/Vinopenkki Smith/.test(ui),'valintanäkymä näyttää kohdeliikkeet');
  // turvakopio epäonnistuu → ei muutosta
  const f=await p.evaluate(k=>{ const o=window.safetyCopy; window.safetyCopy=()=>false; window.__jdlgAuto=true; const r=gMergeEx(k.lai,k.smi); window.safetyCopy=o; return [r,exerciseHistory(k.lai).length]; },k);
  ok(f[0]===false&&f[1]===3,'ilman turvakopiota ei yhdistetä');
  const t0=Date.now();
  const r=await p.evaluate(k=>{ const r=gMergeEx(k.lai,k.smi); const H=exerciseHistory(k.smi); const prog=G.programs.find(x=>x.name==='A').days[0].exercises[0];
    return {r,n:H.length,old:exerciseHistory(k.lai).length,names:[...new Set(H.map(x=>x.ex.name))],pk:prog.key===k.smi,pn:prog.name,upd:G.sessions.filter(s=>s.exercises.some(e=>e.mergedFrom)).every(s=>s.updatedAt>=Date.now()-5000),pu:G.programs.find(x=>x.name==='A').updatedAt,mode:GU.mode,ex:GU.exKey}; },k);
  ok(r.r&&r.n===4&&r.old===0,'kaikki 3 kertaa siirtyivät, yhteensä 4 ('+r.n+')');
  ok(r.names.length===1&&r.names[0]==='Vinopenkki Smith','kaikki kerrat kohdeliikkeen nimellä');
  ok(r.pk&&r.pn==='Vinopenkki Smith','ohjelman liike vaihtui');
  ok(r.upd&&r.pu>=t0-1000,'muutetut treenit ja ohjelma merkitty synkronoitaviksi (updatedAt)');
  ok(r.mode==='exercise'&&r.ex===k.smi,'yhdistämisen jälkeen kohdeliikkeen sivu');
  const prev=await p.evaluate(k=>{ const H=exerciseHistory(k.smi); return H.map(x=>x.top.kg).join(','); },k);
  ok(prev==='80,85,90,95','käyrä ja historia yhdessä ('+prev+')');
  const pg=await p.evaluate(()=>document.getElementById('view-treeni').innerText);
  ok(/Yhdistetty liikkeestä Vinopenkkipunnerruslaite \(3 kertaa\)/.test(pg),'kohdeliikkeen sivulla tieto yhdistämisestä');
  // peruminen
  const u=await p.evaluate(async k=>{ window.__jdlgAuto=true; await gMergeUndo(k.smi,k.lai); return {a:exerciseHistory(k.lai).length,b:exerciseHistory(k.smi).length,pn:G.programs.find(x=>x.name==='A').days[0].exercises[0].name,left:G.sessions.some(s=>s.exercises.some(e=>e.mergedFrom))}; },k);
  ok(u.a===3&&u.b===1&&u.pn==='Vinopenkkipunnerruslaite'&&!u.left,'peruminen palauttaa alkuperäiset nimet ja ohjelman');
  // v2.18.187: katsottu vanha treeni ei saa uutta muokkausaikaa paluun jälkeen (synkronointi voisi muuten jyrätä toisen laitteen muutoksen)
  const bump=await p.evaluate(async k=>{ const s=G.sessions[0]; const u0=s.updatedAt; await new Promise(r=>setTimeout(r,20)); openSession(s.id); gBack(); await new Promise(r=>setTimeout(r,20)); gSetGroup(k.kap,'Rinta'); return [u0,s.updatedAt]; },k);
  ok(bump[0]===bump[1],'paluun jälkeen vanhan treenin muokkausaika ei muutu');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
