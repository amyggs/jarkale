// Järkäle Tracking v2.18.96 – yhteenvedon liikerivit: nimi ei katkea kesken sanan, pitkä sarjarivi tippuu nimen alle; ennätys liikkeen omalla rivillä
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
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1');
    localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(()=>{
    const pr=newProgram('T');
    const defs=[['Vipunostot sivulle',[[10,12],[10,12],[10,12],[10,10]]],
      ['Tasapenkkipunnerrus negatiivinen smith',[[110,3],[100,6],[80,14]]],
      ['Vinopenkkipunnerruslaite tai smith',[[80,10],[70,12],[50,22]]],
      ['Ristikkäistalja rinnalle',[[20,12],[20,12],[20,12],[20,12]]],
      ['Ojentajat taljassa z-kahvalla',[[90,8],[80,8]]]];
    defs.forEach(d=>pr.days[0].exercises.push(newEx({name:d[0],sets:d[1].length,repsMin:8,repsMax:12})));
    touchProg(pr); startSession(pr.id,pr.days[0].id);
    { const o=gSession(G.activeId); o.date=new Date(Date.now()-864e5).toISOString().slice(0,10); o.startedAt=Date.now()-864e5;
      o.exercises.forEach((e,i)=>e.sets.forEach(x=>{ x.kg=(i===1?70:i===2?40:i===0?10:i===3?20:90); x.reps=i===1?5:i===2?8:i===3?12:i===0?12:8; x.done=true; })); finishSession(true); }
    startSession(pr.id,pr.days[0].id);
    const s=gSession(G.activeId);
    defs.forEach((d,i)=>s.exercises[i].sets.forEach((x,j)=>{ x.kg=d[1][j][0]; x.reps=d[1][j][1]; x.done=true; }));
    const sid=G.activeId; finishSession(true); setTab('treeni'); openSession(sid);
  }); await p.waitForTimeout(400);
  console.log('\nYhteenvedon liikerivit (Pixel 7, 412 px)');
  // v2.18.106: rivin muoto nimi → sarjat alla → ennätys → huomio
  const rows=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('.g-sum-list>.gs-row').forEach(r=>{
      const nm=r.querySelector('.nm'); const was=nm.style.overflowWrap; nm.style.overflowWrap='normal';
      const fits=nm.scrollWidth<=nm.clientWidth+1; nm.style.overflowWrap=was;
      const v=r.querySelector('.gs-sets'); const rr=r.getBoundingClientRect(), vr=v.getBoundingClientRect(), nr=nm.getBoundingClientRect();
      out.push({name:nm.textContent.trim(),fits,vInside:vr.right<=rr.right+1&&vr.left>=rr.left-1,below:vr.top>=nr.bottom-2,left:Math.abs(vr.left-nr.left)<2});
    });
    return out;
  });
  ok(rows.length===5,'viisi liikeriviä');
  rows.forEach(r=>ok(r.fits,`ei sanan katkeamista: ${r.name}`));
  rows.forEach(r=>ok(r.vInside,`sarjarivi pysyy rivin sisällä: ${r.name}`));
  ok(rows.every(r=>r.below&&r.left),'sarjat aina nimen alla, samassa linjassa');
  console.log('\nEnnätys liikkeen omalla rivillä');
  const pr=await p.evaluate(()=>{ const t=document.querySelector('.g-sum').innerText; const rows=[...document.querySelectorAll('.g-sum-list>.gs-row')];
    const rt=re=>rows.find(r=>re.test(r.textContent));
    return {sep:document.querySelectorAll('.g-sum-pr').length, tags:document.querySelectorAll('.g-sum-list .gs-pr .pr-tag').length,
      cnt:(t.match(/Tasapenkkipunnerrus/g)||[]).length, lbl:document.querySelector('.g-sum-prh').textContent,
      tasa:rt(/Tasapenkki/).querySelector('.gs-pr')?.textContent||'', tasaDir:!!rt(/Tasapenkki/).querySelector('.g-dir'), rm:/1RM/.test(t)};
  });
  ok(pr.sep===0,'erillistä ennätyslistaa ei ole');
  ok(pr.cnt===1,'liike näkyy yhteenvedossa vain kerran');
  ok(pr.tags>=2&&/ennätyksiä \d/.test(pr.lbl),'ennätysmerkit riveillä ja määrä otsikossa: '+pr.lbl+' / '+pr.tags);
  ok(/110 × 3/.test(pr.tasa)&&/aiemmin/.test(pr.tasa),'rivillä ennätyssarja ja vertailu: '+pr.tasa);
  ok(!pr.tasaDir,'ennätysrivillä ei nuolta');
  ok(!pr.rm,'yhteenvedossa ei arvioitua 1RM:ää');
  const sh=await p.evaluate(()=>sessionShareText(G.sessions.filter(x=>x.endedAt).sort((a,b)=>b.startedAt-a.startedAt)[0]));
  ok(/Ennätyksiä: \d/.test(sh)&&/★ Tasapenkki/.test(sh)&&!/^•/m.test(sh),'jaettava teksti: ★ rivillä, ei erillistä listaa');
  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  if(process.env.IMG){ const b64=await p.evaluate(async()=>{ const blob=await gSessionImage(G.sessions.filter(x=>x.endedAt).sort((a,b)=>b.startedAt-a.startedAt)[0]); return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob);}); }); fs.writeFileSync(process.env.IMG,Buffer.from(b64,'base64')); }
  await p.locator('.g-sum').screenshot({path:process.env.SHOT||'/tmp/sumwrap.png'});
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
