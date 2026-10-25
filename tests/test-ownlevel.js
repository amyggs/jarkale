// Järkäle Tracking v2.18.110 – vertailu omaan tasoon (Päivän tila, Trendien havainnot) ja aloituksen yksityisyysrivi
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
  const fresh=async()=>{ await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); };

  console.log('\nAloitus: yksityisyys');
  await fresh();
  const su=await p.locator('#setup-screen').innerText();
  ok(/Tietosi pysyvät sinulla/.test(su)&&/ei ole omaa palvelinta/.test(su)&&/Google Driveesi/.test(su),'aloitus kertoo, missä tiedot ovat');
  ok(/tekoälyanalyysi lähettää tietoja vain, jos otat sen itse käyttöön/.test(su),'tekoälyanalyysin poikkeus kerrotaan rehellisesti');

  // Data: 35 pv vakaa taso (uni 7,5 h, palautuminen 4, vire 4), viimeiset 3 pv selvästi alle
  const seed=async(lowDays,lowSleep,lowRec)=>{ await p.evaluate(({lowDays,lowSleep,lowRec})=>{
    S.settings.tracking={...initTracking(),sleep:true,recovery:true,motivation:true}; localStorage.setItem('seuranta-setup-done','1'); S.entries={};
    for(let i=35;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const ds=iso(d); const low=i<lowDays;
      S.entries[ds]={date:ds,sleep:low?lowSleep:7.5,recovery:low?lowRec:4,motivation:4,updated_at:Date.now()}; }
    saveAll(); renderSetupScreen(); setTab('log'); S.date=today(); loadDateIntoState?loadDateIntoState(S.date):0; },{lowDays,lowSleep,lowRec}).catch(()=>{});
    await p.evaluate(()=>{ const e=S.entries[today()]; S.sleep=e.sleep; S.recovery=e.recovery; S.motivation=e.motivation; renderReadiness(); }); await p.waitForTimeout(150); };

  console.log('\nPäivän tila: peräkkäiset päivät');
  await seed(3,6.5,2);
  let ds=await p.locator('#readiness-card').innerText();
  ok(/Uni alle oman tason 3 yötä peräkkäin/.test(ds),'uni 3 yötä alle: '+ds.replace(/\n/g,' | '));
  ok(/Palautuminen alle oman tason 3 päivää peräkkäin/.test(ds),'palautuminen 3 päivää alle');
  ok(!/Vire .* oman tason/.test(ds),'vakaa vire ei saa riviä');
  ok(await p.locator('#readiness-card .ds-run').isVisible(),'rivi näkyy myös kiinni-tilassa');
  await seed(2,6.5,2);
  ds=await p.locator('#readiness-card').innerText();
  ok(!/oman tason \d/.test(ds),'2 päivää ei vielä riitä');
  await seed(3,7.3,4);
  ds=await p.locator('#readiness-card').innerText();
  ok(!/oman tason \d/.test(ds),'12 min ero ei ole poikkeama');
  await seed(4,8.5,4);
  ds=await p.locator('#readiness-card').innerText();
  ok(/Uni yli oman tason 4 yötä peräkkäin/.test(ds),'myös hyvä suunta kerrotaan');

  console.log('\nTrendit: viime viikko vs. oma taso');
  await seed(7,6.75,4);
  await p.evaluate(()=>{ S.rangeId='d28'; S.periodOffset=0; setTab('trendit'); renderTrendit(); }); await p.waitForTimeout(250);
  let tr=await p.locator('#trendit-content').innerText();
  ok(/Viime viikon uni keskimäärin 6 h 45 min, 45 min alle oman tasosi \(7 h 30 min\)/.test(tr),'unihavainto omaan tasoon');
  ok(!/Viime viikon palautuminen/.test(tr),'vakaa palautuminen ei saa havaintoa');
  await p.evaluate(()=>{ S.rangeId='kk'; S.periodOffset=-1; renderTrendit(); }); await p.waitForTimeout(200);
  tr=await p.locator('#trendit-content').innerText();
  ok(!/Viime viikon uni/.test(tr),'menneellä jaksolla ei viime viikon vertailua');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
