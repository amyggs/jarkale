// Järkäle Tracking v2.18.121 – teemat: luettavuus ja ylivuoto kaikissa 9 × 2 teemayhdistelmässä, 360 px
// Mittaus pikseleistä: näkymästä otetaan kuva tekstin kanssa ja ilman, ja tekstin kontrasti lasketaan kuvien erosta.
// Näin mukana ovat liukuvärit, läpikuultavat kerrokset ja koristekerrokset (::before/::after) sellaisina kuin ne näkyvät.
// Rajat: tavallinen teksti ≥ 3,0. Tarkoituksella himmeät (ehdotusarvot, placeholderit, tulevat päivät) ≥ 1,6. Ei-käytössä-napit ohitetaan.
// Viikkonauhan tulevien päivien katkoviivapallot erottuvat taustasta (≥ 1,25, v2.18.112:n bugi vaaleissa teemoissa).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
const PAL=(process.env.PAL||'ampiainen,kaurapuuro,magnesium,lasi,soitin,fosfori,kuusnelonen,tekstitv,manageri').split(',');
const TEXT_MIN=3.0, DIM_MIN=1.6, DOT_MIN=1.25;
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},deviceScaleFactor:2,serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({gender:'male',palette:'ampiainen',theme:'dark',profile:{height:190,age:42},
      tracking:{weight:true,sleep:true,recovery:true,motivation:true,training:true,notes:true},gym:{enabled:true},goals:{sleepHours:7.5,workoutsPerWeek:4,trainingDays:[1,3,5]}}));
    const E={}, now=new Date().toISOString();
    for(let i=1;i<=30;i++){ if(i%4===0) continue; const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10);
      E[d]={date:d,weight:90+Math.sin(i/3),sleep:6.5+((i*7)%10)/10,recovery:1+(i%5),motivation:1+((i+2)%5),notes:i%5?'':'Hyvä päivä',created_at:now,updated_at:now}; }
    localStorage.setItem('seuranta-entries',JSON.stringify(E)); });
  await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(async()=>{ const pr=newProgram('Ohjelma'); pr.days[0].name='Rinta';
    pr.days[0].exercises.push(newEx({name:'Penkkipunnerrus',sets:3,repsMin:8,repsMax:10}),newEx({name:'Vinopenkki',sets:3,repsMin:8}));
    pr.days.push({id:gid(),name:'Jalat',exercises:[newEx({name:'Kyykky',sets:3,repsMin:6})]}); touchProg(pr); G.curProgramId=pr.id; gymSave();
    for(let k=0;k<3;k++){ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-(3+k*3)*864e5).toISOString().slice(0,10);
      s.exercises.forEach(ex=>ex.sets.forEach(r=>{ r.kg=60+k*2.5; r.reps=8; r.done=true; })); finishSession(true); }
    await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.exercises[0].sets[0].kg=65; s.exercises[0].sets[0].reps=8; s.exercises[0].sets[0].done=true; gymSave(); });

  // Tekstialueet: tekstisolmut ja tyhjät kentät, joissa näkyy ehdotus. Rajataan näkyvään osaan, ohitetaan peittyneet.
  const collect=()=>{ const R=[], W=innerWidth, H=innerHeight;
    const DIM='.ghost,.ws-day.future'; // ei-käytössä-olevat napit ohitetaan kokonaan (esim. seuraava päivä tänään)
    const vis=el=>{ for(let e=el;e&&e.nodeType===1;e=e.parentElement){ const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return false; } return true; };
    const clip=(r,el)=>{ let L=r.left,T=r.top,Ri=r.right,B=r.bottom;
      for(let e=el.parentElement;e&&e!==document.documentElement;e=e.parentElement){ const cs=getComputedStyle(e); if(cs.overflowX!=='visible'||cs.overflowY!=='visible'){ const q=e.getBoundingClientRect(); L=Math.max(L,q.left); T=Math.max(T,q.top); Ri=Math.min(Ri,q.right); B=Math.min(B,q.bottom); } }
      return {left:Math.max(0,L),top:Math.max(0,T),right:Math.min(W,Ri),bottom:Math.min(H,B)}; };
    const add=(r0,el,txt,kind)=>{ if(el.closest(':disabled,[aria-disabled="true"]')) return; const r=clip(r0,el); if(r.right-r.left<2||r.bottom-r.top<4) return;
      if((r.right-r.left)*(r.bottom-r.top)<0.6*(r0.right-r0.left)*(r0.bottom-r0.top)) return; // suurimmaksi osaksi piilossa (vaakarullaus)
      const hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2); if(!hit||!(el.contains(hit)||hit.contains(el))) return; // toisen elementin alla
      const path=(()=>{ const a=[]; let e=el; for(let i=0;i<3&&e&&e!==document.body;i++){ a.unshift(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList.length?'.'+[...e.classList].slice(0,2).join('.'):'')); e=e.parentElement; } return a.join('>'); })();
      R.push({x:r.left,y:r.top,w:r.right-r.left,h:r.bottom-r.top,txt:txt.slice(0,30),path,dim:kind==='ghost'||!!el.closest(DIM)}); };
    const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(tw.nextNode()){ const t=tw.currentNode, s=t.textContent.trim(); if(!s) continue; const el=t.parentElement;
      if(!el||el.closest('script,style,svg,#theme-boot,.sr-only')||!vis(el)) continue;
      const rg=document.createRange(); rg.selectNodeContents(t); for(const r of rg.getClientRects()) add(r,el,s,'text'); }
    document.querySelectorAll('input[placeholder]:not([type=hidden]),textarea[placeholder]').forEach(el=>{ if(el.value||!el.placeholder.trim()||!vis(el)) return;
      const r=el.getBoundingClientRect(), cs=getComputedStyle(el), pl=parseFloat(cs.paddingLeft), pr=parseFloat(cs.paddingRight), fz=parseFloat(cs.fontSize);
      const w=Math.min(r.width-pl-pr, el.placeholder.length*fz*0.62), cy=r.top+r.height/2, ta=cs.textAlign;
      const x=ta==='center'?r.left+r.width/2-w/2:(ta==='right'||ta==='end')?r.right-pr-w:r.left+pl;
      add({left:x,right:x+w,top:cy-fz*0.6,bottom:cy+fz*0.6},el,el.placeholder,'ghost'); });
    return R; };
  // Kahden kuvan vertailu sivun kankaalla: tekstin pikselit = suurin ero kuvien välillä
  const compare=(a,bimg,rects,frac)=>p.evaluate(async([a,bimg,rects,frac])=>{
    const load=src=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src='data:image/png;base64,'+src; });
    const [A,B]=await Promise.all([load(a),load(bimg)]);
    const cv=n=>{ const c=document.createElement('canvas'); c.width=n.width; c.height=n.height; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(n,0,0); return x; };
    const ca=cv(A), cb=cv(B), D=2;
    const lum=(r,g,b)=>{ const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);}; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
    return rects.map(R=>{ const x=Math.round(R.x*D), y=Math.round(R.y*D), w=Math.max(1,Math.round(R.w*D)), h=Math.max(1,Math.round(R.h*D));
      if(x+w>A.width||y+h>A.height) return {...R,cr:null};
      const da=ca.getImageData(x,y,w,h).data, db=cb.getImageData(x,y,w,h).data, px=[];
      for(let i=0;i<da.length;i+=4) px.push([Math.abs(da[i]-db[i])+Math.abs(da[i+1]-db[i+1])+Math.abs(da[i+2]-db[i+2]),i]);
      px.sort((u,v)=>v[0]-u[0]); if(px[0][0]<6) return {...R,cr:1};
      const n=Math.max(1,Math.round(px.length*frac)), cs=[];
      for(let k=0;k<n;k++){ const i=px[k][1], lt=lum(da[i],da[i+1],da[i+2]), lb=lum(db[i],db[i+1],db[i+2]); cs.push((Math.max(lt,lb)+.05)/(Math.min(lt,lb)+.05)); }
      cs.sort((u,v)=>v-u); return {...R,cr:+cs[Math.floor(cs.length*0.25)].toFixed(2)}; });
  },[a,bimg,rects,frac]);
  // :is(#__x,*) nostaa tarkkuuden id-tasolle, jotta teemojen !important-säännöt eivät jää voimaan
  const HIDE=`:is(#__x,*),:is(#__x,*)::before,:is(#__x,*)::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}
    :is(#__x,*)::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important}`;
  const shot=async()=>(await p.screenshot()).toString('base64');
  const withStyle=async(css,f)=>{ await p.evaluate(css=>{ const s=document.createElement('style'); s.id='__t'; s.textContent=css; document.head.appendChild(s); },css); await p.waitForTimeout(60); const r=await f(); await p.evaluate(()=>document.getElementById('__t').remove()); return r; };
  const VIEWS={
    'Kirjaa':()=>{ GU.mode='home'; setTab('log'); },
    'Trendit':()=>setTab('trendit'),
    'Mitat':()=>setTab('historia'),
    'Asetukset':()=>setTab('asetukset'),
    'Treeni':()=>{ setTab('treeni'); GU.mode='home'; GU.sessionId=null; renderGym(); },
    'Treeni käynnissä':()=>{ setTab('treeni'); GU.mode='session'; GU.sessionId=G.activeId; renderGym(); },
  };
  const fmt=x=>`${x.cr} "${x.txt}" (${x.path.split('>').pop()})`;
  for(const pal of PAL) for(const th of ['light','dark']){
    await p.evaluate(([pal,th])=>{ S.settings.palette=pal; S.settings.theme=th; document.documentElement.setAttribute('data-palette',pal); document.documentElement.setAttribute('data-theme',th); updateMetaThemeColor(); saveAll(); },[pal,th]);
    const badT=[], badD=[], over=[]; let n=0, dots=null;
    for(const [v,fn] of Object.entries(VIEWS)){
      await p.setViewportSize({width:360,height:800});
      await p.evaluate(`(${fn.toString()})()`); await p.waitForTimeout(250);
      // koko näkymä kerralla: ikkuna yhtä korkeaksi kuin rullattava sisältö
      const H=await p.evaluate(()=>{ let m=Math.max(800,document.documentElement.scrollHeight); document.querySelectorAll('body *').forEach(e=>{ if(e.scrollHeight>e.clientHeight+5&&/auto|scroll/.test(getComputedStyle(e).overflowY)) m=Math.max(m,e.scrollHeight+(innerHeight-e.clientHeight)); }); return m; });
      await p.setViewportSize({width:360,height:Math.min(H,7000)}); await p.waitForTimeout(250);
      const sw=await p.evaluate(()=>document.documentElement.scrollWidth); if(sw>361) over.push(v+' '+sw+' px');
      const rects=await p.evaluate(collect);
      const a=await shot(); const bi=await withStyle(HIDE,shot);
      const res=(await compare(a,bi,rects,0.04)).filter(x=>x.cr!=null); n+=res.length;
      res.forEach(x=>{ if(x.dim? x.cr<DIM_MIN : x.cr<TEXT_MIN) (x.dim?badD:badT).push(v+': '+fmt(x)); });
      if(v==='Kirjaa'){ // tulevien päivien katkoviivapallot
        const dr=await p.evaluate(()=>[...document.querySelectorAll('#week-status .ws-day.future .ws-dot')].map(e=>{ const r=e.getBoundingClientRect(); return {x:r.left-2,y:r.top-2,w:r.width+4,h:r.height+4,txt:'pallo',path:'ws-dot'}; }));
        if(dr.length){ const a2=await withStyle(HIDE,shot); const b2=await withStyle(HIDE+'#week-status .ws-dot{visibility:hidden!important}',shot);
          dots=Math.min(...(await compare(a2,b2,dr,0.02)).map(x=>x.cr)); }
      }
    }
    const name=pal+' / '+(th==='light'?'vaalea':'tumma');
    ok(!over.length,`${name}: ei vaakaylivuotoa 360 px leveydellä ${over.join(', ')}`);
    ok(!badT.length,`${name}: teksti luettavissa (${n} tekstiä, raja ${TEXT_MIN})${badT.length?'\n      '+[...new Set(badT)].slice(0,6).join('\n      '):''}`);
    ok(!badD.length,`${name}: himmeät ehdotukset erottuvat (raja ${DIM_MIN})${badD.length?'\n      '+[...new Set(badD)].slice(0,6).join('\n      '):''}`);
    ok(dots==null||dots>=DOT_MIN,`${name}: tulevien päivien pallot erottuvat taustasta (${dots})`);
    ok(await p.evaluate(()=>!!document.querySelector('meta[name="theme-color"]').content),`${name}: tilarivin väri asetettu`);
  }
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
