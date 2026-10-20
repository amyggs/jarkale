// Järkäle Tracking v2.18.86 – valinnainen koetun rasittavuuden kirjaus (RIR / RPE)
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
  await p.evaluate(()=>{ const pr=newProgram('T'); pr.days[0].exercises.push(newEx({name:'Penkki',sets:3})); touchProg(pr); setTab('treeni'); startSession(pr.id,pr.days[0].id); });
  const doSet=async(i,kg,reps)=>{ await p.fill(`[data-set="0-${i}"] input[data-f="kg"]`,String(kg)); await p.fill(`[data-set="0-${i}"] input[data-f="reps"]`,String(reps)); await p.locator(`[data-set="0-${i}"] .ck`).click(); await p.waitForTimeout(80); };

  console.log('\nOletus: pois');
  await doSet(0,80,8);
  ok(await p.locator('.set-eff').count()===0,'oletuksena sarjan alla ei rasittavuusvalintaa');
  ok(await p.evaluate(()=>effTxt(gSession(G.activeId).exercises[0].sets)===''),'ei tekstiä ilman tilaa');

  console.log('\nAsetus');
  await p.evaluate(()=>{ GU.mode='home'; setTab('treeni'); openGymSettings(); });
  await p.waitForTimeout(150);
  const st=await p.locator('#g-settings-body').innerText();
  ok(/Koettu rasittavuus/.test(st)&&/RIR/.test(st)&&/RPE/.test(st),'Asetuksissa on valinta Pois / RIR / RPE');
  await p.locator('#g-settings-body .g-seg button',{hasText:'RIR'}).last().click(); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>gymCfg().effort==='rir'),'RIR-valinta tallentuu');

  console.log('\nRIR: − / + -säädin');
  await p.evaluate(()=>{ setTab('treeni'); openSession(G.activeId); });
  await p.waitForTimeout(200);
  ok(await p.locator('.set-eff').count()===2,'säädin kuitatun ja seuraavana vuorossa olevan sarjan alla');
  const ev0=()=>p.locator('.set-eff').nth(0).locator('.ev');
  ok((await ev0().innerText())==='2'&&await ev0().evaluate(e=>e.classList.contains('ghost')),'oletuksena harmaa ehdotus RIR 2, ei tallennettu');
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe==null),'ehdotus ei tallennu ennen napautusta');
  await p.locator('.set-eff').nth(0).locator('.eb').nth(1).click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe===7),'+ nostaa ehdotuksesta: RIR 3 = RPE 7');
  await p.locator('.set-eff').nth(0).locator('.eb').nth(0).click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe===8)&&(await ev0().innerText())==='2'&&!(await ev0().evaluate(e=>e.classList.contains('ghost'))),'− laskee: RIR 2 = RPE 8, arvo korostuu');
  await ev0().click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe==null),'napautus valittuun arvoon tyhjentää');
  await ev0().click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe===8),'napautus harmaaseen hyväksyy ehdotuksen');
  for(let i=0;i<6;i++){ await p.locator('.set-eff').nth(0).locator('.eb').nth(0).click(); await p.waitForTimeout(40); }
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe===10),'alaraja RIR 0 = RPE 10');
  ok((await p.locator('.set-eff').nth(1).locator('.ev').innerText())==='0','seuraavan sarjan ehdotus seuraa edellistä (RIR 0)');
  for(let i=0;i<7;i++){ await p.locator('.set-eff').nth(0).locator('.eb').nth(1).click(); await p.waitForTimeout(40); }
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe===6)&&(await ev0().innerText())==='4+','yläraja RIR 4+ = RPE 6');
  await ev0().click(); await ev0().click(); await p.waitForTimeout(60);
  await p.locator('.set-eff').nth(0).locator('.eb').nth(1).click(); await p.locator('.set-eff').nth(0).locator('.eb').nth(0).click(); await p.waitForTimeout(60);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe===8),'palautettu RIR 2:een');
  await doSet(1,80,7);
  await p.locator('.set-eff').nth(1).locator('.eb').nth(1).click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[1].rpe===7),'toinen sarja: RIR 3 = RPE 7');
  ok(await p.evaluate(()=>effTxt(gSession(G.activeId).exercises[0].sets)==='RIR 2–3'),'tiivistelmä RIR 2–3');
  await p.locator('.set-eff').nth(1).locator('.ev').click(); await p.waitForTimeout(80);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[1].rpe==null&&effTxt(gSession(G.activeId).exercises[0].sets)==='RIR 2'),'tyhjennys poistaa arvon tiivistelmästä');

  console.log('\nRPE ja tilan vaihto');
  await p.evaluate(()=>setGymOpt('effort','rpe')); await p.evaluate(()=>{ setTab('treeni'); renderGym(); }); await p.waitForTimeout(150);
  ok((await ev0().innerText())==='8'&&await p.locator('.set-eff .lb').first().innerText()==='RPE','sama sarja näkyy RPE 8:na (RIR 2)');
  ok(await p.evaluate(()=>effTxt(gSession(G.activeId).exercises[0].sets)==='RPE 8'),'tiivistelmä RPE 8');
  await p.locator('.set-eff').nth(0).locator('.eb').nth(0).click(); await p.waitForTimeout(60);
  ok(await p.evaluate(()=>gSession(G.activeId).exercises[0].sets[0].rpe===7),'RPE-tilassa − laskee RPE:tä (8 → 7)');
  await p.locator('.set-eff').nth(0).locator('.eb').nth(1).click(); await p.waitForTimeout(60);

  console.log('\nRivin koko ja mahtuminen (360 / 412 px)');
  for(const w of [360,412]){
    await p.setViewportSize({width:w,height:850});
    for(const mode of ['','rir']){
      await p.evaluate(m=>{ setGymOpt('effort',m); setTab('treeni'); renderGym(); },mode); await p.waitForTimeout(120);
      await p.fill('[data-set="0-2"] input[data-f="kg"]','103,75'); await p.fill('[data-set="0-2"] input[data-f="reps"]','12');
      const g=await p.evaluate(()=>{ const row=document.querySelector('[data-set="0-2"]'); const rr=row.getBoundingClientRect(); const bad=[...row.querySelectorAll('input,button')].filter(e=>{ const r=e.getBoundingClientRect(); return r.right>rr.right+0.5||r.left<rr.left-0.5||(e.tagName==='INPUT'&&e.scrollWidth>e.clientWidth+1); }).length; return {bad, fh:Math.round(row.querySelector('.f').getBoundingClientRect().height), ck:Math.round(row.querySelector('.ck').getBoundingClientRect().height), kgw:row.querySelector('input[data-f=kg]').value, docW:document.documentElement.scrollWidth}; });
      ok(g.bad===0&&g.docW<=w,`${w} px, ${mode?'rasittavuus päällä':'pois'}: ei ylivuotoa (kentän korkeus ${g.fh}, nappi ${g.ck})`);
      if(mode==='') ok(g.fh>=50,`${w} px: pois-tilassa kentät isompia (${g.fh} px)`); else ok(g.fh<=44,`${w} px: päällä-tilassa rivi tiiviimpi (${g.fh} px)`);
    }
  }
  await p.setViewportSize({width:412,height:915});
  await p.evaluate(()=>setGymOpt('effort','rpe'));

  console.log('\nYhteenveto, historia, jako');
  await p.evaluate(()=>setGymOpt('effort','rir'));
  await p.evaluate(()=>{ setTab('treeni'); renderGym(); }); await p.waitForTimeout(100);
  await p.getByRole('button',{name:'Lopeta',exact:true}).click();
  await p.getByRole('button',{name:'Tallenna treeni'}).click(); await p.waitForTimeout(200);
  ok(/RIR 2/.test(await p.locator('.g-sum').innerText()),'yhteenvedossa RIR 2');
  ok(await p.evaluate(()=>/Penkki: .*RIR 2/.test(sessionShareText(G.sessions.filter(x=>x.endedAt).at(-1)))),'jaettavassa tekstissä RIR 2');
  await p.evaluate(()=>setGymOpt('effort',''));
  await p.evaluate(()=>{ renderGym(); }); await p.waitForTimeout(100);
  ok(!/RIR|RPE/.test(await p.locator('.g-sum').innerText()),'pois-tilassa mittari ei näy yhteenvedossa');
  ok(await p.evaluate(()=>G.sessions.filter(x=>x.endedAt).at(-1).exercises[0].sets[0].rpe===8),'mutta tieto säilyy datassa');

  console.log('\nEdellinen kerta');
  await p.evaluate(()=>setGymOpt('effort','rir'));
  await p.evaluate(()=>{ G.sessions.filter(x=>x.endedAt).at(-1).exercises[0].sets[0].rpe=10; });
  await p.evaluate(()=>{ gBack(); const pr=G.programs[0]; startSession(pr.id,pr.days[0].id); }); await p.waitForTimeout(200);
  ok(/Viimeksi[^\n]*RIR/.test(await p.locator('.ex-prev').first().innerText()),'edellisen kerran rivillä näkyy RIR viitteenä');
  ok((await p.locator('.set-eff').first().locator('.ev').innerText())==='2'&&await p.locator('.set-eff').first().locator('.ev').evaluate(e=>e.classList.contains('ghost')),'viime kerran RIR 0 ei esitäytä ehdotusta: ensimmäisen sarjan ehdotus on RIR 2');
  await p.evaluate(()=>{ finishSession(true); });

  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
