// Järkäle Tracking v2.18.92 – varmuuskopiomuistutus Treeni-kodissa ja napin kohde (Drive-osio)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block',acceptDownloads:true});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let downloads=0; p.on('download',()=>downloads++);
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1');
    localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{},gym:{enabled:true}}));
    localStorage.setItem('jarkale-fb-later',String(Date.now())); /* v2.18.102: ensimmäisen varmuuskopion kortti ohitettu, testataan tavallinen muistutus */ });
  await p.reload(); await p.waitForTimeout(500);
  const mk=n=>p.evaluate(n=>{
    const pr=G.programs[0]||newProgram('T'); if(!pr.days[0].exercises.length) pr.days[0].exercises.push(newEx({name:'Penkki',sets:2})); touchProg(pr);
    for(let i=n;i>=1;i--){
      const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10);
      startSession(pr.id,pr.days[0].id);
      const s=gSession(G.activeId); s.date=d; s.startedAt=Date.now()-i*864e5;
      s.exercises[0].sets.forEach(x=>{x.kg=50;x.reps=8;x.done=true;}); finishSession(true);
    }
    GU.mode='home'; setTab('treeni'); renderGym();
  },n);
  const nudge=()=>p.locator('.bk-nudge').count();

  console.log('\nEhdot');
  await mk(2); await p.waitForTimeout(150);
  ok(await nudge()===0,'2 treeniä: ei muistutusta');
  await mk(2); await p.waitForTimeout(150);
  ok(await nudge()===1,'4 treeniä, ei varmuuskopiota: muistutus Treeni-kodissa');
  ok(/Ei varmuuskopiota vielä/.test(await p.locator('.bk-nudge').innerText()),'teksti: Ei varmuuskopiota vielä');
  await p.evaluate(()=>{ localStorage.setItem('lastExport',String(Date.now()-3*864e5)); renderGym(); }); await p.waitForTimeout(100);
  ok(await nudge()===0,'varmuuskopio 3 pv sitten: ei muistutusta');
  await p.evaluate(()=>{ localStorage.setItem('lastExport',String(Date.now()-9*864e5)); renderGym(); }); await p.waitForTimeout(100);
  ok(await nudge()===1&&/Edellinen 9 pv sitten/.test(await p.locator('.bk-nudge').innerText()),'varmuuskopio 9 pv sitten: muistutus "Edellinen 9 pv sitten"');
  await p.evaluate(()=>{ localStorage.removeItem('lastExport'); localStorage.setItem('jarkale-sync',JSON.stringify({enabled:true,lastSyncAt:Date.now()-3600e3})); renderGym(); }); await p.waitForTimeout(100);
  ok(await nudge()===0,'synkronointi tunti sitten: ei muistutusta');
  await p.evaluate(()=>{ localStorage.removeItem('jarkale-sync'); renderGym(); }); await p.waitForTimeout(100);

  console.log('\nKesken olevan treenin aikana ei muistutusta');
  await p.evaluate(()=>{ const pr=G.programs[0]; startSession(pr.id,pr.days[0].id); GU.mode='home'; setTab('treeni'); renderGym(); }); await p.waitForTimeout(150);
  ok(await nudge()===0,'aktiivinen treeni: ei muistutusta kodissa');
  await p.evaluate(()=>{ finishSession(true); GU.mode='home'; renderGym(); }); await p.waitForTimeout(150);

  console.log('\nSulje ja siirtymä');
  ok(await nudge()===1,'muistutus takaisin treenin jälkeen');
  await p.locator('.bk-nudge button').click(); await p.waitForTimeout(100);
  ok(await nudge()===0,'× piilottaa muistutuksen');
  await p.evaluate(()=>renderGym()); await p.waitForTimeout(100);
  ok(await nudge()===0,'pysyy piilossa uudelleenpiirrossa (istunnon ajan)');
  await p.evaluate(()=>{ GU.bkHide=false; renderGym(); }); await p.waitForTimeout(100);
  await p.locator('.bk-nudge').click(); await p.waitForTimeout(700);
  ok(await p.evaluate(()=>S.tab==='asetukset'),'napautus avaa Asetukset');
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('stgl-content-data')).display!=='none'),'Varmuuskopiot-osio auki');
  ok(/Yhdistä Google Driveen/.test(await p.locator('#stgl-content-data').innerText()),'osiossa Yhdistä Google Driveen');
  ok(downloads===0,'ei lataa tiedostoa suoraan');

  console.log('\nKirjaa-välilehden muistutus');
  await p.evaluate(()=>{ setTab('log'); }); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(700); await p.evaluate(()=>{ setTab('log'); }); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('backup-reminder')).display)!=='none','Kirjaa näyttää muistutuksen');
  await p.locator('#backup-reminder').click(); await p.waitForTimeout(700);
  ok(await p.evaluate(()=>S.tab==='asetukset')&&await p.evaluate(()=>getComputedStyle(document.getElementById('stgl-content-data')).display!=='none'),'Kirjaa-muistutus avaa myös Varmuuskopiot-osion');
  ok(downloads===0,'eikä lataa tiedostoa');

  console.log('\nEnsimmäisen varmuuskopion kortti (v2.18.102)');
  await p.evaluate(()=>{ localStorage.removeItem('lastExport'); localStorage.removeItem('jarkale-sync'); localStorage.removeItem('jarkale-fb-later'); GU.bkHide=false; GU.mode='home'; setTab('treeni'); renderGym(); }); await p.waitForTimeout(200);
  ok(await p.locator('#view-treeni .fb-card').count()===1,'Treeni-koti: kortti näkyy, kun varmuuskopiota ei ole koskaan tehty');
  ok(await nudge()===0,'ei samaan aikaan pientä muistutusta');
  ok(/Yhdistä Google Driveen/.test(await p.locator('#view-treeni .fb-card').innerText()),'kortissa Yhdistä Google Driveen');
  await p.evaluate(()=>setTab('log')); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('first-backup')).display!=='none'),'Kirjaa: kortti näkyy');
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('backup-reminder')).display)==='none','Kirjaa: pieni muistutus piilossa');
  await p.locator('#first-backup .fb-later').click(); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('first-backup')).display)==='none'&&await p.evaluate(()=>!!localStorage.getItem('jarkale-fb-later')),'Myöhemmin piilottaa ja muistaa');
  await p.evaluate(()=>{ localStorage.setItem('jarkale-fb-later',String(Date.now()-4*864e5)); renderLog(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('first-backup')).display)!=='none','palaa 3 vuorokauden jälkeen');
  await p.evaluate(()=>{ localStorage.setItem('lastExport',String(Date.now())); renderLog(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('first-backup')).display)==='none','varmuuskopion jälkeen ei korttia');

  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
