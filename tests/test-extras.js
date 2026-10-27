// Järkäle Tracking v2.18.117 (+v2.18.123) – erikoistekniikat: rest-pause (R/P) ja pudotussarjat (DS) lisäriveinä
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
const TXT="1 Rinta\nVinopenkki laite 1 * 6 - 10 & 1 * 8 - 12 + R/P + DS + R/P\nRistikkätalja 3 * 8 - 12\nJalkaprässi 2 * 10 - 12 + DS + DS\n";
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],viewport:{width:360,height:800},serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.locator('.su-choice',{hasText:'Kirjata treenejä'}).click(); await p.waitForTimeout(300);

  console.log('\nTuonti');
  const pv=await p.evaluate(t=>{ const d=parseProgramText(t)[0]; return d.exercises.map(e=>({n:e.name,x:e.extras,g:goalTxt(e),note:e.note})); },TXT);
  ok(JSON.stringify(pv[0].x)==='["rp","ds","rp"]'&&pv[0].g==='1 × 6–10 + 1 × 8–12 + R/P + DS + R/P'&&!pv[0].note,'"+ R/P + DS + R/P" → lisärivit tavoitteeseen, ei ohjeeksi: '+pv[0].g);
  ok(!pv[1].x&&JSON.stringify(pv[2].x)==='["ds","ds"]','ilman merkintää ei lisärivejä; "+ DS + DS" kaksi pudotusta');
  ok(await p.evaluate(()=>{ const e=parseExLine('Penkki 3x8-10 80 + R/P'); return e.weight===80&&JSON.stringify(e.extras)==='["rp"]'&&goalInputTxt(e)==='3x8-10 80 + R/P'; }),'paino ja merkintä samalla rivillä, muokkausteksti säilyttää merkinnän');

  const V=await p.evaluate(()=>[
    'Penkki 3x8 + drop set','Penkki 3x8 + rest pause','Penkki 3x8 + rest-pause + DS','Penkki 3x8 (DS)','Penkki 3x8 + 2 DS','Penkki 3x8 + DS × 2','Penkki 3x8 80 (R/P + DS)','Penkki 3x8 + myo-reps','Penkki 3x8, viimeinen sarja pudotuksena'
  ].map(t=>{ const e=parseExLine(t); return (e.extras||[]).join(',')+'|'+e.note; }));
  ok(V[0]==='ds|'&&V[1]==='rp|'&&V[2]==='rp,ds|','"drop set", "rest pause", "rest-pause + DS": '+V.slice(0,3).join(' / '));
  ok(V[3]==='ds|'&&V[4]==='ds,ds|'&&V[5]==='ds,ds|'&&V[6]==='rp,ds|','"(DS)", "+ 2 DS", "DS × 2", "(R/P + DS)": '+V.slice(3,7).join(' / '));
  ok(V[7]==='|+ myo-reps'&&V[8].startsWith('|'),'myo-repsit ja proosa jäävät ohjeeksi: '+V.slice(7).join(' / '));

  console.log('\nTreeni');
  await p.evaluate(t=>{ const pr=newProgram('P'); pr.days=gMatchImport(parseProgramText(t)).map(({include,rest,raw,...d})=>({...d,exercises:d.exercises.map(({unparsed,match,...e})=>e)})); touchProg(pr); G.curProgramId=pr.id; gymSave(); },TXT);
  // edellinen kerta: tavallinen treeni samasta päivästä
  await p.evaluate(async()=>{ const pr=G.programs[0]; await startSession(pr.id,pr.days[0].id); });
  let rows=await p.evaluate(()=>activeSession().exercises[0].sets.map(r=>r.kind||'-').join(','));
  ok(rows==='-,-,rp,ds,rp','treeni luo työsarjat ja merkityt lisärivit: '+rows);
  const labels=await p.evaluate(()=>[...document.querySelectorAll('[data-ex] .sets')][0]?[...document.querySelectorAll('[data-ex]')][0].querySelectorAll('.set .no')?[...[...document.querySelectorAll('[data-ex]')][0].querySelectorAll('.set .no')].map(e=>e.childNodes[0].textContent).join(','):'':'');
  ok(labels==='1,2,R/P,DS,R/P','rivien tunnisteet 1, 2, R/P, DS, R/P: '+labels);
  ok(await p.evaluate(()=>[...document.querySelector('[data-ex]').querySelectorAll('.set .no small')].length===2),'eri toistotavoitteet (6–10 & 8–12): sarjan oma toistoväli näkyy');
  const gg=await p.evaluate(()=>{ const a=parseExLine('Vipunosto 3x6-10 & 1x6-10 + R/P + DS'), b=parseExLine('Penkki 1x6-8 & 2x10-12'); return {a:goalTxt(a),ad:goalGroupsDiffer(a),ai:goalInputTxt(a),b:goalTxt(b),bd:goalGroupsDiffer(b)}; });
  ok(gg.a==='4 × 6–10 + R/P + DS'&&!gg.ad&&/&/.test(gg.ai),'sama toistoväli kahdessa ryhmässä näytetään yhtenä, muokkausteksti säilyy: '+gg.a+' / '+gg.ai);
  ok(gg.b==='1 × 6–8 + 2 × 10–12'&&gg.bd,'eri toistovälit pysyvät erillään: '+gg.b);
  await p.locator('[data-ex] .set .no.kind').first().click(); await p.waitForTimeout(150);
  ok(/Rest-pause: lyhyt tauko/.test(await p.evaluate(()=>document.getElementById('saved-toast')?.textContent||'')),'R/P-tunnisteen napautus näyttää selityksen');
  // kirjoita työsarjat, katso ehdotukset
  await p.evaluate(()=>{ const s=activeSession(); gSetVal(s.id,0,0,'kg','60'); gSetVal(s.id,0,0,'reps','10'); gSetVal(s.id,0,1,'kg','50'); gSetVal(s.id,0,1,'reps','12'); });
  const gh=await p.evaluate(()=>{ const s=activeSession(), ex=s.exercises[0]; return [2,3,4].map(i=>ghostFor(s,ex,i)); });
  ok(gh[0].kg===50&&gh[0].reps==null,'R/P: sama paino kuin edellinen rivi, toistot itse');
  ok(gh[1].kg===35,'DS: 30 % kevyempi, pyöristettynä painon askeleeseen (50 → 35)');
  ok(gh[2].kg===35,'R/P pudotuksen jälkeen: pudotettu paino');
  await p.evaluate(()=>{ const s=activeSession(); [0,1].forEach(i=>gToggleSet(s.id,0,i)); gSetVal(s.id,0,2,'reps','3'); gToggleSet(s.id,0,2); gSetVal(s.id,0,3,'reps','8'); gToggleSet(s.id,0,3); gSetVal(s.id,0,4,'reps','2'); gToggleSet(s.id,0,4); });
  const st=await p.evaluate(()=>{ const s=activeSession(), ex=s.exercises[0]; return {done:doneSets(ex).length,rows:doneRows(ex).length,stats:sessionStats(s).sets,txt:setsTxt(doneRows(ex)),pr:ex.sets.filter(r=>isPR(r,[{kg:1,reps:1}])).length}; });
  ok(st.done===2&&st.rows===5&&st.stats===2,'työsarjoja 2 (lisärivit eivät kasvata sarjamäärää)');
  ok(st.txt==='60 × 10 · 50 × 12 + R/P 3 + DS 35 × 8 + R/P 2','teksti: '+st.txt.replace(/ /g,' '));
  ok(st.pr===2,'lisärivit eivät ole ennätyksiä');
  // käsin lisätty pudotussarja liikkeelle ilman merkintää
  await p.evaluate(()=>{ const s=activeSession(); gSetVal(s.id,1,0,'kg','20'); gSetVal(s.id,1,0,'reps','10'); gToggleSet(s.id,1,0); gAddKind(s.id,1,'ds'); });
  ok(await p.evaluate(()=>{ const s=activeSession(), ex=s.exercises[1]; const r=ex.sets[ex.sets.length-1]; return r.kind==='ds'&&ghostFor(s,ex,ex.sets.length-1).kg===13.75; }),'valikosta lisätty pudotussarja + ehdotus (20 → 13,75 kg, askel 1,25)');
  await p.evaluate(()=>{ const s=activeSession(); gAddSet(s.id,0); });
  ok(await p.evaluate(()=>activeSession().exercises[0].sets.map(r=>r.kind||'-').join(','))==='-,-,rp,ds,rp,-','+ Sarja tehtyjen lisärivien jälkeen menee loppuun');
  await p.evaluate(()=>{ const s=activeSession(); gRemoveSet(s.id,0); });

  console.log('\nYhteenveto ja seuraava kerta');
  await p.evaluate(()=>{ const id=G.activeId; finishSession(true); GU.mode='session'; GU.sessionId=id; renderGym(); }); await p.waitForTimeout(200);
  const sum=await p.locator('#view-treeni').innerText();
  ok(/50\s×\s12 \+\sR\/P\s3 \+\sDS\s35\s×\s8 \+\sR\/P\s2/.test(sum.replace(/ /g,' ')),'yhteenvedossa lisärivit pääsarjan perässä');
  const sh=await p.evaluate(()=>sessionShareText(G.sessions[G.sessions.length-1]));
  ok(/\+ DS 35/.test(sh),'jakotekstissä lisärivit');
  await p.evaluate(async()=>{ const pr=G.programs[0]; await startSession(pr.id,pr.days[0].id); }); await p.waitForTimeout(200);
  const nx=await p.evaluate(()=>{ const s=activeSession(), ex=s.exercises[0]; return {g:[0,1,2,3].map(i=>ghostFor(s,ex,i)), prev:document.querySelector('[data-ex] .ex-prev')?.innerText||''}; });
  ok(nx.g[0].kg===60&&nx.g[1].kg===50&&nx.g[2].reps===3&&nx.g[3].reps===8,'seuraavalla kerralla työsarjat ja lisärivien toistot edelliseltä kerralta');
  ok(/R\/P/.test(nx.prev),'"Viimeksi"-rivillä lisärivit: '+nx.prev.replace(/ /g,' '));
  ok(await p.evaluate(()=>{ const e=document.querySelector('[data-ex]'); return e.scrollWidth<=e.clientWidth+1; }),'mahtuu 360 px leveyteen');

  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
