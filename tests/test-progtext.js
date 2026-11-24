// Järkäle Tracking v2.18.116 – ohjelmateksti Word-tiedostosta (tyhjä rivi jokaisen rivin välissä), sulkeissa olevat ohjeet
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
// Keksitty ohjelma, rakenne kuten valmentajan Word-ohjelmassa
const TXT=["Ohjelma testi 1/2026","","Jokainen sarja failureen saakka.","","1 Rinta ja ojentajat","","Penkkipunnerrus 2 * 6 - 8 & 1 * 8 - 12","",
 "Supersarja:","","Ristikkätalja 3 * 10 - 15","","Peck deck takaolkapäille 3 * 10 - 15","","Ojentajat taljassa 4 * 8 - 12","",
 "Kolmoissarja:","","Punnerrus 2 * max","","Dipit 2 * max","","Vatsat 2 * 15","","Kyykky 3 * 5","",
 "2 Jalat","","Reiden koukistukset istuen (pidä jalkaterät ylöspäin, pohkeet venytyksessä) 4 * 8 - 12","",
 "Maastaveto (Barbell) 3 * 5","","RDL tai SJMV levytangolla 2 * 8 - 12.","",
 "Yhden käden ylätalja D kahvalla, nojaa vinopenkkiin (kyynärpää kohti lonkkaa) 3 * 8 - 12"].join("\n");
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  const r=await p.evaluate(t=>{ const pv=parseProgramText(t); return pv.map(d=>({n:d.name,inc:d.include,e:d.exercises.map(e=>({n:e.name,g:goalTxt(e),note:e.note}))})); },TXT);
  const d1=r.find(d=>d.n==='Rinta ja ojentajat'), d2=r.find(d=>d.n==='Jalat');
  const E=(d,n)=>(d&&d.e.find(e=>e.n===n))||{};
  console.log('\nTyhjät rivit ja supersarjat');
  ok(d1&&d2&&d1.e.length===8&&d2.e.length===4,'kaksi päivää, 8 + 4 liikettä: '+r.map(d=>d.n+' '+d.e.length).join(', '));
  ok(/^Supersarja: Peck deck takaolkapäille/.test(E(d1,'Ristikkätalja').note||'')&&/^Supersarja: Ristikkätalja/.test(E(d1,'Peck deck takaolkapäille').note||''),'supersarja säilyy tyhjistä riveistä huolimatta');
  ok(!E(d1,'Ojentajat taljassa').note,'supersarja päättyy kahteen liikkeeseen');
  ok(/^Kolmoissarja: Dipit \+ Vatsat/.test(E(d1,'Punnerrus').note||'')&&/Kolmoissarja/.test(E(d1,'Vatsat').note||'')&&!E(d1,'Kyykky').note,'kolmoissarja kolmeen liikkeeseen');
  console.log('\nNimet ja ohjeet');
  ok(E(d2,'Reiden koukistukset istuen').note==='pidä jalkaterät ylöspäin, pohkeet venytyksessä','pitkä sulkeissa oleva ohje ohjeeksi, pilkku sulkeissa ei katkaise nimeä');
  ok(E(d2,'Maastaveto (Barbell)').g==='3 × 5','lyhyt tarkenne sulkeissa jää nimeen');
  ok(E(d2,'RDL tai SJMV levytangolla').note===''&&E(d2,'RDL tai SJMV levytangolla').g==='2 × 8–12','loppupiste ei tule ohjeeksi');
  ok(E(d2,'Yhden käden ylätalja D kahvalla').note==='nojaa vinopenkkiin (kyynärpää kohti lonkkaa)','pilkun jälkeinen tarkenne ohjeeksi sulkeineen');

  console.log('\nTaulukko (v2.18.129, esim. ChatGPT:n tekemä ohjelma)');
  const tb=await p.evaluate(()=>{ const f=t=>parseProgramText(t).map(d=>d.name+': '+d.exercises.map(e=>e.name+' '+goalTxt(e)+(e.note?' ['+e.note+']':'')).join(' | ')).join(' // ');
    return {
      a:f("### Treeni A – Ylävartalo\n\n| Liike | Sarjat x toistot | Teho | Palautus |\n|---|---|---|---|\n| Penkkipunnerrus tangolla | 3 x 6–8 | RIR 2 | 2–3 min |\n| Tuettu rintasoutu laitteessa | 3 x 8–12 | RIR 2 | 2 min |\n\n### Treeni B – Alavartalo\n\n| Liike | Sarjat x toistot | Teho | Palautus |\n|---|---|---|---|\n| Takakyykky | 3 x 5–8 | RIR 2–3 | 3 min |"),
      b:f("**Päivä 1**\n\n| Liike | Sarjat | Toistot | Paino |\n|:---|:---:|:---:|---|\n| Penkkipunnerrus | 3 | 8-10 | 60 kg |\n| Ylätalja | 3 | 10–12 | |"),
      c:f("| Päivä | Liike | Sarjat x toistot |\n|---|---|---|\n| Maanantai | Kyykky | 3 x 5 |\n| Maanantai | Penkki | 3 x 8 |\n| Torstai | Maastaveto | 2 x 5 |"),
      d:f("## Day A\n\n| Exercise | Sets x Reps | RPE |\n| --- | --- | --- |\n| Bench Press | 4 x 6-8 | 8 |") }; });
  ok(tb.a==='Treeni A – Ylävartalo: Penkkipunnerrus tangolla 3 × 6–8 [teho RIR 2, palautus 2–3 min] | Tuettu rintasoutu laitteessa 3 × 8–12 [teho RIR 2, palautus 2 min] // Treeni B – Alavartalo: Takakyykky 3 × 5–8 [teho RIR 2–3, palautus 3 min]','taulukko: otsikot päiviksi, sarjat ja toistot, teho ja palautus ohjeeksi: '+tb.a);
  ok(tb.b==='Päivä 1: Penkkipunnerrus 3 × 8–10 · 60 kg | Ylätalja 3 × 10–12','erilliset Sarjat- ja Toistot-sarakkeet, paino: '+tb.b);
  ok(tb.c==='Maanantai: Kyykky 3 × 5 | Penkki 3 × 8 // Torstai: Maastaveto 2 × 5','Päivä-sarake treenipäiviksi: '+tb.c);
  ok(tb.d==='Day A: Bench Press 4 × 6–8 [RPE 8]','englanninkielinen taulukko: '+tb.d);
  // v2.18.182: eri toistotavoitteet pilkulla ja pyramidina
  const mx=await p.evaluate(()=>['Penkki 2*6-8, 1*10-12 + R/P + DS','Vinopenkki 3 x 8 / 10 / 12','Kyykky 3 x 12/10/8 60 kg','Ylätalja 3 x 10-12, viimeinen sarja hitaasti'].map(t=>{const r=parseExLine(t);return goalTxt(r)+'|'+r.note;}));
  ok(mx[0]==='2\u00a0×\u00a06–8 + 1\u00a0×\u00a010–12 + R/P + DS|'||mx[0].replace(/\u00a0/g,' ')==='2 × 6–8 + 1 × 10–12 + R/P + DS|','pilkulla eroteltu toinen toistotavoite säilyy ('+mx[0]+')');
  ok(mx[1].replace(/\u00a0/g,' ')==='1 × 8 + 1 × 10 + 1 × 12|','pyramidi 3 x 8/10/12 → sarjoittain ('+mx[1]+')');
  ok(/1 × 12 \+ 1 × 10 \+ 1 × 8 · 60 kg/.test(mx[2].replace(/\u00a0/g,' ')),'laskeva pyramidi ja paino ('+mx[2]+')');
  ok(mx[3].replace(/\u00a0/g,' ')==='3 × 10–12|viimeinen sarja hitaasti','pilkun jälkeinen ohje jää ohjeeksi');
  // v2.18.187: vihkomerkinnät ja prosentti
  const vh=await p.evaluate(()=>['Kyykky 140x5x3','Penkki 3x5x140','Penkki 12,5x10x3','Kyykky 5x5 75 %','Kyykky 5x3 @ 80%','Kyykky 5x5 72,5','Hauis 3x10x12'].map(t=>{const r=parseExLine(t);return [r.name,r.sets,r.repsMin,r.weight,r.note].join('|');}));
  ok(vh[0]==='Kyykky|3|5|140|','paino × toistot × sarjat: 140x5x3 → 3 × 5 · 140 kg ('+vh[0]+')');
  ok(vh[1]==='Penkki|3|5|140|','sarjat × toistot × paino: 3x5x140 ('+vh[1]+')');
  ok(vh[2]==='Penkki|3|10|12.5|','desimaalipaino ensin: 12,5x10x3 ('+vh[2]+')');
  ok(vh[3]==='Kyykky|5|5||75 %','prosentti ei ole paino: 5x5 75 % ('+vh[3]+')');
  ok(vh[4]==='Kyykky|5|3||@ 80%','@ 80% ohjeeksi ('+vh[4]+')');
  ok(vh[5]==='Kyykky|5|5|72.5|','desimaalipaino perässä edelleen painoksi ('+vh[5]+')');
  ok(vh[6].startsWith('Hauis|3|10|')&&!vh[6].includes('|12|'),'monitulkintainen 3x10x12 ei arvaa painoa ('+vh[6]+')');
  // v2.18.200: nousevat sarjat, jokaisella oma paino
  const rp=await p.evaluate(async()=>{ const f=t=>{ const x=parseExLine(t); return [x.name,x.sets,goalTxt(x).replace(/\u00a0/g,' '),goalInputTxt(x),x.note].join('|'); };
    const out={a:f('Penkki 150x3, 160x2, 170x1'),b:f('Maastaveto 180x3x2, 200x1'),c:f('Penkki 92,5x8, 95x6,97,5x4 + DS'),d:f('Penkki 150 kg x 3; 160 kg x 2 kova päivä'),e:f('Penkki 2 x 6-8, 1 x 10-12'),g:f('Kyykky 140x5x3')};
    const pr=newProgram('R'); pr.days[0].exercises.push({...newEx(parseExLine('Penkki 150x3, 160x2, 170x1'))}); touchProg(pr); gymSave();
    await startSession(pr.id,pr.days[0].id); const s=activeSession(); const ex=s.exercises[0]; out.gh=ex.sets.map((r,i)=>{ const g=ghostFor(s,ex,i); return g.kg+'x'+g.reps; }).join(',');
    ex.sets.forEach(r=>{ r.kg=null; }); discardSession&&0; finishSession(true); return out; });
  ok(rp.a==='Penkki|3|150 kg × 3 · 160 kg × 2 · 170 kg × 1|150x3, 160x2, 170x1|','nousevat sarjat: oma paino ja toistot sarjoittain ('+rp.a+')');
  ok(rp.b==='Maastaveto|3|180 kg × 3, 3 · 200 kg × 1|180x3x2, 200x1|','paino × toistot × sarjat listassa ('+rp.b+')');
  ok(/^Penkki\|3\|92,5 kg × 8 · 95 kg × 6 · 97,5 kg × 4 \+ DS\|92,5x8, 95x6, 97,5x4 \+ DS\|$/.test(rp.c),'desimaalipainot ja pudotussarja ('+rp.c+')');
  ok(rp.d==='Penkki|2|150 kg × 3 · 160 kg × 2|150x3, 160x2|kova päivä','kg-merkintä, puolipiste ja ohje perässä ('+rp.d+')');
  ok(rp.e.startsWith('Penkki|3|2 × 6–8 + 1 × 10–12')&&rp.g.startsWith('Kyykky|3|3 × 5 · 140 kg'),'aiemmat muodot ennallaan');
  ok(rp.gh==='150x3,160x2,170x1','treenissä jokaisen sarjan valmis paino ja toistot ohjelmasta ('+rp.gh+')');
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
