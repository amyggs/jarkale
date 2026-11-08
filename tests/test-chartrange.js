// Järkäle Tracking v2.18.145 – liikekäyrän aikaväli (3 kk / 6 kk / 1 v / Kaikki)
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
  // keksitty historia: Penkki joka 5. päivä 400 päivän ajan, Kyykky vain kahdesti hiljattain, Soutu kahdesti yli vuosi sitten
  await p.evaluate(async()=>{ const pr=newProgram('Testi'); pr.days[0].name='A';
    pr.days[0].exercises.push(newEx({name:'Penkki',sets:1,repsMin:8}),newEx({name:'Kyykky',sets:1,repsMin:8}),newEx({name:'Soutu',sets:1,repsMin:8})); touchProg(pr); G.curProgramId=pr.id; gymSave();
    const run=async(dAgo,which)=>{ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-dAgo*864e5).toISOString().slice(0,10); s.startedAt=Date.now()-dAgo*864e5;
      s.exercises.forEach((ex,i)=>{ if(which.includes(i)){ const x=ex.sets[0]; x.kg=60+Math.round((400-dAgo)/40)*2.5; x.reps=8; x.done=true; } else ex.skipped=true; }); finishSession(true); };
    for(let d=400; d>=5; d-=5) await run(d,d===10||d===5?[0,1]:d===400||d===395?[0,2]:[0]); });
  const view=async name=>p.evaluate(n=>{ const k=G.sessions.flatMap(s=>s.exercises).find(e=>e.name===n).key; setTab('treeni'); GU.mode='exercise'; GU.exKey=k; renderGym();
    const c=document.querySelector('#view-treeni .g-chart'); return {chips:[...(c?.querySelectorAll('.g-rng button')||[])].map(b=>b.textContent+(b.classList.contains('on')?'*':'')),
      pts:c?c.querySelectorAll('svg circle').length:0, sum:c?.querySelector('.g-chart-sum')?.innerText||'', ax:c?.querySelector('.g-chart-ax')?.innerText.replace(/\s+/g,' ')||'',
      sw:document.documentElement.scrollWidth}; },name);
  let v=await view('Penkki');
  ok(v.chips.join(',')==='3 kk,6 kk*,1 v,Kaikki','valinnat ja oletus 6 kk: '+v.chips.join(','));
  ok(v.pts>=35&&v.pts<=37,'6 kk ≈ 36 kertaa (ennen enintään 16): '+v.pts);
  ok(v.sw<=360,'mahtuu 360 px leveyteen');
  await p.locator('.g-rng button',{hasText:'Kaikki'}).click(); await p.waitForTimeout(150);
  v=await view('Penkki');
  ok(v.pts===80&&/Kaikki\*/.test(v.chips.join(',')),'Kaikki: koko historia 80 kertaa: '+v.pts);
  ok(/\d+\.\d+\.\d{4}/.test(v.ax)&&/\+/.test(v.sum),'pitkällä välillä päivämäärissä vuosi, muutos näkyy: '+v.ax+' / '+v.sum);
  await p.reload(); await p.waitForTimeout(500);
  v=await view('Penkki');
  ok(/Kaikki\*/.test(v.chips.join(',')),'valinta muistetaan uudelleenkäynnistyksen yli');
  await p.evaluate(()=>setChartRange('3')); v=await view('Penkki');
  ok(/3 kk\*/.test(v.chips.join(','))&&v.pts>=17&&v.pts<=19&&!/\d{4}/.test(v.ax),'3 kk: noin 18 kertaa, lyhyt päivämäärä: '+v.pts+' / '+v.ax);
  v=await view('Kyykky');
  ok(v.chips.length===0&&v.pts===2,'vain kaksi tuoretta kertaa: ei valintoja, käyrä näkyy: '+v.chips.join(',')+' / '+v.pts);
  v=await view('Soutu');
  ok(v.pts===2&&v.chips.length===0,'yli vuosi sitten tehty liike: kaksi kertaa näkyy silti: '+v.pts+' / '+v.chips.join(','));
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
