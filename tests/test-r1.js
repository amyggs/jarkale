// Järkäle Tracking – Julkaisu 1 hyväksymistestit (ChatGPT-määrittelyn kohta 29)
const { chromium, devices } = require('playwright');
const NEW='http://localhost:8765/index.html', OLD='http://localhost:8766/index.html';
let pass=0, fail=0; const fails=[];
const ok=(c,msg)=>{ if(c){pass++;} else {fail++; fails.push(msg);} console.log((c?'  ✓ ':'  ✗ ')+msg); };
const iso=d=>d.toISOString().slice(0,10);
const dAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d);};

// Vanhan muodon data (ei uusia kenttiä), mukana vanha yksittäinen kipukenttä
function oldData(){
  const e={};
  for(let i=1;i<=40;i++){ const ds=dAgo(i); if(i===3||i===4) continue; // 3 ja 4 pv sitten tyhjiä
    e[ds]={date:ds,weight:+(97+i*0.02).toFixed(1),sleep:7+(i%3)*0.5,recovery:1+(i%5),motivation:1+(i*2%5),
      training_done:i%2===0,training_load:i%2===0?3+(i%3):null,training_type:i%2===0?"Yläkroppa":"",training_notes:i%6===0?"meni ok":""};
  }
  e[dAgo(10)].injury_bodyPart="knee_l"; e[dAgo(10)].injury_painLevel=2; e[dAgo(10)].injury_direction="sama";
  e[dAgo(11)].injury_items=[{bodyPart:"shoulder_l",painLevel:3,direction:"pahenee",resolved:false}];
  const m=[{date:dAgo(30),wn:93,neck:40,hips:104,chest:112},{date:dAgo(2),wn:92,neck:40,hips:104,chest:112,sf_chest:9,sf_abd:12,sf_thigh:9}];
  return {entries:e,measurements:m,settings:{gender:"male",profile:{height:190,age:42},goals:{sleepHours:7.5,workoutsPerWeek:4,cardioPerWeek:2,measurementIntervalDays:28}}};
}
async function seed(p,url,data){
  await p.goto(url);
  await p.evaluate(d=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-entries',JSON.stringify(d.entries));localStorage.setItem('seuranta-meas',JSON.stringify(d.measurements));
    localStorage.setItem('seuranta-settings',JSON.stringify(d.settings));},data);
  await p.reload(); await p.waitForTimeout(700);
}
const clickText=async(p,txt)=>{ await p.getByRole('button',{name:txt,exact:true}).first().click(); await p.waitForTimeout(80); };
const flush=p=>p.evaluate(()=>flushPendingAutoSave());
const entry=(p,ds)=>p.evaluate(ds=>S.entries[ds]?JSON.parse(JSON.stringify(S.entries[ds])):null,ds);
const stored=(p,ds)=>p.evaluate(ds=>(JSON.parse(localStorage.getItem('seuranta-entries')||'{}'))[ds]||null,ds);

