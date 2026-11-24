// v2.18.199: treeni ilman ohjelmaa. Aloitus yhdellä napautuksella, liikkeet lisätään sitä mukaa (tunnettu liike: viime kerran
// sarjamäärä ja luvut, uusi: 1 sarja), päivän vaihto myös menneeseen (historia ja päiväkirja oikeaan päivään), Tallenna ohjelmaksi
// (liikkeet, sarjamäärät, toistoväli, ei painoja), ohjelmien kierto ennallaan, tyhjää treeniä ei tallenneta.
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now())); localStorage.setItem('jarkale-news-seen','["x","2026-11-teksti"]'); localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{training:true},gym:{enabled:true}})); });
  await p.reload(); await p.waitForFunction(()=>typeof startFreeSession==='function'); await p.waitForTimeout(300);
  // tyhjätila ilman ohjelmaa
  await p.evaluate(()=>{ setTab('treeni'); GU.mode='home'; renderGym(); });
  ok(await p.locator('#view-treeni button',{hasText:'Treeni ilman ohjelmaa'}).count()===1,'ilman ohjelmaa: aloitustapana Treeni ilman ohjelmaa');
  // ohjelma ja historia
  await p.evaluate(async()=>{ const pr=newProgram('P'); pr.days=gMatchImport(parseProgramText(`1 Ylä\nPenkkipunnerrus 3 x 6-8\n2 Ala\nKyykky 3 x 5`)).map(({include,rest,raw,...x})=>({...x,exercises:x.exercises.map(({unparsed,match,...e})=>e)})); touchProg(pr); gymSave();
    await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-5*864e5).toISOString().slice(0,10); s.startedAt=Date.now()-5*864e5; s.exercises.forEach(e=>e.sets.forEach(r=>{r.kg=80;r.reps=7;r.done=true;})); finishSession(true);
    setTab('treeni'); GU.mode='home'; renderGym(); });
  const nx0=await p.evaluate(()=>gNextDay&&gNextDay(curProgram())?.name);
  // aloitus yhdellä napautuksella
  await p.locator('.tr-free').click(); await p.waitForTimeout(250);
  const st=await p.evaluate(()=>{ const s=activeSession(); return {free:s&&s.free,name:s&&s.dayName,prog:s&&s.programId,n:s&&s.exercises.length,mode:GU.mode,focus:document.activeElement&&document.activeElement.id,date:!!document.querySelector('.g-dch input[type=date]')}; });
  ok(st.free&&st.name==='Treeni'&&st.prog===null&&st.n===0&&st.mode==='session','yksi napautus aloittaa tyhjän treenin nimellä Treeni');
  ok(st.focus==='g-addex'&&st.date,'lisäyskenttä valmiina ja päivän valinta otsikossa');
  // nimiehdotus ja liikkeet
  await p.locator('#g-addex').fill('penk'); await p.waitForTimeout(150);
  ok(/Penkkipunnerrus/.test(await p.locator('#g-addex-sug').innerText()),'kirjoitettaessa ehdotus omasta historiasta');
  const ex=await p.evaluate(async()=>{ const s=activeSession(); const I=()=>document.getElementById('g-addex'); I().value='Penkkipunnerrus'; await gAddEx(s.id); I().value='Pystypunnerrus käsipainoilla'; await gAddEx(s.id);
    return s.exercises.map(e=>e.name+':'+e.sets.length+':'+(ghostFor(s,e,0).kg??'-')).join('|'); });
  ok(ex==='Penkkipunnerrus:3:80|Pystypunnerrus käsipainoilla:1:-','tunnettu liike: viime kerran sarjamäärä ja luvut, uusi liike: 1 sarja ('+ex+')');
  // päivä menneeseen kesken treenin, lopetus
  const past=await p.evaluate(()=>{ const s=activeSession(); s.exercises[0].sets.forEach(r=>{r.kg=82.5;r.reps=7;r.done=true;}); s.exercises[1].sets[0].kg=26; s.exercises[1].sets[0].reps=10; s.exercises[1].sets[0].done=true;
    const ds=new Date(Date.now()-20*864e5).toISOString().slice(0,10); gSetSessionDate(s.id,ds); const fut=new Date(Date.now()+2*864e5).toISOString().slice(0,10); gSetSessionDate(s.id,fut);
    finishSession(true); const x=gSession(s.id);
    return {ds,date:x.date,dur:x.endedAt-x.startedAt,startDay:new Date(x.startedAt).toISOString().slice(0,10),entry:!!(S.entries[ds]&&S.entries[ds].training_done&&(S.entries[ds].workout_ids||[]).includes(x.id)),todayLinked:!!(S.entries[today()]&&(S.entries[today()].workout_ids||[]).includes(x.id))}; });
  ok(past.date===past.ds&&past.startDay===past.ds,'päivä vaihtui menneeseen (tuleva päivä hylätään), aloitusaika siirtyi samalle päivälle');
  ok(past.dur>=0&&past.dur<6*3600e3,'kesto järkevä (ei päiviä) siirron jälkeen');
  ok(past.entry&&!past.todayLinked,'päiväkirjan treenimerkintä menneelle päivälle, ei tälle päivälle');
  // historia: menneen päivän treeni on liikkeen historiassa oikeassa kohdassa (ennen 5 pv sitten tehtyä)
  const hist=await p.evaluate(()=>exerciseHistory(exKey('Penkkipunnerrus')).map(x=>x.sets?x.sets.length:0).length);
  const prevNow=await p.evaluate(()=>{ const pv=prevFor(exKey('Penkkipunnerrus'),null); return pv&&pv.date; });
  ok(hist===2&&prevNow===new Date(Date.now()-5*864e5).toISOString().slice(0,10),'liikehistoriassa 2 kertaa, Viimeksi on edelleen uusin (5 pv sitten), ei menneelle siirretty');
  // päivän vaihto tallennetussa treenissä siirtää päiväkirjamerkinnän
  const mv=await p.evaluate(()=>{ const s=G.sessions.find(x=>x.free); const old=s.date; const nd=new Date(Date.now()-18*864e5).toISOString().slice(0,10); gSetSessionDate(s.id,nd);
    return {oldGone:!(S.entries[old]&&(S.entries[old].workout_ids||[]).includes(s.id)),newOn:!!(S.entries[nd]&&(S.entries[nd].workout_ids||[]).includes(s.id))}; });
  ok(mv.oldGone&&mv.newOn,'tallennetun treenin päivän vaihto siirtää päiväkirjamerkinnän');
  // Tallenna ohjelmaksi
  await p.evaluate(()=>{ const s=G.sessions.find(x=>x.free); GU.editPast=null; openSession(s.id); });
  await p.waitForTimeout(200);
  ok(await p.locator('.g-saveprog').count()===1,'yhteenvedossa Tallenna ohjelmaksi');
  const sp=await p.evaluate(()=>{ const n0=G.programs.length; const s=G.sessions.find(x=>x.free); gSaveAsProgram(s.id); const pr=G.programs[G.programs.length-1];
    return {added:G.programs.length-n0,day:pr.days[0].name,ex:pr.days[0].exercises.map(e=>`${e.name}:${e.sets}:${e.repsMin??'-'}:${e.weight??'-'}:${e.key===exKey(e.name)}`).join('|'),mode:GU.mode,saved:s.savedProgramId===pr.id}; });
  ok(sp.added===1&&sp.day==='Treeni'&&sp.saved,'ohjelma syntyi tehdystä treenistä ja avautui muokkaukseen ('+sp.mode+')');
  ok(sp.ex==='Penkkipunnerrus:3:7:-:true|Pystypunnerrus käsipainoilla:1:10:-:true','liikkeet, sarjamäärät ja toistot, ei painoja ('+sp.ex+')');
  // kierto ei huomioi vapaata treeniä
  const nx1=await p.evaluate(()=>{ G.curProgramId=G.programs[0].id; return gNextDay&&gNextDay(curProgram())?.name; });
  ok(nx1===nx0,'ohjelman kierto ennallaan ('+nx1+')');
  // tyhjää vapaata treeniä ei tallenneta
  const em=await p.evaluate(()=>{ const n=G.sessions.length; startFreeSession(); finishSession(true); return G.sessions.length===n&&!G.activeId; });
  ok(em,'tyhjää treeniä ei tallenneta');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
