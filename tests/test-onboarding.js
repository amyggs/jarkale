// Järkäle Tracking v2.18.82 – uusi aloitusnäyttö (treeni / keho / molemmat), tekoälykortti vain avaimen kanssa
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  const fresh=async()=>{ await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500); };
  const txt=()=>p.evaluate(()=>document.getElementById('setup-screen').innerText.replace(/\n+/g,' | '));
  const dlgs=()=>p.evaluate(()=>(window.__jdlgLog||[]).length);

  console.log('\nValintanäkymä');
  await fresh();
  let t=await txt();
  ok(/Kirjata treenejä/.test(t)&&/Seurata kehoa ja vointia/.test(t)&&/Molempia/.test(t),'ensimmäinen näkymä tarjoaa kolme valintaa');
  ok(!/Verenpaine|Migreeni/.test(t),'terveysseurantalistaa ei näytetä ensin');
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('meas-reminder')).display==='none'),'mittausmuistutus ei näy aloitusnäytöllä');

  console.log('\nTreenit');
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(300);
  const g=await p.evaluate(()=>({done:localStorage.getItem('seuranta-setup-done'), gym:gymOn(), nav:getComputedStyle(document.getElementById('nav-treeni')).display, tab:S.tab, setup:document.getElementById('setup-screen').style.display, view:document.getElementById('view-treeni')&&getComputedStyle(document.getElementById('view-treeni')).display}));
  ok(g.done==='1'&&g.gym,'treenivalinta päättää aloituksen ja ottaa treenimoduulin käyttöön');
  ok(g.nav!=='none'&&g.tab==='treeni','Treeni-välilehti näkyy ja on auki');
  ok(g.setup==='none','aloitusnäyttö sulkeutuu');
  ok(await p.evaluate(()=>{ setTab('log'); return getComputedStyle(document.getElementById('meas-reminder')).display==='none'; }),'pelkkää treeniä kirjaava ei saa mittausmuistutusta');
  await p.evaluate(()=>setTab('treeni')); await p.waitForTimeout(200);
  ok(!/Keep/.test(await p.evaluate(()=>document.getElementById('view-treeni').innerText)),'tyhjä Treeni-näkymä ei viittaa Google Keepiin');
  const kept=await p.evaluate(()=>JSON.parse(localStorage.getItem('seuranta-settings')));
  ok(kept.gym&&kept.gym.enabled===true,'valinta tallentui asetuksiin');
  await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>gymOn()&&document.getElementById('setup-screen').style.display==='none'),'valinta säilyy uudelleenlatauksessa');

  console.log('\nKeho');
  await fresh();
  await p.locator('.su-choice',{hasText:'Seurata kehoa'}).click(); await p.waitForTimeout(200);
  t=await txt();
  ok(/Mitä haluat seurata\?/.test(t)&&/Paino/.test(t)&&/Treenipäivän merkintä/.test(t)&&!/Salitreeni\b/.test(t),'seurantalista näkyy, "Salitreeni" on nimetty uudelleen');
  ok(/Takaisin/.test(t),'takaisin-linkki näkyy');
  await p.locator('.su-back').click(); await p.waitForTimeout(150);
  ok(/Kirjata treenejä/.test(await txt()),'takaisin palaa valintoihin');
  await p.locator('.su-choice',{hasText:'Seurata kehoa'}).click(); await p.waitForTimeout(150);
  await p.locator('.su-row',{hasText:'Paino'}).first().click(); await p.waitForTimeout(100);
  await p.locator('.su-go').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!gymOn()&&localStorage.getItem('seuranta-setup-done')==='1'&&getComputedStyle(document.getElementById('nav-treeni')).display==='none'),'kehovalinta jättää treenimoduulin pois');

  console.log('\nMolemmat');
  await fresh();
  await p.locator('.su-choice',{hasText:'Molempia'}).click(); await p.waitForTimeout(200);
  await p.locator('.su-row',{hasText:'Paino'}).first().click(); await p.waitForTimeout(100);
  await p.locator('.su-go').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>gymOn()&&getComputedStyle(document.getElementById('nav-treeni')).display!=='none'&&S.tab!=='treeni'),'"Molempia" ottaa treenimoduulin käyttöön ja jää Kirjaa-näkymään');
  ok(await p.evaluate(()=>!!document.getElementById('nav-trendit')),'päänavigointi toimii');

  console.log('\nTekoälykortti Trendeissä (oikea näkymä)');
  await p.evaluate(()=>{ localStorage.removeItem('seuranta-apikey'); setTab('trendit'); S.rangeId='d28'; renderTrendit(); });
  await p.waitForTimeout(500);
  ok(!/Kirjallinen yhteenveto/.test(await p.locator('#trendit-content').innerText()),'28 pv -näkymässä ei AI-korttia ilman avainta');
  await p.evaluate(()=>{ S.rangeId='vko'; S.periodOffset=-1; S.trendToggles={analysis:true}; renderTrendit(); }); await p.waitForTimeout(500);
  ok(!/Kirjallinen yhteenveto/.test(await p.locator('#trendit-content').innerText()),'viikkonäkymässä ei AI-korttia ilman avainta');
  await p.evaluate(()=>{ localStorage.setItem('seuranta-apikey','sk-ant-test-123456'); S.rangeId='d28'; renderTrendit(); }); await p.waitForTimeout(500);
  ok(/Kirjallinen yhteenveto/.test(await p.locator('#trendit-content').innerText()),'avaimen kanssa 28 pv -näkymässä kortti näkyy');
  await p.evaluate(()=>{ localStorage.removeItem('seuranta-apikey'); });
  console.log('\nTekoälykortti');
  const c=await p.evaluate(()=>{ localStorage.removeItem('seuranta-apikey'); const a=buildAnalysisSectionHTML([], '2026-09-01','r',100,'2026-09-01','2026-09-30'); localStorage.setItem('seuranta-apikey','sk-ant-test-123456'); const b2=buildAnalysisSectionHTML([], '2026-09-01','r',100,'2026-09-01','2026-09-30'); localStorage.removeItem('seuranta-apikey'); return {no:a, yes:b2}; });
  ok(c.no==='','ilman API-avainta korttia ei näytetä');
  ok(/Kirjallinen yhteenveto/.test(c.yes),'avaimen kanssa kortti näkyy');
  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
