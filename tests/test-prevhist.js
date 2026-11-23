// v2.18.189: aiemmat kerrat treenin aikana Viimeksi-rivin alla, valinta muistetaan, koko historia ja paluu treeniin
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));localStorage.setItem('jarkale-news-seen','["x"]');localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{training:true},gym:{enabled:true}}));});
  await p.reload(); await p.waitForFunction(()=>typeof prevHist==='function'); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ const pr=newProgram('P'); [['Penkki',3],['Soutu',3],['Kyykky',3]].forEach(([n,c])=>pr.days[0].exercises.push(newEx({name:n,sets:c,repsMin:8}))); touchProg(pr); gymSave();
    const kg=[70,72.5,72.5,75,75,77.5];
    for(let i=0;i<6;i++){ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-(40-i*6)*864e5).toISOString().slice(0,10);
      s.exercises.forEach((e,j)=>{ if(j===1&&i<5) { e.skipped=true; return; } e.sets.forEach(r=>{r.kg=kg[i];r.reps=8;r.done=true;}); }); finishSession(true); }
    await startSession(pr.id,pr.days[0].id); setTab('treeni'); });
  await p.waitForTimeout(300);
  const c0=await p.evaluate(()=>({t:document.querySelectorAll('.ex-prev-t').length,ph:document.querySelectorAll('.ex-ph').length}));
  ok(c0.t===2&&c0.ph===0,'oletuksena kiinni; avausrivi vain liikkeellä, jolla on aiempia kertoja ('+c0.t+')');
  await p.locator('.ex-prev-t').first().click(); await p.waitForTimeout(150);
  const rows=await p.evaluate(()=>[...document.querySelectorAll('.ex-ph')[0].querySelectorAll(':scope>div')].map(d=>d.textContent.replace(/\s+/g,' ').trim()));
  ok(rows.length===4,'neljä aiempaa kertaa Viimeksi-rivin alla ('+rows.length+')');
  ok(/75 kg/.test(rows[0])&&/72,5 kg/.test(rows[3])&&!/77,5/.test(rows.join('')),'uusimmasta vanhimpaan, Viimeksi-kerta ei toistu ('+rows[0]+' … '+rows[3]+')');
  ok(await p.evaluate(()=>localStorage.getItem('jarkale-prevhist')==='1'),'valinta tallessa');
  await p.reload(); await p.waitForTimeout(400); await p.evaluate(()=>setTab('treeni')); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>document.querySelectorAll('.ex-ph').length===2),'auki myös uudelleenavauksen jälkeen');
  // koko historia → liikkeen sivu → takaisin treeniin
  await p.evaluate(()=>{ document.getElementById('view-treeni').scrollTop=120; });
  await p.locator('.ex-ph .g-link').first().click(); await p.waitForTimeout(200);
  const ex=await p.evaluate(()=>({m:GU.mode,t:document.getElementById('view-treeni').innerText}));
  ok(ex.m==='exercise'&&/Kaikki kerrat/i.test(ex.t),'Koko historia avaa liikkeen sivun');
  await p.evaluate(()=>gBack()); await p.waitForTimeout(200);
  const back=await p.evaluate(()=>({m:GU.mode,sid:GU.sessionId,act:G.activeId}));
  ok(back.m==='session'&&back.sid===back.act,'takaisin käynnissä olevaan treeniin, ei Treeni-etusivulle');
  // listalta avattu liike palaa listaan kuten ennen
  await p.evaluate(()=>{ GU.mode='home'; renderGym(); gOpenEx(exKey('Penkki')); gBack(); });
  ok(await p.evaluate(()=>GU.mode==='home'),'listalta avattu liike palaa listaan');
  // sulkeminen
  await p.evaluate(()=>openSession(G.activeId)); await p.waitForTimeout(150);
  await p.locator('.ex-prev-t').first().click(); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>document.querySelectorAll('.ex-ph').length===0&&localStorage.getItem('jarkale-prevhist')==='0'),'uusi napautus sulkee ja muistaa');
  // v2.18.190: napautettu rivi pysyy paikallaan, vaikka yläpuolisetkin kortit kasvavat
  await p.evaluate(()=>{ localStorage.setItem('jarkale-prevhist','0'); renderGym(); });
  await p.waitForTimeout(150);
  const pos=await p.evaluate(async()=>{ const els=[...document.querySelectorAll('.ex-prev-t')]; const el=els[els.length-1]; const id=el.dataset.ex;
    el.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,50)); const y0=el.getBoundingClientRect().top; el.click(); await new Promise(r=>setTimeout(r,50));
    const y1=document.querySelector(`.ex-prev-t[data-ex="${id}"]`).getBoundingClientRect().top; return {n:els.length,y0:Math.round(y0),y1:Math.round(y1)}; });
  ok(pos.n>=2&&Math.abs(pos.y0-pos.y1)<=2,'alemman liikkeen rivi pysyy paikallaan avattaessa ('+pos.n+' riviä, '+pos.y0+' → '+pos.y1+')');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
