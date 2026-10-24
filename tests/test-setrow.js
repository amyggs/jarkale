// Järkäle Tracking v2.18.93 – toistojen − / + ja pienennetyn liikerivin rivitys
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
  // edellinen treeni: 80 x 8, 8, 10
  await p.evaluate(()=>{
    const pr=newProgram('T'); pr.days[0].exercises.push(newEx({name:'Vinopenkkipunnerruslaite tai smith',sets:3}),newEx({name:'Tasapenkkipunnerrus negatiivinen smith',sets:3}));
    touchProg(pr);
    startSession(pr.id,pr.days[0].id);
    const s=gSession(G.activeId); s.date=new Date(Date.now()-864e5).toISOString().slice(0,10); s.startedAt=Date.now()-864e5;
    s.exercises[0].sets.forEach((x,i)=>{x.kg=80;x.reps=[8,8,10][i];x.done=true;});
    s.exercises[1].sets.forEach((x,i)=>{x.kg=[110,100,80][i];x.reps=[3,6,14][i];x.done=true;});
    finishSession(true);
    const pr2=G.programs[0]; startSession(pr2.id,pr2.days[0].id); setTab('treeni');
  }); await p.waitForTimeout(300);

  console.log('\nToistojen − / +');
  const row=i=>`[data-set="0-${i}"]`;
  ok(await p.locator(`${row(0)} .rpw .kgb`).count()===2,'seuraavana vuorossa olevalla sarjalla toistoille − ja +');
  ok(await p.locator(`${row(1)} .rpw`).count()===0,'myöhemmillä sarjoilla ei vielä nappeja');
  ok(await p.locator(`${row(0)} input[data-f="reps"]`).getAttribute('placeholder')==='8','harmaana edellisen kerran 8');
  await p.locator(`${row(0)} .rpw .kgb`).nth(1).click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].reps===9),'+ lähtee harmaasta ehdotuksesta: 8 → 9');
  ok(await p.locator(`${row(0)} input[data-f="reps"]`).inputValue()==='9','kenttä näyttää 9');
  await p.locator(`${row(0)} .rpw .kgb`).nth(0).click(); await p.locator(`${row(0)} .rpw .kgb`).nth(0).click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].reps===7),'− laskee: 7');
  await p.fill(`${row(0)} input[data-f="reps"]`,'12'); 
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].reps===12),'kirjoittaminen toimii edelleen');
  await p.fill(`${row(0)} input[data-f="kg"]`,'80');
  await p.locator(`${row(0)} .ck`).click(); await p.waitForTimeout(150);
  ok(await p.locator(`${row(1)} .rpw`).count()===1&&await p.locator(`${row(0)} .rpw`).count()===0,'nappi siirtyy seuraavalle sarjalle kuittauksen jälkeen');
  ok(await p.locator(`${row(1)} input[data-f="reps"]`).getAttribute('placeholder')==='12'&&await p.locator(`${row(1)} input[data-f="kg"]`).getAttribute('placeholder')==='80','toisen sarjan ehdotus kopioituu ensimmäisestä: 80 × 12 (v2.18.104)');

  console.log('\nMahtuminen 360 / 412 px (toistot 100, RPE päällä ja pois)');
  for(const w of [360,412]){
    await p.setViewportSize({width:w,height:850});
    for(const eff of ['','rir']){
      await p.evaluate(m=>{ setGymOpt('effort',m); setTab('treeni'); renderGym(); },eff); await p.waitForTimeout(120);
      await p.fill(`${row(1)} input[data-f="reps"]`,'100'); await p.fill(`${row(1)} input[data-f="kg"]`,'103,75');
      const g=await p.evaluate(()=>{ const r=document.querySelector('[data-set="0-1"]'); const rr=r.getBoundingClientRect();
        const bad=[...r.querySelectorAll('input,button')].filter(e=>{ const q=e.getBoundingClientRect(); return q.right>rr.right+0.5||q.left<rr.left-0.5||(e.tagName==='INPUT'&&e.scrollWidth>e.clientWidth+1); }).length;
        return {bad,docW:document.documentElement.scrollWidth}; });
      ok(g.bad===0&&g.docW<=w,`${w} px, RPE ${eff||'pois'}: ei ylivuotoa`);
    }
  }

  console.log('\nPienennetty liikerivi');
  await p.evaluate(()=>{ setGymOpt('effort',''); const s=gSession(G.activeId); s.exercises[0].sets.forEach((x,i)=>{x.kg=[110,100,80][i];x.reps=[3,6,14][i];x.done=true;}); s.exercises[0].feel='hard'; GU.expanded[s.exercises[0].id]=false; setTab('treeni'); renderGym(); }); await p.waitForTimeout(150);
  for(const w of [360,412]){
    await p.setViewportSize({width:w,height:850}); await p.waitForTimeout(150);
    const g=await p.evaluate(()=>{ const m=document.querySelector('.ex.mini'); const n=m.querySelector('.ex-n'), st=m.querySelector('.st'); const mr=m.getBoundingClientRect(), nr=n.getBoundingClientRect(), sr=st.getBoundingClientRect();
      // nimessä ei saa olla kesken sanan katkaisua: jokainen sana mahtuu riville
      const words=n.textContent.split(/\s+/); const c=document.createElement('span'); c.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:'+getComputedStyle(n).font; document.body.appendChild(c);
      const maxW=Math.max(...words.map(x=>{ c.textContent=x; return c.getBoundingClientRect().width; })); c.remove();
      return {nameW:Math.round(nr.width),maxWord:Math.round(maxW),over:Math.round(Math.max(0,sr.right-mr.right,nr.right-mr.right)),stBelow:sr.top>=nr.bottom-1}; });
    ok(g.nameW>=g.maxWord,`${w} px: nimen leveys (${g.nameW}) ≥ pisin sana (${g.maxWord}) eli ei katkea kesken sanan`);
    ok(g.over===0,`${w} px: rivi ei ylivuoda`);
  }
  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
