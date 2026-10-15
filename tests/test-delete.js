// Järkäle Tracking v2.18.30 – päivän kirjauksen poisto: hyväksymistestit
const { chromium, devices } = require('playwright');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let dlg=[]; let answer=true; p.on('dialog',d=>{ dlg.push(d.message()); answer?d.accept():d.dismiss(); });
  await p.goto(URL);
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({gender:'male',palette:'ampiainen',theme:'light',profile:{height:190,age:42},gym:{enabled:true}}));
    const y=new Date(Date.now()-864e5).toISOString().slice(0,10), d2=new Date(Date.now()-2*864e5).toISOString().slice(0,10);
    const now=new Date().toISOString();
    localStorage.setItem('seuranta-entries',JSON.stringify({[y]:{date:y,weight:90.5,sleep:7,recovery:4,notes:'testi',created_at:now,updated_at:now},
      [d2]:{date:d2,weight:91,recovery:3,training_done:true,training_auto:true,training_load:4,workout_ids:['g1'],created_at:now,updated_at:now}}));
    const t=Date.parse(d2+'T17:00:00');
    localStorage.setItem('jarkale-gym',JSON.stringify({v:1,programs:[],sessions:[{id:'g1',programId:'x',dayId:'x',date:d2,startedAt:t,endedAt:t+3600000,dayName:'Jalat',trainingType:'Jalat',exercises:[{id:'e1',key:'rdl',name:'RDL',sets:[{kg:80,reps:10,done:true}]}]}],activeId:null}));
  });
  await p.reload(); await p.waitForTimeout(600);
  const Y=await p.evaluate(()=>new Date(Date.now()-864e5).toISOString().slice(0,10)), D2=await p.evaluate(()=>new Date(Date.now()-2*864e5).toISOString().slice(0,10));

  console.log('\nNäkyvyys');
  ok(!(await p.locator('#log-del').isVisible()),'tänään ei kirjausta: ei poistolinkkiä');
  await p.evaluate(Y=>{S.date=Y;loadDayIntoForm(Y);renderLog();},Y);
  ok(await p.locator('#log-del').isVisible(),'kirjatulla päivällä poistolinkki näkyy');

  console.log('\nPeruutus ja poisto');
  answer=false; await p.locator('#log-del').click();
  ok(await p.evaluate(Y=>!!S.entries[Y],Y)&&/Poistetaanko .*kirjaus\?/.test(dlg[0]),'vahvistuksen peruutus ei poista ('+dlg[0]+')');
  answer=true; dlg=[]; await p.locator('#log-del').click(); await p.waitForTimeout(100);
  const r1=await p.evaluate(Y=>({gone:!S.entries[Y], stored:!JSON.parse(localStorage.getItem('seuranta-entries'))[Y], tomb:!!syncTombs().e[Y], form:S.weight==null&&S.recovery==null, link:document.getElementById('log-del').style.display}),Y);
  ok(r1.gone&&r1.stored&&r1.tomb,'kirjaus poistuu muistista ja tallennuksesta, synkronoinnille tombstone');
  ok(r1.form&&r1.link==='none','lomake tyhjenee ja linkki piiloutuu');
  ok(await p.locator('#undo-toast.on').isVisible(),'Kumoa-ilmoitus näkyy');

  console.log('\nKumoa');
  await p.locator('#undo-toast button').click();
  const r2=await p.evaluate(Y=>{ const e=S.entries[Y]; const t=syncTombs().e[Y]; return {back:e&&e.weight===90.5&&e.notes==='testi', form:S.weight==90.5, newer:Date.parse(e.updated_at)>t,
      merged:!!mergeMaps({[Y]:e},{},tsOf,syncTombs().e)[Y]}; },Y);
  ok(r2.back&&r2.form,'Kumoa palauttaa kirjauksen ja lomakkeen');
  ok(r2.newer&&r2.merged,'palautettu kirjaus on tombstonea uudempi, synkronointi ei poista sitä');

  console.log('\nPäivä, jolla on salitreeni');
  await p.evaluate(D2=>{S.date=D2;loadDayIntoForm(D2);renderLog();},D2);
  dlg=[]; await p.locator('#log-del').click(); await p.waitForTimeout(100);
  const r3=await p.evaluate(D2=>{ const e=S.entries[D2]; return {msg:true, e, tomb:!!syncTombs().e[D2], ses:G.sessions.length, link:document.getElementById('log-del').style.display}; },D2);
  ok(/salitreeni säilyy/.test(dlg[0]),'vahvistus kertoo, että salitreeni säilyy');
  ok(r3.e&&r3.e.training_done&&r3.e.training_auto&&r3.e.workout_ids[0]==='g1'&&r3.e.weight==null&&r3.e.recovery==null&&r3.e.training_load==null&&r3.e.training_type==='Jalat','muut tiedot poistuvat, salitreenin Treeni-merkintä jää');
  ok(!r3.tomb&&r3.ses===1,'ei tombstonea, salitreeni ennallaan');
  ok(r3.link==='none','pelkälle salitreenimerkinnälle ei tarjota poistoa');
  await p.evaluate(()=>{gymHealLinks();});
  ok(await p.evaluate(D2=>{const e=S.entries[D2];return e.weight==null&&e.workout_ids.length===1;},D2),'gymHealLinks ei palauta poistettuja tietoja');

  console.log('\nTämän päivän kirjaus: otsikon tila päivittyy');
  await p.evaluate(()=>{ const t=today(), n=new Date().toISOString(); S.entries[t]={date:t,weight:90,recovery:4,created_at:n,updated_at:n}; saveAll(); S.date=t; loadDayIntoForm(t); renderAll(); });
  const before=await p.evaluate(()=>({tc:getComputedStyle(document.getElementById('today-check')).display, ws:document.getElementById('week-status').innerHTML}));
  dlg=[]; await p.locator('#log-del').click(); await p.waitForTimeout(100);
  const after=await p.evaluate(()=>({tc:getComputedStyle(document.getElementById('today-check')).display, ws:document.getElementById('week-status').innerHTML}));
  ok(before.tc!=='none'&&after.tc==='none','"Kirjattu"-merkki poistuu otsikosta');
  ok(after.ws!==before.ws,'viikkonauha päivittyy');
  await p.locator('#undo-toast button').click();
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('today-check')).display!=='none'),'Kumoa palauttaa merkin');
  ok(errs.length===0,'ei JS-virheitä'+(errs.length?': '+errs.join(' | '):''));
  console.log(`\n${pass} / ${pass+fail} läpi`);
  await b.close();
})();
