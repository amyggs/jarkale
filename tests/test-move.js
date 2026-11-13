// Järkäle Tracking v2.18.155 – siirto omaan domainiin: vanha osoite pakkaa datan #-osaan, uusi tuo sen vahvistuksella.
// Kaksi eri originia: localhost (vanha) ja 127.0.0.1 (uusi). Data on keksittyä.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OLD='http://localhost:8765/index.html', NEW='http://127.0.0.1:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(([N])=>{ window.__jdlgAuto=true; if(location.hostname==='localhost'&&!sessionStorage.getItem('nomove')) window.__MOVE_TEST={target:N}; },[NEW]);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  // ilman testikytkintä ilmoitusta ei näy (MOVE_ON=false)
  await p.goto(OLD); await p.evaluate(()=>sessionStorage.setItem('nomove','1')); await p.reload(); await p.waitForTimeout(600);
  ok(await p.evaluate(()=>MOVE_ON===false&&!document.getElementById('move-card')),'ilmoitus piilossa, kunnes siirto kytketään päälle');
  await p.evaluate(()=>sessionStorage.removeItem('nomove'));
  // vanha osoite: keksitty historia
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('seuranta-apikey','sk-testi');
    localStorage.setItem('seuranta-settings',JSON.stringify({palette:'kaurapuuro',theme:'light',tracking:{weight:true,sleep:true,training:true,body:true},gym:{enabled:true}}));
    const E={},now=new Date().toISOString(); for(let i=1;i<=120;i++){ const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10); E[d]={date:d,weight:80+i%5*0.3,sleep:7,notes:i%7?'':'Testihuomio äöå',created_at:now,updated_at:now}; }
    localStorage.setItem('seuranta-entries',JSON.stringify(E));
    localStorage.setItem('seuranta-meas',JSON.stringify([{date:'2026-10-01',wn:90,ar:38.5},{date:'2026-11-01',wn:89}])); });
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(async()=>{ const pr=newProgram('Testiohjelma'); pr.days[0].name='Ylävartalo'; pr.days[0].exercises.push(newEx({name:'Penkkipunnerrus',sets:3,repsMin:8})); touchProg(pr); G.curProgramId=pr.id; gymSave();
    for(let k=0;k<40;k++){ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-(k*3+1)*864e5).toISOString().slice(0,10); s.exercises[0].sets.forEach(r=>{ r.kg=60+k; r.reps=8; r.done=true; }); finishSession(true); } });
  await p.reload(); await p.waitForTimeout(600);
  const card=await p.locator('#move-card').innerText().catch(()=> '');
  ok(/Järkäle on muuttanut/.test(card)&&/127\.0\.0\.1/.test(card)&&/Siirrä tiedot/.test(card),'vanhassa osoitteessa ilmoitus ja uusi osoite: '+card.replace(/\s+/g,' ').slice(0,90));
  const size=await p.evaluate(async()=>(await movePack()).length);
  ok(size>100&&size<1500000,'pakattu siirtolinkki mahtuu rajaan ('+size+' merkkiä)');
  // siirto
  await p.locator('#move-card button',{hasText:'Siirrä tiedot'}).click();
  await p.waitForURL(/127\.0\.0\.1/); await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>({host:location.hostname, hash:location.hash, e:Object.keys(S.entries).length, s:(G.sessions||[]).length, m:(S.measurements||[]).length,
    pal:S.settings.palette, note:Object.values(S.entries).find(x=>x.notes)?.notes||'', key:localStorage.getItem('seuranta-apikey'), setup:localStorage.getItem('seuranta-setup-done'), su:document.documentElement.classList.contains('su-on'), card:!!document.getElementById('move-card')}));
  ok(r.host==='127.0.0.1'&&r.hash==='','uusi osoite, #-osa poistettu osoiteriviltä');
  ok(r.e===120&&r.s===40&&r.m===2,'kaikki tiedot siirtyivät: '+r.e+' kirjausta, '+r.s+' treeniä, '+r.m+' mittausta');
  ok(r.pal==='kaurapuuro'&&r.note==='Testihuomio äöå','asetukset ja ääkköset säilyivät');
  ok(r.key===null,'API-avain ei siirry');
  ok(r.setup==='1'&&!r.su&&!r.card,'uudessa osoitteessa ei aloitusta eikä muuttoilmoitusta');
  // rikkinäinen linkki
  await p.goto(NEW+'#siirto=z1.rikki'); await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>location.hash===''&&Object.keys(S.entries).length===120),'rikkinäinen linkki ei muuta tietoja');
  // kieltäytyminen
  await p.goto(OLD); await p.waitForTimeout(500); const code=await p.evaluate(async()=>movePack());
  await p.evaluate(()=>window.__jdlgAuto=false);
  await p.goto(NEW); await p.waitForTimeout(400); await p.evaluate(()=>{ S.entries={}; saveAll(); window.__jdlgAuto=false; });
  await p.goto(NEW+'#siirto='+code); await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>Object.keys(S.entries).length===0),'vahvistuksen peruminen ei tuo tietoja');
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
