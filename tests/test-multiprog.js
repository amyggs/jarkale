// Järkäle Tracking v2.18.166 – useampi käytössä oleva ohjelma: Treeni-välilehti näyttää kaikkien päivät (yhden päivän ohjelma
// pelkkänä päivänä, monipäiväiset ryhminä), kierto ohjelmien yli, yhdellä ohjelmalla ennallaan, tuonti lisää yhden päivän ohjelmaan.
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
const p=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');
const reset=async()=>{ await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));localStorage.setItem('jarkale-news-seen','999');
  localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'dark',tracking:{weight:true},gym:{enabled:true}}));}); await p.reload(); await p.waitForTimeout(400); };
const txt=()=>p.evaluate(()=>{ setTab('treeni'); GU.mode='home'; renderGym(); return document.getElementById('view-treeni').innerText; });
// 1) jokainen päivä omana ohjelmanaan
await reset();
await p.evaluate(async()=>{ for(const n of ['Rinta','Jalat','Selkä']){ const pr=newProgram(n); pr.days[0].name=n; pr.days[0].exercises.push(newEx({name:n+'liike',sets:3,repsMin:8})); touchProg(pr); } gymSave();
  const r=G.programs.find(x=>x.name==='Rinta'); await startSession(r.id,r.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-864e5).toISOString().slice(0,10); s.exercises[0].sets.forEach(x=>{x.kg=50;x.reps=8;x.done=true;}); finishSession(true); });
let t=await txt();
ok(/^Treeni\b/m.test(t)&&/3 ohjelmaa · 3 treenipäivää/.test(t),'otsikko Treeni ja ohjelmien määrä');
ok(/Rinta/.test(t)&&/Jalat/.test(t)&&/Selkä/.test(t)&&await p.locator('#view-treeni .tr-grp').count()===0,'yhden päivän ohjelmat näkyvät päivinä ilman ryhmäotsikoita');
const nx=await p.evaluate(()=>{ const r=document.querySelector('#view-treeni .tr-next .n'); return r&&r.textContent; });
ok(nx&&nx!=='Rinta','Seuraavana kierrossa on tekemätön päivä toisesta ohjelmasta ('+nx+')');
ok(await p.evaluate(()=>!document.querySelector('#view-treeni .view-hero .tr-pill[onclick*=gOpenEdit]')),'yläreunan Muokkaa piilossa, kun ohjelmia on useita');
await p.evaluate(()=>{ document.querySelector('#view-treeni .tr-next .tr-go').click(); });
const started=await p.evaluate(()=>{ const s=activeSession(); return s&&gProg(s.programId).name===s.dayName; });
ok(started,'Aloita aloittaa oikean ohjelman päivän');
await p.evaluate(()=>{ const s=activeSession(); s.endedAt=null; G.activeId=null; G.sessions=G.sessions.filter(x=>x!==s); gymSave(); });
// 2) kaksi monipäiväistä ohjelmaa → ryhmät, viimeksi treenattu ensin
await reset();
await p.evaluate(async()=>{ const mk=(n,ds)=>{ const pr=newProgram(n); pr.days=ds.map(d=>({id:gid(),name:d,exercises:[newEx({name:d+' liike',sets:2,repsMin:8})]})); touchProg(pr); return pr; };
  const a=mk('Golden Six',['A','B']); const c=mk('Toinen',['Ylä','Ala']); gymSave();
  await startSession(c.id,c.days[0].id); const s=activeSession(); s.exercises[0].sets.forEach(x=>{x.kg=40;x.reps=8;x.done=true;}); finishSession(true); });
t=await txt();
const grps=await p.evaluate(()=>[...document.querySelectorAll('#view-treeni .tr-grp')].map(e=>e.textContent));
ok(grps.length===2&&grps[0]==='Toinen','monipäiväiset ohjelmat ryhminä, viimeksi treenattu ensin ('+grps.join(', ')+')');
const nx2=await p.evaluate(()=>{ const r=document.querySelector('#view-treeni .tr-next .n'); return r&&r.textContent; });
ok(nx2==='Ala','kierto tulee viimeksi treenatusta monipäiväisestä ohjelmasta ('+nx2+')');
// 3) yksi ohjelma → ennallaan
await reset();
await p.evaluate(()=>{ const pr=newProgram('Aku 06'); pr.days=[{id:gid(),name:'Rinta',exercises:[newEx({name:'Penkki',sets:3,repsMin:8})]},{id:gid(),name:'Jalat',exercises:[newEx({name:'Kyykky',sets:3,repsMin:8})]}]; touchProg(pr); gymSave(); });
t=await txt();
ok(/^Aku 06/m.test(t)&&/2 treenipäivää/.test(t)&&await p.locator('#view-treeni .tr-grp').count()===0&&await p.evaluate(()=>!!document.querySelector('#view-treeni .view-hero .tr-pill[onclick*=gOpenEdit]')),'yksi ohjelma: otsikko, Muokkaa ja lista ennallaan');
// 4) tuonti: yksi päivä ja monipäiväinen ohjelma käytössä → oletuksena päiväksi ohjelmaan
await p.evaluate(()=>{ GU.mode='import'; GU.importText='Selkä\nSoutu 3x10\nLeuanveto 3x8'; GU.importPreview=gMatchImport(parseProgramText(GU.importText)); renderGym(); });
const btn=await p.evaluate(()=>document.querySelector('.g-save-dock .tr-go').textContent);
ok(/Lisää päiväksi ohjelmaan Aku 06/.test(btn),'yksi päivä: ensisijainen nappi lisää päiväksi ohjelmaan');
await p.evaluate(()=>gImportSave(true)); await p.waitForTimeout(300);
const r4=await p.evaluate(()=>({n:G.programs.filter(x=>!x.archived).length, d:G.programs[0].days.map(d=>d.name)}));
ok(r4.n===1&&r4.d.length===3,'päivä lisättiin olemassa olevaan ohjelmaan, ei uutta ohjelmaa');
ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);})();
