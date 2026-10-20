// Järkäle Tracking v2.18.79+ – tietoturva- ja eheystestit (auditointi 20.10.2026)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
const HTML=fs.readFileSync(__dirname+'/../index.html','utf8');
(async()=>{
  console.log('\nStaattiset tarkistukset');
  const names=[...HTML.matchAll(/^(?:async )?function ([A-Za-z0-9_$]+)\s*\(/gm)].map(m=>m[1]);
  const dup=names.filter((n,i)=>names.indexOf(n)!==i);
  ok(dup.length===0,'ei kaksoismäärittelyjä ylätason funktioille'+(dup.length?' ('+[...new Set(dup)].join(', ')+')':''));
  ok(!/user-scalable\s*=\s*no/.test(HTML),'zoomausta ei estetä viewportissa');

  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  const base=()=>p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({gender:'male',palette:'ampiainen',theme:'light',profile:{height:190,age:42},gym:{enabled:true}}));});

  console.log('\nPerustavoitteet (ei kautta)');
  await base(); await p.reload(); await p.waitForTimeout(400);
  const g=await p.evaluate(()=>{ setAnyGoal('sleepHours','8',''); setAnyGoal('workoutsPerWeek','5',''); setAnyGoal('measurementIntervalDays','14',''); return JSON.parse(localStorage.getItem('seuranta-settings')).goals; });
  ok(g&&g.sleepHours===8&&g.workoutsPerWeek===5&&g.measurementIntervalDays===14,'perustavoitteet tallentuvat ('+JSON.stringify(g)+')');
  const sg=await p.evaluate(()=>{ S.settings.seasonsEnabled=true; S.settings.seasons=[{id:7,name:'Kausi',start:'2000-01-01',end:'2099-12-31',goals:{}}]; saveAll(); setAnyGoal('sleepHours','7.5','7'); return S.settings.seasons[0].goals.sleepHours; });
  ok(sg===7.5,'kausikohtainen tavoite tallentuu');
  const set=await p.evaluate(()=>{ const a=setGoalAt({sets:3,repsMin:8,repsMax:10},0); return a&&a.sets; });
  ok(set===3,'salitavoitteen setGoalAt toimii');

  console.log('\nVioittunut tallenne');
  await base();
  await p.evaluate(()=>{ localStorage.setItem('seuranta-entries','{"2026-10-01":{"date":"2026-10-01","weight":90'); localStorage.setItem('jarkale-gym','{"v":1,"sessions":[{'); });
  await p.addInitScript(()=>{ window.__jdlgAuto=true; });
  await p.reload(); await p.waitForTimeout(1200);
  const c=await p.evaluate(()=>{ const ks=Object.keys(localStorage); const e=ks.find(k=>k.startsWith('seuranta-entries-corrupt-')), gk=ks.find(k=>k.startsWith('jarkale-gym-corrupt-'));
    return {e:e&&localStorage.getItem(e), g:gk&&localStorage.getItem(gk), log:(window.__jdlgLog||[]).join('|'), ents:Object.keys(S.entries).length}; });
  ok(c.e==='{"2026-10-01":{"date":"2026-10-01","weight":90','vioittunut kirjausdata säilyy erillisenä');
  ok(c.g==='{"v":1,"sessions":[{','vioittunut salidata säilyy erillisenä');
  ok(/ei avautunut/.test(c.log),'käyttäjälle ilmoitetaan ('+c.log.slice(0,50)+')');
  await p.evaluate(()=>{ S.entries['2026-10-02']={date:'2026-10-02',weight:88,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}; saveAll(); });
  ok(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('seuranta-entries-corrupt-'))),'tallennus ei poista vioittunutta kopiota');

  ok(errs.length===0,'ei sivuvirheitä'+(errs.length?' '+errs[0]:''));
  await b.close();
  console.log(`\n${pass} / ${pass+fail} läpi`); process.exit(fail?1:0);
})();
