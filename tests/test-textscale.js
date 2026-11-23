// v2.18.193: iso järjestelmän tekstikoko (Android kasvattaa vain tekstiä). Simuloidaan kertomalla tyylien fonttikoot 1,6:lla 360 px:n näytöllä.
// Alapalkki, taukonapit ja liikkeen tunnusluvut mahtuvat (sovitus, samankokoiset), pitkä liikkeen nimi ei katkea kesken sanan, Drive-nappi ei leikkaudu.
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},serviceWorkers:'block',reducedMotion:'reduce'}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('jarkale-news-seen','["x"]'); localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{training:true},gym:{enabled:true}})); });
  await p.reload(); await p.waitForFunction(()=>typeof fitText==='function'); await p.waitForTimeout(300);
  const metrics=async()=>p.evaluate(()=>{ const tw=el=>{ const r=document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    const inner=el=>{ const cs=getComputedStyle(el); return el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight); };
    const fits=sel=>[...document.querySelectorAll(sel)].filter(e=>e.clientWidth).every(e=>tw(e)<=inner(e)+0.5);
    const same=sel=>new Set([...document.querySelectorAll(sel)].filter(e=>e.clientWidth).map(e=>getComputedStyle(e).fontSize)).size<=1;
    const n=document.querySelector('.ex-n,.tr-h1'); let word=true; if(n){ n.style.overflowWrap='normal'; word=n.scrollWidth<=n.clientWidth; n.style.overflowWrap=''; }
    return {nav:fits('#nav button span.lbl'),navSame:same('#nav button span.lbl'),gt:fits('.gt .gt-q'),gtSame:same('.gt .gt-q'),stats:fits('.g-stats b')&&fits('.g-stats span'),statsSame:same('.g-stats span'),word,
      drive:[...document.querySelectorAll('.g-safe .tr-go')].every(e=>e.scrollHeight<=e.clientHeight+1),fs:getComputedStyle(document.querySelector('#nav button span.lbl')).fontSize}; });
  const base=await metrics();
  await p.evaluate(async()=>{ const pr=newProgram('P'); pr.days[0].name='Rinta, olkapäät ja ojentajat'; pr.days[0].exercises.push(newEx({name:'Vinopenkkipunnerrus laitteessa',sets:2,repsMin:8})); touchProg(pr); gymSave();
    for(let k=0;k<3;k++){ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-(3+k*3)*864e5).toISOString().slice(0,10); s.exercises[0].sets.forEach(r=>{r.kg=60+k*2.5;r.reps=8;r.done=true;}); finishSession(true); }
    const walk=rules=>{ for(const r of rules){ if(r.cssRules) walk(r.cssRules); if(r.style&&/px$/.test(r.style.fontSize||'')) r.style.fontSize=(parseFloat(r.style.fontSize)*1.6).toFixed(2)+'px'; } };
    for(const sh of document.styleSheets){ try{ walk(sh.cssRules); }catch(_){} }
    setTab('log'); renderAll(); });
  await p.waitForTimeout(200);
  const r1=await p.evaluate(()=>{ setTab('treeni'); GU.mode='home'; renderGym(); return 1; }); await p.waitForTimeout(150);
  const home=await metrics();
  ok(home.nav&&home.navSame,'alapalkin tekstit mahtuvat ja ovat samankokoisia (iso teksti '+home.fs+', normaali '+base.fs+')');
  await p.evaluate(async()=>{ const pr=G.programs[0]; await startSession(pr.id,pr.days[0].id); setTab('treeni'); renderGym(); }); await p.waitForTimeout(200);
  const ses=await metrics();
  ok(ses.gt&&ses.gtSame,'taukonapit mahtuvat ja ovat samankokoisia');
  ok(ses.word,'pitkä liikkeen nimi ei katkea kesken sanan');
  await p.evaluate(()=>{ const s=activeSession(); s.exercises[0].sets.forEach(r=>{r.kg=70;r.reps=9;r.done=true;}); finishSession(); }); await p.waitForTimeout(300);
  const sum=await metrics();
  ok(sum.drive,'Drive-napin teksti ei leikkaudu');
  await p.evaluate(()=>{ GU.mode='home'; gOpenEx(G.sessions[0].exercises[0].key); }); await p.waitForTimeout(200);
  const ex=await metrics();
  ok(ex.stats&&ex.statsSame,'liikkeen tunnusluvut mahtuvat ja selitteet ovat samankokoisia');
  ok(ex.word,'liikkeen sivun otsikko ei katkea kesken sanan');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
