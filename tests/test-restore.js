// Järkäle Tracking v2.18.81 – nollaus ja palautus synkronoinnin kanssa, turvakopio
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
  const seed=async()=>{
    await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
      localStorage.setItem('seuranta-settings',JSON.stringify({gender:'male',palette:'ampiainen',theme:'light',profile:{height:190,age:42},gym:{enabled:true}}));
      const old=new Date(Date.now()-5*864e5).toISOString(), now=new Date().toISOString();
      localStorage.setItem('seuranta-entries',JSON.stringify({
        '2026-09-01':{date:'2026-09-01',weight:90,created_at:now,updated_at:now},
        '2026-09-02':{date:'2026-09-02',weight:89,created_at:now,updated_at:now}}));
      localStorage.setItem('seuranta-meas',JSON.stringify([{date:'2026-09-01',waist:90,updated_at:now}]));
      localStorage.setItem('jarkale-sync',JSON.stringify({enabled:true,lastSyncAt:Date.now()-1000,dirtyAt:0,email:'a@b.c'}));
    });
    await p.reload(); await p.waitForTimeout(500);
  };

  console.log('\nNollaus synkronoinnin kanssa');
  await seed();
  const remoteBefore=await p.evaluate(()=>JSON.parse(JSON.stringify(syncSnapshot())));
  await p.evaluate(()=>resetAllData()); await p.waitForTimeout(200);
  const r1=await p.evaluate(rb=>{ const m=syncMerge(syncSnapshot(),rb,true); return {local:Object.keys(S.entries).length, merged:Object.keys(m.entries).length, mmeas:m.measurements.length, safety:!!localStorage.getItem('jarkale-safety-copy')}; },remoteBefore);
  ok(r1.local===0,'nollaus tyhjentää paikalliset kirjaukset');
  ok(r1.merged===0&&r1.mmeas===0,'Driven vanha kopio ei palauta nollattua dataa synkronoinnissa');
  ok(r1.safety,'turvakopio tallentui');
  ok(await p.locator('#undo-toast.on').isVisible(),'Kumoa-ilmoitus näkyy');
  await p.locator('#undo-toast button').click(); await p.waitForTimeout(200);
  const r2=await p.evaluate(rb=>{ const m=syncMerge(syncSnapshot(),rb,true); return {local:Object.keys(S.entries).sort().join(), merged:Object.keys(m.entries).length, meas:S.measurements.length}; },remoteBefore);
  ok(r2.local==='2026-09-01,2026-09-02'&&r2.meas===1,'Kumoa palauttaa kirjaukset ja mittaukset');
  ok(r2.merged===2,'palautus säilyy myös synkronoinnissa');

  console.log('\nVarmuuskopion palautus synkronoinnin kanssa');
  await seed();
  // paikallinen: 09-01 uudempi (90 kg), 09-02 lisäksi; varmuuskopio: vain 09-01 vanhalla arvolla ja 09-03
  const remote2=await p.evaluate(()=>JSON.parse(JSON.stringify(syncSnapshot())));
  const old=new Date(Date.now()-9*864e5).toISOString();
  const backup={version:6,exported:old,entries:{'2026-09-01':{date:'2026-09-01',weight:80,created_at:old,updated_at:old},'2026-09-03':{date:'2026-09-03',weight:79,created_at:old,updated_at:old}},measurements:[],settings:{}};
  // 09-03 on poistettu aiemmin → tombstone
  await p.evaluate(()=>{ syncTomb('e','2026-09-03'); });
  await p.setInputFiles('input[type=file][onchange^="importData"]',{name:'b.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await p.waitForTimeout(500);
  const r3=await p.evaluate(rb=>{ const m=syncMerge(syncSnapshot(),rb,true); return {local:Object.keys(S.entries).sort().join(), w1:S.entries['2026-09-01']&&S.entries['2026-09-01'].weight, merged:Object.keys(m.entries).sort().join(), mw1:m.entries['2026-09-01']&&m.entries['2026-09-01'].weight, safety:!!localStorage.getItem('jarkale-safety-copy')}; },remote2);
  ok(r3.local==='2026-09-01,2026-09-03'&&r3.w1===80,'palautus korvaa paikallisen datan ('+r3.local+')');
  ok(r3.mw1===80,'Driven uudempi kopio ei ylikirjoita palautettua kirjausta');
  ok(!r3.merged.includes('2026-09-02'),'kirjaus, jota varmuuskopiossa ei ole, ei palaa Drivesta');
  ok(r3.merged.includes('2026-09-03'),'aiemmin poistettu kirjaus palautuu varmuuskopiosta');
  ok(r3.safety,'turvakopio otettiin ennen palautusta');

  console.log('\nTurvakopion palautus');
  ok(await p.evaluate(()=>{ renderAsetukset(); return /Palauta tila ennen/.test(document.getElementById('safety-copy-row').innerText); }),'Asetuksissa näkyy turvakopion palautus');
  await p.evaluate(()=>restoreSafetyCopy()); await p.waitForTimeout(300);
  const r4=await p.evaluate(()=>({k:Object.keys(S.entries).sort().join(), w1:S.entries['2026-09-01'].weight}));
  ok(r4.k==='2026-09-01,2026-09-02'&&r4.w1===90,'turvakopio palauttaa tilan ennen palautusta');

  console.log('\nIlman synkronointia');
  await seed(); await p.evaluate(()=>{ localStorage.setItem('jarkale-sync',JSON.stringify({enabled:false})); }); await p.reload(); await p.waitForTimeout(400);
  const upd=await p.evaluate(()=>S.entries['2026-09-01'].updated_at);
  await p.setInputFiles('input[type=file][onchange^="importData"]',{name:'b.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:6,exported:old,entries:{'2026-09-01':{date:'2026-09-01',weight:70,created_at:old,updated_at:old}}}))});
  await p.waitForTimeout(400);
  const r5=await p.evaluate(()=>({w:S.entries['2026-09-01'].weight, u:S.entries['2026-09-01'].updated_at}));
  ok(r5.w===70&&/^20/.test(r5.u)&&Date.parse(r5.u)<Date.now()-8*864e5,'ilman synkronointia aikaleimat säilyvät sellaisinaan');

  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
