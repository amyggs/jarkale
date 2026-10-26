// Järkäle Tracking v2.18.113 – Strongin "Jaa treeni" -tekstin tuonti ohjelmaksi (keksitty esimerkki fixtures/strong-jako-esimerkki.txt)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const URL='http://localhost:8765/index.html';
const TXT=fs.readFileSync(path.join(__dirname,'fixtures','strong-jako-esimerkki.txt'),'utf8');
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(300);

  console.log('\nJäsennys');
  const r=await p.evaluate(t=>{ const pv=parseProgramText(t); return {source:pv.source,days:pv.map(d=>({name:d.name,ex:d.exercises.map(e=>({name:e.name,goal:goalTxt(e),unp:e.unparsed}))})),skipped:pv.skipped}; },TXT);
  ok(r.source==='strong','tunnistetaan Strongin jakotekstiksi');
  ok(r.days.length===1&&r.days[0].name==='Jalkapäivä','yksi treenipäivä, nimi otsikosta: '+r.days.map(d=>d.name).join(','));
  const ex=Object.fromEntries((r.days[0]||{ex:[]}).ex.map(e=>[e.name,e.goal]));
  ok(Object.keys(ex).length===5,'5 liikettä: '+Object.keys(ex).join(' | '));
  ok(ex['Squat (Barbell)']==='3 × 6–8 · 85 kg','lämmittely ohitetaan, 3 työsarjaa, toistoväli ja raskain paino: '+ex['Squat (Barbell)']);
  ok(ex['Triceps Pushdown (Cable - Straight Bar)']==='3 × 10–12 · 30 kg','" - " nimessä säilyy: '+ex['Triceps Pushdown (Cable - Straight Bar)']);
  ok(ex['Leg Press']==='2 × 12 · 100 kg','paunat kiloiksi (220 lb ≈ 100 kg): '+ex['Leg Press']);
  ok(ex['Pull Up']==='2 × 6–8','kehonpainoliike ilman painoa: '+ex['Pull Up']);
  ok(ex['Plank']==='1 sarja','aikasarja: sarjamäärä ilman toistoja: '+ex['Plank']);
  ok(!Object.keys(ex).some(n=>/strongapp|http|2026/.test(n)),'@strongapp, linkki ja päiväys eivät tule liikkeiksi');
  ok(r.skipped.some(l=>/@strongapp/.test(l))&&r.skipped.some(l=>/2026/.test(l)),'ohitetut rivit näytetään esikatselussa');

  console.log('\nTavallinen ohjelmateksti ennallaan');
  const n=await p.evaluate(()=>{ const pv=parseProgramText("1 Rinta\nPenkkipunnerrus 3 * 8 - 12\nVipunosto 4x10\n\n2 Selkä\nYlätalja 3 * 6 - 8"); return {src:pv.source||null,days:pv.length,g:goalTxt(pv[0].exercises[0])}; });
  ok(n.src===null&&n.days===2&&n.g==='3 × 8–12','tavallinen tuonti ei mene Strong-polulle');

  console.log('\nKäyttöliittymä');
  await p.evaluate(()=>{ setTab('treeni'); GU.mode='import'; GU.importText=''; GU.importPreview=null; renderGym(); }); await p.waitForTimeout(200);
  await p.locator('#g-import').fill(TXT); await p.locator('button',{hasText:'Esikatsele'}).click(); await p.waitForTimeout(250);
  const ui=await p.locator('#view-treeni').innerText();
  ok(/Tunnistettu Strongin jakoteksti/.test(ui),'esikatselu kertoo tunnistuksesta');
  ok(/päiväys, linkit ja muut rivit ilman sarjoja/.test(ui),'ohitettujen rivien selite');
  await p.locator('button',{hasText:'Tallenna uudeksi ohjelmaksi'}).click(); await p.waitForTimeout(300);
  const pr=await p.evaluate(()=>{ const x=G.programs[G.programs.length-1]; return {name:x.name,n:x.days[0].exercises.length}; });
  ok(pr.name==='Jalkapäivä'&&pr.n===5,'ohjelma tallentuu, nimi treenin otsikosta: '+pr.name);
  await p.evaluate(()=>{ GU.mode='import'; GU.importText=''; GU.importPreview=null; renderGym(); }); await p.waitForTimeout(150);
  await p.locator('#g-import').fill(TXT); await p.locator('button',{hasText:'Esikatsele'}).click(); await p.waitForTimeout(200);
  await p.locator('button',{hasText:'Tallenna uudeksi ohjelmaksi'}).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>G.programs[G.programs.length-1].name==='Jalkapäivä 2'),'toinen tuonti numeroidaan');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
