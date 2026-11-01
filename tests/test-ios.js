// Järkäle Tracking v2.18.138 – iPhone selaimessa: ohje Koti-valikkoon lisäämisestä (aloitus) ja tietojen siirtokortti
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const {defaultBrowserType,...iph}=devices['iPhone 13'];
  const ctx=await b.newContext({...iph,serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400);

  console.log('\nAloitus iPhonessa (selain)');
  ok(await p.evaluate(()=>isIOS()&&!isStandalone()),'tunnistetaan iPhone ja selain');
  const su=await p.locator('#setup-screen').innerText();
  ok(/lisää Järkäle ensin Koti-valikkoon/.test(su)&&/Safarissa/.test(su)&&/Lisää Koti-valikkoon/.test(su),'aloituksessa ohje Koti-valikkoon lisäämisestä');
  ok(await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).isVisible(),'valinnat näkyvät ohjeen alla (voi jatkaa)');
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(300);
  ok(!(await p.evaluate(()=>!!iosDataCardHTML())),'ei korttia ennen kuin dataa on');

  console.log('\nKun dataa on');
  await p.evaluate(()=>{ const pr=newProgram('P'); pr.days[0].exercises.push(newEx({name:'Penkki',sets:3})); touchProg(pr); gymSave(); setTab('treeni'); GU.mode='home'; renderGym(); }); await p.waitForTimeout(200);
  const tr=await p.locator('#view-treeni').innerText();
  ok(/iPhone voi poistaa tietosi/.test(tr)&&/Yhdistä Google Drive/.test(tr)&&/aloittaa tyhjänä/.test(tr),'Treeni-näkymässä siirtokortti: Drive ensin, Koti-valikon Järkäle tyhjä');
  await p.locator('#view-treeni .ios-card .ios-later').click(); await p.waitForTimeout(200);
  ok(!/iPhone voi poistaa tietosi/.test(await p.locator('#view-treeni').innerText()),'Myöhemmin piilottaa kortin');

  console.log('\nKoti-valikosta avattuna ja Androidissa');
  await p.evaluate(()=>{ localStorage.removeItem('jarkale-ios-later'); Object.defineProperty(navigator,'standalone',{value:true,configurable:true}); });
  ok(await p.evaluate(()=>!iosNeedsInstall()&&!iosDataCardHTML()),'Koti-valikosta avattuna ei ohjetta');
  const and=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage();
  await and.goto(URL); await and.evaluate(()=>localStorage.clear()); await and.reload(); await and.waitForTimeout(300);
  ok(!/Koti-valikkoon/.test(await and.locator('#setup-screen').innerText())&&await and.evaluate(()=>!isIOS()),'Androidissa ei iPhone-ohjetta');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
