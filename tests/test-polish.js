// Järkäle Tracking v2.18.102 – ulkopuolisen arvion korjaukset: aloitus, treenin tila, Mitä uutta, ilmoituksen paikka
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:412,height:915},serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  const fresh=async()=>{ await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); };
  const shown=sel=>p.evaluate(s=>{ const e=document.querySelector(s); return !!e&&getComputedStyle(e).display!=='none'; },sel);

  console.log('\nAloitus');
  await fresh();
  ok(!(await shown('#nav'))&&!(await shown('#date-nav')),'aloituksessa ei alapalkkia eikä päivämäärää');
  await p.locator('.su-choice',{hasText:'Seurata kehoa'}).click(); await p.waitForTimeout(250);
  const on=await p.evaluate(()=>Object.entries(S.settings.tracking).filter(([k,v])=>v===true).map(([k])=>k).sort().join(','));
  ok(on==='motivation,recovery,sleep,weight','perusvalinnat valmiina: '+on);
  ok(!(await p.locator('.su-all').count())&&!/Valitse kaikki ja aloita/.test(await p.locator('#setup-screen').innerText()),'"Valitse kaikki ja aloita" poistettu');
  const go=await p.evaluate(()=>{ const r=document.querySelector('.su-go').getBoundingClientRect(); return {bot:r.bottom,h:innerHeight,txt:document.querySelector('.su-go').textContent}; });
  ok(go.bot<=go.h&&/Aloita näillä · 4 valittu/.test(go.txt),'Aloita-nappi näkyy ilman vieritystä ('+Math.round(go.bot)+' ≤ '+go.h+'): '+go.txt);
  await p.locator('.su-go').click(); await p.waitForTimeout(400);
  ok(await shown('#nav')&&await shown('#date-nav'),'aloituksen jälkeen alapalkki ja päivämäärä palaavat');
  ok(await shown('#first-backup'),'aloituksen jälkeen tarjotaan varmuuskopiota');
  await p.locator('.su-choice').count().then(n=>ok(n===0,'aloitusnäkymä suljettu'));
  // Takaisin-polku: valinnat säilyvät, oletuksia ei lisätä uudelleen jos käyttäjä on jo valinnut
  await fresh();
  await p.locator('.su-choice',{hasText:'Molempia'}).click(); await p.waitForTimeout(200);
  await p.locator('.su-row',{hasText:'Paino'}).click(); await p.waitForTimeout(100);
  await p.locator('.su-back').click(); await p.waitForTimeout(100);
  await p.locator('.su-choice',{hasText:'Molempia'}).click(); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>S.settings.tracking.weight!==true&&S.settings.tracking.sleep===true),'käyttäjän poistamaa valintaa ei palauteta takaisin-polulla');

  console.log('\nKäynnissä oleva treeni');
  await fresh();
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const pr=newProgram('T'); pr.days[0].exercises.push(newEx({name:'Penkki',sets:3,repsMin:8})); touchProg(pr); gymSave(); startSession(pr.id,pr.days[0].id); GU.mode='session'; GU.sessionId=G.activeId; renderGym(); }); await p.waitForTimeout(300);
  ok(!(await shown('#nav')),'alapalkki piilossa treenin aikana');
  const gt=await p.evaluate(()=>{ const e=document.getElementById('gym-timer'); if(!e||getComputedStyle(e).display==='none') return null; const r=e.getBoundingClientRect(); return innerHeight-r.bottom; });
  ok(gt!==null&&gt<=40,'taukopalkki alareunassa ('+gt+' px)');
  await p.locator('.g-back').first().click(); await p.waitForTimeout(250);
  ok(await shown('#nav'),'"‹ Treeni" palauttaa alapalkin');
  await p.evaluate(()=>{ GU.mode='session'; GU.sessionId=G.activeId; renderGym(); setTab('log'); }); await p.waitForTimeout(200);
  ok(await shown('#nav'),'välilehden vaihto palauttaa alapalkin');
  await p.evaluate(()=>{ setTab('treeni'); }); await p.waitForTimeout(200);
  ok(!(await shown('#nav')),'paluu treeniin piilottaa taas');
  await p.evaluate(()=>{ const id=G.activeId; finishSession(true); GU.mode='session'; GU.sessionId=id; renderGym(); }); await p.waitForTimeout(200);
  ok(await shown('#nav'),'tallennetun treenin yhteenvedossa alapalkki näkyy');

  console.log('\nKaksi treeniä samana päivänä (v2.18.105)');
  await p.evaluate(async()=>{ S.settings.tracking={...(S.settings.tracking||{}),training:true}; saveAll(); const pr=G.programs[0]; await startSession(pr.id,pr.days[0].id); { const s0=gSession(G.activeId); s0.exercises[0].sets[0].kg=40; s0.exercises[0].sets[0].reps=10; s0.exercises[0].sets[0].done=true; finishSession(true); } await startSession(pr.id,pr.days[0].id); GU.mode='session'; GU.sessionId=G.activeId; const s=gSession(G.activeId); s.exercises[0].sets[0].kg=50; s.exercises[0].sets[0].reps=8; s.exercises[0].sets[0].done=true; GU.finishing=true; renderGym(); }); await p.waitForTimeout(200);
  const ft=await p.locator('.g-finish').innerText();
  ok(/Päivän rasitus, molemmat treenit/.test(ft)&&/Arvio korvaa päivän aiemman arvion/.test(ft),'toisen treenin lopetuskysely kertoo arvion koskevan päivää');
  await p.evaluate(()=>{ finishSession(true); GU.finishing=false; }); 
  await p.evaluate(()=>{ setTab('asetukset'); SETTINGS_TOGGLES.goals=true; renderAsetukset(); }); await p.waitForTimeout(150);
  ok(/Treenipäiviä viikossa/.test(await p.locator('#goals-section').innerText()),'tavoite "Treenipäiviä viikossa"');

  console.log('\nMitä uutta');
  await p.evaluate(()=>{ setTab('asetukset'); SETTINGS_TOGGLES.changelog=true; renderAsetukset(); }); await p.waitForTimeout(200);
  const n1=await p.evaluate(()=>[...document.querySelectorAll('#changelog-content > div')].length);
  ok(n1===5,'oletuksena 5 uusinta ('+n1+')');
  await p.locator('.cl-more').click(); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>[...document.querySelectorAll('#changelog-content > div')].length===CHANGELOG.length),'Näytä kaikki avaa kaikki');

  console.log('\nTallennettu-ilmoitus');
  await p.evaluate(()=>{ setTab('log'); showSavedToast(); }); await p.waitForTimeout(100);
  const tt=await p.evaluate(()=>{ const t=document.getElementById('saved-toast').getBoundingClientRect(), h=document.getElementById('header').getBoundingClientRect(); return {tb:t.bottom,hb:h.bottom}; });
  ok(tt.tb<=tt.hb+1,'ilmoitus pysyy yläpalkin korkeudella ('+Math.round(tt.tb)+' ≤ '+Math.round(tt.hb)+')');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
