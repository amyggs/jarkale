// v2.18.186: treenin jako kuvana – kuva tehdään etukäteen, vanhentunut jakolupa → uusi Jaa kuva -napautus
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const p=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));localStorage.setItem('jarkale-news-seen','["x"]');localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{training:true},gym:{enabled:true}}));});
  await p.reload(); await p.waitForFunction(()=>typeof gShareSession==='function'); await p.waitForTimeout(300);
  const r=await p.evaluate(async()=>{
    const a=newProgram('A'); a.days[0].exercises.push(newEx({name:'Penkki',sets:3})); touchProg(a); gymSave();
    await startSession(a.id,a.days[0].id); const s=activeSession(); s.exercises.forEach(e=>e.sets.forEach(r=>{r.kg=80;r.reps=8;r.done=true;})); const id=s.id; finishSession(true);
    const log=[]; let calls=0, made=0;
    const orig=window.gSessionImage; window.gSessionImage=async(...x)=>{ made++; return orig(...x); };
    navigator.canShare=()=>true;
    navigator.share=async(d)=>{ calls++; log.push(d.files?'file':'text'); if(calls===1){ const e=new Error('x'); e.name='NotAllowedError'; throw e; } };
    const dlg=[]; const oc=window.jConfirm; window.jConfirm=async(msg,o)=>{ dlg.push(msg.split('\n')[0]); return true; };
    const oa=window.jAlert; let alerted=null; window.jAlert=m=>{ alerted=m; };
    await gShareSession(id);
    window.jConfirm=oc; window.jAlert=oa; window.gSessionImage=orig;
    return {log,dlg,alerted,made};
  });
  ok(r.made>=1,'kuva tehtiin');
  ok(r.dlg[0]&&/kuvana vai tekstinä/.test(r.dlg[0])&&r.dlg[1]==='Kuva on valmis.','vanhentunut lupa: kysytään Jaa kuva ('+r.dlg.join(' / ')+')');
  ok(r.log.join(',')==='file,file'&&!r.alerted,'jaetaan kuvana toisella napautuksella, ei vaihtoa tekstiin');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
