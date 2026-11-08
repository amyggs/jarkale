// Järkäle Tracking v2.18.144 – arvioitu maksimi vertailuissa enintään 12 toistolla (sama sääntö kuin ennätyksissä)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'dark',tracking:{training:true},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(500);
  // keksitty esimerkki: pitkä kevyt sarja (157,5 × 30) ja raskaampi lyhyt sarja (200 × 8)
  const r=await p.evaluate(async()=>{ const pr=newProgram('Testi'); pr.days[0].name='Jalat'; pr.days[0].exercises.push(newEx({name:'Jalkaprässi',sets:1,repsMin:10})); touchProg(pr); G.curProgramId=pr.id; gymSave();
    const run=async(kg,reps,dAgo)=>{ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-dAgo*864e5).toISOString().slice(0,10); s.startedAt=Date.now()-dAgo*864e5; const x=s.exercises[0].sets[0]; x.kg=kg; x.reps=reps; x.done=true; finishSession(true); return s.id; };
    await run(200,8,6); await run(157.5,30,4);
    const key=pr.days[0].exercises[0].key; setTab('treeni'); GU.mode='exercise'; GU.exKey=key; renderGym();
    const stats=[...document.querySelectorAll('#view-treeni .g-stats > div')].map(d=>d.innerText.replace(/\s+/g,' '));
    const tr=exerciseTrend(key);
    // samalla painolla toisto lisää yli 12 toiston alueella on nousu
    const id3=await run(60,13,3), id4=await run(60,14,2);
    const sum=sessionSummary(gSession(id4)).rows[0];
    return {stats,tr:tr.dir,sinceBest:tr.sinceBest,dir:sum.dir}; });
  ok(/^200\s×\s8 Paras sarja/.test(r.stats[0]),'liikesivun paras sarja ei ole 30 toiston sarja: '+r.stats[0]);
  ok(/^253,5 Arvioitu 1RM/.test(r.stats[2]),'arvioitu 1RM 12 toiston rajalla (ei 315 kevyemmästä 30 toiston sarjasta): '+r.stats[2]);
  ok(r.tr==='down'&&r.sinceBest===1,'suunta ja "paras" samalla säännöllä: '+r.tr+' / '+r.sinceBest);
  ok(r.dir==='up','yhteenvedon nuoli: 60 × 13 → 60 × 14 on nousu: '+r.dir);
  // v2.18.146: ennätys yhteisluvulla. Keksitty esimerkki: aiemmin 73 × 3, 54 × 8, 45 × 13 → 54 × 10 ei ole ennätys
  const pr=await p.evaluate(()=>{ const P=[{kg:73,reps:3},{kg:54,reps:8},{kg:45,reps:8},{kg:45,reps:13}], d=r=>({...r,done:true});
    return { a:isPR(d({kg:54,reps:10}),P), b:isPR(d({kg:75,reps:2}),P), c:isPR(d({kg:70,reps:6}),P), e:isPR(d({kg:45,reps:15}),P),
      t:prText(d({kg:70,reps:6}),P), f:isPR(d({kg:80,reps:9}),[{kg:80,reps:8},{kg:60,reps:12}]), ft:prText(d({kg:80,reps:9}),[{kg:80,reps:8},{kg:60,reps:12}]) }; });
  ok(pr.a===false,'54 × 10 aiempien 73 × 3 ja 54 × 8 jälkeen ei ole ennätys');
  ok(pr.b===true,'raskain paino koskaan on ennätys (75 × 2)');
  ok(pr.c===true&&/aiempi paras 73\skg\s×\s3/.test(pr.t),'kevyempi mutta laskennallisesti kovempi on ennätys: '+pr.t);
  ok(pr.e===false,'kevyt pitkä sarja (45 × 15) ei ole ennätys');
  ok(pr.f===true&&/aiempi paras 80\skg\s×\s8/.test(pr.ft),'samalla painolla toisto lisää on ennätys, kun se nostaa parasta: '+pr.ft);
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
