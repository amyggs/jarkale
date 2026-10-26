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

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
