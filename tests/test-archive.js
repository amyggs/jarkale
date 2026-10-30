// Järkäle Tracking v2.18.118 – ohjelman arkistointi: kysymys uuden ohjelman tuonnin jälkeen, nappi muokkausnäkymän yläreunassa
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(300);
  const imp=async(txt,auto)=>{ await p.evaluate(a=>{ window.__jdlgAuto=a; window.__jdlgLog=[]; GU.mode='import'; GU.importText=''; GU.importPreview=null; setTab('treeni'); renderGym(); },auto); await p.waitForTimeout(100);
    await p.locator('#g-import').fill(txt); await p.locator('button',{hasText:'Esikatsele'}).click(); await p.waitForTimeout(150);
    await p.locator('button',{hasText:'Tallenna uudeksi ohjelmaksi'}).click(); await p.waitForTimeout(300); };

  console.log('\nTuonnin jälkeen');
  await imp("Vanha ohjelma\n\n1 Rinta\nPenkki 3x8",true);
  ok(await p.evaluate(()=>!(window.__jdlgLog||[]).some(m=>/Arkistoidaanko/.test(m))),'ensimmäinen ohjelma: ei kysymystä');
  await imp("Uusi ohjelma\n\n1 Rinta\nPenkki 4x6",false);
  ok(await p.evaluate(()=>(window.__jdlgLog||[]).some(m=>/Arkistoidaanko edellinen ohjelma Vanha ohjelma\?/.test(m))),'uuden tuonnin jälkeen kysytään edellisen arkistointia');
  ok(await p.evaluate(()=>G.programs.filter(x=>!x.archived).length===2),'"Pidä käytössä": molemmat aktiivisia');
  await imp("Kolmas ohjelma\n\n1 Rinta\nPenkki 5x5",true);
  const st=await p.evaluate(()=>({act:G.programs.filter(x=>!x.archived).map(x=>x.name),arc:G.programs.filter(x=>x.archived).map(x=>x.name),cur:curProgram().name}));
  ok(st.arc.join()==='Uusi ohjelma'&&st.cur==='Kolmas ohjelma'&&st.act.includes('Vanha ohjelma'),'hyväksyntä arkistoi juuri edellisen valitun ohjelman: '+JSON.stringify(st));
  ok(/Arkistoidut ohjelmat \(1\)/.test(await p.locator('#view-treeni').innerText()),'arkistoitu näkyy Treeni-välilehden lopussa');

  console.log('\nMuokkausnäkymä');
  await p.evaluate(()=>{ gOpenEdit(curProgram().id,false); }); await p.waitForTimeout(150);
  const top=await p.evaluate(()=>{ const bar=document.querySelector('.g-edit-bar'); return bar?bar.innerText:''; });
  ok(/Arkistoi/.test(top),'Arkistoi muokkausnäkymän yläreunassa');
  ok(await p.evaluate(()=>[...document.querySelectorAll('#view-treeni button')].filter(b=>b.textContent.trim()==='Arkistoi').length===1),'vain yksi Arkistoi-nappi');
  await p.evaluate(()=>{ gDoneEdit(); const c=G.curProgramId; const np=newProgram('Tyhjä'); gOpenEdit(np.id,true); GU.editSnap.cur=c; renderGym(); }); await p.waitForTimeout(150);
  ok(!/Arkistoi/.test(await p.evaluate(()=>document.querySelector('.g-edit-bar').innerText)),'uudella ohjelmalla ei Arkistoi-nappia (Peruuta poistaa)');


  console.log('\nLiikkeen historia toisesta liikkeestä (v2.18.132)');
  await p.evaluate(()=>{ window.__jdlgAuto=true; const pr=newProgram('Selkä'); pr.days[0].name='Selkä';
    pr.days[0].exercises.push({...newEx({name:'Leuanveto leveä myötäote',sets:3,repsMin:6,repsMax:12}),key:'ylatalja'},newEx({name:'Ylätalja',sets:3,repsMin:8}));
    touchProg(pr); G.curProgramId=pr.id; const t=Date.now()-3*864e5;
    G.sessions.push({id:'hx',programId:'x',dayId:'x',date:new Date(t).toISOString().slice(0,10),startedAt:t,endedAt:t+3600000,dayName:'Selkä',exercises:[{id:'e1',key:'ylatalja',name:'Ylätalja',sets:[{kg:80,reps:10,done:true}]}]});
    pr.days[0].exercises[1].key='ylatalja'; gymSave(); setTab('treeni'); gOpenEdit(pr.id,false); });
  await p.waitForTimeout(200);
  const hl=await p.locator('.ed-l',{hasText:'Leuanveto'}).innerText();
  ok(/Historia: Ylätalja/.test(hl)&&!/Historia/.test(await p.locator('.ed-l',{hasText:/^Ylätalja/}).innerText()),'väärin kytketyllä liikkeellä merkintä "Historia: Ylätalja", oikealla ei');
  await p.locator('.ed-l',{hasText:'Leuanveto'}).click(); await p.waitForTimeout(150);
  ok(/tulevat liikkeestä Ylätalja \(1 kerta\)/.test(await p.locator('.ed-hist').innerText()),'avattuna selitys ja kertojen määrä');
  await p.locator('.ed-hist button',{hasText:'Erota omaksi liikkeeksi'}).click(); await p.waitForTimeout(150);
  const ux=await p.evaluate(()=>{ const e=curProgram().days[0].exercises; return {k:e[0].key,k2:e[1].key,prev:prevFor(e[0].key,null),hist:G.sessions.find(s=>s.id==='hx').exercises[0].key}; });
  ok(ux.k!=='ylatalja'&&ux.k2==='ylatalja'&&!ux.prev&&ux.hist==='ylatalja','erotus: oma avain, ei viime kertaa, ylätaljan historia ennallaan: '+JSON.stringify(ux));
  ok(!(await p.locator('.ed-hl').count()),'merkintä poistuu erotuksen jälkeen');
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
