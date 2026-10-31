// Järkäle Tracking v2.18.133 – kuukausikuva: treenipäivät ohjelman päivän värillä, toteutuminen, kehitys; jako ja kuukauden alun ehdotus
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
    localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'dark',gym:{enabled:true},tracking:{},goals:{trainingDays:[1,4]}})); });
  await p.reload(); await p.waitForTimeout(400);
  // keksitty data: syyskuu vertailukohdaksi, lokakuussa 5 treeniä kolmella treenipäivällä, yksi päivä kahdesti
  await p.evaluate(()=>{ let k=0; const add=(date,day,sets)=>{ const t=new Date(date+'T17:00:00').getTime(); G.sessions.push({id:'m'+(k++),programId:'p',dayId:day,date,startedAt:t+k*1000,endedAt:t+k*1000+3e6,dayName:day,exercises:sets.map(([key,name,kg,reps])=>({id:gid(),key,name,sets:[{kg,reps,done:true}]}))}); };
    add('2026-09-28','Rinta',[['penkki','Penkki',80,10],['vip','Vipunosto',10,12]]);
    add('2026-10-01','Rinta',[['penkki','Penkki',85,10],['vip','Vipunosto',8,15]]); add('2026-10-02','Jalat',[['kyykky','Kyykky',100,5]]);
    add('2026-10-08','Rinta',[['penkki','Penkki',90,10]]); add('2026-10-08','Selkä',[['yla','Ylätalja',70,10]]); add('2026-10-15','Jalat',[['kyykky','Kyykky',110,5]]);
    G.sessions.push({id:'tyhja',programId:'p',dayId:'x',date:'2026-10-20',startedAt:1,endedAt:2,dayName:'Tyhjä',exercises:[{id:'e',key:'z',name:'Z',sets:[{kg:1,reps:1,done:false}]}]}); gymSave(); });

  console.log('\nKuukauden yhteenveto');
  const m=await p.evaluate(()=>{ const s=monthSummary('2026-10'); return {count:s.count,days:s.days,order:s.order,types:s.types,planned:s.planned,prog:s.prog.map(x=>`${x.name} ${x.a.kg}×${x.a.reps}→${x.b.kg}×${x.b.reps}`),two:s.byDay['2026-10-08']}; });
  ok(m.count===5&&m.days===4,'5 treeniä neljänä päivänä, tyhjä treeni ei lasketa: '+m.count+'/'+m.days);
  ok(JSON.stringify(m.order)==='["Jalat","Rinta","Selkä"]'&&m.types.Rinta===2&&m.types.Jalat===2,'treenipäivät määrän mukaan (selite): '+JSON.stringify(m.order));
  ok(JSON.stringify(m.two)==='["Rinta","Selkä"]','kaksi treeniä samana päivänä: molemmat värit');
  ok(m.planned===9,'suunnitellut treenipäivät (ma ja to lokakuussa): '+m.planned);
  ok(JSON.stringify(m.prog)==='["Penkki 80×10→90×10"]','kehitys vain liikkeille, joilla on aiempaa historiaa ja paras arvioitu maksimi nousi (Vipunosto 8 × 15 ei): '+JSON.stringify(m.prog));

  console.log('\nKuva');
  for(const pal of ['ampiainen','tekstitv']){
    await p.evaluate(pal=>document.documentElement.setAttribute('data-palette',pal),pal);
    const sz=await p.evaluate(async()=>{ const bl=await gMonthImage('2026-10'); const im=await createImageBitmap(bl); return {b:bl.size,w:im.width,h:im.height}; });
    ok(sz.b>15000&&sz.w===Math.round(412*2.6)&&sz.h>sz.w,`${pal}: kuva syntyy (${sz.w}×${sz.h}, ${Math.round(sz.b/1024)} kt)`);
  }

  console.log('\nJakopaikat');
  await p.evaluate(()=>{ setTab('treeni'); GU.mode='home'; renderGym(); }); await p.waitForTimeout(200);
  ok(await p.locator('.tr-seclink',{hasText:'Jaa kuukausi'}).isVisible(),'Tehdyt treenit -otsikossa Jaa kuukausi');
  const at=async d=>{ await p.clock.setFixedTime(new Date(d+'T10:00:00')); return p.evaluate(()=>monthShareCardHTML()); };
  const card={a:await at('2026-11-02'),b:await at('2026-11-05')};
  await p.evaluate(()=>localStorage.setItem('jarkale-month-card-2026-10','1')); card.c=await at('2026-11-02');
  ok(/Lokakuu: 5 treeniä/.test(card.a)&&!card.b&&!card.c,'kuukauden alussa ehdotus kerran (ei 4. päivästä alkaen, ei ohituksen jälkeen)');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
