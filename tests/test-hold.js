// Järkäle Tracking v2.18.148 – Kirjaa-näkymän −/+ pohjassa: arvo juoksee; askeleet 100 välein
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
    localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'dark',tracking:{weight:true,sleep:true,steps:true,recovery:true,motivation:true}})); });
  await p.reload(); await p.waitForTimeout(500);
  const plus=p.locator('#track-steps-wrap .stepper-btn').nth(1), minus=p.locator('#track-steps-wrap .stepper-btn').nth(0);
  const val=()=>p.evaluate(()=>S.steps);
  await plus.scrollIntoViewIfNeeded();
  await plus.click(); ok(await val()===100,'napautus: 0 → 100 (ennen 500)');
  await p.evaluate(()=>{ S.steps=7234; renderSteppers(); });
  await plus.click(); ok(await val()===7300,'napautus tasaa sadan ruudukkoon: 7 234 → 7 300: '+await val());
  await minus.click(); ok(await val()===7200,'miinus: 7 300 → 7 200');
  const bx=await plus.boundingBox();
  await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2); await p.mouse.down(); await p.waitForTimeout(300);
  ok(await val()===7200,'lyhyt painallus ei vielä juokse');
  await p.waitForTimeout(2200); const mid=await val(); await p.mouse.up(); await p.waitForTimeout(150); const after=await val();
  ok(mid>=9000&&mid%100===0,'pohjassa arvo juoksee ja kiihtyy (2,5 s → '+mid+')');
  ok(after===mid,'irrotuksen jälkeen ei ylimääräistä askelta ('+mid+' → '+after+')');
  await plus.click(); ok(await val()===after+100,'tavallinen napautus toimii pidon jälkeen');
  // pyyhkäisy napin päältä ei käynnistä juoksua
  const bx2=await plus.boundingBox(); Object.assign(bx,bx2);
  const v0=await val(); await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2); await p.mouse.down(); await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2+90,{steps:6}); await p.waitForTimeout(900); await p.mouse.up();
  ok(await val()===v0,'liikkuva sormi (vieritys) ei muuta arvoa: '+v0+' → '+await val());
  // uni: pohjassa 5 minuutin askelin
  await p.evaluate(()=>{ S.sleep=7; renderSteppers(); });
  const sp=p.locator('#track-sleep-wrap .stepper-btn, .stepper-btn[onclick^="adj(\'sleep\',0.25"]').last(); const sb=await sp.boundingBox();
  await p.mouse.move(sb.x+sb.width/2,sb.y+sb.height/2); await p.mouse.down(); await p.waitForTimeout(1200); await p.mouse.up(); await p.waitForTimeout(100);
  const sl=await p.evaluate(()=>S.sleep); ok(sl>7.2&&Math.abs(Math.round(sl*60)%5)===0,'uni juoksee 5 min askelin: '+sl);
  ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.stepper-btn')).userSelect)==='none','pitkä painallus ei valitse tekstiä');
  // v2.18.151: tyhjästä kentästä ensimmäinen painallus tuo viime päivien tason (keksitty historia: 7 päivää, keskiarvo 8 143 → 8 000)
  const base=await p.evaluate(()=>{ const now=new Date().toISOString(); [9000,7000,8000,10000,6000,8500,8500].forEach((v,i)=>{ const d=new Date(Date.now()-(i+1)*864e5).toISOString().slice(0,10); S.entries[d]={date:d,steps:v,created_at:now,updated_at:now}; });
    const old=new Date(Date.now()-60*864e5).toISOString().slice(0,10); S.entries[old]={date:old,steps:30000,created_at:now,updated_at:now};
    S.steps=null; renderSteppers(); return stepsBase(S.date); });
  ok(base===8000,'lähtöarvo = 7 viime päivän keskiarvo 500:n tarkkuudella, vanha päivä ei vaikuta: '+base);
  await plus.click(); ok(await val()===8000,'tyhjä kenttä + → 8 000 (ei 100): '+await val());
  await plus.click(); ok(await val()===8100,'siitä eteenpäin 100 kerrallaan: '+await val());
  await p.evaluate(()=>{ S.steps=null; renderSteppers(); }); await minus.click(); ok(await val()===8000,'tyhjä kenttä − → sama lähtöarvo');
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
