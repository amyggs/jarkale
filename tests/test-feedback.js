// Järkäle Tracking v2.18.157 – palaute kehittäjälle: vain pilotissa, mailto osoitteeseen tuki@jarkale.com, mukana versio/laite/teema mutta ei kirjauksia.
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},serviceWorkers:'block'});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const seed=async()=>{ await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));
  localStorage.setItem('seuranta-settings',JSON.stringify({palette:'kaurapuuro',theme:'dark',tracking:{weight:true,sleep:true}}));
  const d=new Date().toISOString().slice(0,10); localStorage.setItem('seuranta-entries',JSON.stringify({[d]:{date:d,weight:83.4,notes:'Salainen testihuomio'}}));}); await p.reload(); await p.waitForTimeout(500); };
// pilotti
await p.goto('http://localhost:8765/jarkale-pilotti/index.html'); await seed();
await p.evaluate(()=>setTab('asetukset')); await p.waitForTimeout(300);
const btn=p.locator('button.pilot-only',{hasText:'Palaute kehittäjälle'});
ok(await btn.isVisible(),'pilotti: Palaute kehittäjälle -nappi asetuksissa');
const href=await p.evaluate(()=>feedbackHref());
const dec=decodeURIComponent(href);
ok(href.startsWith('mailto:tuki@jarkale.com?subject='),'mailto osoitteeseen tuki@jarkale.com');
ok(/Järkäle-palaute/.test(dec),'otsikko Järkäle-palaute');
ok(/Pilotti v\d+\.\d+\.\d+/.test(dec)&&/Android/.test(dec)&&/Chrome \d+/.test(dec),'mukana versio, Android ja Chrome: '+dec.split('\n').pop());
ok(/teema kaurapuuro tumma/.test(dec),'mukana teema');
ok(!/83,4|83\.4|Salainen/.test(dec),'kirjauksia ei liitetä viestiin');
await p.evaluate(()=>{ SETTINGS_TOGGLES.changelog=true; renderAsetukset(); }); await p.waitForTimeout(200);
ok(await p.locator('#changelog-content button',{hasText:'Kirjoita kehittäjälle'}).count()===1,'pilotin Mitä uutta -näkymässä palautelinkki');
// oma versio
await p.goto('http://localhost:8765/index.html'); await seed();
await p.evaluate(()=>{ setTab('asetukset'); SETTINGS_TOGGLES.changelog=true; renderAsetukset(); }); await p.waitForTimeout(300);
ok(!(await p.locator('button.pilot-only',{hasText:'Palaute kehittäjälle'}).isVisible()),'oma versio: nappi piilossa');
ok(await p.locator('#changelog-content button',{hasText:'Kirjoita kehittäjälle'}).count()===0,'oma versio: ei palautelinkkiä Mitä uutta -näkymässä');
ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);})();
