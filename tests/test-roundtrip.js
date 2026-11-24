// v2.18.198: varmuuskopion täysi kierros. Kaikki tietotyypit (päiväkirjaukset kaikkine kenttineen, mitat, asetukset, ohjelmat,
// treenit R/P- ja DS-riveineen, RPE, huomiot, liikkeiden kiinnitykset ja ryhmät, yhdistetty liike, arkistoitu ohjelma, tuotu treeni)
// → varmuuskopiotiedosto → tyhjä selain → palautus tiedostovalinnalla → kenttäkohtainen vertailu, myös uudelleenkäynnistyksen jälkeen.
// Lisäksi vanhan muodon varmuuskopio (versio 1: pelkät kirjaukset, vanha yksittäinen kipukenttä) palautuu.
const { chromium, devices } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const URL='http://localhost:8765/index.html';
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const errs=[];
  const page=async()=>{ const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block',acceptDownloads:true}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
    await ctx.addInitScript(()=>{ window.__jdlgAuto=true; }); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); return p; };

  // ── A: rikas data sovelluksen omilla toiminnoilla
  const A=await page(); await A.goto(URL);
  await A.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',palette:'lasi',profile:{height:190,age:42,sex:'m'},goals:{sleepHours:7.5,workoutsPerWeek:4},
      tracking:{weight:true,sleep:true,steps:true,recovery:true,motivation:true,training:true,notes:true,injury:true,cardio:true,bp:true,blood_sugar:true,migraine:true,menstrual:true,body:true},gym:{enabled:true,autoRest:true}})); });
  await A.reload(); await A.waitForFunction(()=>typeof autoSaveEntry==='function'); await A.waitForTimeout(400);
  await A.evaluate(async()=>{
    const d=i=>new Date(Date.now()-i*864e5).toISOString().slice(0,10);
    for(let i=1;i<=6;i++){
      Object.assign(S,{weight:90-i/10,sleep:7+i/6,steps:8000+i*111,recovery:1+i%5,motivation:1+(i+2)%5,bp_sys:120+i,bp_dia:80-i,notes:`päivä ${i} – ääkköset ja "lainaus"`,injury_notes:i%2?'olkapää jäykkä':'',
        injury_items:i%2?[{bodyPart:'shoulder_left',painLevel:2,direction:'same',resolved:false},{bodyPart:'elbow_right',painLevel:1,direction:'better',resolved:i===5}]:[],
        blood_sugar:5+i/10,menstrual_start:false,menstrual_pain:null,menstrual_mood:null,menstrual_bloating:false,migraine:i===3,migraine_severity:i===3?3:null,
        training_done:i%2===0,training_load:i%2===0?4:null,training_type:i%2===0?TRAINING_TYPES[0].id:'',cardio_done:i===4,cardio_type:i===4?CARDIO_TYPES[0].id:'',cardio_duration:i===4?35:null,cardio_hr_min:i===4?120:null,cardio_hr_max:i===4?155:null,
        training_notes:i%2===0?'hyvä veto':'',training_outcome:i%2===0?'better':null,training_modifications:i%2===0?[TRAINING_MODIFICATIONS[0].id]:[],day_factors:i===2?[DAY_FACTORS[0].id,DAY_FACTORS[1].id]:[],
        field_changed_at:{weight:new Date().toISOString()},planned_lightening:i===6?true:null});
      S.date=d(i); LAST_SAVED_JSON=''; autoSaveEntry(d(i));
    }
    S.measurements=[{date:d(20),waist:92.5,chest:105,neck:40,hip:100,arm:38.5,thigh:60,skinfold_chest:10,skinfold_abd:20,skinfold_thigh:15,updated_at:new Date().toISOString()},{date:d(2),waist:91,chest:106,neck:40,updated_at:new Date().toISOString()}];
    S.settings.meds=[{id:'m1',name:'D-vitamiini',days:[1,3,5],time:'08:00'}];
    saveAll();
    // sali
    const pr=newProgram('Ohjelma A'); pr.days=gMatchImport(parseProgramText(`1 Ylävartalo
Vinopenkkipunnerrus 1 x 6-10, 1 x 8-12 + R/P + DS
Kulmasoutu 3 x 8-10
2 Alavartalo
Kyykky 140x5x3
Pohjenosto 3 x 12/10/8`)).map(({include,rest,raw,...x})=>({...x,exercises:x.exercises.map(({unparsed,match,...e})=>e)})); touchProg(pr);
    const old=newProgram('Vanha ohjelma'); old.days[0].exercises.push(newEx({name:'Pystypunnerrus',sets:3})); old.archived=true; touchProg(old); gymSave();
    for(let k=0;k<3;k++){ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=d(10-k*3); s.startedAt=Date.now()-(10-k*3)*864e5;
      s.exercises.forEach(e=>e.sets.forEach((r,j)=>{ r.kg=r.kind==='ds'?55:80+k*2.5; r.reps=r.kind==='rp'?4:8-j%2; r.done=true; if(!r.kind) r.rpe=8.5; }));
      s.exercises[0].userNote='ote leveämmäksi'; s.exercises[1].feel='heavy'; finishSession(true); }
    await startSession(pr.id,pr.days[1].id); const s2=activeSession(); s2.date=d(1); s2.exercises.forEach(e=>e.sets.forEach(r=>{r.kg=140;r.reps=5;r.done=true;})); finishSession(true);
    exMetaSet(exKey('Vinopenkkipunnerrus'),{pin:'penkki 3. reikä',group:'Rinta'});
    // yhdistetty liike: vanha nimi → uusi
    await startSession(old.id,old.days[0].id); const s3=activeSession(); s3.date=d(30); s3.exercises.forEach(e=>e.sets.forEach(r=>{r.kg=50;r.reps=10;r.done=true;})); s3.exercises[0].name='Pystypunnerrus laite'; s3.exercises[0].key=exKey('Pystypunnerrus laite'); finishSession(true);
    G.sessions.find(x=>x.id===s3.id).exercises[0].mergedFrom={key:exKey('Pystypunnerrus laite'),name:'Pystypunnerrus laite'};
    // tuotu treeni
    G.sessions.push({id:gid(),date:d(60),dayName:'Push',programId:null,source:'strong',importId:'strong:'+d(60)+'|Push',importBatch:'b1',startedAt:Date.now()-60*864e5,endedAt:Date.now()-60*864e5+3600e3,updatedAt:Date.now(),
      exercises:[{id:gid(),key:exKey('Penkki'),name:'Penkki',srcName:'Bench Press (Barbell)',goal:{sets:1},sets:[{kg:100,reps:5,done:true,rpe:9},{kind:'ds',kg:70,reps:8,done:true}],userNote:''}]});
    gymSave();
  });
  const snap=p=>p.evaluate(()=>{ const strip=o=>JSON.parse(JSON.stringify(o,(k,v)=>['updated_at','updatedAt','created_at'].includes(k)?undefined:v));
    return {entries:strip(S.entries),meas:strip(S.measurements),settings:strip({profile:S.settings.profile,goals:S.settings.goals,tracking:S.settings.tracking,meds:S.settings.meds,palette:S.settings.palette}),
      programs:strip(G.programs),sessions:strip(G.sessions),exMeta:strip(G.exMeta||{})}; });
  const before=await snap(A);
  const bj=JSON.stringify(before);
  ok(['"kind":"rp"','"kind":"ds"','"rpe":8.5','penkki 3. reikä','mergedFrom','"source":"strong"','"archived":true','injury_items','day_factors','D-vitamiini','skinfold_chest'].every(t=>bj.includes(t)),'vertailtavassa datassa R/P, DS, RPE, kiinnitys, yhdistetty liike, tuotu treeni, arkistoitu ohjelma, kivut, poikkeamat, lääkkeet ja ihopoimut');
  ok(Object.keys(before.entries).length>=6&&before.sessions.length===6&&before.programs.length===2,`lähtödata: ${Object.keys(before.entries).length} kirjausta, ${before.sessions.length} treeniä, ${before.programs.length} ohjelmaa`);

  // varmuuskopio tiedostoksi (jakovalikko pois → lataus)
  await A.evaluate(()=>{ navigator.canShare=()=>false; });
  const [dl]=await Promise.all([A.waitForEvent('download'),A.evaluate(()=>exportData())]);
  const file=path.join(os.tmpdir(),'jarkale-kierros.txt'); await dl.saveAs(file);
  const raw=fs.readFileSync(file,'utf8'); const J=JSON.parse(raw);
  ok(J.version&&J.gym&&J.entries&&J.measurements&&J.settings,'varmuuskopiossa kaikki osat (versio '+J.version+')');

  // ── B: tyhjä selain, palautus tiedostovalinnalla
  const B=await page(); await B.goto(URL);
  await B.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); });
  await B.reload(); await B.waitForFunction(()=>typeof importData==='function'); await B.waitForTimeout(300);
  await B.locator('input[type=file][onchange^="importData"]').setInputFiles(file); await B.waitForTimeout(800);
  const cmp=(a,b2,label)=>{ const diffs=[]; const walk=(x,y,pth)=>{ if(diffs.length>8) return; if(typeof x!==typeof y||Array.isArray(x)!==Array.isArray(y)){ diffs.push(pth+': '+JSON.stringify(x)+' ≠ '+JSON.stringify(y)); return; }
      if(x&&typeof x==='object'){ const ks=new Set([...Object.keys(x),...Object.keys(y||{})]); ks.forEach(k=>walk(x[k],y?y[k]:undefined,pth+'.'+k)); } else if(x!==y) diffs.push(pth+': '+JSON.stringify(x)+' ≠ '+JSON.stringify(y)); };
    walk(a,b2,label); return diffs; };
  const check=async(p,when)=>{ const after=await snap(p);
    for(const k of ['entries','meas','settings','programs','sessions','exMeta']){ const d=cmp(before[k],after[k],k); ok(d.length===0,`${when}: ${k} täsmää kentittäin${d.length?' – '+d.slice(0,4).join(' | '):''}`); } };
  await check(B,'palautuksen jälkeen');
  await B.reload(); await B.waitForTimeout(600);
  await check(B,'uudelleenkäynnistyksen jälkeen');
  const ui=await B.evaluate(()=>{ setTab('treeni'); GU.mode='home'; renderGym(); return document.getElementById('view-treeni').innerText; });
  ok(/Ohjelma A/.test(ui)&&/Ylävartalo/.test(ui),'palautettu ohjelma näkyy Treeni-välilehdellä');

  // ── C: vanhan muodon varmuuskopio (versio 1, ei salia, vanha yksittäinen kipukenttä)
  const v1={version:1,exported:'2026-06-01T08:00:00.000Z',entries:{'2026-05-30':{date:'2026-05-30',weight:91.2,sleep:7.5,recovery:4,motivation:3,notes:'vanha',injury_bodyPart:'knee_left',injury_painLevel:3,injury_direction:'worse'}},settings:{theme:'light'}};
  const f1=path.join(os.tmpdir(),'jarkale-v1.txt'); fs.writeFileSync(f1,JSON.stringify(v1));
  const C=await page(); await C.goto(URL); await C.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); }); await C.reload(); await C.waitForTimeout(300);
  await C.locator('input[type=file][onchange^="importData"]').setInputFiles(f1); await C.waitForTimeout(600); await C.reload(); await C.waitForTimeout(400);
  const c=await C.evaluate(()=>{ const e=S.entries['2026-05-30']; return {w:e&&e.weight,s:e&&e.sleep,n:e&&e.notes,inj:e?JSON.stringify(getInjuryItems(e)):''}; });
  ok(c.w===91.2&&c.s===7.5&&c.n==='vanha','vanha varmuuskopio (versio 1): kirjaus palautuu');
  ok(/knee_left/.test(c.inj)&&/"painLevel":3/.test(c.inj),'vanha yksittäinen kipukenttä luetaan kipulistaksi ('+c.inj+')');

  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close(); console.log(`\n${pass}/${pass+fail} läpi`); process.exit(fail?1:0);
})();
