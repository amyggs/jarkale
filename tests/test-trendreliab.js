// v2.18.213: Trendien luotettavuus. Muutos vain kohinarajan yli (ei arvottavia värejä), salivertailu parhaalla sarjalla
// vs. edellinen jakso (kevennysviikko ei käännä suuntaa), alustava "Yhteys datastasi" ei näy.
const { chromium, devices } = require('playwright'); const fs=require('fs');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{weight:true,recovery:true,motivation:true,steps:true,training:true},gym:{enabled:true}})); });
  await p.reload(); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{ const t=new Date(today()+'T00:00:00'); const D=o=>{ const d=new Date(t); d.setDate(t.getDate()-o); return iso(d); };
    // 56 pv: edellinen 28 pv palautuminen 3,0 / vire 3,0 / askeleet 8000; nykyinen 3,1 / 3,6 / 8300
    for(let o=0;o<56;o++){ const cur=o<28; S.entries[D(o)]={date:D(o),weight:93,recovery:cur?(o%10===0?4:3):3,motivation:cur?(o%5===0?3:4):3,steps:cur?8300:8000}; }
    const ses=(o,kg,reps)=>({id:'s'+o,date:D(o),startedAt:Date.parse(D(o)+'T17:00:00'),endedAt:Date.parse(D(o)+'T18:00:00'),exercises:[{key:'penkki',name:'Penkkipunnerrus',sets:[{kg,reps,done:true}]}]});
    G.sessions=[ses(40,100,5),ses(33,100,5), ses(25,105,5), ses(2,80,5)]; // nykyisen jakson viimeinen = kevennys
    saveAll(); S.rangeId='d28'; S.periodOffset=0; S.trendToggles={charts:false}; setTab('trendit'); renderTrendit();
    runCountUp&&0; const c=document.getElementById('content'), txt=c.innerText.replace(/ /g,' ');
    const colored=[...c.querySelectorAll('span')].filter(x=>/^[↑↓]/.test(x.textContent.trim())&&/green|red/.test(x.getAttribute('style')||'')).length;
    return {txt,colored}; });
  ok(/Palautuminen[\s\S]{0,20}3,1\/5\s*ennallaan/.test(r.txt),'pieni muutos (+0,1) näkyy "ennallaan" ('+(r.txt.match(/Palautuminen[^\n]*\n?[^\n]*/)||[''])[0].replace(/\n/g,' ')+')');
  ok(/Yleinen vire[\s\S]{0,20}3,8\/5\s*↑ \+0,8/.test(r.txt),'kohinarajan ylittävä muutos näkyy');
  ok(/Askeleet ka[\s\S]{0,30}ennallaan/.test(r.txt),'askeleiden alle 10 % muutos: ennallaan');
  ok(r.colored===0,'muutosnuolet eivät ole vihreitä tai punaisia');
  ok(/Nousi \(1\)[\s\S]*Penkkipunnerrus: 100 kg × 5 → 105 kg × 5/.test(r.txt)&&!/Laski/.test(r.txt),'kevennyskerta ei käännä suuntaa: paras sarja vs. edellinen jakso');
  ok(/Paras sarja tällä jaksolla verrattuna edelliseen/.test(r.txt),'vertailun peruste kerrotaan');
  await p.waitForTimeout(900); const st=await p.evaluate(()=>{ const t=document.getElementById('content').innerText.replace(/\u00a0/g,' '); return (t.match(/Askeleet ka[^\n]*\n?[^\n]*/)||[''])[0]; });
  ok(/ennallaan/.test(st)&&/8 300/.test(st),'askelten muutosmerkintä säilyy lukuanimaation jälkeen ('+st.replace(/\n/g,' ')+')');
  const c2=await p.evaluate(()=>{ const html=buildConnectionsHTML(iso(new Date(Date.now()-20*864e5)),today()); return html; });
  ok(c2==='','alustavaa yhteyttä (pieni otos) ei näytetä');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
