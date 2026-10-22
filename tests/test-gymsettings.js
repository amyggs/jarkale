// Järkäle Tracking v2.18.87 – treeniasetukset Treeni-välilehdellä, pääasetuksissa vain pääkytkin
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
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(500);

  console.log('\nPääasetukset');
  await p.evaluate(()=>{ SETTINGS_TOGGLES.training=true; setTab('asetukset'); renderAsetukset(); document.getElementById('stgl-content-training').style.display=''; });
  const main=await p.locator('#gym-settings').innerText();
  ok(/Saliohjelmat ja treeniseuranta/.test(main),'pääasetuksissa on Saliohjelmat-kytkin');
  ok(!/Ajastimen ääni|Painon − \/ \+ -askel|Koettu rasittavuus|Näyttö päällä/.test(main),'ajastin-, ääni-, askel- ja rasittavuusvalintoja ei ole pääasetuksissa');
  ok(/Treeni → Asetukset/.test(main),'ohje kertoo, mistä treeniasetukset löytyvät');
  await p.locator('#gym-settings .g-sw').first().click(); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>!gymOn()&&getComputedStyle(document.getElementById('nav-treeni')).display==='none'),'kytkin pois: Treeni-välilehti piiloutuu');
  await p.locator('#gym-settings .g-sw').first().click(); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>gymOn()&&getComputedStyle(document.getElementById('nav-treeni')).display!=='none'),'kytkin päälle: Treeni-välilehti palaa');

  console.log('\nTreeni-välilehden Asetukset');
  await p.evaluate(()=>{ setTab('treeni'); });
  await p.waitForTimeout(150);
  ok(await p.getByRole('button',{name:'Asetukset',exact:true}).first().isVisible(),'Treeni-kodissa on Asetukset-nappi (myös ilman ohjelmaa)');
  await p.locator('#view-treeni .tr-pill',{hasText:'Asetukset'}).click(); await p.waitForTimeout(150);
  let t=await p.locator('#view-treeni').innerText();
  ok(/Treenin asetukset/.test(t)&&/Näyttö päällä treenin ajan/.test(t)&&/Käynnistä tauko automaattisesti/.test(t)&&/Ajastimen ääni/.test(t)&&/Ajastimen värinä/.test(t)&&/Painon − \/ \+ -askel/.test(t)&&/Koettu rasittavuus/.test(t),'näkymässä kaikki treeniasetukset selityksineen');
  ok(!/Saliohjelmat ja treeniseuranta/.test(t),'pääkytkin ei ole tässä näkymässä');
  await p.locator('#g-settings-body .g-set-row',{hasText:'Ajastimen ääni'}).locator('.g-sw').click(); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>gymCfg().sound===false&&GU.mode==='settings'),'kytkin tallentuu ja näkymä pysyy auki');
  ok(!/Hiljainen/.test(await p.locator('#view-treeni').innerText()),'äänen ollessa pois äänitasot piiloutuvat');
  await p.locator('#g-settings-body .g-seg button',{hasText:'RPE'}).click(); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>gymCfg().effort==='rpe'),'rasittavuuden valinta tallentuu');
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('seuranta-settings')).gym.effort==='rpe'),'ja päätyy localStorageen');
  await p.locator('.g-back').click(); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>GU.mode==='home'),'paluulinkki vie Treeni-kotiin');
  await p.evaluate(()=>openGymSettings()); await p.waitForTimeout(100);
  await p.evaluate(()=>{ history.back(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>GU.mode==='home'&&S.tab==='treeni'),'Androidin takaisin-ele sulkee asetusnäkymän ja jää Treeniin');

  console.log('\nMuutos näkyy treenissä');
  await p.evaluate(()=>{ const pr=newProgram('Pitkä ohjelman nimi kokeeksi'); pr.days[0].exercises.push(newEx({name:'Penkki',sets:2,repsMin:8,repsMax:10,weight:60})); touchProg(pr); gBack(); startSession(pr.id,pr.days[0].id); });
  await p.fill('[data-set="0-0"] input[data-f="kg"]','60'); await p.fill('[data-set="0-0"] input[data-f="reps"]','8'); await p.locator('[data-set="0-0"] .ck').click(); await p.waitForTimeout(100);
  ok(await p.locator('.set-eff .lb').first().innerText()==='RPE','Treeniasetuksista valittu RPE näkyy sarjan alla');
  await p.evaluate(()=>{ finishSession(true); });

  console.log('\nKapea näyttö');
  await p.setViewportSize({width:360,height:800});
  await p.evaluate(()=>{ gBack(); renderGym(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360&&[...document.querySelectorAll('#view-treeni .view-hero .tr-pill')].every(e=>e.getBoundingClientRect().right<=360)),'Treeni-kodin napit mahtuvat 360 px:lle pitkällä ohjelman nimellä');
  await p.evaluate(()=>openGymSettings()); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360&&[...document.querySelectorAll('#g-settings-body *')].every(e=>e.getBoundingClientRect().right<=361)),'asetusnäkymä mahtuu 360 px:lle');

  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
