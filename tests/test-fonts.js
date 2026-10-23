// Järkäle Tracking v2.18.80 – fontit paikallisesti, nopea ensipiirto heikolla verkolla, SW-päivitys ei keskeytä treeniä
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
const ROOT=__dirname+'/..';
const HTML=fs.readFileSync(ROOT+'/index.html','utf8');
const SW=fs.readFileSync(ROOT+'/sw.js','utf8');
(async()=>{
  console.log('\nStaattiset');
  ok(!/fonts\.(googleapis|gstatic)\.com/.test(HTML),'index.html ei lataa fontteja Googlelta');
  const need=['manrope-latin-400-normal','manrope-latin-500-normal','manrope-latin-600-normal','manrope-latin-700-normal','manrope-latin-800-normal','share-tech-mono-latin-400-normal','vt323-latin-400-normal'];
  ok(need.every(n=>fs.existsSync(`${ROOT}/fonts/${n}.woff2`)&&HTML.includes(`fonts/${n}.woff2`)),'kaikki tarvittavat fonttitiedostot ovat repossa ja @font-face viittaa niihin');
  ok(fs.existsSync(ROOT+'/fonts/LICENSE-manrope.txt'),'Manropen lisenssi mukana');
  ok(/startsWith\(PREFIX\)/.test(SW)&&!/keys\.filter\(k=>k!==CACHE\)/.test(SW),'SW siivoaa vain oman sovelluksensa välimuistit');
  ok(/jarkale-fonts-v1/.test(SW)&&/manrope-latin-600/.test(SW),'SW esilataa perusfontin pysyvään fonttivälimuistiin');

  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});

  console.log('\nHeikko verkko: Googlen fonttipalvelut eivät vastaa 6 s');
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  let googleReq=0;
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, async r=>{ googleReq++; await new Promise(x=>setTimeout(x,6000)); r.abort().catch(()=>{}); });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const fontReqs=[]; p.on('requestfinished',r=>{ if(/\.woff2/.test(r.url())) fontReqs.push(r.url().split('/').pop()); });
  await p.goto(URL,{waitUntil:'commit'});
  await p.waitForFunction(()=>performance.getEntriesByName('first-contentful-paint').length>0,null,{timeout:20000});
  const fcp=await p.evaluate(()=>Math.round(performance.getEntriesByName('first-contentful-paint')[0].startTime));
  ok(fcp<1500,'ensipiirto alle 1,5 s ('+fcp+' ms)');
  ok(googleReq===0,'Googleen ei tehdä pyyntöjä');
  await p.waitForTimeout(800);
  const fm=await p.evaluate(async()=>{ await document.fonts.ready; await document.fonts.load('600 14px Manrope'); return {m6:document.fonts.check('600 14px Manrope'), loaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight)}; });
  await p.waitForTimeout(300);
  ok(fm.m6&&fontReqs.some(n=>/manrope-latin-6|manrope-latin-7/.test(n)),'Manrope latautuu omalta palvelimelta ('+fontReqs.filter(n=>/manrope/.test(n)).join(',')+')');
  await ctx.close();

  console.log('\nService worker: ensiasennus ja päivitys');
  const ctx2=await b.newContext({...devices['Pixel 7']});
  await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  const p2=await ctx2.newPage(); let navs=0; p2.on('load',()=>{ navs++; });
  await p2.goto(URL); await p2.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:15000}).catch(()=>{}); await p2.waitForTimeout(1500);
  ok(navs===1,'ensimmäinen avaus ei lataa sivua uudelleen (navigaatioita: '+navs+')');
  const caches=await p2.evaluate(async()=>{ const k=await caches.keys(); const fc=await caches.open('jarkale-fonts-v1'); return {k, fonts:(await fc.keys()).map(r=>r.url.split('/').pop())}; });
  ok(caches.k.includes('jarkale-fonts-v1')&&caches.fonts.length>=5,'fontit ovat pysyvässä välimuistissa ('+caches.fonts.length+' kpl)');
  const d1=await p2.evaluate(()=>{ G.activeId='x'; return jSwReload(); });
  ok(d1==='deferred','käynnissä oleva treeni lykkää uudelleenlatausta');
  const d2=await p2.evaluate(()=>{ G.activeId=null; const i=document.createElement('input'); document.body.appendChild(i); i.focus(); const r=jSwReload(); i.remove(); return r; });
  ok(d2==='deferred','kentän muokkaus lykkää uudelleenlatausta');
  ok(errs.length===0,'ei sivuvirheitä');
  // offline vielä fonttien kanssa
  await ctx2.setOffline(true);
  await p2.reload({waitUntil:'domcontentloaded'}); await p2.waitForTimeout(800);
  const off=await p2.evaluate(async()=>{ await document.fonts.ready; await document.fonts.load('600 14px Manrope').catch(()=>{}); return {nav:!!document.getElementById('nav'), m:document.fonts.check('600 14px Manrope')}; });
  ok(off.nav&&off.m,'offline-lataus onnistuu ja Manrope renderöityy');
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
