// Järkäle Tracking v2.18.97 – päivän vaihto pyyhkäisyllä ei jätä piilotettua korttia sivuun siirretyksi (Kehon mittaus -muistutus)
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
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    const d=new Date(Date.now()-82*864e5).toISOString().slice(0,10);
    localStorage.setItem('seuranta-meas',JSON.stringify([{date:d,waist:90}]));
    localStorage.setItem('seuranta-settings',JSON.stringify({theme:'dark',tracking:{body:true}})); });
  await p.reload(); await p.waitForTimeout(600); await p.evaluate(()=>setTab('log')); await p.waitForTimeout(500);
  const st=()=>p.evaluate(()=>{ const e=document.getElementById('meas-reminder'); const r=e.getBoundingClientRect(); return {disp:getComputedStyle(e).display,tf:e.style.transform,op:e.style.opacity,left:Math.round(r.left),right:Math.round(r.right)}; });
  console.log('\nLähtötilanne (tänään, mittaus myöhässä)');
  let s0=await st(); ok(s0.disp==='flex','muistutus näkyy tänään'); ok(s0.left===16&&s0.right<=396,`kortti omalla paikallaan (${s0.left}–${s0.right})`);
  console.log('\nVeto kesken päivän vaihdon: kortti näkyi vedon alkaessa, mutta piiloutuu edelliselle päivälle');
  await p.evaluate(()=>{ setPartsX(90,.8); }); // sormi vetää sisältöä oikealle
  await p.evaluate(()=>dayTurn(-1,90)); await p.waitForTimeout(700);
  const y=await p.evaluate(()=>({date:S.date,hidden:getComputedStyle(document.getElementById('meas-reminder')).display==='none'}));
  ok(y.hidden,'edellisellä päivällä muistutus on piilossa ('+y.date+')');
  await p.evaluate(()=>goToday()); await p.waitForTimeout(700);
  const s1=await st();
  ok(s1.disp==='flex','takaisin tähän päivään: muistutus näkyy');
  ok(s1.tf===''&&s1.op==='','ei jäänyttä siirtoa tai läpinäkyvyyttä (transform="'+s1.tf+'", opacity="'+s1.op+'")');
  ok(s1.left===16&&s1.right<=396,`kortti omalla paikallaan (${s1.left}–${s1.right})`);
  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
