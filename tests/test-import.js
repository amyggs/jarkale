// Järkäle Tracking v2.18.103 – treenihistorian tuonti Strongista (CSV, Androidin vientimuoto). Fixture on keksitty.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path=require('path');
const URL='http://localhost:8765/index.html';
const FX=path.join(__dirname,'fixtures','strong-esimerkki.csv');
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{weight:true},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(500);

  console.log('\nJäsennys');
  const csv=fs.readFileSync(FX,'utf8');
  const r=await p.evaluate(t=>strongParse(t),csv);
  ok(!r.error&&r.workouts.length===2,'2 treeniä');
  ok(r.sets===6,'6 sarjaa (lämmittely, tauko, huomio ja matkasarja pois): '+r.sets);
  ok(r.warm===1&&r.timed===1,'lämmittely 1 ja aikasarja 1 laskettu');
  ok(r.rpeN===3&&r.workouts[0].ex[0].sets[1].rpe===8.5,'RPE tuodaan (8.5)');
  ok(r.workouts[0].ex[0].notes[0]==='Pieni stoppi rinnalla','Note-rivi = liikkeen huomio');
  ok(r.workouts[0].ex.find(e=>/Knee/.test(e.name)).sets[0].kg===null,'paino 0 = kehonpaino (null)');
  ok(r.workouts[0].date==='2026-03-02'&&new Date(r.workouts[0].start).getHours()===17,'päivä ja kellonaika paikallisena');
  const lbs=await p.evaluate(t=>strongParse(t.replace('Weight (kg)','Weight (lbs)')),csv);
  ok(lbs.lbs&&Math.abs(lbs.workouts[0].ex[0].sets[0].kg-36.29)<0.01,'paunat muunnetaan kiloiksi');
  const comma=await p.evaluate(()=>strongParse('Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n2026-01-10 10:00:00,Push,1h 5m,Bench Press (Barbell),1,70,10,,,,,\n'));
  ok(!comma.error&&comma.workouts[0].dur===3900&&!comma.unitKnown,'vanha pilkullinen muoto ja kesto "1h 5m"');
  ok(!!(await p.evaluate(()=>strongParse('a;b\n1;2').error)),'väärä tiedosto antaa virheen');

  console.log('\nTuonti ja yhdistäminen');
  await p.evaluate(()=>{ const pr=newProgram('Ohjelma'); pr.days[0].exercises.push(newEx({name:'Penkkipunnerrus',sets:3,repsMin:6})); touchProg(pr); gymSave(); setTab('treeni'); openGymSettings(); });
  await p.waitForTimeout(200);
  await p.locator('#view-treeni input[type=file]').first().setInputFiles(FX); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>GU.mode==='histimport'),'esikatselu avautuu');
  const t=await p.locator('#view-treeni').innerText();
  ok(/2 treeniä/.test(t)&&/Lämmittelysarjoja \(1\) ei tuoda/.test(t),'esikatselu kertoo määrät ja ohitetut');
  const i=await p.evaluate(()=>GU.hist.r.exNames.findIndex(x=>x.name==='Bench Press (Barbell)'));
  await p.locator('.hi-map select').nth(i).selectOption({label:'Penkkipunnerrus'});
  await p.locator('.g-save-dock button').click(); await p.waitForTimeout(400);
  const st=await p.evaluate(()=>({n:G.sessions.filter(s=>s.source==='strong').length, h:exerciseHistory(exKey('Penkkipunnerrus')).length, e:Object.keys(S.entries).length, lat:exerciseHistory(exKey('Lat Pulldown (Cable)')).length, src:G.sessions[0].exercises[0].srcName}));
  ok(st.n===2,'2 treeniä tuotu');
  ok(st.h===2&&st.src==='Bench Press (Barbell)','yhdistetty liike jatkaa Penkkipunnerruksen historiaa, alkuperäinen nimi säilyy');
  ok(st.lat===1,'yhdistämätön liike Strongin nimellä');
  ok(st.e===0,'päiväseurantaan ei merkintöjä');
  await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>Object.keys(S.entries).length===0),'käynnistyksen korjaus (gymHealLinks) ei linkitä tuotuja');
  ok(await p.evaluate(()=>{ const pr=G.programs[0]; return prevFor(pr.days[0].exercises[0].key,null)?.sets[0].kg===82.5; }),'uuden treenin ehdotus tulee Strong-historiasta (82,5)');

  console.log('\nKaksoistuonti ja peruminen');
  await p.evaluate(()=>{ setTab('treeni'); openGymSettings(); }); await p.waitForTimeout(200);
  await p.locator('#view-treeni input[type=file]').first().setInputFiles(FX); await p.waitForTimeout(400);
  ok(/Ei uusia treenejä/.test(await p.locator('.g-save-dock button').innerText())&&await p.locator('.g-save-dock button').isDisabled(),'sama tiedosto uudelleen: ei kaksoiskappaleita');
  await p.evaluate(()=>gBack()); await p.evaluate(()=>openGymSettings()); await p.waitForTimeout(200);
  ok(/Poista tuotu historia \(2 treeniä\)/.test(await p.locator('#view-treeni').innerText()),'peruminen tarjolla');
  await p.locator('.hi-undo').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>G.sessions.filter(s=>s.source).length===0&&syncTombs().s&&Object.keys(syncTombs().s).length===2),'peruminen poistaa ja merkitsee poistetuiksi (synkronointi)');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
