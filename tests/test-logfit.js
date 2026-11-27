// v2.18.219: Kirjaa-näkymän paino, uni ja askeleet puhelimessa. Kolme korttia rinnakkain, kun pisimmät luvut mahtuvat (logFit),
// muuten askeleet tiiviinä rivinä. Kaikissa teemoissa, tekstikoot 1 / 1,15 / 1,3, leveydet 360 ja 412: luvut eivät leikkaudu eivätkä mene päällekkäin.
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
const PAL=['ampiainen','kaurapuuro','magnesium','lasi','soitin','fosfori','kuusnelonen','tekstitv','manageri'];
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const errs=[];
  const run=async(W,ts,checkAll)=>{
    const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:W,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
    await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8765/index.html');
    const res=[];
    for(const pal of (checkAll?PAL:['ampiainen'])) for(const th of (checkAll?['light','dark']:['dark'])){
      await p.evaluate(([pal,th,ts])=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('jarkale-news-seen','["x"]'); localStorage.setItem('jarkale-fb-later',String(Date.now())); localStorage.setItem('jarkale-textsize',ts);
        localStorage.setItem('seuranta-settings',JSON.stringify({palette:pal,theme:th,tracking:{weight:true,sleep:true,steps:true,recovery:true,motivation:true}})); },[pal,th,String(ts)]);
      await p.reload(); await p.waitForFunction(()=>typeof logFit==='function');
      await p.evaluate(()=>{ S.entries[today()]={date:today(),weight:108.9,sleep:10+55/60,steps:18888}; saveAll(); });
      await p.reload(); await p.waitForFunction(()=>typeof logFit==='function'); await p.waitForTimeout(400);
      res.push(await p.evaluate(()=>{
        const vl=document.getElementById('view-log'), r3=vl.classList.contains('r3p');
        const inpFits=el=>{ const cs=getComputedStyle(el), c=document.createElement('canvas').getContext('2d'); c.font=cs.font; const w=c.measureText(el.value).width+(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0); return w<=el.clientWidth+1; };
        const hm=document.getElementById('sleep-hm'), rg=document.createRange(); rg.selectNodeContents(hm); const hmOk=rg.getBoundingClientRect().width<=hm.parentNode.clientWidth+1;
        const iw=document.getElementById('inp-weight'), kg=iw.parentNode.querySelector('span'); const cs=getComputedStyle(iw), c=document.createElement('canvas').getContext('2d'); c.font=cs.font;
        const tw=c.measureText(iw.value).width, ir=iw.getBoundingClientRect(), kr=kg.getBoundingClientRect();
        const textRight=cs.textAlign==='center'?ir.left+(ir.width+tw)/2:ir.left+(parseFloat(cs.paddingLeft)||0)+tw;
        const kgOk=!r3||textRight<=kr.left+1;
        const st=document.getElementById('track-steps-wrap'), cols=[...vl.children].filter(e=>e.offsetParent&&/track-(weight|sleep|steps)-wrap/.test(e.id)).map(e=>Math.round(e.getBoundingClientRect().top));
        return {r3,steps:inpFits(document.getElementById('inp-steps')),weight:inpFits(iw),hmOk,kgOk,oneRow:new Set(cols).size===1,
          stepsH:st.getBoundingClientRect().height};
      }));
    }
    await ctx.close(); return res;
  };
  // 412 px, normaali: Järkäle-teemassa kolme korttia rinnakkain
  const n=await run(412,1,false);
  ok(n[0].r3&&n[0].oneRow,'412 px, normaali teksti: paino, uni ja askeleet samalla rivillä');
  // 412 px, Järkäle-koko: ei mahdu → askeleet tiiviinä rivinä, matala kortti
  const j=await run(412,1.3,false);
  ok(!j[0].r3&&!j[0].oneRow&&j[0].stepsH<110,'412 px, Järkäle-koko: askeleet omana tiiviinä rivinään (korkeus '+Math.round(j[0].stepsH)+' px)');
  // kaikki teemat ja koot: luvut mahtuvat
  for(const W of [360,412]) for(const ts of [1,1.15,1.3]){
    const r=await run(W,ts,true);
    const bad=r.map((x,i)=>(x.steps&&x.weight&&x.hmOk&&x.kgOk)?null:PAL[i>>1]+(i%2?'/tumma':'/vaalea')+JSON.stringify(x)).filter(Boolean);
    ok(!bad.length,`${W} px, tekstikoko ${ts}: luvut mahtuvat kaikissa 18 teemassa (rinnakkain ${r.filter(x=>x.r3).length})`+(bad.length?' '+bad.join(' '):''));
  }
  // tabletti ei muutu (row3 tabletin säännöillä, ei r3p)
  { const ctx=await b.newContext({viewport:{width:800,height:900},serviceWorkers:'block'}); const p=await ctx.newPage(); await p.goto('http://localhost:8765/index.html');
    await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('jarkale-news-seen','["x"]'); localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{weight:true,sleep:true,steps:true,recovery:true,motivation:true}})); });
    await p.reload(); await p.waitForTimeout(800);
    const t=await p.evaluate(()=>{ const vl=document.getElementById('view-log'); return {r3p:vl.classList.contains('r3p'),row3:vl.classList.contains('row3')}; });
    ok(!t.r3p&&t.row3,'tabletti: ennallaan (tabletin kolmen kortin asettelu)'); await ctx.close(); }
  ok(!errs.length,'ei JS-virheitä'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(`\n${pass}/${pass+fail} läpi`); await b.close(); process.exit(fail?1:0);
})();
