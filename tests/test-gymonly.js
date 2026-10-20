// Järkäle Tracking v2.18.85 – pelkkää treeniä kirjaavan polku: Trendit, Mitat, ensimmäinen yhteenveto, tuonti, viikkorivi
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
  const fresh=async()=>{ await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500); };
  const vis=sel=>p.evaluate(s=>{ const e=document.querySelector(s); return !!e&&getComputedStyle(e).display!=='none'; },sel);

  console.log('\nPelkkä treeni: Trendit ja Mitat');
  await fresh();
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>isGymOnly()),'treenivalinta on pelkkä treeni');
  ok(!(await vis('#nav-historia')),'Mitat-välilehti on piilossa');
  ok(await vis('#nav-trendit')&&await vis('#nav-treeni'),'Trendit ja Treeni näkyvät');
  await p.evaluate(()=>setTab('trendit')); await p.waitForTimeout(300);
  let t=await p.locator('#trendit-content').innerText();
  ok(/Ei tallennettuja treenejä/.test(t)&&!/Graafit|Ei dataa|Kirjallinen yhteenveto|Kattavuus/i.test(t),'tyhjä Trendit puhuu treeneistä, ei kehoseurannasta ('+t.replace(/\n+/g,' | ').slice(0,90)+')');

  console.log('\nTuonti: nimi, Tallenna näkyvissä, kotiin');
  await p.evaluate(()=>setTab('treeni')); await p.waitForTimeout(200);
  const long=Array.from({length:6},(_,d)=>`Päivä ${'ABCDEF'[d]}\n`+Array.from({length:7},(_,i)=>`Liike ${d}${i} 3x8-10 ${20+i}`).join('\n')).join('\n\n');
  await p.getByRole('button',{name:'Liitä ohjelma tekstinä'}).click();
  await p.fill('#g-import',long);
  await p.getByRole('button',{name:'Esikatsele'}).click(); await p.waitForTimeout(300);
  const geo=await p.evaluate(()=>{ const v=document.getElementById('view-treeni').getBoundingClientRect(); const b=document.querySelector('.g-save-dock .tr-go'); const r=b.getBoundingClientRect(); const nav=document.getElementById('nav').getBoundingClientRect(); return {bot:r.bottom, top:r.top, navTop:nav.top, vh:innerHeight, scrollable:document.getElementById('view-treeni').scrollHeight>document.getElementById('view-treeni').clientHeight}; });
  ok(geo.scrollable&&geo.top>0&&geo.bot<=geo.navTop+1,'pitkällä esikatselulla Tallenna-nappi on näkyvissä ilman vieritystä ('+Math.round(geo.bot)+' ≤ '+Math.round(geo.navTop)+')');
  await p.getByRole('button',{name:'Tallenna uudeksi ohjelmaksi'}).click(); await p.waitForTimeout(300);
  const a=await p.evaluate(()=>({mode:GU.mode, name:G.programs[0].name, toast:document.getElementById('saved-toast')&&document.getElementById('saved-toast').innerText, h1:document.querySelector('#view-treeni .tr-h1')&&document.querySelector('#view-treeni .tr-h1').innerText}));
  ok(a.mode==='home'&&a.name==='Oma ohjelma'&&a.h1==='Oma ohjelma','tuonnin jälkeen Treeni-koti, nimi "Oma ohjelma"');
  ok(/Ohjelma tallennettu: Oma ohjelma/.test(a.toast||''),'ilmoitus kertoo tallennuksen ('+a.toast+')');
  await p.evaluate(()=>{ GU.mode='import'; GU.importText=''; GU.importPreview=null; renderGym(); });
  await p.fill('#g-import','Päivä X\nPenkki 3x8 60');
  await p.getByRole('button',{name:'Esikatsele'}).click();
  await p.getByRole('button',{name:'Tallenna uudeksi ohjelmaksi'}).click(); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>G.programs.map(x=>x.name).join('|')==='Oma ohjelma|Oma ohjelma 2'),'toinen tuonti numeroidaan');

  console.log('\nEnsimmäinen treeni');
  await p.evaluate(()=>{ const pr=G.programs[0]; GU.mode='home'; startSession(pr.id,pr.days[0].id); });
  await p.fill('[data-set="0-0"] input[data-f="kg"]','20'); await p.fill('[data-set="0-0"] input[data-f="reps"]','8'); await p.locator('[data-set="0-0"] .ck').click();
  await p.getByRole('button',{name:'Lopeta',exact:true}).click();
  await p.getByRole('button',{name:'Tallenna treeni'}).click(); await p.waitForTimeout(200);
  let sum=await p.locator('.g-sum').innerText();
  ok(/Ensimmäinen treeni tallennettu/.test(sum)&&!/Ei ennätyksiä/.test(sum),'ensimmäinen yhteenveto ei väitä ennätysten puuttuvan');
  ok(/alkavat näkyä/.test(sum)&&!/Nuoli:/.test(sum),'selite kertoo vertailun alkavan toisesta kerrasta');
  await p.evaluate(()=>{ setTab('trendit'); S.rangeId='d28'; renderTrendit(); }); await p.waitForTimeout(300);
  t=await p.locator('#trendit-content').innerText();
  ok(/Salitreenit/.test(t)&&/1 treeniä/.test(t)&&!/Graafit/.test(t),'Trendit näyttää treenin ('+t.replace(/\n+/g,' | ').slice(0,80)+')');
  await p.evaluate(()=>{ setTab('treeni'); const pr=G.programs[0]; GU.mode='home'; startSession(pr.id,pr.days[0].id); });
  await p.fill('[data-set="0-0"] input[data-f="kg"]','20'); await p.fill('[data-set="0-0"] input[data-f="reps"]','8'); await p.locator('[data-set="0-0"] .ck').click();
  await p.getByRole('button',{name:'Lopeta',exact:true}).click();
  await p.getByRole('button',{name:'Tallenna treeni'}).click(); await p.waitForTimeout(200);
  sum=await p.locator('.g-sum').innerText();
  ok(!/Ensimmäinen treeni tallennettu/.test(sum)&&/Ei ennätyksiä|Ennätykset/.test(sum)&&/Nuoli:/.test(sum),'toisen treenin yhteenveto on tavallinen');

  console.log('\nViikkorivin selite');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{weight:true}})); });
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(()=>{ setTab('log'); renderWeekStatus&&renderWeekStatus(S.date); });
  ok(!/kirjattu/.test(await p.locator('#week-status .ws-legend').count()?await p.locator('#week-status .ws-legend').innerText():''),'ilman kirjauksia "kirjattu"-selitettä ei näytetä');
  await p.evaluate(()=>{ const t=today(); S.entries[t]={date:t,weight:80,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}; saveAll(); renderWeekStatus(S.date); });
  ok(/kirjattu/.test(await p.locator('#week-status .ws-legend').innerText()),'kirjauksen jälkeen selite näkyy');

  console.log('\nMuilla käyttäjillä ei muutu mikään');
  await p.evaluate(()=>{ S.settings.tracking={weight:true}; S.settings.gym={enabled:true}; saveAll(); applyTrackingVisibility(); });
  ok(await p.evaluate(()=>!isGymOnly())&&await vis('#nav-historia'),'päiväseurantaa käyttävä: Mitat näkyy, ei treeni-pelkkä');
  await p.evaluate(()=>{ S.settings.tracking={}; S.measurements=[{date:'2026-09-01',waist:90}]; saveAll(); applyTrackingVisibility(); });
  ok(await vis('#nav-historia'),'jos mittauksia on jo, Mitat pysyy näkyvissä');
  await p.evaluate(()=>{ S.settings.tracking={body:true}; S.measurements=[]; saveAll(); applyTrackingVisibility(); });
  ok(await vis('#nav-historia'),'kehon seurannan päälle laitto palauttaa Mitat-välilehden');

  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
