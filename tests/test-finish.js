// v2.18.220: treenin lopetus selkeämmäksi ja tavoite muokattavaksi kesken treenin.
// Lopetusnäkymän auetessa yläreunan Lopeta piiloon, päänappi "Lopeta ja tallenna", ohjelmapohjan päivitys kertoo muutoksen ("Dippi → JM press").
// Tavoite muokataan ⋯-valikosta tai tavoiterivistä; virheellinen syöte ei muuta tavoitetta; päivitetty tavoite siirtyy ohjelmaan valinnalla.
const { chromium, devices } = require('playwright');
const fs = require('fs');
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('jarkale-news-seen','["x"]');
    localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(()=>{ const pr=newProgram('T'); ['Dippi','Ojentajapunnerrus'].forEach((n,i)=>pr.days[0].exercises.push(newEx({name:n,sets:3,repsMin:8,repsMax:12})));
    touchProg(pr); startSession(pr.id,pr.days[0].id); setTab('treeni');
    // liikkeen vaihto kuten Vaihda liike → Vaihdoin liikkeen: uusi avain ja nimi, toistotavoite pois
    const e=gSession(G.activeId).exercises[0]; e.name='JM press'; e.key=exKey('JM press'); e.goal={sets:3}; renderGym(); });
  await p.waitForTimeout(200);

  console.log('\nTavoite kesken treenin');
  ok(await p.locator('.ex-goal-btn').first().textContent()==='Tavoite 3 sarjaa','tavoiterivi on napautettava');
  await p.locator('.ex-more').first().click(); await p.getByRole('button',{name:'Tavoite',exact:true}).click(); await p.waitForTimeout(150);
  ok(await p.locator('#g-goal-in').count()===1&&await p.inputValue('#g-goal-in')==='3x','⋯-valikon Tavoite avaa kentän (pelkkä sarjamäärä: "3x")');
  await p.fill('#g-goal-in','kolme kertaa'); await p.press('#g-goal-in','Enter'); await p.waitForTimeout(100);
  const g0=await p.evaluate(()=>gSession(G.activeId).exercises[0].goal);
  ok(g0.sets===3&&g0.repsMin==null&&/ei tunnistettu/.test(await p.locator('.ex-goal-hint').textContent()),'tunnistamaton syöte ei muuta tavoitetta ja kertoo syyn');
  await p.fill('#g-goal-in','3x8-10'); await p.press('#g-goal-in','Enter'); await p.waitForTimeout(150);
  const g1=await p.evaluate(()=>gSession(G.activeId).exercises[0].goal);
  ok(g1.sets===3&&g1.repsMin===8&&g1.repsMax===10,'3x8-10 tallentuu tavoitteeksi');
  ok((await p.locator('.ex-goal-btn').first().textContent()).replace(/\s/g,' ')==='Tavoite 3 × 8–10','tavoiterivi päivittyy');
  await p.locator('.ex-goal-btn').first().click(); await p.waitForTimeout(100);
  ok(await p.inputValue('#g-goal-in')==='3x8-10','tavoiterivin napautus avaa kentän nykyisellä tavoitteella');
  await p.getByRole('button',{name:'OK',exact:true}).click(); await p.waitForTimeout(100);

  console.log('\nLopetus');
  await p.getByRole('button',{name:'Lopeta',exact:true}).click(); await p.waitForTimeout(150);
  ok(await p.getByRole('button',{name:'Lopeta',exact:true}).count()===0,'lopetusnäkymän ollessa auki yläreunan Lopeta on piilossa');
  ok(await p.getByRole('button',{name:'Lopeta ja tallenna'}).count()===1,'päänappi: Lopeta ja tallenna');
  const lbl=(await p.locator('.g-check').textContent()).trim();
  ok(lbl==='Päivitä ohjelmaan: Dippi → JM press','ohjelmapohjan valinta kertoo muutoksen ('+lbl+')');
  await p.getByRole('button',{name:'Jatka treeniä'}).click(); await p.waitForTimeout(100);
  ok(await p.getByRole('button',{name:'Lopeta',exact:true}).count()===1,'Jatka treeniä palauttaa Lopeta-napin');
  await p.evaluate(()=>{ gSession(G.activeId).exercises.forEach(e=>e.sets.forEach(x=>{x.kg=40;x.reps=10;x.done=true;})); renderGym(); });
  await p.getByRole('button',{name:'Lopeta',exact:true}).click(); await p.waitForTimeout(100);
  await p.locator('.g-check input').check(); await p.getByRole('button',{name:'Lopeta ja tallenna'}).click(); await p.waitForTimeout(200);
  const tpl=await p.evaluate(()=>{ const d=G.programs[0].days[0]; return d.exercises.map(e=>({n:e.name,s:e.sets,a:e.repsMin,b:e.repsMax})); });
  ok(tpl[0].n==='JM press'&&tpl[0].s===3&&tpl[0].a===8&&tpl[0].b===10&&tpl[1].n==='Ojentajapunnerrus','ohjelmaan päivittyy JM press 3 × 8–10 Dipin tilalle');
  // muut kuvaukset
  const txt=await p.evaluate(()=>{ const pr=G.programs[0]; startSession(pr.id,pr.days[0].id); const s=gSession(G.activeId);
    const a=tplChangeTxt(s); s.exercises.reverse(); const b=tplChangeTxt(s); s.exercises.reverse(); s.exercises[1].skipped=true; const c=tplChangeTxt(s);
    s.exercises[1].skipped=false; s.exercises.push({...s.exercises[0],id:'z',key:exKey('Face pull'),name:'Face pull'}); const d=tplChangeTxt(s); return {a,b,c,d}; });
  ok(txt.b==='liikkeiden järjestys'&&txt.c==='pois Ojentajapunnerrus'&&txt.d==='+ Face pull','järjestys, ohitettu ja lisätty kerrotaan ('+JSON.stringify(txt)+')');
  // lopetusnäkymän napit mahtuvat: kaikki teemat, 360 px ja suurin tekstikoko
  for(const [W,ts] of [[360,'1.3'],[412,'1.15']]){
    const c2=await b.newContext({...devices['Pixel 7'],viewport:{width:W,height:900},serviceWorkers:'block'}); await c2.addInitScript(()=>{ window.__jdlgAuto=true; });
    const q=await c2.newPage(); await q.goto('http://localhost:8765/index.html'); const bad=[];
    for(const pal of ['ampiainen','kaurapuuro','magnesium','lasi','soitin','fosfori','kuusnelonen','tekstitv','manageri']) for(const th of ['light','dark']){
      await q.evaluate(([pal,th,ts])=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('jarkale-news-seen','["x"]'); localStorage.setItem('jarkale-fb-later',String(Date.now())); localStorage.setItem('jarkale-textsize',ts);
        localStorage.setItem('seuranta-settings',JSON.stringify({palette:pal,theme:th,tracking:{training:true},gym:{enabled:true}})); },[pal,th,ts]);
      await q.reload(); await q.waitForFunction(()=>typeof gOpenFinish==='function');
      await q.evaluate(()=>{ const pr=newProgram('T'); pr.days[0].exercises.push(newEx({name:'Dippi',sets:2,repsMin:8})); touchProg(pr); startSession(pr.id,pr.days[0].id); setTab('treeni');
        gSession(G.activeId).exercises[0].sets.forEach(x=>{x.kg=40;x.reps=8;x.done=true;}); gOpenFinish(); });
      await q.waitForTimeout(250);
      const r=await q.evaluate(()=>{ const f=document.querySelector('.g-finish').getBoundingClientRect(); const out=[];
        document.querySelectorAll('.g-finish .g-rate button, .g-finish .tr-go').forEach(e=>{ const rc=e.getBoundingClientRect(), rg=document.createRange(); rg.selectNodeContents(e); const t=rg.getBoundingClientRect();
          if(rc.right>f.right+0.5||rc.left<f.left-0.5||t.width>rc.width-2+0.5) out.push(e.textContent.trim()); }); return out; });
      if(r.length) bad.push(pal+'/'+th+': '+r.join(', '));
    }
    ok(!bad.length,`lopetusnäkymän napit mahtuvat kaikissa 18 teemassa (${W} px, tekstikoko ${ts})`+(bad.length?' '+bad.join(' | '):''));
    await c2.close();
  }
  ok(!errs.length,'ei JS-virheitä'+(errs.length?': '+errs.join(' | '):''));
  console.log(`\n${pass}/${pass+fail} läpi`); await b.close(); process.exit(fail?1:0);
})();
