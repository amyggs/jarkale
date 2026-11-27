// v2.18.211: harvoin mitattavat Trendeissä. Kerran viikossa mitattu verenpaine näkyy käyränä myös viikkonäkymässä
// (vähintään 8 viimeisintä mittausta 90 päivältä), verensokerin käyrä, migreenipäivät viikoittain.
const { chromium, devices } = require('playwright'); const fs=require('fs');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{weight:true,bp:true,bloodSugar:true,migraine:true}})); });
  await p.reload(); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{ const t=new Date(today()+'T00:00:00');
    for(let k=0;k<12;k++){ const d=new Date(t); d.setDate(t.getDate()-7*k); const ds=iso(d); S.entries[ds]={date:ds,bp_sys:120+k,bp_dia:80,blood_sugar:5+k/10}; } // kerran viikossa, 12 viikkoa
    [1,2,9,30].forEach(o=>{ const d=new Date(t); d.setDate(t.getDate()-o); const ds=iso(d); S.entries[ds]={...(S.entries[ds]||{date:ds}),migraine:true,migraine_severity:2}; });
    saveAll(); S.rangeId='vko'; S.periodOffset=0; S.trendToggles={charts:true}; setTab('trendit'); renderTrendit();
    const heads=[...document.querySelectorAll('#trendit-content .section-head, .section-head')].map(h=>h.innerText.replace(/ /g,' '));
    const bpSvg=document.querySelector('svg[aria-label="Verenpaine"]'), bsSvg=document.querySelector('svg[aria-label="Verensokeri"]'), mig=document.querySelector('svg[aria-label="Migreenipäivät viikoittain"]');
    const sp=sparsePts(e=>e.bp_sys!=null,iso(t),iso(t));
    const tg=document.getElementById('content').innerText;
    return {tg,heads:heads.join(' | '),bp:!!bpSvg,bs:!!bsSvg,bsCircles:bsSvg?bsSvg.querySelectorAll('circle').length:0,mig:!!mig,migTxt:mig?[...mig.querySelectorAll('text')].map(x=>x.textContent).filter(x=>/^\d+$/.test(x)).join(','):'',spN:sp.pts.length,spExt:sp.ext,spOld:sp.pts[0].date};
  });
  ok(r.bp&&/Verenpaine · viimeiset 8 mittausta/.test(r.heads)&&/Graafit/.test(r.tg),'viikkonäkymä: Graafit-osiossa verenpaineen käyrä 8 viimeisestä mittauksesta, otsikko kertoo sen');
  ok(r.spN===8&&r.spExt,'harvat mittaukset: 8 viimeisintä, jakso laajenee taaksepäin');
  ok(r.bs&&r.bsCircles===8&&/Verensokeri · viimeiset 8 mittausta/.test(r.heads),'verensokerin käyrä (8 mittausta)');
  ok(r.mig&&r.migTxt.split(',').reduce((a,b)=>a+(+b),0)===4&&/Migreenipäivät/.test(r.heads),'migreenipäivät viikoittain ('+r.migTxt+')');
  const r28=await p.evaluate(()=>{ S.rangeId='d28'; renderTrendit(); const c=[...document.querySelectorAll('.tcard')].find(x=>/Verenpaine/.test(x.querySelector('.tc-h').innerText)); return {bp:!!c&&!!c.querySelector('svg[aria-label="Verenpaine"]'),t:c?c.innerText.replace(/\u00a0/g,' '):''}; });
  ok(r28.bp&&/käyrässä viimeiset 8 mittausta/.test(r28.t)&&/4 mittausta/.test(r28.t),'28 pv: Verenpaine-kortti, jakson ka 4 mittauksesta, käyrä täydennetty 8 viimeiseen');
  // 90 päivän raja ja tiheä mittaus: jakson omat riittävät
  const r2=await p.evaluate(()=>{ const t=new Date(today()+'T00:00:00'); const f=d=>iso(d);
    const old=new Date(t); old.setDate(t.getDate()-100); S.entries={}; S.entries[f(old)]={date:f(old),bp_sys:150,bp_dia:95}; S.entries[today()]={date:today(),bp_sys:118,bp_dia:76};
    const a=sparsePts(e=>e.bp_sys!=null,today(),today());
    S.entries={}; for(let i=0;i<10;i++){ const d=new Date(t); d.setDate(t.getDate()-i); S.entries[f(d)]={date:f(d),bp_sys:120,bp_dia:80}; }
    const st=new Date(t); st.setDate(t.getDate()-9); const b2=sparsePts(e=>e.bp_sys!=null,f(st),today());
    S.rangeId='vko'; renderTrendit(); const noMig=!document.querySelector('svg[aria-label="Migreenipäivät viikoittain"]');
    return {a:a.pts.length,b:b2.pts.length,bext:b2.ext,noMig}; });
  ok(r2.a===1,'yli 90 päivää vanhaa ei oteta mukaan');
  ok(r2.b===10&&!r2.bext,'tiheästi mitattu: jakson omat mittaukset, ei laajennusta');
  ok(r2.noMig,'ei migreenejä 8 viikossa: ei kaaviota');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
