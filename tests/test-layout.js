// Järkäle Tracking v2.18.158 – tabletti ja tietokone: puhelin ennallaan, tabletilla leveämpi palsta, tietokoneella sivupalkki
// palstan vasemmalla puolella kaikissa teemoissa, kaaviot sisältöalueen levyisiä ja piirretään uudelleen, kun leveys muuttuu.
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
const PAL=['ampiainen','kaurapuuro','magnesium','lasi','soitin','fosfori','kuusnelonen','tekstitv','manageri'];
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
const seed=async(p,pal,th)=>{ await p.evaluate(([pal,th])=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));
  localStorage.setItem('seuranta-settings',JSON.stringify({palette:pal,theme:th,tracking:{weight:true,sleep:true},gym:{enabled:true}}));
  const E={},now=new Date().toISOString(); for(let i=0;i<40;i++){ const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10); E[d]={date:d,weight:84+i%3*0.2,sleep:7,created_at:now,updated_at:now}; } localStorage.setItem('seuranta-entries',JSON.stringify(E));},[pal,th]); await p.reload(); await p.waitForTimeout(500); };
const errs=[];
// puhelin
const ph=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage(); ph.on('pageerror',e=>errs.push(e.message));
await ph.goto('http://localhost:8765/index.html'); await seed(ph,'ampiainen','dark');
const r1=await ph.evaluate(()=>{ const a=document.getElementById('app').getBoundingClientRect(), n=document.getElementById('nav').getBoundingClientRect(); return {aw:a.width,vw:innerWidth,nb:n.bottom,vh:innerHeight,nw:n.width,cw:chartW()}; });
ok(r1.aw===r1.vw&&r1.nb>r1.vh-30&&r1.nw>r1.vw*0.8,'puhelin: koko levyinen, alapalkki alhaalla');
ok(r1.cw===340,'puhelin: kaavion leveys ennallaan (340)');
// tabletti
const tb=await (await b.newContext({viewport:{width:744,height:1133},serviceWorkers:'block'})).newPage(); tb.on('pageerror',e=>errs.push(e.message));
await tb.goto('http://localhost:8765/index.html'); await seed(tb,'ampiainen','light');
const r2=await tb.evaluate(()=>{ const a=document.getElementById('app').getBoundingClientRect(), n=document.getElementById('nav').getBoundingClientRect(); return {aw:a.width,vw:innerWidth,nb:n.bottom,vh:innerHeight,cw:chartW(),z:parseFloat(getComputedStyle(document.body).zoom)||1}; });
ok(r2.z===1.2&&Math.abs(r2.aw-r2.vw)<2&&r2.nb>r2.vh-40,'tabletti: 120 %, palsta täyttää ruudun, alapalkki alhaalla');
await tb.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('seuranta-settings')); s.tracking.steps=true; s.tracking.recovery=true; s.tracking.motivation=true; localStorage.setItem('seuranta-settings',JSON.stringify(s)); }); await tb.reload(); await tb.waitForTimeout(500);
const r3=await tb.evaluate(()=>{ const t=id=>document.getElementById(id).getBoundingClientRect(); const w=t('track-weight-wrap'),sl=t('track-sleep-wrap'),st=t('track-steps-wrap'),rc=t('track-recovery-wrap'),m=t('track-motivation-wrap');
  return {row:Math.abs(w.top-sl.top)<2&&Math.abs(w.top-st.top)<2&&st.left>sl.left, pair:Math.abs(rc.top-m.top)<2&&rc.top>w.bottom}; });
ok(r3.row&&r3.pair,'tabletti: paino, uni ja askeleet samalla rivillä, palautuminen ja vire alla rinnakkain');
const r4=await ph.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('seuranta-settings')); s.tracking.steps=true; localStorage.setItem('seuranta-settings',JSON.stringify(s)); return true; }); await ph.reload(); await ph.waitForTimeout(500);
ok(await ph.evaluate(()=>{ const w=document.getElementById('track-weight-wrap').getBoundingClientRect(), st=document.getElementById('track-steps-wrap').getBoundingClientRect(); return st.top>w.bottom-2&&Math.abs(st.width-innerWidth+32)<20; }),'puhelin: askeleet ennallaan omalla rivillään');
ok(r2.cw>500,'tabletti: kaavio sisältöalueen levyinen ('+r2.cw+')');
// tietokone, kaikki teemat
const dk=await (await b.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'})).newPage(); dk.on('pageerror',e=>errs.push(e.message));
await dk.goto('http://localhost:8765/index.html');
const bad=[];
for(const pal of PAL) for(const th of ['dark','light']){ await seed(dk,pal,th);
  const r=await dk.evaluate(()=>{ const a=document.getElementById('app').getBoundingClientRect(), n=document.getElementById('nav').getBoundingClientRect(); return {z:parseFloat(getComputedStyle(document.body).zoom)||1,al:a.left,aw:a.width,nr:n.right,nl:n.left,nh:n.height,nw:n.width,vis:getComputedStyle(document.getElementById('nav')).display!=='none'}; });
  if(!(Math.abs(r.aw-760*r.z)<2&&r.vis&&r.nr<=r.al-8&&r.nl>=0&&r.nh>r.nw&&r.nh<700)) bad.push(pal+'/'+th+' '+JSON.stringify(r)); }
ok(bad.length===0,'tietokone: sivupalkki palstan vasemmalla puolella kaikissa 18 teemassa '+bad.join(' | '));
await dk.evaluate(()=>{ setTab('trendit'); }); await dk.waitForTimeout(400);
const vb=await dk.evaluate(()=>{ const s=document.querySelector('#view-trendit svg[role=img]'); return s?+s.getAttribute('viewBox').split(' ')[2]:0; });
ok(vb>600,'tietokone: Trendit-kaavio piirretty leveänä ('+vb+'), ei venytetty');
await dk.setViewportSize({width:412,height:900}); await dk.waitForTimeout(700);
const vb2=await dk.evaluate(()=>{ const s=document.querySelector('#view-trendit svg[role=img]'); return s?+s.getAttribute('viewBox').split(' ')[2]:0; });
ok(vb2===340,'ikkunan kaventaminen piirtää kaavion uudelleen puhelinleveyteen ('+vb2+')');
await dk.setViewportSize({width:2560,height:1440}); await dk.waitForTimeout(500);
const z=await dk.evaluate(()=>parseFloat(getComputedStyle(document.body).zoom)||1);
ok(z>1.4,'iso näyttö: sovellus suurenee ('+z+')');
ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);})();
