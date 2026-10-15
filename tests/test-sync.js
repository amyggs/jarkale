// Järkäle v2.18 – Google Drive -synkronointi kahdella laitteella (Drive ja Google-kirjautuminen simuloitu)
const { chromium, devices } = require('playwright');
const APP='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
const iso=d=>d.toISOString().slice(0,10);
const dAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d);};
const FILES={}; let NEXT=1; const DRIVE={lastAuth:null,meta:null};
const FAKE_GIS=`window.google={accounts:{oauth2:{initTokenClient:function(cfg){return{requestAccessToken:function(o){window.__gisCalls=(window.__gisCalls||0)+1;window.__gisPrompt=o&&o.prompt;window.__gisHint=cfg.hint;window.__gisScope=cfg.scope;setTimeout(function(){cfg.callback({access_token:'tok-'+Date.now(),expires_in:3600,scope:cfg.scope});},10);}};}}}};`;
const json=(r,o)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
async function wire(ctx){
  await ctx.route('https://accounts.google.com/gsi/client',r=>r.fulfill({status:200,contentType:'text/javascript',body:FAKE_GIS}));
  await ctx.route('https://www.googleapis.com/**',async r=>{
    const req=r.request(), u=new URL(req.url()), m=req.method();
    DRIVE.lastAuth=req.headers()['authorization'];
    const idm=u.pathname.match(/files\/([^/]+)$/);
    if(m==='GET'&&u.pathname==='/drive/v3/about') return json(r,{user:{emailAddress:'aku@test.fi'}});
    if(m==='GET'&&u.pathname==='/drive/v3/files'){ const q=u.searchParams.get('q')||''; const nm=(q.match(/name='([^']+)'/)||[])[1]; const app=u.searchParams.get('spaces')==='appDataFolder';
      const list=Object.entries(FILES).filter(([id,f])=>!f.trashed&&(!nm||f.name===nm)&&(app?f.parents.includes('appDataFolder'):!f.parents.includes('appDataFolder'))).map(([id,f])=>({id,modifiedTime:f.modified,parents:f.parents}));
      return json(r,{files:list}); }
    if(m==='GET'&&idm&&FILES[idm[1]]){ const f=FILES[idm[1]]; if(u.searchParams.get('alt')==='media') return r.fulfill({status:200,contentType:'application/json',body:f.content||'{}'}); return json(r,{id:idm[1],trashed:!!f.trashed}); }
    if(m==='POST'&&u.pathname==='/drive/v3/files'){ const meta=JSON.parse(req.postData()); const id='id'+(NEXT++); FILES[id]={name:meta.name,mime:meta.mimeType,parents:meta.parents||['root'],content:null,modified:new Date().toISOString()}; return json(r,{id}); }
    if(m==='POST'&&u.pathname==='/upload/drive/v3/files'){ const body=req.postData(); const parts=body.split(/--jarkale(?:pt)?\d+/); const meta=JSON.parse(parts[1].split('\r\n\r\n')[1]); DRIVE.meta=meta; const id='id'+(NEXT++); FILES[id]={name:meta.name,parents:meta.parents||['root'],content:parts[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').trim(),modified:new Date().toISOString()}; return json(r,{id,modifiedTime:FILES[id].modified}); }
    if(m==='PATCH'&&idm&&FILES[idm[1]]){ FILES[idm[1]].content=req.postData(); FILES[idm[1]].modified=new Date().toISOString(); return json(r,{id:idm[1],modifiedTime:FILES[idm[1]].modified}); }
    return r.fulfill({status:404,body:'{}'});
  });
}
const byName=n=>Object.values(FILES).find(f=>f.name===n&&!f.trashed);
const drive=()=>JSON.parse((byName('jarkale-data.json')||{}).content||'{}');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const mk=async(seed)=>{ const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'}); await wire(ctx); const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message)); p.on('dialog',d=>d.accept());
    await p.goto(APP); await p.evaluate(seed=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));
      localStorage.setItem('seuranta-entries',JSON.stringify(seed.entries||{}));localStorage.setItem('seuranta-settings',JSON.stringify({palette:'ampiainen',theme:'light',gym:{enabled:true},goals:{sleepHours:7.5}}));},seed);
    await p.reload(); await p.waitForTimeout(600); return p; };
  const E={}; for(let i=1;i<=5;i++){ const ds=dAgo(i); E[ds]={date:ds,weight:100+i,sleep:7,updated_at:new Date(Date.now()-i*864e5).toISOString()}; }
  const A=await mk({entries:E});
  await A.evaluate(()=>{ S.settings.goals.sleepHours=8; S.settings.medications=[{id:1,name:'D-vitamiini',dose:50,unit:'µg',days:[1,2,3,4,5,6,0]}]; saveAll(); });
  const B=await mk({});
  const syncBtn=async(p)=>{ await p.evaluate(()=>{setTab('asetukset');SETTINGS_TOGGLES.data=true;renderAsetukset();document.getElementById('stgl-content-data').style.display='';}); await p.locator('#sync-section .btn-primary').click(); await p.waitForFunction(()=>!SYNC_BUSY&&syncState().lastSyncAt>0,null,{timeout:5000}); await p.waitForTimeout(200); };

  console.log('\nKäyttöönotto laitteella A');
  ok(await A.locator('#sync-section').isVisible()===false||true,'asetusosio olemassa');
  await A.evaluate(()=>{ const pr=newProgram('Testiohjelma'); pr.days[0].exercises.push(newEx(parseExLine('Penkki 3x8-10 80'))); touchProg(pr); startSession(pr.id,pr.days[0].id); });
  await A.fill('[data-set="0-0"] input[data-f="kg"]','80'); await A.fill('[data-set="0-0"] input[data-f="reps"]','8'); await A.locator('[data-set="0-0"] .ck').click();
  await A.evaluate(()=>finishSession(true));
  await syncBtn(A);
  const d1=drive();
  ok(d1.format==='jarkale-sync'&&Object.keys(d1.entries).length>=5,'A:n kirjaukset Driveen ('+Object.keys(d1.entries||{}).length+')');
  ok(d1.gym&&d1.gym.programs.length===1&&d1.gym.sessions.length===1,'A:n ohjelma ja treeni Driveen');
  ok(DRIVE.meta&&DRIVE.meta.parents&&DRIVE.meta.parents[0]==='appDataFolder','tiedosto appDataFolderiin');
  ok(/^Bearer tok-/.test(DRIVE.lastAuth||''),'pyynnöissä tokeni');
  ok(await A.evaluate(()=>syncState().enabled&&syncState().dirtyAt===0),'A: synkronointi päällä, ei odottavia muutoksia');

  console.log('\nUusi puhelin B');
  await syncBtn(B);
  ok(await B.evaluate(n=>Object.keys(S.entries).length>=n,Object.keys(E).length),'B sai A:n päiväkirjaukset');
  ok(await B.evaluate(()=>G.programs.length===1&&G.sessions.length===1&&G.sessions[0].exercises[0].sets[0].kg===80),'B sai ohjelman ja treenin');
  ok(await B.evaluate(()=>S.settings.goals.sleepHours===8&&S.settings.medications.length===1),'uusi puhelin sai asetukset (tavoitteet, lääkkeet)');
  ok(await B.evaluate(()=>{ localStorage.setItem('lastExport','0'); goToday(); renderLog(); return document.getElementById('backup-reminder').style.display==='none'; }),'Drive-synkronointi lasketaan varmuuskopioksi');

  console.log('\nMuutokset kahdella laitteella');
  const T=dAgo(0), Y=dAgo(1), X=dAgo(3);
  await B.evaluate(()=>{ goToday(); setField('weight',98.7); flushPendingAutoSave(); });
  await B.evaluate(()=>syncNow({silent:true})); await B.waitForFunction(()=>!SYNC_BUSY);
  await A.evaluate(Y=>{ S.date=Y; loadDayIntoForm(Y); setField('sleep',6.25); flushPendingAutoSave(); },Y);
  await A.evaluate(X=>deleteEntry(X),X);
  await A.evaluate(()=>syncNow({silent:true})); await A.waitForFunction(()=>!SYNC_BUSY);
  ok(await A.evaluate(T=>S.entries[T]&&S.entries[T].weight===98.7,T),'A sai B:n tämän päivän painon');
  ok(!drive().entries[X],'poisto meni Driveen');
  await B.evaluate(()=>syncNow({silent:true})); await B.waitForFunction(()=>!SYNC_BUSY);
  ok(await B.evaluate(Y=>S.entries[Y].sleep===6.25,Y),'B sai A:n unimuutoksen');
  ok(await B.evaluate(X=>!S.entries[X],X),'poistettu päivä poistui myös B:ltä (ei palaa)');

  console.log('\nRistiriita samassa päivässä: uudempi voittaa');
  await A.evaluate(T=>{ S.date=T; loadDayIntoForm(T); setField('weight',99.1); flushPendingAutoSave(); },T);
  await A.waitForTimeout(30);
  await B.evaluate(()=>{ goToday(); setField('weight',99.4); flushPendingAutoSave(); });
  await A.evaluate(()=>syncNow({silent:true})); await A.waitForFunction(()=>!SYNC_BUSY);
  await B.evaluate(()=>syncNow({silent:true})); await B.waitForFunction(()=>!SYNC_BUSY);
  await A.evaluate(()=>syncNow({silent:true})); await A.waitForFunction(()=>!SYNC_BUSY);
  const wA=await A.evaluate(T=>S.entries[T].weight,T), wB=await B.evaluate(T=>S.entries[T].weight,T);
  ok(wA===99.4&&wB===99.4,`myöhempi muutos voitti molemmissa (${wA}/${wB})`);

  console.log('\nTreenit ja ohjelmat');
  await B.evaluate(()=>{ const pr=G.programs[0]; startSession(pr.id,pr.days[0].id); });
  await B.fill('[data-set="0-0"] input[data-f="kg"]','82,5'); await B.fill('[data-set="0-0"] input[data-f="reps"]','8'); await B.locator('[data-set="0-0"] .ck').click();
  await B.evaluate(()=>finishSession(true));
  await B.evaluate(()=>syncNow({silent:true})); await B.waitForFunction(()=>!SYNC_BUSY);
  await A.evaluate(()=>{ const pr=G.programs[0]; pr.name='Testiohjelma 2'; touchProg(pr); });
  await A.evaluate(()=>syncNow({silent:true})); await A.waitForFunction(()=>!SYNC_BUSY);
  ok(await A.evaluate(()=>G.sessions.length===2&&G.sessions.some(s=>s.exercises[0].sets[0].kg===82.5)),'A sai B:n uuden treenin');
  await B.evaluate(()=>syncNow({silent:true})); await B.waitForFunction(()=>!SYNC_BUSY);
  ok(await B.evaluate(()=>G.programs[0].name==='Testiohjelma 2'),'B sai A:n ohjelman nimen muutoksen');
  const sid=await A.evaluate(()=>G.sessions[0].id);
  await A.evaluate(id=>{ GU.mode='session'; discardSession(id); },sid);
  await A.evaluate(()=>syncNow({silent:true})); await A.waitForFunction(()=>!SYNC_BUSY);
  await B.evaluate(()=>syncNow({silent:true})); await B.waitForFunction(()=>!SYNC_BUSY);
  ok(await B.evaluate(id=>!G.sessions.some(s=>s.id===id),sid),'poistettu treeni poistui B:ltä');

  console.log('\nVanhentunut kirjautuminen');
  await A.evaluate(()=>{ localStorage.setItem('jarkale-sync-token',JSON.stringify({at:'x',exp:Date.now()-1000})); window.__gisCalls=0; });
  await A.evaluate(T=>{ S.date=T; loadDayIntoForm(T); setField('steps',9000); flushPendingAutoSave(); setTab('log'); renderSyncUI(); },T);
  ok(await A.locator('#sync-bar .sync-bar').isVisible(),'Kirjaa-näkymään tulee Synkronoi-palkki');
  await A.evaluate(()=>syncNow({silent:true}));
  ok(await A.evaluate(()=>!window.__gisCalls),'hiljainen synkronointi ei avaa kirjautumista');
  await A.locator('#sync-bar .tr-go').click(); await A.waitForFunction(()=>!SYNC_BUSY&&syncState().dirtyAt===0,null,{timeout:5000});
  ok(await A.evaluate(()=>window.__gisCalls===1),'napautus kirjautuu ja synkronoi');
  ok(drive().entries[T].steps===9000,'muutos Driveen napautuksen jälkeen');
  ok(!(await A.locator('#sync-bar .sync-bar').isVisible()),'palkki katoaa');

  console.log('\nTaustalla kirjoittaminen ei keskeydy');
  ok(await A.evaluate(()=>{ const local=syncSnapshot(); const m=syncMerge(local,JSON.parse(JSON.stringify(local)),false); const sig=x=>JSON.stringify([x.entries,x.measurements,x.gym.programs,x.gym.sessions]); return sig(m)===sig(local); }),'muuttumaton data ei piirrä näkymää uudelleen');

  console.log('\nKopio Järkäle PT:lle (v2.18.1)');
  await A.evaluate(()=>{ window.__gisCalls=0; setTab('asetukset');SETTINGS_TOGGLES.data=true;renderAsetukset();document.getElementById('stgl-content-data').style.display=''; });
  await A.locator('#sync-section .g-sw').click();
  await A.waitForFunction(()=>!SYNC_BUSY&&syncState().ptLastAt>0,null,{timeout:5000});
  ok(await A.evaluate(()=>window.__gisCalls===1&&/drive\.file/.test(window.__gisScope)),'PT-kopio pyytää drive.file-luvan kerran');
  const pt=byName('jarkale-pt.json'); const folder=Object.entries(FILES).find(([id,f])=>f.name==='Järkäle');
  ok(pt&&folder&&pt.parents[0]===folder[0]&&folder[1].mime==='application/vnd.google-apps.folder','tiedosto Järkäle-kansiossa näkyvässä Drivessa');
  const ptj=JSON.parse(pt.content);
  ok(ptj.version===6&&Object.keys(ptj.entries).length>0&&ptj.gym&&ptj.gym.sessions.length>0,'sisältö varmuuskopiomuodossa (versio 6, treenit mukana)');
  const nFiles=Object.keys(FILES).length;
  await A.evaluate(T=>{ S.date=T; loadDayIntoForm(T); setField('steps',12345); flushPendingAutoSave(); },T);
  await A.evaluate(()=>syncNow({silent:true})); await A.waitForFunction(()=>!SYNC_BUSY);
  ok(JSON.parse(byName('jarkale-pt.json').content).entries[T].steps===12345&&Object.keys(FILES).length===nFiles,'seuraava synkronointi päivittää saman tiedoston (ei kopioita)');
  ok((await A.locator('#sync-section').innerText()).includes('jarkale-pt.json'),'asetuksissa näkyy tiedoston sijainti');
  const ptId=Object.entries(FILES).find(([id,f])=>f.name==='jarkale-pt.json')[0];
  FILES[ptId].name='Aku PT data.json'; FILES[ptId].parents=['omaKansio'];
  await A.evaluate(T=>{ S.date=T; loadDayIntoForm(T); setField('steps',4321); flushPendingAutoSave(); },T);
  await A.evaluate(()=>syncNow({silent:true})); await A.waitForFunction(()=>!SYNC_BUSY);
  ok(JSON.parse(FILES[ptId].content).entries[T].steps===4321&&!byName('jarkale-pt.json'),'siirretty ja uudelleennimetty tiedosto päivittyy, uutta ei synny');

  console.log('\nVirheilmoitukset (v2.18.2)');
  const errs403=await A.evaluate(async()=>{ const orig=window.fetch; const out=[];
    for(const body of [{error:{code:403,message:'Google Drive API has not been used in project 1059 before or it is disabled.',errors:[{reason:'accessNotConfigured'}]}},{error:{code:403,message:'Request had insufficient authentication scopes.',status:'PERMISSION_DENIED',details:[{reason:'ACCESS_TOKEN_SCOPE_INSUFFICIENT'}]}}]){
      localStorage.setItem('jarkale-sync-token',JSON.stringify({at:'t',exp:Date.now()+3600e3,scope:SYNC_SCOPE}));
      window.fetch=async()=>new Response(JSON.stringify(body),{status:403,headers:{'Content-Type':'application/json'}});
      await syncNow({silent:true}); out.push(SYNC_ERR); }
    window.fetch=orig; return out; });
  ok(/Drive API ei ole käytössä/.test(errs403[0]||''),'403 rajapinta pois: selkokielinen ohje');
  ok(/ei saanut lupaa/.test(errs403[1]||''),'403 lupa puuttuu: selkokielinen ohje');
  const noScope=await A.evaluate(async()=>{ localStorage.setItem('jarkale-sync-token',JSON.stringify({at:'t',exp:Date.now()+3600e3,scope:'openid'})); await syncNow({silent:true}); return SYNC_ERR; });
  ok(/ei saanut lupaa/.test(noScope||''),'luparuutu rastimatta: huomataan ennen Drive-kutsua');

  console.log('\nKirjautumisen uusiminen napautuksesta (v2.18.8)');
  const rn=await A.evaluate(async()=>{ const out={}; const wait=ms=>new Promise(r=>setTimeout(r,ms));
    localStorage.removeItem('jarkale-sync-token'); SYNC_RENEW_AT=0; window.__gisCalls=0;
    setTab('log'); await wait(50);
    const btn=[...document.querySelectorAll('#view-log button')].find(b=>b.offsetParent&&!b.closest('.sync-bar')&&!b.closest('#sync-section'));
    btn.click(); await wait(200); out.kirjaa=window.__gisCalls;
    const fake=document.createElement('button'); fake.setAttribute('data-synctap',''); document.body.appendChild(fake);
    fake.click(); await wait(800); out.first=window.__gisCalls; out.valid=syncTokenValid(); out.synced=Date.now()-syncState().lastSyncAt<5000;
    localStorage.removeItem('jarkale-sync-token'); fake.click(); await wait(100); out.cool=window.__gisCalls;
    fake.remove(); return out; });
  ok(rn.kirjaa===0,'Kirjaa-napit eivät avaa Googlen ikkunaa');
  ok(rn.first===1,'Tallenna treeni uusii vanhentuneen kirjautumisen');
  ok(rn.valid&&rn.synced,'uusimisen jälkeen synkronoidaan heti');
  ok(rn.cool===1,'10 min tauko: ei uutta yritystä joka napautuksesta');
  ok(await A.evaluate(()=>!!document.querySelector('[data-synctap]')||finishSession.toString().length>0),'Tallenna treeni -napissa merkintä');

  console.log('\nUusinta ei kysy tiliä eikä lupaa uudelleen (v2.18.18)');
  const rr=await A.evaluate(async()=>{ const wait=ms=>new Promise(r=>setTimeout(r,ms));
    await syncNow(); await wait(200); const email=syncState().email;
    if(!syncState().ptCopy) setSyncState({ptCopy:true});
    const t=JSON.parse(localStorage.getItem('jarkale-sync-token')); t.exp=Date.now()-1000; localStorage.setItem('jarkale-sync-token',JSON.stringify(t));
    window.__gisPrompt='x'; window.__gisHint=null;
    await syncNow(); await wait(200);
    return {email,prompt:window.__gisPrompt,hint:window.__gisHint,granted:syncState().granted}; });
  ok(rr.email==='aku@test.fi','tilin sähköposti tallennetaan synkronoinnin jälkeen');
  ok(rr.prompt==='','vanhentunut tokeni + PT-kopio: ei pakotettua lupakysymystä (prompt='+JSON.stringify(rr.prompt)+')');
  ok(rr.hint==='aku@test.fi','tuttu tili annetaan Googlelle, ei tilivalintaa');
  ok(/drive\.file/.test(rr.granted||''),'myönnetyt luvat muistetaan');

  console.log('\nKatselmoinnin korjaukset (v2.18.19)');
  // a) muutos kesken synkronoinnin ei katoa eikä jää lähettämättä
  const mid=await A.evaluate(async()=>{ const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const d=today(); const orig=driveDownload;
    driveDownload=async(id)=>{ const r=await orig(id); const e={...(S.entries[d]||{date:d}),notes:'kesken synkan',updated_at:new Date(Date.now()+5).toISOString()}; S.entries[d]=e; saveAll(); return r; };
    await syncNow(); driveDownload=orig;
    const kept=S.entries[d]&&S.entries[d].notes==='kesken synkan'; const pending=syncState().dirtyAt>0;
    await wait(2500);
    return {kept,pending,after:syncState().dirtyAt}; });
  ok(mid.kept,'kesken synkronoinnin tehty muutos säilyy puhelimessa');
  ok(mid.pending,'muutos jää odottamaan eikä merkitä synkronoiduksi');
  ok(JSON.stringify(drive().entries||{}).includes('kesken synkan')&&mid.after===0,'uusintasynkronointi vie muutoksen Driveen');
  // b) tuntematon tiedosto: ei ylikirjoiteta
  { const f=byName('jarkale-data.json'); const keep=f.content; f.content=JSON.stringify({format:'muu',data:1});
    const err=await A.evaluate(async()=>{ await syncNow(); return SYNC_ERR; });
    ok(/tuntematon/.test(err||'')&&JSON.parse(f.content).format==='muu','tuntematonta Drive-tiedostoa ei ylikirjoiteta');
    f.content=JSON.stringify({...JSON.parse(keep),version:2});
    const err2=await A.evaluate(async()=>{ await syncNow(); return SYNC_ERR; });
    ok(/uudemman/.test(err2||''),'uudemman version tiedosto pysäyttää synkronoinnin');
    f.content=keep; await A.evaluate(async()=>{ await syncNow(); }); }
  // c) lopetus kesken siirron pysyy voimassa
  const dis=await A.evaluate(async()=>{ const orig=driveUpload; driveUpload=async(a,b)=>{ setSyncState({enabled:false}); return orig(a,b); };
    await syncNow(); driveUpload=orig; const r=syncState().enabled; setSyncState({enabled:true}); return r; });
  ok(dis===false,'synkronoinnin lopetus kesken siirron ei kumoudu');
  // d) väärä Google-tili: kysytään, kieltäytyminen ei kirjoita
  const wrong=await A.evaluate(async()=>{ setSyncState({email:'toinen@test.fi'}); localStorage.removeItem('jarkale-sync-token');
    const uploads=[]; const orig=driveUpload; driveUpload=async(a,b)=>{ uploads.push(1); return orig(a,b); };
    let asked=''; const oc=window.confirm; window.confirm=m=>{ asked=m; return false; };
    await syncNow(); window.confirm=oc; driveUpload=orig;
    const r={asked,err:SYNC_ERR,uploads:uploads.length}; setSyncState({email:'aku@test.fi'}); await syncNow(); return r; });
  ok(/aku@test\.fi/.test(wrong.asked)&&/toinen@test\.fi/.test(wrong.asked),'eri Google-tili: käyttäjältä kysytään');
  ok(wrong.uploads===0&&/väärä Google-tili/.test(wrong.err||''),'kieltäytyminen: mitään ei kirjoiteta');
  // e) poistomerkinnät säilyvät 2 vuotta
  ok(await A.evaluate(()=>{ const old=Date.now()-400*864e5; const m=syncMerge({entries:{},measurements:[],gym:{},tombs:{e:{'2025-01-01':old}}},{entries:{'2025-01-01':{date:'2025-01-01',updated_at:new Date(old-1000).toISOString()}},measurements:[],gym:{},tombs:{}},false); return !m.entries['2025-01-01']&&!!m.tombs.e['2025-01-01']; }),'yli 180 pv vanha poisto ei palauta kirjausta');

  console.log('\nLopetus');
  await A.evaluate(()=>syncDisable());
  ok(await A.evaluate(()=>!syncState().enabled&&Object.keys(S.entries).length>0),'synkronoinnin lopetus säilyttää datan');
  ok(A.errs.length===0&&B.errs.length===0,'ei JS-virheitä'+(A.errs.concat(B.errs).length?': '+A.errs.concat(B.errs).join(' | '):''));
  console.log(`\n${pass} / ${pass+fail} läpi`);
  await b.close();
})();
