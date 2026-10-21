// Järkäle Tracking v2.18.95 – yhteenvedon liikerivit: nimi ei katkea kesken sanan, pitkä sarjarivi tippuu nimen alle
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
    const s=gSession(G.activeId);
    defs.forEach((d,i)=>s.exercises[i].sets.forEach((x,j)=>{ x.kg=d[1][j][0]; x.reps=d[1][j][1]; x.done=true; }));
    const sid=G.activeId; finishSession(true); setTab('treeni'); openSession(sid);
  }); await p.waitForTimeout(400);
  console.log('\nYhteenvedon liikerivit (Pixel 7, 412 px)');
  const rows=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('.g-sum-list>div').forEach(r=>{
      const nm=r.querySelector('.nm'); const was=nm.style.overflowWrap; nm.style.overflowWrap='normal';
      const fits=nm.scrollWidth<=nm.clientWidth+1; nm.style.overflowWrap=was;
      const v=r.querySelector('.v'); const rr=r.getBoundingClientRect(), vr=v.getBoundingClientRect(), nr=nm.getBoundingClientRect();
      out.push({name:nm.textContent.trim(),fits,vInside:vr.right<=rr.right+1&&vr.left>=rr.left-1,stacked:vr.top>=nr.bottom-2});
    });
    return out;
  });
  ok(rows.length===5,'viisi liikeriviä');
  rows.forEach(r=>ok(r.fits,`ei sanan katkeamista: ${r.name}`));
  rows.forEach(r=>ok(r.vInside,`sarjarivi pysyy rivin sisällä: ${r.name}`));
  const long=rows.find(r=>/Tasapenkki/.test(r.name)); ok(long&&long.stacked,'pitkä nimi + pitkä sarjarivi: sarjat nimen alle');
  const short=rows.find(r=>/Vipunostot/.test(r.name)); ok(short&&!short.stacked,'lyhyt nimi: sarjat samalla rivillä oikealla');
  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await p.locator('.g-sum-list').screenshot({path:process.env.SHOT||'/tmp/sumwrap.png'});
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
