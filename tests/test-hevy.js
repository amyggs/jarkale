// Järkäle Tracking v2.18.115 – treenihistorian tuonti Hevystä (keksitty esimerkki fixtures/hevy-esimerkki.csv)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const URL='http://localhost:8765/index.html';
const CSV=fs.readFileSync(path.join(__dirname,'fixtures','hevy-esimerkki.csv'),'utf8');
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
  const r=await p.evaluate(t=>{ const r=histParse(t); return {app:r.app,err:r.error,n:r.workouts&&r.workouts.length,w:r.workouts&&r.workouts.map(w=>({date:w.date,dur:w.dur,name:w.name,notes:w.notes,ex:w.ex.map(e=>({n:e.name,s:e.sets.map(x=>`${x.kg}x${x.reps}${x.rpe?'@'+x.rpe:''}`).join(','),notes:e.notes.join('|')}))})),warm:r.warm,timed:r.timed,sets:r.sets,rpeN:r.rpeN}; },CSV);
  ok(r.app==='hevy'&&!r.err,'tunnistetaan Hevyn vienniksi');
  ok(r.n===2&&r.w[0].date==='2026-10-12'&&r.w[1].date==='2026-10-14','kaksi treeniä, päivät muodosta "12 Oct 2026, 17:30"');
  ok(r.w[0].dur===65*60&&r.w[0].name==='Push','kesto alku- ja loppuajasta (65 min), nimi');
  const bench=r.w[0].ex.find(e=>/Bench/.test(e.n));
  ok(bench&&bench.s==='80x8@8,80x6@10','lämmittely pois, failure-sarja mukaan, RPE: '+(bench&&bench.s));
  ok(bench&&bench.notes==='Leveä ote','liikkeen huomio');
  ok(r.w[0].ex.some(e=>e.n==='Triceps Pushdown (Cable - Straight Bar)'&&e.s==='25x12,15x10'),'pudotussarja mukaan, nimi kokonaan');
  const ds=await p.evaluate(t=>{ const r=histParse(t); const e=r.workouts[0].ex.find(x=>/Triceps/.test(x.name)); return {k:e.sets.map(x=>x.kind||'-').join(','),drops:r.drops,sets:r.sets}; },CSV);
  ok(ds.k==='-,ds'&&ds.drops===1&&ds.sets===6,'Hevyn dropset tuodaan DS-lisärivinä, ei työsarjana: '+JSON.stringify(ds));
  ok(!r.w[0].ex.some(e=>/Treadmill/.test(e.n))&&r.timed===1&&r.warm===1,'matka-/aikasarja ja lämmittely lasketaan ohitetuiksi');
  ok(r.w[1].ex.some(e=>e.n==='Pull Up'&&e.s==='nullx8'),'kehonpainosarja ilman kiloja');
  const lb=await p.evaluate(t=>{ const r=histParse(t.replace('"weight_kg"','"weight_lbs"').replace(',"warmup",40,10',',"warmup",88,10').replace(',"normal",80,8,,,8',',"normal",176,8,,,8')); return {lbs:r.lbs,kg:r.workouts[0].ex[0].sets[0].kg}; },CSV);
  ok(lb.lbs&&Math.abs(lb.kg-79.83)<0.01,'paunat kiloiksi (176 lb = 79,83 kg)');
  ok(await p.evaluate(()=>/Strongin viennille/.test(histParse('a,b\n1,2').error||'')),'tuntematon tiedosto: Strongin virheilmoitus kuten ennen');

  console.log('\nTuonti');
  await p.evaluate(t=>{ const r=histParse(t); const known=knownExercises(), map={}; r.exNames.forEach(x=>map[x.name]=""); GU.hist={r,map,file:'workout_data.csv'}; GU.mode='histimport'; setTab('treeni'); renderGym(); },CSV); await p.waitForTimeout(200);
  const ui=await p.locator('#view-treeni').innerText();
  ok(/Tuo historia Hevystä/.test(ui)&&/Hevyn historia jatkaa/.test(ui),'näkymä puhuu Hevystä');
  ok(/Pudotussarjat \(1\) tuodaan lisäriveinä/.test(ui)&&/Lämmittelysarjoja \(1\) ei tuoda/.test(ui)&&/Aika- ja matkasarjoja \(1\) ei tuoda/.test(ui),'ohitetut sarjat kerrotaan');
  await p.locator('button',{hasText:'Tuo 2 treeniä'}).click(); await p.waitForTimeout(300);
  const s=await p.evaluate(()=>G.sessions.filter(x=>x.importBatch).map(x=>({src:x.source,prog:x.programName,day:x.dayName,id:x.importId})));
  ok(s.length===2&&s.every(x=>x.src==='hevy'&&x.prog==='Hevy'),'treenit tallentuvat lähteellä hevy');
  ok(await p.evaluate(()=>!Object.values(S.entries).some(e=>e.training_done)),'päiväseurantaan ei merkintöjä');
  await p.evaluate(t=>{ const r=histParse(t); GU.hist={r,map:{},file:'x.csv'}; GU.mode='histimport'; renderGym(); },CSV); await p.waitForTimeout(150);
  ok(/2 treeniä on jo tuotu aiemmin/.test(await p.locator('#view-treeni').innerText()),'kaksoistuonti estetään');
  await p.evaluate(()=>{ GU.mode='settings'; renderGym(); }); await p.waitForTimeout(150);
  ok(/Hevyssä Settings → Export & Import Data/.test(await p.locator('#view-treeni').innerText()),'asetuksissa ohje Hevyn viennille');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