(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],hasTouch:true,acceptDownloads:true});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  const data=oldData(); const T=dAgo(0);

  console.log('\nVanha data');
  await seed(p,NEW,data);
  const n0=await p.evaluate(()=>Object.keys(S.entries).length);
  ok(n0===Object.keys(data.entries).length,`vanhat kirjaukset latautuvat (${n0})`);
  for(const tab of ['trendit','historia','asetukset','log']) await p.evaluate(t=>setTab(t),tab);
  await p.evaluate(()=>{moveDate(-10);});
  const oldForm=await p.evaluate(()=>({o:S.training_outcome,m:S.training_modifications,f:S.day_factors,inj:S.injury_items.length,tr:S.training_done}));
  ok(oldForm.o===null&&oldForm.m.length===0&&oldForm.f.length===0,'vanha päivä: uudet kentät null / []');
  ok(oldForm.inj===1,'vanha yksittäinen kipukenttä näkyy kipulistana');
  if(!(await p.evaluate(()=>S.showExtra))) await p.evaluate(()=>toggleExtra());
  await p.waitForTimeout(100);
  ok(await p.getByRole('button',{name:'✓ Treeni',exact:true}).isVisible(),'vanha treeni aukeaa treeniosioon (treeni merkitty tehdyksi)');
  // Pelkkä selaaminen ei saa kirjoittaa tavallista vanhaa riviä uudelleen (autosave käynnistyy renderLogista)
  const before12=await stored(p,dAgo(12));
  await p.evaluate(()=>{moveDate(-2);}); await p.waitForTimeout(1300); await flush(p);
  const after12=await stored(p,dAgo(12));
  ok(JSON.stringify(before12)===JSON.stringify(after12),'vanhan päivän avaaminen ei kirjoita riviä uudelleen');
  await p.evaluate(()=>{goToday();});
  ok((await p.evaluate(()=>(S.measurements||[]).length))===2,'vanhat mittaukset näkyvät');
  const lockedOld=await p.evaluate(()=>Object.values(S.entries).filter(e=>e.day_state_snapshot_locked_at).length);
  ok(lockedOld===0,'vanhoille päiville ei luotu snapshotteja selaamalla');
  const noInvented=await p.evaluate(()=>Object.values(S.entries).every(e=>e.training_outcome==null&&!(e.day_factors||[]).length&&!(e.training_modifications||[]).length&&e.day_state_snapshot==null));
  ok(noInvented,'vanhoille riveille ei ole syntynyt uusia arvoja');

  console.log('\nSnapshot ei lukitu liian aikaisin');
  await p.evaluate(()=>{goToday(); setField('sleep',7.5); setStars('recovery',4); setStars('motivation',4);});
  if(!(await p.evaluate(()=>S.showExtra))) await p.evaluate(()=>toggleExtra());
  await p.evaluate(()=>toggleTraining('done')); await p.evaluate(()=>setTrainingLoad(4));
  await flush(p);
  let e=await entry(p,T);
  ok(e&&e.training_done&&!e.day_state_snapshot_locked_at,'aamuarvot + treeni tallentuvat, snapshotia ei vielä lukittu');
  ok(e.training_outcome===null,'treeni ilman arviota: outcome null (ei "normal")');

  console.log('\nTreenin kulku ja snapshot');
  ok(!(await p.locator('button',{hasText:'Kevensin tarkoituksella'}).count()),'ennen arviota muutoskysymys ei ole näkyvissä');
  await clickText(p,'Heikommin kuin normaalisti'); await flush(p);
  e=await entry(p,T);
  ok(e.training_outcome==='worse','worse tallentuu');
  ok(e.day_state_snapshot&&e.day_state_snapshot.body_state==='recovered'&&e.day_state_snapshot.general_energy==='high','snapshot lukittuu ensimmäiseen outcomeen (recovered / high)');
  ok(e.day_state_model_version===1&&typeof e.day_state_snapshot_locked_at==='string','malliversio 1 ja lukitusaika tallentuvat');
  ok(Array.isArray(e.day_state_snapshot.reasons)&&e.day_state_snapshot.complete===true&&e.day_state_snapshot.captured_inputs.sleep===7.5&&e.day_state_snapshot.captured_inputs.recovery===4,'snapshot on rakenteinen (complete, reasons, captured_inputs), ei UI-tekstiä');
  const snap1=JSON.stringify([e.day_state_snapshot,e.day_state_model_version,e.day_state_snapshot_locked_at]);
  ok(await p.locator('button',{hasText:'Kevensin tarkoituksella'}).isVisible(),'worse tuo muutoskysymyksen näkyviin');
  await clickText(p,'Vaihdoin liikkeitä'); await clickText(p,'Jätin osan pois'); await flush(p);
  e=await entry(p,T);
  ok(JSON.stringify(e.training_modifications)==='["exercise_substitution","partial_session"]','useampi muutos tallentuu');
  await clickText(p,'Normaalisti'); await flush(p);
  e=await entry(p,T);
  ok(e.training_outcome==='normal','arvon voi vaihtaa (worse → normal)');
  ok(JSON.stringify([e.day_state_snapshot,e.day_state_model_version,e.day_state_snapshot_locked_at])===snap1,'snapshot ei muutu outcome-korjauksen jälkeen');
  await p.evaluate(()=>{setField('sleep',4); setStars('recovery',1);}); await flush(p);
  e=await entry(p,T);
  const liveNow=await p.evaluate(()=>calculateBodyState(S.date).level);
  ok(liveNow==='loaded','nykyinen Päivän tila päivittyy aamuarvojen korjauksesta (loaded)');
  ok(JSON.stringify([e.day_state_snapshot,e.day_state_model_version,e.day_state_snapshot_locked_at])===snap1,'snapshot ei muutu aamuarvojen korjauksen jälkeen');
  await clickText(p,'Normaalisti'); await flush(p); // tyhjennys
  e=await entry(p,T);
  ok(e.training_outcome===null,'outcomen tyhjennys → null');
  ok(JSON.stringify([e.day_state_snapshot,e.day_state_model_version,e.day_state_snapshot_locked_at])===snap1,'snapshot säilyy outcomen tyhjennyksen jälkeen');
  await clickText(p,'Paremmin kuin normaalisti'); await flush(p);
  e=await entry(p,T);
  ok(e.training_outcome==='better'&&JSON.stringify([e.day_state_snapshot,e.day_state_model_version,e.day_state_snapshot_locked_at])===snap1,'better tallentuu, uusi valinta ei lukitse snapshotia uudelleen');
  await p.reload(); await p.waitForTimeout(600);
  const rl=await p.evaluate(()=>({o:S.training_outcome,m:S.training_modifications,snap:JSON.stringify([S.day_state_snapshot,S.day_state_model_version,S.day_state_snapshot_locked_at])}));
  ok(rl.o==='better'&&rl.m.length===2&&rl.snap===snap1,'outcome, muutokset ja snapshot säilyvät reloadissa');

  console.log('\nnormal/better ei pakota muutoskysymystä');
  await p.evaluate(()=>{moveDate(-3); /* tyhjä päivä */});
  if(!(await p.evaluate(()=>S.showExtra))) await p.evaluate(()=>toggleExtra());
  await p.evaluate(()=>{setField('sleep',7); setStars('recovery',3); toggleTraining('done');});
  await clickText(p,'Paremmin kuin normaalisti'); await flush(p);
  ok(!(await p.locator('button',{hasText:'Kevensin tarkoituksella'}).count()),'better: muutoskysymys ei näy automaattisesti');
  ok(await p.locator('button',{hasText:'+ Treeni muuttui'}).isVisible(),'better: "+ Treeni muuttui" on saatavilla');
  await clickText(p,'+ Treeni muuttui'); await clickText(p,'Kevensin tarkoituksella'); await flush(p);
  e=await entry(p,dAgo(3));
  ok(JSON.stringify(e.training_modifications)==='["deliberate_lightening"]','"+ Treeni muuttui" -polku tallentaa muutoksen');

  console.log('\nVapaa kirjausjärjestys: uni myöhässä');
  await p.evaluate(()=>{moveDate(-1); /* 4 pv sitten, tyhjä */});
  if(!(await p.evaluate(()=>S.showExtra))) await p.evaluate(()=>toggleExtra());
  await p.evaluate(()=>toggleTraining('done'));
  await clickText(p,'Normaalisti'); await flush(p);
  e=await entry(p,dAgo(4));
  ok(e.training_outcome==='normal'&&e.day_state_snapshot&&e.day_state_snapshot.complete===false&&e.day_state_snapshot.body_state===null,'kulku ennen aamuarvoja → vajaa snapshot (complete=false), ei null');
  ok(e.day_state_snapshot.captured_inputs.sleep===null&&e.day_state_snapshot.captured_inputs.recovery===null,'vajaa snapshot kertoo mitkä tiedot puuttuivat (null)');
  const snapPartial=JSON.stringify(e.day_state_snapshot);
  await p.evaluate(()=>{setField('sleep',8); setStars('recovery',5);});
  await clickText(p,'Normaalisti'); await clickText(p,'Normaalisti'); await flush(p);
  e=await entry(p,dAgo(4));
  ok(JSON.stringify(e.day_state_snapshot)===snapPartial,'snapshotia ei täytetä jälkikäteen myöhemmin lisätyistä arvoista');
  ok(e.sleep===8&&e.recovery===5,'myöhässä kirjattu uni ja palautuminen tallentuvat normaalisti');
  const liveLate=await p.evaluate(()=>calculateBodyState(S.date)?.level);
  ok(liveLate==='recovered','Päivän tila lasketaan myöhään kirjatuista tiedoista normaalisti');

  console.log('\nPäivän tekijät');
  await p.evaluate(()=>{ const d=new Date(); d.setDate(d.getDate()-41); const ds=d.toISOString().slice(0,10); flushPendingAutoSave(); S.date=ds; loadDayIntoForm(ds); renderLog(); });
  const D41=dAgo(41);
  ok(await p.locator('#day-factors .df-open').isVisible(),'"+ Päivässä jotain poikkeavaa" näkyy ilman lisäseurantoja');
  await p.locator('#day-factors .df-open').click(); await clickText(p,'Sairas'); await flush(p);
  e=await stored(p,D41);
  ok(e&&JSON.stringify(e.day_factors)==='["illness"]','yksi tagi tallentuu (localStorage)');
  ok(e&&e.weight==null&&e.sleep==null&&!e.training_done,'pelkkä tagi riittää päivän säilyttämiseen');
  await clickText(p,'Poikkeava stressi'); await flush(p);
  e=await stored(p,D41);
  ok(JSON.stringify(e.day_factors)==='["illness","high_stress"]','useampi tagi tallentuu');
  await p.evaluate(()=>cleanupEmptyEntries&&cleanupEmptyEntries());
  ok(!!(await stored(p,D41))||!!(await entry(p,D41)),'tyhjien päivien siivous ei poista tagipäivää');
  await p.reload(); await p.waitForTimeout(500);
  ok(JSON.stringify((await entry(p,D41)).day_factors)==='["illness","high_stress"]','tagit säilyvät reloadissa');
  const streakOk=await p.evaluate(ds=>hasMeaningfulEntry(S.entries[ds]),D41);
  ok(streakOk,'tagipäivä lasketaan kirjatuksi (hasMeaningfulEntry)');

  console.log('\nCSV (skeema v2)');
  // ChatGPT kohta 15: treenipäivä worse + kaksi muutosta
  const D42=dAgo(42);
  await p.evaluate(ds=>{ flushPendingAutoSave(); S.date=ds; loadDayIntoForm(ds); renderLog(); if(!S.showExtra) toggleExtra(); setField('sleep',6); setStars('recovery',2); toggleTraining('done'); setTrainingLoad(3); },D42);
  await clickText(p,'Heikommin kuin normaalisti'); await clickText(p,'Vaihdoin liikkeitä'); await clickText(p,'Jätin osan pois'); await flush(p);
  const getCsv=()=>p.evaluate(async()=>{ let out=null; window.shareOrDownloadFile=async(blob)=>{out=await blob.text();return true;}; await exportCSV(); return out; });
  const parseCsv=t=>{ const rows=[];let row=[],cell='',q=false; t=t.replace(/^\ufeff/,'');
    for(let i=0;i<t.length;i++){const c=t[i];
      if(q){ if(c==='"'){ if(t[i+1]==='"'){cell+='"';i++;} else q=false; } else cell+=c; }
      else if(c==='"') q=true; else if(c===','){row.push(cell);cell='';} else if(c==='\r'){} else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';} else cell+=c; }
    if(cell!==''||row.length){row.push(cell);rows.push(row);} return rows; };
  const tbl=parseCsv(await getCsv()); const H=tbl[0]; const rec=ds=>{const r=tbl.find(r=>r[0]===ds); if(!r) return null; const o={}; H.forEach((h,i)=>o[h]=r[i]); return o;};
  ok(H[0]==='pvm'&&H.includes('treenin_rasitus')&&H.includes('treenihuomio')&&H.includes('loukkaantumiset'),'vanhat sarakkeet mukana');
  ok(['training_outcome','training_modifications','day_factors','injury_items','day_state_body','day_state_energy','day_state_reasons','day_state_model_version','day_state_snapshot_locked_at','created_at','updated_at','csv_schema_version'].every(h=>H.includes(h)),'uudet sarakkeet mukana');
  ok(!H.includes('day_state_snapshot'),'snapshot litistetty omiin sarakkeisiin (ei JSON-solua)');
  const r42=rec(D42);
  ok(r42&&r42.training_outcome==='worse'&&r42.training_modifications==='exercise_substitution|partial_session','treeni: worse + exercise_substitution|partial_session');
  ok(r42.day_state_body==='loaded'&&r42.day_state_complete==='true'&&r42.day_state_reasons.split('|').includes('low_recovery')&&r42.day_state_input_sleep==='6','snapshot-sarakkeet: body, complete, reasons (koodit), lähtötiedot');
  const r41=rec(D41);
  ok(r41&&r41.day_factors==='illness|high_stress'&&r41.paino_kg===''&&r41.training_outcome==='','poikkeuspäivä ilman muuta dataa tulee CSV:hen tageineen');
  const rT=rec(T);
  ok(rT.day_state_body==='recovered'&&rT.day_state_input_sleep==='7.5'&&rT.day_state_input_recovery==='4','CSV: lukitut snapshot-arvot, vaikka uni ja palautuminen muutettiin myöhemmin (4 / 1)');
  ok(rT.uni_h==='4'&&rT.palautuminen==='1','CSV: päivän nykyiset arvot omissa sarakkeissaan (4 / 1)');
  ok(rT.training_outcome==='better','CSV: outcome-korjaus näkyy, snapshot ei muuttunut');
  const r4=rec(dAgo(4));
  ok(r4.day_state_complete==='false'&&r4.day_state_body===''&&r4.day_state_input_sleep==='','vajaa snapshot: complete=false, puuttuvat tyhjinä');
  const old=rec(dAgo(20));
  const newCols=['training_outcome','training_modifications','day_factors','day_state_complete','day_state_body','day_state_energy','day_state_reasons','day_state_model_version','day_state_snapshot_locked_at','created_at','updated_at'];
  ok(old&&newCols.every(c=>old[c]===''),'vanha päivä: uudet sarakkeet tyhjiä, ei keksittyjä arvoja');
  ok(!tbl.slice(1).some(r=>r.some(c=>/^(none|no_changes)$/.test(c))),'ei "none" / "no_changes" -arvoja');
  ok(tbl.slice(1).every(r=>rec(r[0]).csv_schema_version==='3'),'csv_schema_version = 3 jokaisella rivillä');
  ok(rT.created_at&&rT.updated_at&&!isNaN(Date.parse(rT.updated_at)),'uusi kirjaus: created_at ja updated_at');
  ok(old.created_at===''&&old.updated_at==='','vanhalle riville ei keksitty kirjausaikaa');
  const r11=rec(dAgo(11));
  ok(r11&&r11.injury_items==='shoulder_l:3:pahenee:','kipusarake: rakenteinen muoto kulkee (suunta mukana)');

  console.log('\nJSON-varmuuskopio');
  const backup=await p.evaluate(async()=>{ let out=null; window.shareOrDownloadFile=async(blob)=>{out=await blob.text();return true;}; await exportData(); return out; });
  const bj=JSON.parse(backup);
  ok(bj.entries[T].training_outcome==='better'&&bj.entries[T].day_state_snapshot&&bj.entries[D41].day_factors.length===2,'backup sisältää uudet kentät');
  // Palautus uuteen, tyhjään selaimeen
  await seed(p,NEW,{entries:{},measurements:[],settings:data.settings});
  await p.locator('input[type=file][onchange="importData(this)"]').setInputFiles({name:'b.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await p.waitForTimeout(900);
  const rest=await p.evaluate(ds=>S.entries[ds]||null,T);
  ok(rest&&rest.training_outcome==='better'&&JSON.stringify([rest.day_state_snapshot,rest.day_state_model_version,rest.day_state_snapshot_locked_at])===snap1,'uusi backup palautuu (outcome + snapshot identtisenä)');
  ok((await p.evaluate(ds=>JSON.stringify(S.entries[ds]?.day_factors),D41))==='["illness","high_stress"]','uusi backup palauttaa tagit');
  // Vanha backup + virheelliset arvot
  const oldBackup={version:5,exported:new Date().toISOString(),entries:JSON.parse(JSON.stringify(data.entries)),measurements:data.measurements,settings:data.settings};
  oldBackup.entries[dAgo(5)].training_outcome='great'; oldBackup.entries[dAgo(5)].day_factors=['illness','other','illness'];
  await seed(p,NEW,{entries:{},measurements:[],settings:data.settings});
  await p.locator('input[type=file][onchange="importData(this)"]').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldBackup))});
  await p.waitForTimeout(900);
  const imp=await p.evaluate(()=>Object.keys(S.entries).length);
  ok(imp===Object.keys(data.entries).length,`vanha backup tuodaan (${imp} kirjausta)`);
  const e5=await entry(p,dAgo(5));
  ok(e5.training_outcome===null&&JSON.stringify(e5.day_factors)==='["illness"]','tuonti: tuntematon enum → null, tuntematon tagi pudotetaan, duplikaatit pois');
  const e6=await entry(p,dAgo(6));
  ok(!('training_outcome' in e6)&&!('day_state_snapshot' in e6),'tuonti: vanhoille riveille ei lisätä keksittyjä kenttiä');

  console.log('\nKivun muokkaus tallennetulla päivällä (katselmointilöydös)');
  {
    const Tt=dAgo(0), Yy=dAgo(1);
    await seed(p,NEW,{entries:{[Yy]:{date:Yy,weight:107,injury_items:[{bodyPart:"hauo",painLevel:1,direction:"sama",resolved:false}]},
      [Tt]:{date:Tt,weight:107.5,injury_items:[{bodyPart:"hauo",painLevel:1,direction:"sama",resolved:false}]}},measurements:[],settings:data.settings});
    await p.evaluate(()=>{ if(!S.showExtra) toggleExtra(); setInjuryPainLevel(0,3); setInjuryDir(0,'pahenee'); });
    await p.waitForTimeout(1300); await flush(p);
    let st=(await stored(p,Tt)).injury_items[0];
    ok(st.painLevel===3&&st.direction==='pahenee','tänään: kiputason ja suunnan muutos tallentuu localStorageen');
    await p.reload(); await p.waitForTimeout(500);
    st=(await entry(p,Tt)).injury_items[0];
    ok(st.painLevel===3&&st.direction==='pahenee','tänään: muutos säilyy reloadissa');
    await p.evaluate(()=>{ moveDate(-1); if(!S.showExtra) toggleExtra(); toggleInjuryResolved(0); });
    await p.waitForTimeout(1300); await flush(p);
    ok((await stored(p,Yy)).injury_items[0].resolved===true,'eilinen: "Kipu ohi" tallentuu localStorageen');
    const before=await stored(p,Yy); await p.evaluate(()=>{moveDate(1);moveDate(-1);}); await p.waitForTimeout(1300); await flush(p);
    ok(JSON.stringify(before)===JSON.stringify(await stored(p,Yy)),'pelkkä avaaminen ei muuta tallennettua kipuriviä');
  }
  console.log('\nVanhamuotoinen kipukenttä');
  {
    const L=dAgo(2);
    await seed(p,NEW,{entries:{[L]:{date:L,weight:100,injury_bodyPart:"knee_l",injury_painLevel:2,injury_direction:"sama"}},measurements:[],settings:data.settings});
    const before=await stored(p,L);
    await p.evaluate(()=>{moveDate(-2);}); await p.waitForTimeout(1300); await flush(p);
    ok(JSON.stringify(before)===JSON.stringify(await stored(p,L)),'vanhamuotoisen kipurivin avaaminen ei kirjoita sitä uudelleen');
    await p.evaluate(()=>{ if(!S.showExtra) toggleExtra(); setInjuryPainLevel(0,4); }); await p.waitForTimeout(1300); await flush(p);
    const af=await stored(p,L);
    ok(af.injury_items&&af.injury_items[0].painLevel===4,'vanhamuotoisen rivin kipumuutos tallentuu uuteen muotoon');
  }

  console.log('\nJatkuvan kivun tarjous');
  {
    const Y=dAgo(1), Y3=dAgo(3), Y9=dAgo(9);
    const ents={
      [Y]:{date:Y,weight:100,injury_items:[{bodyPart:"knee_l",painLevel:3,direction:"sama",resolved:false},{bodyPart:"elbow_r",painLevel:2,direction:null,resolved:true}]},
      [Y3]:{date:Y3,weight:100,injury_items:[{bodyPart:"elbow_r",painLevel:4,direction:"pahenee",resolved:false},{bodyPart:"shoulder_l",painLevel:2,direction:"sama",resolved:false}]},
      [Y9]:{date:Y9,weight:100,injury_items:[{bodyPart:"back_low",painLevel:2,direction:"sama",resolved:false}]}
    };
    const st={...data.settings,tracking:undefined};
    await seed(p,NEW,{entries:ents,measurements:[],settings:data.settings});
    const offered=await p.evaluate(()=>pendingPainCarry(S.date).map(x=>x.bodyPart+':'+x.daysAgo));
    ok(offered.includes('knee_l:1')&&offered.includes('shoulder_l:3'),'aktiiviset kivut tarjotaan (eilen ja 3 pv sitten)');
    ok(!offered.some(x=>x.startsWith('elbow_r')),'uusimmassa kirjauksessa ohi merkittyä kipua ei tarjota');
    ok(!offered.some(x=>x.startsWith('back_low')),'yli 7 pv vanhaa kipua ei tarjota');
    ok(await p.locator('#pain-carry').isVisible(),'"Jatkuuko kipu?" -kortti näkyy');
    ok((await p.evaluate(()=>S.injury_items.length))===0,'mitään ei kopioida automaattisesti');
    ok((await stored(p,T))===null,'tarjous ei yksin luo tallennettavaa kirjausta');
    await p.locator('#pain-carry .pc-row').filter({hasText:'3/5'}).getByRole('button',{name:'Ennallaan',exact:true}).click();
    await p.waitForTimeout(1300); await flush(p);
    const t1=await stored(p,T);
    const k=t1&&t1.injury_items&&t1.injury_items.find(i=>i.bodyPart==='knee_l');
    ok(k&&k.painLevel===3&&k.direction==='sama'&&k.resolved===false,'Ennallaan: taso säilyy, suunta sama, tallentuu');
    ok(!(await p.evaluate(()=>pendingPainCarry(S.date).some(x=>x.bodyPart==='knee_l'))),'kirjattu kipu poistuu tarjouksesta');
    await p.evaluate(()=>carryPain('shoulder_l','ohi')); await p.waitForTimeout(1300); await flush(p);
    const sh=(await stored(p,T)).injury_items.find(i=>i.bodyPart==='shoulder_l');
    ok(sh&&sh.resolved===true&&sh.painLevel==null,'Ohi: merkitään parantuneeksi ilman tasoa');
    ok(!(await p.locator('#pain-carry').isVisible()),'kortti piiloutuu kun kaikki on käsitelty');
    // Huonompi / Parempi ja ohitus toisella päivällä
    await seed(p,NEW,{entries:ents,measurements:[],settings:data.settings});
    await p.evaluate(()=>carryPain('knee_l','huonompi'));
    ok(await p.evaluate(()=>{const i=S.injury_items.find(x=>x.bodyPart==='knee_l');return i.direction==='pahenee'&&i.painLevel===3;}),'Huonompi: suunta pahenee, taso säilyy');
    await p.evaluate(()=>dismissPainCarry('shoulder_l'));
    ok(!(await p.evaluate(()=>pendingPainCarry(S.date).some(x=>x.bodyPart==='shoulder_l'))),'× piilottaa tarjouksen tältä päivältä');
    ok(!(await p.evaluate(()=>S.injury_items.some(x=>x.bodyPart==='shoulder_l'))),'× ei kirjaa mitään');
    const noTrk=await p.evaluate(()=>{const s=JSON.parse(JSON.stringify(S.settings));S.settings.tracking={...(S.settings.tracking||{}),injury:false};const r=pendingPainCarry(S.date).length;S.settings=s;return r;});
    ok(noTrk===0,'ei tarjousta, jos kipuseuranta on pois päältä');
  }

  console.log('\nMitat-näkymä');
  {
    const ms=[{date:dAgo(60),wn:100,neck:41,hips:106,ar:38},{date:dAgo(30),wn:99,neck:41,hips:105,comment:"aamulla"},{date:dAgo(2),wn:97.5,neck:41,hips:105,sf_chest:11,sf_abd:19,sf_thigh:13}];
    await seed(p,NEW,{entries:data.entries,measurements:ms,settings:data.settings});
    await p.evaluate(()=>setTab('historia')); await p.waitForTimeout(200);
    const txt=await p.locator('#historia-content').innerText();
    ok(txt.includes('Kokonaiskuva')&&txt.includes('3 mittausta'),'kokonaiskuva ja mittausmäärä näkyvät');
    ok(txt.includes('97,5')&&txt.includes('alusta'),'vyötärön viimeisin arvo ja muutos alusta');
    const heads=await p.locator('.mo-table thead .mo-date').allInnerTexts();
    const fd=ds=>{const d=new Date(ds+'T00:00:00');return d.getDate()+'.'+(d.getMonth()+1)+'.';};
    ok(heads.length===3&&heads[0].startsWith(fd(dAgo(2)))&&heads[2].startsWith(fd(dAgo(60))),'taulukossa kaikki mittaukset, uusin ensin');
    ok(await p.locator('.mo-table th[scope=row]',{hasText:'Olkavarsi oikea'}).count()===1,'vain kerran mitattu kenttä näkyy taulukossa');
    ok(await p.locator('.mo-table th[scope=row]',{hasText:'Pohje oikea'}).count()===0,'mittaamattomia kenttiä ei näytetä');
    ok(txt.includes('aamulla'),'mittauksen huomio näkyy');
    // Muokkaus päivää napauttamalla + päivämäärän vaihto ei saa jättää kaksoiskappaletta
    await p.locator('.mo-date').nth(1).click(); await p.waitForTimeout(150);
    ok(await p.evaluate(()=>MEAS_FORM.show&&MEAS_FORM.editing),'päivän napautus avaa muokkauksen');
    const nd=dAgo(20);
    await p.evaluate(nd=>{MEAS_FORM.date=nd;saveMeasForm();},nd);
    const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('seuranta-meas')).map(m=>m.date));
    ok(after.length===3&&after.includes(nd)&&!after.includes(dAgo(30)),'päivämäärän vaihto siirtää mittauksen (ei kaksoiskappaletta)');
    // Päällekkäinen päivä: kysytään, hylkäys ei muuta mitään
    p.removeAllListeners('dialog'); p.on('dialog',d=>d.dismiss());
    await p.evaluate(()=>startEditMeas(S.measurements[0].date));
    await p.evaluate(d=>{MEAS_FORM.date=d;saveMeasForm();},dAgo(2));
    ok((await p.evaluate(()=>JSON.parse(localStorage.getItem('seuranta-meas')).length))===3,'olemassa olevan päivän päälle ei tallenneta ilman vahvistusta');
    await p.evaluate(()=>{MEAS_FORM={show:true,editing:null,date:S.measurements[2].date,values:{},comment:""};renderMeasurements();document.getElementById('mfd-wn').value='96';saveMeasForm();});
    ok((await p.evaluate(()=>S.measurements[2].wn))===97.5,'uusi mittaus samalle päivälle ei korvaa ilman vahvistusta');
    p.removeAllListeners('dialog'); p.on('dialog',d=>d.accept());
    await p.evaluate(()=>{cancelMeasForm();startEditMeas(S.measurements[0].date);});
    await p.getByRole('button',{name:'Poista mittaus',exact:true}).click(); await p.waitForTimeout(150);
    const left=await p.evaluate(()=>({n:JSON.parse(localStorage.getItem('seuranta-meas')).length,f:MEAS_FORM.show}));
    ok(left.n===2&&!left.f,'Poista mittaus -nappi poistaa ja sulkee lomakkeen');
    await p.evaluate(()=>{S.measurements=[];saveAll();renderMeasurements();});
    ok((await p.locator('#historia-content').innerText()).includes('Ei mittauksia vielä'),'tyhjä tila näkyy');
  }

  console.log('\nSnapshot ja seurantavalinnat');
  {
    const st={...data.settings,tracking:{sleep:true,recovery:true,motivation:false,injury:false,training:true,weight:true}};
    await seed(p,NEW,{entries:{},measurements:[],settings:st});
    const ci=await p.evaluate(()=>{S.sleep=7;S.recovery=3;S.motivation=4;S.training_done=true;setTrainingOutcome('normal');return S.day_state_snapshot.captured_inputs;});
    ok(ci.highest_active_pain===null,'kipu ei seurannassa: snapshotiin null eikä 0');
    ok(ci.general_energy_rating===null,'vire ei seurannassa: snapshotiin null');
    ok(ci.sleep===7&&ci.recovery===3,'seuratut arvot tallentuvat snapshotiin');
    const st2={...data.settings,tracking:{sleep:true,recovery:true,injury:true,training:true}};
    await seed(p,NEW,{entries:{},measurements:[],settings:st2});
    const ci2=await p.evaluate(()=>{S.sleep=7;S.recovery=3;S.training_done=true;setTrainingOutcome('normal');return S.day_state_snapshot.captured_inputs;});
    ok(ci2.highest_active_pain===0,'kipu seurannassa, ei aktiivista kipua: 0');
  }
  console.log('\nLääkkeiden aikaleimat');
  {
    const st={...data.settings,medications:[{id:7,name:"Testi",dose:10,unit:"mg",days:[0,1,2,3,4,5,6]}]};
    const Y=dAgo(1);
    await seed(p,NEW,{entries:{[Y]:{date:Y,weight:100,updated_at:"2026-01-01T00:00:00.000Z"}},measurements:[],settings:st});
    await p.evaluate(()=>toggleMedTaken('7',7));
    const t0=await stored(p,T);
    ok(t0&&t0.created_at&&t0.updated_at,'uusi päivä pelkällä lääkemerkinnällä saa created_at ja updated_at');
    await p.evaluate(()=>moveDate(-1)); await p.waitForTimeout(1300); await flush(p);
    await p.evaluate(()=>toggleMedTaken('7',7));
    const y1=await stored(p,Y);
    ok(y1.updated_at>"2026-01-01T00:00:00.000Z"&&!y1.created_at,'vanhan päivän lääkemerkintä päivittää updated_at, ei keksi created_at:ia');
    const before=y1.updated_at; await p.waitForTimeout(20);
    await p.evaluate(()=>adjMedDose('7',7,5));
    ok((await stored(p,Y)).updated_at>before,'annosmuutos päivittää updated_at');
  }

  console.log('\nVarmuuskopion jako (.txt)');
  {
    await seed(p,NEW,data);
    const r=await p.evaluate(async()=>{let got=null;
      navigator.canShare=({files})=>files.every(f=>/\.(txt|csv)$/.test(f.name)); // Chromen sallittujen päätteiden lista: ei .json
      navigator.share=async({files})=>{got={name:files[0].name,type:files[0].type,text:await files[0].text()};};
      await exportData(); return got;});
    ok(r&&r.name.endsWith('.txt'),'varmuuskopio avaa jakovalikon .txt-tiedostona ('+(r&&r.name)+')');
    const parsed=JSON.parse(r.text);
    ok(Object.keys(parsed.entries).length===Object.keys(data.entries).length&&parsed.measurements.length===2&&parsed.settings,'tiedoston sisältö on täysi JSON-varmuuskopio');
    // Palautus .txt-tiedostosta
    await p.evaluate(()=>{localStorage.setItem('seuranta-entries','{}');});
    await p.reload(); await p.waitForTimeout(500);
    await p.evaluate(()=>setTab('asetukset'));
    await p.locator('input[type=file][accept*=".txt"]').setInputFiles({name:r.name,mimeType:'text/plain',buffer:Buffer.from(r.text)});
    await p.waitForTimeout(600);
    ok((await p.evaluate(()=>Object.keys(S.entries).length))===Object.keys(data.entries).length,'palautus .txt-varmuuskopiosta palauttaa kirjaukset');
  }

  console.log('\nPT-viennin jako (.txt)');
  {
    await seed(p,NEW,data);
    const r=await p.evaluate(async()=>{let got=null;
      navigator.canShare=({files})=>files.every(f=>/\.(txt|csv)$/.test(f.name));
      navigator.share=async({files})=>{got={name:files[0].name,text:await files[0].text()};};
      await exportForPT(); const ref=buildPTExportData(); return {got,ref};});
    ok(r.got&&/^jarkale-pt-\d{4}-\d{2}-\d{2}\.txt$/.test(r.got.name),'PT-vienti avaa jakovalikon .txt-tiedostona ('+(r.got&&r.got.name)+')');
    const a=JSON.parse(r.got.text), b=r.ref; delete a.exported_at; delete b.exported_at;
    ok(JSON.stringify(a)===JSON.stringify(b)&&a.schema_version===1,'PT-viennin sisältö identtinen buildPTExportData():n kanssa, schema_version 1');
  }

  console.log('\nPainon lähtöarvo');
  {
    const Y=dAgo(1), Y5=dAgo(5);
    await seed(p,NEW,{entries:{[Y5]:{date:Y5,weight:107.6},[Y]:{date:Y,sleep:7}},measurements:[],settings:data.settings});
    ok((await p.locator('#inp-weight').getAttribute('placeholder'))==='107,6','tyhjässä painokentässä viimeisin paino harmaana vihjeenä');
    ok((await p.evaluate(()=>S.weight))===null&&(await stored(p,T))===null,'vihje ei tallennu arvoksi');
    await p.evaluate(()=>adj('weight',0.1));
    ok((await p.evaluate(()=>S.weight))===107.7,'+ lähtee viimeisimmästä painosta (107.6 → 107.7)');
    await p.evaluate(()=>{S.weight=null;adj('weight',-0.1);});
    ok((await p.evaluate(()=>S.weight))===107.5,'− lähtee viimeisimmästä painosta (107.6 → 107.5)');
    await seed(p,NEW,{entries:{},measurements:[],settings:data.settings});
    await p.evaluate(()=>adj('weight',0.1));
    ok((await p.evaluate(()=>S.weight))===80.1,'ilman aiempaa painoa lähtöarvo 80 kg');
  }

  console.log('\nViikkoyhteenveto');
  {
    const ctx2=await b.newContext({...devices['Pixel 7']}); const q=await ctx2.newPage();
    q.on('pageerror',e=>errs.push(e.message));
    await q.clock.install({time:new Date('2026-10-05T08:00:00')}); // maanantai
    const ents={}; const mk=(ds,o)=>{ents[ds]={date:ds,...o};};
    // edellinen viikko 21.–27.9.: paino ~109
    ['2026-09-21','2026-09-22','2026-09-23','2026-09-24'].forEach(d=>mk(d,{weight:109}));
    // viikko 28.9.–4.10.
    mk('2026-09-28',{weight:108.4,sleep:7.5,recovery:3,training_done:true,training_load:4,training_outcome:'worse',injury_items:[{bodyPart:'hauo',painLevel:2,direction:'sama',resolved:false}]});
    mk('2026-09-29',{weight:108.4,sleep:5.5,recovery:2,training_done:true,training_load:4,training_outcome:'worse',training_modifications:['deliberate_lightening'],day_factors:['alcohol'],day_state_snapshot:{complete:true,body_state:'loaded'}});
    mk('2026-09-30',{weight:108.2,sleep:7,recovery:4});
    mk('2026-10-01',{sleep:6,recovery:3,training_done:true,training_load:3,training_outcome:'normal',injury_items:[{bodyPart:'hauo',painLevel:null,direction:null,resolved:true}]});
    await seed(q,NEW,{entries:ents,measurements:[],settings:data.settings});
    const R=await q.evaluate(()=>buildWeekRecap('2026-09-28'));
    ok(R.logged===4&&R.enough,'yhteenveto laskee viikon kirjatut päivät (4)');
    ok(R.weight.avg===108.3&&R.weight.delta===-0.7,'painon viikkoka ja muutos edelliseen viikkoon');
    ok(R.training.n===3&&R.training.outcomes.worse===2,'treenit ja treenin kulku lasketaan');
    ok(R.sleep.below===3&&R.sleep.n===4,'uni alle tavoitteen lasketaan');
    ok(R.pains.length===1&&R.pains[0].resolved,'viikon viimeisin kiputila ratkaisee (ohi)');
    ok(R.factors.length===1&&R.factors[0].id==='alcohol','poikkeamat lasketaan');
    ok(R.training.lightened===1,'kevennetyt treenit lasketaan (1)');
    ok(R.dayState.loaded===1&&R.dayState.n===1,'Päivän tilan jakauma lasketaan tallenteista');
    ok(R.insight===undefined&&R.training.sleepCtx===undefined,'ei havaintoa eikä ryhmävertailua viikon sisällä');
    const html=await q.evaluate(()=>weekRecapHTML(buildWeekRecap('2026-09-28')));
    ok(/Kevennettiin tarkoituksella <b>1<\/b> treeni/.test(html)&&/Kuormittunut/.test(html),'kevennys ja Päivän tila näkyvät kuvailevasti');
    ok(!/\d+\/\d+ · muut|%|wr-insight/.test(html.replace(/kirjattu \d+\/\d+/,'').replace(/\d+\/\d+ alle/,'')),'ei vertailevia osuuksia tai prosentteja');
    ok(await q.locator('#week-recap .wr-banner').isVisible()&&/Viikon 40 yhteenveto valmis/.test(await q.locator('#week-recap').innerText()),'maanantaina Kirjaa-näkymässä yksirivinen ilmoitus viikkoyhteenvedosta');
    await q.locator('#week-recap .pc-x').click();
    ok(!(await q.locator('#week-recap').isVisible()),'yhteenvedon voi sulkea');
    await q.reload(); await q.waitForTimeout(500);
    ok(!(await q.locator('#week-recap').isVisible()),'suljettu yhteenveto pysyy suljettuna');
    const thin=await q.evaluate(()=>{const R=buildWeekRecap('2026-09-14'); return {enough:R.enough,html:weekRecapHTML(R)};});
    ok(!thin.enough&&/vähintään 3/.test(thin.html),'alle 3 kirjauspäivää: ei yhteenvetoa, vain selitys');
    const notrk=await q.evaluate(()=>{S.settings.tracking={weight:true,training:true};const R=buildWeekRecap('2026-09-28');return {s:R.sleep,r:R.recovery};});
    ok(notrk.s===undefined&&notrk.r===undefined,'seuraamattomia tietoja ei näytetä yhteenvedossa');
    await ctx2.close();
  }
  console.log('\nMitat-aloitusnäkymä');
  {
    const st={...data.settings,tracking:{body:true,weight:false,sleep:false}};
    await seed(p,NEW,{entries:{},measurements:[],settings:st});
    ok(await p.evaluate(()=>S.tab==='historia'),'vain mittoja seuraava aloittaa Mitat-sivulta');
    await p.evaluate(()=>setTab('log'));
    ok(await p.locator('#body-only-note').isVisible(),'Kirjaa-näkymä ohjaa Mitat-sivulle');
    await seed(p,NEW,{entries:{},measurements:[],settings:{...data.settings,tracking:{body:true,weight:true}}});
    ok(await p.evaluate(()=>S.tab==='log')&&!(await p.locator('#body-only-note').isVisible()),'jos päivittäisiä seurantoja on, aloitus on Kirjaa');
    await seed(p,NEW,{entries:{},measurements:[],settings:data.settings});
    ok(await p.evaluate(()=>S.tab==='log'),'vanha käyttäjä ilman seurantavalintoja aloittaa Kirjaa-näkymästä');
  }
  console.log('\nTrendien ja treeniosion ulkoasu');
  {
    await seed(p,NEW,data);
    await p.evaluate(()=>{setTab('trendit');S.rangeId='d28';S.trendToggles={charts:true};renderTrendit();});
    const html=await p.locator('#trendit-content').innerHTML();
    ok(!/[\u{1F300}-\u{1FAFF}]/u.test(html),'Trendit-näkymässä ei emojeja');
    ok(!/#60a5fa|#4ade80|#C9A227/i.test(html),'kaavioissa ei kovakoodattuja värejä (teeman muuttujat)');
    await p.evaluate(()=>{setTab('log'); if(!S.showExtra) toggleExtra(); S.training_done=true; renderTrainingSection();});
    ok(await p.getByRole('button',{name:'Heikommin kuin normaalisti',exact:true}).isVisible(),'treenin kulku -napeilla täysi saavutettava nimi');
    const tl=await p.locator('#training-section').innerText();
    ok(!/[\u{1F300}-\u{1FAFF}]/u.test(tl),'treeniosiossa ei emojeja');
    for(const tab of ['log','asetukset','historia']){
      await p.evaluate(t=>{setTab(t); if(t==='asetukset'){Object.keys(SETTINGS_TOGGLES).forEach(k=>SETTINGS_TOGGLES[k]=true); renderAsetukset();}},tab);
      const txt=await p.locator('#view-'+tab).innerText();
      const em=(txt.replace(/\s/g,'').match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu)||[]).filter(c=>c!=='✓');
      ok(em.length===0,`näkymässä ${tab} ei emojeja`+(em.length?': '+em.join(''):''));
    }
    ok((await p.evaluate(()=>Object.keys(ICONS).length))>30&&(await p.evaluate(()=>ico('scale').startsWith('<svg'))),'ikonisarja käytössä');
  }

  console.log('\nKenttäkohtaiset muutosajat ja suunniteltu kevennys');
  {
    const st={...data.settings,tracking:{sleep:true,recovery:true,motivation:true,injury:true,training:true,weight:true}};
    await seed(p,NEW,{entries:{},measurements:[],settings:st});
    await p.evaluate(()=>{setField('sleep',7); setStars('recovery',4);});
    await p.waitForTimeout(30);
    await p.evaluate(()=>{setStars('motivation',3); addInjuryItem('hauo'); setInjuryPainLevel(0,2);});
    await p.waitForTimeout(1300); await flush(p);
    const e1=await stored(p,T);
    ok(e1.field_changed_at&&e1.field_changed_at.recovery&&e1.field_changed_at.motivation&&e1.field_changed_at.injury,'palautumisen, vireen ja kivun muutosajat tallentuvat');
    ok(e1.field_changed_at.recovery<=e1.field_changed_at.motivation,'muutosajat ovat aikajärjestyksessä');
    await p.waitForTimeout(30);
    await p.evaluate(()=>{ if(!S.showExtra) toggleExtra(); toggleTraining('done'); setTrainingOutcome('worse'); });
    await p.waitForTimeout(1300); await flush(p);
    const e2=await stored(p,T);
    ok(e2.day_state_snapshot.inputs_changed_at.recovery===e1.field_changed_at.recovery,'tallenne kopioi lukittujen arvojen muutosajat');
    ok(e2.day_state_snapshot.inputs_changed_at.recovery<e2.day_state_snapshot_locked_at,'muutosaika on ennen lukitusta');
    await p.evaluate(()=>setStars('recovery',2)); await p.waitForTimeout(1300); await flush(p);
    const e3=await stored(p,T);
    ok(e3.field_changed_at.recovery>e2.field_changed_at.recovery&&e3.day_state_snapshot.inputs_changed_at.recovery===e2.day_state_snapshot.inputs_changed_at.recovery,'myöhempi muutos päivittää kentän ajan, lukittu tallenne ei muutu');
    ok(!(await p.getByRole('button',{name:'Kyllä, suunniteltu',exact:true}).count()),'kevennyskysymys ei näy ilman kevennysmerkintää');
    await p.evaluate(()=>toggleTrainingMod('deliberate_lightening'));
    await p.getByRole('button',{name:'Kyllä, suunniteltu',exact:true}).click();
    await p.waitForTimeout(1300); await flush(p);
    ok((await stored(p,T)).planned_lightening===true,'suunniteltu kevennys tallentuu');
    await p.evaluate(()=>toggleTrainingMod('deliberate_lightening')); await p.waitForTimeout(1300); await flush(p);
    ok((await stored(p,T)).planned_lightening===null,'kevennysmerkinnän poisto tyhjentää tiedon');
    const csv=await p.evaluate(async()=>{let c=null; window.shareOrDownloadFile=async(b)=>{c=await b.text();return true;}; await exportCSV(); return c;});
    const tb=parseCsv(csv); const H=tb[0]; const row=tb.find(r=>r[0]===T);
    ok(['recovery_changed_at','energy_changed_at','pain_changed_at','day_state_recovery_changed_at','planned_lightening'].every(h=>H.includes(h))&&H.indexOf('planned_lightening')>H.indexOf('csv_schema_version'),'CSV v3: uudet sarakkeet lopussa');
    ok(row[H.indexOf('day_state_recovery_changed_at')]===e2.day_state_snapshot.inputs_changed_at.recovery,'CSV: tallenteen muutosaika viedään');
    const old=await p.evaluate(()=>{const Y=Object.keys(S.entries)[0];return null;});
  }

  console.log('\nKirjallinen yhteenveto (tekoäly)');
  {
    await seed(p,NEW,data);
    await p.evaluate(()=>{localStorage.setItem('seuranta-coach-2026-09-28','{"text":"x"}');});
    await p.reload(); await p.waitForTimeout(500);
    ok(await p.evaluate(()=>localStorage.getItem('seuranta-coach-2026-09-28')===null),'vanhat valmentajaraporttien välimuistit siivotaan');
    await p.evaluate(()=>{setTab('trendit');S.rangeId='vko';S.periodOffset=-1;S.trendToggles={analysis:true};renderTrendit();});
    const vk=await p.locator('#trendit-content').innerText();
    ok(!/Valmentaja/.test(vk)&&!/Viikkokooste/.test(vk),'Valmentajalle-raportti ja erillinen viikkokooste poistettu');
    ok(/Kirjallinen yhteenveto/.test(vk),'viikkonäkymässä kirjallinen yhteenveto');
    const calls=await p.evaluate(async()=>{
      localStorage.setItem('jarkale-api-key','sk-test'); const seen=[];
      window.getApiKey=()=>'sk-test';
      window.fetch=async(url,opt)=>{const b=JSON.parse(opt.body); seen.push({model:b.model,sys:b.system,msg:b.messages[0].content});
        if(b.model==='claude-sonnet-5-5') return new Response('{}',{status:404});
        return new Response(JSON.stringify({content:[{type:'text',text:'Jaksolla kirjattiin 5 päivää. Uni oli keskimäärin 7,2 h.'}]}),{status:200,headers:{'Content-Type':'application/json'}});};
      const r=getRange(); await triggerPeriodSummary(r.start,r.dataEnd); return seen;});
    ok(calls[0]&&calls[0].model==='claude-sonnet-5-5','yhteenveto pyydetään ensin Sonnetilta');
    ok(calls[1]&&calls[1].model==='claude-haiku-4-5-20251001','jos Sonnet ei ole käytettävissä, käytetään Haikua');
    ok(/KIELI/.test(calls[0].msg)&&/desimaalipilkku/i.test(calls[0].msg)&&/ilman puhuttelua/.test(calls[0].msg),'kehotteessa suomen kielen ja jaettavuuden säännöt');
    ok(/Kokonaiskuva:/.test(calls[0].msg)&&/Huomionarvoista:/.test(calls[0].msg)&&/Seurattavaa:/.test(calls[0].msg),'kehote pyytää tulkitsevan rakenteen (kokonaiskuva, huomionarvoista, seurattavaa)');
    ok(/VALMIIKSI LASKETUT LUVUT/.test(calls[0].msg)&&/edellinen vastaava jakso/.test(calls[0].msg),'kehotteessa valmiiksi lasketut vertailut edelliseen jaksoon');
    ok(/Älä väitä syy-yhteyksiä/.test(calls[0].msg),'kehote kieltää syy-väitteet');
    await p.waitForTimeout(200);
    const card=await p.locator('#period-summary-card').innerText();
    ok(/Kopioi/.test(card)&&/Jaa/.test(card)&&/7,2 h/.test(card),'valmis yhteenveto näkyy ja sen voi kopioida tai jakaa');
    const share=await p.evaluate(()=>{const r=getRange();return summaryShareText(r.start,r.dataEnd);});
    const empty=await p.evaluate(async()=>{ const seen=[];
      window.fetch=async(url,opt)=>{const b=JSON.parse(opt.body); seen.push(b.model+':'+b.max_tokens);
        if(b.model==='claude-sonnet-5-5') return new Response(JSON.stringify({content:[{type:'thinking',thinking:'...'}],stop_reason:'max_tokens'}),{status:200});
        return new Response(JSON.stringify({content:[{type:'text',text:'Kokonaiskuva: ok.'}]}),{status:200});};
      const t=await callClaudeForText('x'); return {seen,t}; });
    ok(empty.seen[0]==='claude-sonnet-5-5:4000'&&empty.seen[1].startsWith('claude-haiku')&&empty.t==='Kokonaiskuva: ok.','tyhjä Sonnet-vastaus → automaattinen uusi yritys Haikulla');
    ok(/^Järkäle-yhteenveto \d+\.\d+\.\d{4}–\d+\.\d+\.\d{4}\n\nJaksolla/.test(share),'jaettavassa tekstissä otsikko ja aikaväli');
  }

  console.log('\nSuunniteltu vs. toteutunut, varmuuskopiomuistutus, kipuosio');
  {
    const ctx3=await b.newContext({...devices['Pixel 7']}); const q=await ctx3.newPage();
    q.on('pageerror',e=>errs.push(e.message)); q.on('dialog',d=>d.accept());
    await q.clock.install({time:new Date('2026-10-05T08:00:00')});
    const E={}; const mk=(ds,o)=>{E[ds]={date:ds,weight:108,...o};};
    mk('2026-09-28',{training_done:true,training_load:4});                                   // ma suunniteltu → toteutui
    mk('2026-09-29',{training_done:true,training_load:3,training_modifications:['partial_session']}); // ti → muuttui
    mk('2026-09-30',{sleep:7});                                                               // ke ei suunniteltu, ei treeniä
    mk('2026-10-01',{sleep:7});                                                               // to suunniteltu, kirjattu ilman treeniä → jäi väliin
    // pe 2.10. suunniteltu, ei kirjausta → ei tietoa
    mk('2026-10-04',{training_done:true,training_load:3});                                   // su ei suunniteltu → ylimääräinen
    const st={...data.settings,tracking:{weight:true,training:true,sleep:true,injury:true},goals:{...data.settings.goals,trainingDays:[1,2,4,5]}};
    await seed(q,NEW,{entries:E,measurements:[],settings:st});
    const P=await q.evaluate(()=>planStatusForRange('2026-09-28','2026-10-04'));
    ok(P.planned===4&&P.completed===1&&P.modified===1&&P.skipped===1&&P.unknown===1&&P.extra===1,'suunniteltu vs. toteutunut päätellään kirjauksista ('+JSON.stringify(P)+')');
    const html=await q.evaluate(()=>weekRecapHTML(buildWeekRecap('2026-09-28')));
    ok(/Suunnitellut treenit/.test(html)&&/Jäi väliin/.test(html)&&/ilman kirjausta/.test(html),'viikkoyhteenveto näyttää suunniteltujen treenien toteutumisen');
    ok(!/Varmuuskopio/.test(html),'varmuuskopiomuistutus ei toistu viikkoyhteenvedossa (yksi paikka)');
    const noPlan=await q.evaluate(()=>{S.settings.goals.trainingDays=null; return planStatusForRange('2026-09-28','2026-10-04');});
    ok(noPlan===null,'ilman viikkorytmiä ei suunnitelmaa');
    await q.evaluate(()=>{setTab('asetukset'); SETTINGS_TOGGLES.goals=true; renderAsetukset(); toggleTrainingDay(3,'');});
    ok((await q.evaluate(()=>JSON.stringify(S.settings.goals.trainingDays)))==='[3]','treenipäivän valinta asetuksissa tallentuu');
    // Kipuosio: uusi ulkoasu toimii samoilla setter-funktioilla
    await q.evaluate(()=>{setTab('log'); goToday(); if(!S.showExtra) toggleExtra(); addInjuryItem('hauo');});
    await q.locator('#injury-selector .inj-lvl button',{hasText:'2'}).click();
    await q.getByRole('button',{name:'Ennallaan',exact:true}).click();
    ok(await q.evaluate(()=>S.injury_items[0].painLevel===2&&S.injury_items[0].direction==='sama'),'kipuosion taso ja suunta toimivat uusilla napeilla');
    await q.locator('#injury-selector .inj-res').click();
    ok(await q.evaluate(()=>S.injury_items[0].resolved===true),'Kipu ohi -nappi toimii');
    ok(!/[\u{1F300}-\u{1FAFF}]/u.test(await q.locator('#injury-selector').innerText()),'kipuosiossa ei emojeja');
    ok(await q.evaluate(()=>!document.querySelector('#injury-selector .inj-select')&&!!document.querySelector('#injury-selector .inj-addbtn')),'aktiivisen kivun aikana lisäysvalinnat piilossa');
    await q.locator('#injury-selector .inj-addbtn').click();
    ok(await q.evaluate(()=>!!document.querySelector('#injury-selector .inj-select')),'Lisää kipupaikka -nappi avaa valinnat');
    await q.locator('#injury-selector .inj-addbtn.open').click();
    ok(await q.evaluate(()=>!document.querySelector('#injury-selector .inj-select')),'Sulje lisäys piilottaa valinnat uudelleen');
    await ctx3.close();
  }

  console.log('\nPäivän huomio: kipu');
  {
    const E={}; for(let i=1;i<=40;i++){const ds=dAgo(i); E[ds]={date:ds,weight:100,injury_items:[{bodyPart:'hauo',painLevel:1,direction:'sama',resolved:false}]};}
    const r1=await (async()=>{ await seed(p,NEW,{entries:E,measurements:[],settings:data.settings});
      return p.evaluate(T=>buildRuleBasedSaveInsight({date:T,weight:100,injury_items:[{bodyPart:'hauo',painLevel:1,direction:'sama',resolved:false}]},{...S.entries,[T]:{date:T,weight:100,injury_items:[{bodyPart:'hauo',painLevel:1,direction:'sama',resolved:false}]}}),T); })();
    ok(!r1||r1.type!=='injury_streak','pitkään jatkunut kipu ei tuota "kolmatta päivää" -huomiota');
    const E2={}; for(let i=1;i<=10;i++){const ds=dAgo(i); E2[ds]={date:ds,weight:100};} [1,2].forEach(i=>{E2[dAgo(i)].injury_items=[{bodyPart:'polvv',painLevel:2,direction:null,resolved:false}];});
    await seed(p,NEW,{entries:E2,measurements:[],settings:data.settings});
    const r2=await p.evaluate(T=>{const e={date:T,weight:100,injury_items:[{bodyPart:'polvv',painLevel:2,direction:null,resolved:false}]};return buildRuleBasedSaveInsight(e,{...S.entries,[T]:e});},T);
    ok(r2&&r2.type==='injury_streak'&&/Polvi vasen: uusi kipu/.test(r2.text),'uusi kipu kolmatta päivää tuottaa huomion ('+(r2&&r2.text)+')');
  }

  console.log('\nKirjaa-näkymän rakenne');
  {
    const E={}; for(let i=1;i<=30;i++){const ds=dAgo(i); E[ds]={date:ds,weight:108,sleep:7,recovery:3,motivation:3,injury_items:[{bodyPart:'hauo',painLevel:1,direction:'sama',resolved:false}]};}
    await seed(p,NEW,{entries:E,measurements:[],settings:data.settings});
    const order=await p.evaluate(()=>{const ids=['week-status','track-weight-wrap','extra-toggle','extra-fields','save-insight','meas-reminder','backup-reminder'];
      const all=[...document.querySelectorAll('#view-log *')]; return ids.map(id=>all.indexOf(document.getElementById(id)));});
    ok(order.every((v,i)=>v>=0&&(i===0||v>order[i-1])),'järjestys: viikkopallot → kirjauskentät → lisäseurannat → huomio → mittaus- ja varmuuskopiomuistutus ('+order.join(',')+')');
    ok(!(await p.locator('#week-status .ws-stat').count()),'viikkokortissa ei paino- ja unilaatikoita');
    const y=await p.evaluate(()=>document.getElementById('inp-weight').getBoundingClientRect().top);
    ok(y<420,'painokenttä näkyy heti avattaessa ('+Math.round(y)+' px)');
    const pc=await p.locator('#pain-carry').innerText();
    ok(/kirjattu eilen · jakso 30 pv/.test(pc)&&/Muuttui/.test(pc)&&!/Huonompi/.test(pc)&&/Ei tänään/.test(pc),'pitkään ennallaan jatkunut kipu tiiviinä rivinä, kirjausajankohta ja jakso erikseen ('+pc.split('\n')[1]+')');
    // v2.13.0: uni h:mm, harmaa edellinen arvo, asteikon merkitys, Päivän tila oma taso
    const u=await p.evaluate(()=>({ph:document.getElementById('inp-sleep').placeholder,gh:document.getElementById('sleep-ghost-hint').textContent,
      wgh:document.getElementById('weight-ghost-hint').textContent,
      a:parseSleep('6:12'),b:parseSleep('6,5'),c:parseSleep('6h 30min'),d:parseSleep('6:75'),e:fmtSleepHM(6.2),f:fmtSleepHM(7.999),g:fmtSleepHM(parseSleep('6.55')),h:fmtSleepHM(parseSleep('6,55')),i:fmtSleepHM(parseSleep('655')),j:fmtSleepHM(parseSleep('6.75')),k:fmtSleepHM(parseSleep('6:59')),l:parseSleep('7')}));
    ok(u.ph==='7:00'&&/harmaa = eilen/.test(u.gh)&&/eilen/.test(u.wgh),'tyhjänä päivänä harmaana edellinen uni ja paino, lähde kerrotaan ('+u.ph+' / '+u.gh+')');
    { const f=await p.evaluate(()=>{const e=document.getElementById('inp-weight');e.focus();e.value='108,5';S.weight=null;renderSteppers();const r={v:e.value,c:getComputedStyle(e,'::placeholder').color};e.blur();return r;});
      ok(f.v===''&&/0\.28\)$|28%/.test(f.c),'tyhjä paino tyhjentää kentän myös aktiivisena, eilinen arvo haalea ('+f.c+')'); }
    ok(u.a===6.2&&u.b===6.5&&u.c===6.5&&u.d===null&&u.e==='6:12'&&u.f==='8:00','unen syöte ja esitys h:mm');
    ok(u.g==='6:55'&&u.h==='6:55'&&u.i==='6:55'&&u.j==='6:45'&&u.k==='6:59'&&u.l===7,'unen syöte: 6.55, 6,55 ja 655 = 6:55; 6.75 = 6:45 ('+[u.g,u.h,u.i,u.j,u.k,u.l].join(' ')+')');
    await p.locator('#track-sleep-wrap .stepper-btn').nth(1).click();
    ok(await p.evaluate(()=>fmtSleepHM(S.sleep))==='7:05','unen + lähtee edellisestä unesta, 5 min askel');
    { const seq=await p.evaluate(()=>{const out=[];S.sleep=6.87; /* 6:52 */ for(let i=0;i<3;i++){adj('sleep',0.25);out.push(fmtSleepHM(S.sleep));} for(let i=0;i<14;i++){adj('sleep',-0.25);} out.push(fmtSleepHM(S.sleep)); S.sleep=7.08; renderSteppers(); renderReadiness(); return out;});
      ok(seq.join(' ')==='6:55 7:00 7:05 5:55','unen askeleet tasautuvat 5 minuuttiin ilman pyöristysvirhettä ('+seq.join(' ')+')'); }
    await p.evaluate(()=>{setStars('recovery',2);setStars('motivation',3);});
    ok((await p.locator('#scale-lbl-recovery').innerText()).trim()==='melko kuormittunut','valitun asteikkoarvon merkitys näkyy');
    ok(await p.evaluate(()=>document.getElementById('inp-sleep').value)==='7:05','uni näytetään h:mm');
    ok((await p.locator('#sleep-hm').innerText()).replace(/\s+/g,' ').trim()==='7 h 5 min','uni näkyy muodossa 7 h 5 min');
    { const c=await p.evaluate(()=>{DS_OPEN=false;renderReadiness();const el=document.getElementById('readiness-card');const r={txt:el.innerText.replace(/\s+/g,' ').trim(),tbl:!!el.querySelector('.ds-tbl')};
        el.querySelector('.ds-row').click();r.open=!!el.querySelector('.ds-tbl')&&localStorage.getItem('jarkale-ds-open')==='1';return r;});
      ok(!c.tbl&&/^Päivän tila/i.test(c.txt)&&c.txt.length<80,'Päivän tila kiinni: yksi rivi ('+c.txt+')');
      ok(/palautuminen/i.test(c.txt),'kiinni-tilassa luokitukseen vaikuttava tekijä näkyy');
      ok(c.open,'napautus avaa taulukon ja valinta muistetaan'); }
    const ds=await p.locator('#readiness-card').innerText();
    ok(/oma taso/.test(ds)&&/Palautuminen\s*2\s*3,0/.test(ds)&&/Uni\s*7 h 5 min\s*7 h/.test(ds)&&!/Yleinen vire/.test(ds),'Päivän tila: tänään ja oma taso rinnakkain ('+ds.replace(/\s+/g,' ').slice(0,120)+')');
    ok(await p.evaluate(()=>!document.querySelector('#training-section')?.innerText.includes('oma ka')),'kuormitusvertailu ei näy Kirjaa-näkymän treeniosiossa');
    // v2.14.0: ruudukko vain Kirjaa-näkymässä; muut näkymät eivät vuoda
    const g=await p.evaluate(()=>{const w=document.getElementById('track-weight-wrap').getBoundingClientRect(),s=document.getElementById('track-sleep-wrap').getBoundingClientRect();return {same:Math.abs(w.top-s.top)<2&&s.left>w.right};});
    ok(g.same,'paino ja uni vierekkäin');
    await p.evaluate(()=>setTab('asetukset')); await p.waitForTimeout(300);
    ok(await p.evaluate(()=>getComputedStyle(document.getElementById('view-log')).display)==='none','Kirjaa-näkymä piilossa muilla välilehdillä');
    await p.evaluate(()=>setTab('log')); await p.waitForTimeout(300);
    // v2.15.0: desimaalipilkku näkyvässä tekstissä, päiväykset ja versiot ennallaan
    { const r=await p.evaluate(async()=>{const out={};for(const t of ['log','trendit','historia','asetukset']){setTab(t);await new Promise(r=>setTimeout(r,250));out[t]=document.getElementById('view-'+t)?.innerText||'';}setTab('log');
        return {all:Object.values(out).join('\n'),fi:fiDec('108.5 kg, 3.6/5, 6.10., 28.9.–4.10., v2.14.7, 0.16 kg/vko'),num:[parseNum('8 400'),parseNum('108,5'),parseNum('108.5')]};});
      const bad=(r.all.match(/(^|[^\d.,])\d+\.\d+(?![\d.])/g)||[]);
      ok(!bad.length,'ei pistedesimaaleja näkyvässä tekstissä'+(bad.length?' ('+bad.slice(0,5).join(' | ')+')':''));
      ok(r.fi==='108,5 kg, 3,6/5, 6.10., 28.9.–4.10., v2.14.7, 0,16 kg/vko','muunnin: desimaalit pilkulle, päiväykset ja versiot ennallaan');
      ok(r.num[0]===8400&&r.num[1]===108.5&&r.num[2]===108.5,'syötteet: 8 400, 108,5 ja 108.5 kelpaavat'); }
    { const m=await p.evaluate(()=>{const keep=S.measurements;S.measurements=[{date:'2026-08-01',wn:100,neck:41}];setTab('historia');renderMeasurements();renderMeasurements();const n=document.querySelectorAll('.mo-add').length,inHero=!!document.querySelector('#mitat-hero .mo-add');S.measurements=keep;setTab('log');return {n,inHero,titles:document.querySelectorAll('.hero-title').length};});
      ok(m.n===1&&m.inHero&&m.titles===0,'Lisää mittaus yläosassa kerran, ei sivuotsikoita ('+JSON.stringify(m)+')'); }
    // v2.16.0: päivän vaihto sivunkääntönä (nuoli ja pyyhkäisy), ei jää siirtymiä päälle
    { const r=await p.evaluate(async()=>{const T=S.date;dayStep(-1);await new Promise(r=>setTimeout(r,60));const mid=dayParts().some(el=>el.getAnimations().length>0);
        await new Promise(r=>setTimeout(r,600));const d1=S.date;
        const z=document.getElementById('view-log'),W=window.innerWidth;
        const tch=(type,x)=>{const t=new Touch({identifier:1,target:z,clientX:x,clientY:400});z.dispatchEvent(new TouchEvent(type,{touches:type==='touchend'?[]:[t],changedTouches:[t],bubbles:true}));};
        tch('touchstart',W*0.8);for(let x=W*0.8;x>W*0.25;x-=30){tch('touchmove',x);} const dragX=dayParts()[0].style.transform; tch('touchend',W*0.25);
        await new Promise(r=>setTimeout(r,600));const d2=S.date;
        const left=dayParts().filter(el=>el.style.transform||el.style.opacity).length;
        return {T,d1,d2,mid,dragX,left};});
      ok(r.d1<r.T&&r.d2===r.T&&r.mid&&/translateX\(-/.test(r.dragX)&&r.left===0,'päivän vaihto: nuoli taaksepäin, pyyhkäisy eteenpäin, sisältö seuraa sormea, ei jäänteitä ('+JSON.stringify(r)+')'); }
    // v2.16.2: Trendien viikot pyyhkäisemällä; 28 pv -näkymässä pyyhkäisy ei tee mitään; jaksovalinnan vieritys ei käännä
    { const r=await p.evaluate(async()=>{setTab('trendit');S.rangeId='vko';S.periodOffset=0;renderTrendit();await new Promise(r=>setTimeout(r,200));
        const z=document.getElementById('view-trendit'),W=innerWidth;
        const sw=(x0,x1,tgt)=>{const mk=x=>new Touch({identifier:1,target:tgt||z,clientX:x,clientY:500});(tgt||z).dispatchEvent(new TouchEvent('touchstart',{touches:[mk(x0)],changedTouches:[mk(x0)],bubbles:true}));for(let x=x0;Math.abs(x-x1)>20;x+=(x1>x0?20:-20))(tgt||z).dispatchEvent(new TouchEvent('touchmove',{touches:[mk(x)],changedTouches:[mk(x)],bubbles:true}));(tgt||z).dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[mk(x1)],bubbles:true}));};
        const lbl0=document.getElementById('period-label').textContent;
        sw(W*0.2,W*0.75); await new Promise(r=>setTimeout(r,600)); const o1=S.periodOffset, lbl1=document.getElementById('period-label').textContent;
        sw(W*0.75,W*0.2); await new Promise(r=>setTimeout(r,600)); const o2=S.periodOffset;
        sw(W*0.75,W*0.2); await new Promise(r=>setTimeout(r,600)); const o3=S.periodOffset;
        sw(W*0.2,W*0.75,document.querySelector('#range-pills .pill-btn')); await new Promise(r=>setTimeout(r,600)); const o4=S.periodOffset;
        S.rangeId='d28';renderTrendit(); sw(W*0.2,W*0.75); await new Promise(r=>setTimeout(r,600)); const o5=S.periodOffset;
        const left=turnParts('view-trendit').filter(el=>el.style.transform).length; S.rangeId='d28'; setTab('log');
        return {o1,o2,o3,o4,o5,changed:lbl0!==lbl1,left};});
      ok(r.o1===-1&&r.o2===0&&r.o3===0&&r.o4===0&&r.o5===0&&r.changed&&r.left===0,'Trendit: viikko taaksepäin ja takaisin pyyhkäisemällä, ei tulevaisuuteen, ei jaksovalinnasta eikä 28 pv -näkymässä ('+JSON.stringify(r)+')'); }
    // v2.16.3: kirjattu päivä ruksina, treenipäivä käsipainona, selite näkyy
    { const w=await p.evaluate(()=>({ck:document.querySelectorAll('#week-status .ws-day.logged .ws-dot svg').length,lg:document.querySelectorAll('#week-status .ws-day.logged').length,leg:document.querySelector('#week-status .ws-legend')?.innerText||''}));
      ok(w.lg>0&&w.ck===w.lg&&/kirjattu/.test(w.leg),'viikon päivät: jokaisessa kirjatussa päivässä ruksi ja selite ('+JSON.stringify(w)+')'); }
    // v2.16.5: kauden suunta yhteenvedon faktoihin
    { const r=await p.evaluate(()=>{const keep=JSON.stringify(S.settings);const t=today();const st=new Date(t+'T00:00:00');st.setDate(st.getDate()-30);
        S.settings.seasonsEnabled=true;S.settings.seasons=[{id:1,name:'Kehityskausi',startDate:iso(st),durationWeeks:16}];
        const a=seasonFacts(t,{wLast:108,rate:0.2});S.settings.seasons=[{id:2,name:'Dieetti',startDate:iso(st)}];const b=seasonFacts(t,{wLast:108,rate:0.2});
        S.settings=JSON.parse(keep);return {a,b,dl:aiDayLine({date:t,sleep:6.75})};});
      ok(/painon nousu/.test(r.a)&&/on tavoitteen suuntainen/.test(r.a)&&/viikko 5\/16/.test(r.a)&&/painon lasku/.test(r.b)&&/ei tavoitteen suuntainen/.test(r.b)&&/6 h 45 min/.test(r.dl),'yhteenvedon faktat: kauden suunta ja uni h min ('+r.a.slice(0,90)+')'); }
    // v2.16.6: Trendien havaintolauseet
    { const t=await p.evaluate(async()=>{setTab('trendit');S.rangeId='d28';renderTrendit();await new Promise(r=>setTimeout(r,300));const x=document.getElementById('view-trendit').innerText;setTab('log');return x;});
      ok(!/Treeniä \d|kg\/viikko tällä|\dh\b|päivää — väli/.test(t),'Trendien havainnot ilman kömpelöitä muotoja'); }
    // v2.16.6: viikkoyhteenvedon lukumäärät nimi + luku -muodossa
    { const h=await p.evaluate(()=>{const R={weekStart:'2026-10-05',weekEnd:'2026-10-11',logged:7,passed:7,enough:true,complete:true,factors:[],pains:[],training:{n:2,goal:4,outcomeN:2,outcomes:{worse:0,normal:1,better:1}},sleep:{avg:6.5,n:7,below:7,goal:7},dayState:{n:1,loaded:0,normal:1,recovered:0}};return weekRecapHTML(R);});
      ok(/>Normaalisti<b>1<\/b>/.test(h)&&/>Kuormittunut<b>0<\/b>/.test(h)&&!/<b>1<\/b> normaalisti/.test(h)&&/6 h 30 min/.test(h)&&/2 alle tavoitteen/.test(h),'viikkoyhteenveto: lukumäärät muodossa "Normaalisti 1", uni h min'); }
    // v2.14.0: teemat
    ok(await p.evaluate(()=>document.documentElement.getAttribute('data-palette'))==='ampiainen','oletusteema Järkäle (ampiainen)');
    { const dd=await p.evaluate(()=>{const e=document.getElementById('date-display'),b=e.querySelector('.vko-badge');const r=e.getBoundingClientRect(),q=b.getBoundingClientRect();return {t:e.innerText,one:Math.abs(r.top-q.top)<14&&e.scrollWidth<=e.clientWidth+1};});
      ok(/VKO \d+/.test(dd.t)&&!/20\d\d/.test(dd.t)&&dd.one,'viikkonumero samalla rivillä, ei kuluvaa vuotta ('+dd.t.replace(/\n/g,' ')+')'); }
    for(const pal of ['magnesium','ampiainen','fosfori','kuusnelonen','tekstitv','manageri','hahmo','hiscore','kaurapuuro']){
      const r=await p.evaluate(pl=>{applyPalette(pl);const b=document.querySelector('#stars-recovery button.active')||document.querySelector('#stars-recovery button');
        const cs=getComputedStyle(b);return {attr:document.documentElement.getAttribute('data-palette'),saved:JSON.parse(localStorage.getItem('seuranta-settings')).palette,bg:cs.backgroundColor,fg:cs.color};},pal);
      ok(r.attr===pal&&r.saved===pal&&r.bg!==r.fg,'teema '+pal+' asettuu ja tallentuu');
    }
    { const fz=await p.evaluate(()=>{ const prevT=S.settings.theme; applyPalette('fosfori'); const res={};
        for(const t of ['dark','light']){ applyTheme(t); const b=getComputedStyle(document.body); res[t]={bg:b.backgroundColor,fg:b.color,ff:b.fontFamily}; }
        applyTheme(prevT); applyPalette('kaurapuuro'); return res; });
      const lum=c=>{const m=c.match(/\d+/g).map(Number);return (m[0]*299+m[1]*587+m[2]*114)/1000;};
      ok(lum(fz.dark.bg)<40&&lum(fz.dark.fg)>150&&lum(fz.light.bg)>180&&lum(fz.light.fg)<90,'Fosfori: tumma pääte ja vaalea käänteinen versio '+JSON.stringify([fz.dark.bg,fz.dark.fg,fz.light.bg,fz.light.fg]));
      ok(/Share Tech Mono/.test(fz.dark.ff),'Fosfori: tasalevyinen fontti'); }
    { const bt=await p.evaluate(async()=>{ const r={}; await new Promise(x=>setTimeout(x,120)); bootEnd(true); const mm=window.matchMedia; window.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
        themeBoot('kuusnelonen'); r.k=!!document.querySelector('#theme-boot.tb-kuusnelonen');
        await new Promise(x=>setTimeout(x,700)); r.kTxt=document.querySelector('#theme-boot .tb-txt').textContent;
        document.getElementById('theme-boot').click(); await new Promise(x=>setTimeout(x,450)); r.kSkip=!document.getElementById('theme-boot');
        themeBoot('fosfori'); await new Promise(x=>setTimeout(x,4200)); r.fGone=!document.getElementById('theme-boot');
        themeBoot('tekstitv'); await new Promise(x=>setTimeout(x,900)); r.tt=document.querySelector('#theme-boot .tt-pg')?.textContent; await new Promise(x=>setTimeout(x,3000)); r.ttGone=!document.getElementById('theme-boot');
        themeBoot('manageri'); await new Promise(x=>setTimeout(x,2000)); r.mg=document.querySelector('#theme-boot .mg-ls')?.textContent; await new Promise(x=>setTimeout(x,2000)); r.mgGone=!document.getElementById('theme-boot');
        window.matchMedia=q=>({matches:/reduce/.test(q),media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
        themeBoot('fosfori'); r.reduced=!document.getElementById('theme-boot');
        window.matchMedia=mm; return r; });
      ok(bt.k&&/JARKALE 64 BASIC V2/.test(bt.kTxt)&&/PAIVAA/.test(bt.kTxt),'Kuusnelonen: käynnistysanimaatio ja kirjausmäärä ('+bt.kTxt.slice(0,60)+')');
      ok(bt.kSkip,'napautus ohittaa animaation');
      ok(bt.fGone,'Fosforin animaatio päättyy itsestään');
      ok(bt.reduced,'Vähennä liikettä: ei animaatiota');
      ok(bt.tt==='P100'&&bt.ttGone,'Teksti-TV: sivunumero näppäillään, animaatio päättyy');
      ok(/Kirjaukset/.test(bt.mg||'')&&!/Tero/.test(bt.mg||'')&&bt.mgGone,'Manageri: tietokannan lataus, ei henkilötietoja'); }
    { await p.evaluate(()=>{const st=JSON.parse(localStorage.getItem('seuranta-settings'));st.palette='ampiainen';st.theme='light';localStorage.setItem('seuranta-settings',JSON.stringify(st));});
      await p.reload(); await p.waitForTimeout(900);
      const mc=await p.evaluate(()=>[document.querySelector('meta[name=theme-color]').content,getComputedStyle(document.getElementById('header')).backgroundColor]);
      ok(mc[0]===mc[1]&&/255, 210, 59/.test(mc[0]),'tilarivin väri = yläpalkin keltainen heti käynnistyksessä ('+mc[0]+')');
      await p.evaluate(()=>{applyPalette('kaurapuuro');applyTheme('dark');}); }
    await p.getByRole('button',{name:'Muuttui…',exact:true}).click();
    ok(/Huonompi/.test(await p.locator('#pain-carry').innerText()),'"Muuttui…" avaa kaikki vaihtoehdot');
    const fb=await p.evaluate(T=>{const e={date:T,weight:108};return buildRuleBasedSaveInsight(e,{...S.entries,[T]:e});},T);
    ok(!fb||fb.type!=='fallback','ei täytetekstihuomiota');
  }

  console.log('\nPT-mittausvienti täsmälleen ennallaan');
  const ptOf=async url=>{ await seed(p,url,data); return p.evaluate(async()=>{const d=buildPTExportData(); delete d.exported_at;
    let csv=null; window.shareOrDownloadFile=async(blob)=>{csv=await blob.text();return true;}; await exportCSV();
    return {pt:JSON.stringify(d),csv};}); };
  const oldR=await ptOf(OLD), newR=await ptOf(NEW); const ptOld=oldR.pt, ptNew=newR.pt;
  const oT=parseCsv(oldR.csv), nT=parseCsv(newR.csv);
  const verCol=oT[0].indexOf('csv_schema_version'); // versionumero nousee (2→3), muuten vanhat sarakkeet identtiset
  const sameOldCols=oT.length===nT.length&&oT.every((r,i)=>r.every((c,j)=>(i>0&&j===verCol)||nT[i][j]===c));
  ok(sameOldCols,'päiväkirja-CSV: vertailuversion (v2.9.3) sarakkeet ja arvot identtiset, uudet vain perässä');
  ok(ptOld===ptNew,'buildPTExportData() tuottaa saman tuloksen kuin vertailuversio (v2.9.3)');
  ok(!ptNew.includes('training_outcome')&&!ptNew.includes('day_factors'),'PT-vienti ei sisällä uusia kenttiä');

  ok(errs.length===0,'ei JS-virheitä'+(errs.length?': '+errs.join(' | '):''));
  console.log(`\n${pass} / ${pass+fail} läpi`);
  if(fail) console.log('EPÄONNISTUI:\n - '+fails.join('\n - '));
  await b.close(); process.exit(fail?1:0);
})();
