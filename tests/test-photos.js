// v2.18.207: kehityskuvat (vaihe 1). Lisäys kulmineen ja omine nimineen, viikkoryhmittely ja painon keskiarvo,
// vertailu, katselu/muokkaus/poisto, pysyvyys (IndexedDB), pienennys, zip-tallennus ja täysi palautus, jako, pilotissa piilossa.
const { chromium, devices } = require('playwright'); const fs=require('fs'), os=require('os'), path=require('path');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block',acceptDownloads:true}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now())); localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{weight:true,photos:true}})); indexedDB.deleteDatabase('jarkale-photos'); });
  await p.reload(); await p.waitForFunction(()=>typeof renderPhotos==='function'); await p.waitForTimeout(300);
  // keksityt testikuvat (2400 × 3200 ja 600 × 800)
  const img=async(w,h,col)=>Buffer.from((await p.evaluate(([w,h,col])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.fillStyle=col; x.fillRect(0,0,w,h); x.fillStyle='#fff'; x.fillRect(w/4,h/4,w/2,h/2); return c.toDataURL('image/png').split(',')[1]; },[w,h,col])),'base64');
  const big=await img(2400,3200,'#c33'), sm=await img(600,800,'#36c');
  const files=(n,buf)=>Array.from({length:n},(_,i)=>({name:`kuva${i+1}.png`,mimeType:'image/png',buffer:buf}));
  const D=await p.evaluate(()=>{ const t=new Date(today()+'T00:00:00'); const mon=new Date(t); mon.setDate(t.getDate()-(t.getDay()+6)%7); const lw=new Date(mon); lw.setDate(mon.getDate()-7); const lw2=new Date(lw); lw2.setDate(lw.getDate()+2);
    const w=[95,95.5,96]; w.forEach((v,i)=>{ const d=new Date(lw); d.setDate(lw.getDate()+i); S.entries[iso(d)]={date:iso(d),weight:v}; }); S.entries[today()]={date:today(),weight:93.2}; saveAll();
    return {lastWed:iso(lw2),lastMon:iso(lw),mon:iso(mon)}; });
  await p.evaluate(()=>setTab('historia')); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>/Kehityskuvat/.test(document.getElementById('photos-sec').innerText)&&!!document.querySelector('#photos-sec .ph-add')),'Mitat-välilehdellä Kehityskuvat-osio ja Lisää kuvat');

  // 1) neljä kuvaa viime viikolle, neljäs omalla nimellä
  await p.setInputFiles('#ph-file',files(4,big)); await p.waitForFunction(()=>PH.draft&&!PH.draft.busy,null,{timeout:15000});
  const d1=await p.evaluate(()=>({n:PH.draft.items.length,a:PH.draft.items.map(i=>i.angle).join(','),inp:document.querySelectorAll('.ph-di input').length,wh:PH.draft.items[0].w+'x'+PH.draft.items[0].h}));
  ok(d1.n===4&&d1.a==='front,side,back,__new'&&d1.inp===1,'luonnos: kulmat Edestä/Sivulta/Takaa ja neljännelle oman nimen kenttä ('+d1.a+')');
  ok(d1.wh==='1200x1600','kuva pienennetään 1600 pikseliin ('+d1.wh+')');
  await p.locator('.ph-di input').fill('Hauis jännitetty');
  await p.evaluate(d=>phDraftDate(d),D.lastWed); await p.evaluate(()=>phSave()); await p.waitForFunction(()=>!PH.draft&&PH.list.length===4);
  // 2) kaksi kuvaa tälle päivälle
  await p.setInputFiles('#ph-file',files(2,sm)); await p.waitForFunction(()=>PH.draft&&!PH.draft.busy); await p.evaluate(()=>phSave()); await p.waitForFunction(()=>PH.list.length===6);
  const tl=await p.evaluate(()=>{ const w=[...document.querySelectorAll('.ph-wk')]; return {n:w.length,first:w[0]?.dataset.wk,t0:w[0]?.innerText.replace(/ /g,' '),t1:w[1]?.innerText.replace(/ /g,' ')}; });
  ok(tl.n===2&&tl.first===D.mon,'kaksi viikkoa, uusin ensin');
  ok(/paino ka 93,2 kg \(1 pv\)/.test(tl.t0)&&/paino ka 95,5 kg \(3 pv\)/.test(tl.t1),'viikon aamupainojen keskiarvo ja päivien määrä');
  ok(/Hauis jännitetty/.test(tl.t1)&&/Edestä/.test(tl.t1)&&/Takaa/.test(tl.t1),'viikon kuvissa kulmat ja oma nimi');
  // 3) oma nimi muistetaan seuraavalla kerralla
  await p.setInputFiles('#ph-file',files(4,sm)); await p.waitForFunction(()=>PH.draft&&!PH.draft.busy);
  ok(await p.evaluate(()=>PH.draft.items[3].angle==='c:Hauis jännitetty'&&[...document.querySelectorAll('.ph-di select')][0].innerText.includes('Hauis jännitetty')),'oma kulman nimi tarjotaan seuraavalla kerralla');
  await p.evaluate(()=>phDraftCancel());
  // 4) vertailu
  await p.evaluate(()=>phCmpToggle()); await p.waitForTimeout(150);
  const cm=await p.evaluate(()=>({imgs:document.querySelectorAll('.ph-cmp .ph-ci img').length,chips:[...document.querySelectorAll('.ph-cmp .chip')].map(c=>c.innerText).join('|'),sel:[...document.querySelectorAll('.ph-cmp select')].map(s=>s.value).join(',')}));
  ok(cm.imgs===2&&cm.sel===D.lastMon+','+D.mon,'vertailu: ensimmäinen ja viimeisin viikko rinnakkain');
  ok(cm.chips==='Edestä|Sivulta|Takaa|Hauis jännitetty','vertailun kulmat ('+cm.chips+')');
  await p.evaluate(()=>{ PH.cmp.ang=PH.cmp.angs[2]; renderPhotos(); }); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>/Ei kuvaa tästä kulmasta/.test(document.querySelector('.ph-cmp').innerText)),'puuttuva kulma kerrotaan');
  // 5) katselu, kulman ja päivän muutos, poisto
  const vid=await p.evaluate(()=>PH.list.find(x=>x.angle==='front'&&x.date===today()).id);
  await p.evaluate(id=>phOpen(id),vid); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!!document.getElementById('ph-view')&&document.querySelector('#ph-view img').naturalWidth>0),'kuva aukeaa koko näytölle');
  await p.evaluate(id=>phSetAngle(id,'back'),vid); await p.waitForTimeout(150);
  await p.evaluate(([id,d])=>phSetDate(id,d),[vid,D.lastWed]); await p.waitForTimeout(150);
  ok(await p.evaluate(id=>{ const m=PH.list.find(x=>x.id===id); return m.angle==='back'&&document.querySelectorAll('.ph-wk')[0].dataset.wk!==undefined; },vid)&&await p.evaluate(([id,d])=>PH.list.find(x=>x.id===id).date===d,[vid,D.lastWed]),'kulman ja päivän muutos');
  await p.evaluate(id=>phDelete(id),vid); await p.waitForTimeout(250);
  const del=await p.evaluate(async()=>({n:PH.list.length,db:(await phTx('readonly',st=>st.count())),view:!!document.getElementById('ph-view')}));
  ok(del.n===5&&del.db===5&&!del.view,'poisto vahvistuksen jälkeen (myös tietokannasta)');
  // 6) pysyvyys
  await p.reload(); await p.waitForTimeout(300); await p.evaluate(()=>setTab('historia')); await p.waitForTimeout(600);
  ok(await p.evaluate(()=>PH.list.length===5&&[...document.querySelectorAll('.ph-th img')].every(i=>i.naturalWidth>0)),'kuvat säilyvät uudelleenavauksessa');
  // 7) jako (testiselaimessa ilman jakovalikkoa → lataus)
  const shareDl=[]; const lis=d=>shareDl.push(d.suggestedFilename()); p.on('download',lis);
  await p.evaluate(m=>phShareWeek(m),D.mon); await p.waitForTimeout(1200); p.off('download',lis);
  ok(shareDl.length===1&&/^vko\d+-sivulta\.jpg$/.test(shareDl[0]),'viikon kuvien jako: tiedostonimi viikosta ja kulmasta ('+shareDl.join(',')+')');
  // 8) zip-tallennus ja täysi palautus
  const before=await p.evaluate(async()=>{ const all=await phTx('readonly',st=>st.getAll()); return all.sort((a,b)=>a.id<b.id?-1:1).map(r=>[r.id,r.date,r.angle,r.w,r.h,r.blob.size].join('|')).join(';'); });
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>phExport())]);
  const zp=path.join(os.tmpdir(),'jarkale-test-kuvat.zip'); await dl.saveAs(zp);
  ok(/^jarkale-kuvat-\d{4}-\d{2}-\d{2}\.zip$/.test(dl.suggestedFilename())&&fs.statSync(zp).size>1000,'kuvat tallentuvat zip-tiedostoon');
  try{ const l=require('child_process').execSync(`python3 -c "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip() or 'OK',len(z.namelist()))" ${zp}`).toString().trim(); ok(l==='OK 6','zip on kelvollinen tavallisille ohjelmille ('+l+')'); }catch(e){ ok(false,'zip-tarkistus: '+e.message); }
  await p.evaluate(async()=>{ await phTx('readwrite',st=>st.clear()); PH.list=[]; PH.urls={}; renderPhotos(); });
  await p.evaluate(()=>{ window.__jdlgLog=[]; }); await p.setInputFiles('#ph-zip',zp); await p.waitForFunction(()=>PH.list.length===5,null,{timeout:10000});
  const after=await p.evaluate(async()=>{ const all=await phTx('readonly',st=>st.getAll()); return all.sort((a,b)=>a.id<b.id?-1:1).map(r=>[r.id,r.date,r.angle,r.w,r.h,r.blob.size].join('|')).join(';'); });
  ok(after===before,'palautus tuo kuvat, päivät ja kulmat täsmälleen ennallaan');
  ok(await p.evaluate(()=>/Palautettiin 5/.test(window.__jdlgLog.join('|'))),'palautuksen tulos kerrotaan');
  await p.evaluate(()=>{ window.__jdlgLog=[]; document.getElementById('ph-zip').value=''; }); await p.setInputFiles('#ph-zip',zp); await p.waitForTimeout(800);
  ok(await p.evaluate(()=>PH.list.length===5&&/Palautettiin 0[\s\S]*5 kuvaa oli jo tässä puhelimessa/.test(window.__jdlgLog.join('|'))),'sama tiedosto uudelleen ei tuplaa kuvia');
  await p.evaluate(()=>{ window.__jdlgLog=[]; }); await p.setInputFiles('#ph-zip',{name:'muu.zip',mimeType:'application/zip',buffer:Buffer.from('ei zip')}); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>/ei ole Järkäleen kuvatiedosto/.test(window.__jdlgLog.join('|'))&&PH.list.length===5),'väärä tiedosto: selkeä viesti, mitään ei muutu');
  // 9) Asetukset: varmuuskopio-osion rivi
  await p.evaluate(()=>{ setTab('asetukset'); SETTINGS_TOGGLES.data=true; renderAsetukset(); }); await p.waitForTimeout(200);
  const bk=await p.evaluate(()=>document.getElementById('photo-backup-row').innerText.replace(/ /g,' '));
  ok(/Kehityskuvat/.test(bk)&&/5 kuvaa/.test(bk)&&/eivät ole varmuuskopiossa/.test(bk)&&/Tallennettu viimeksi: \d/.test(bk),'Varmuuskopio-osiossa kuvien tila ja napit');
  // 10) valinnat: Valitse kaikki ei ota kuvia, pelkät mitat + kuvat = mittatila, kuvien seuranta pois piilottaa osion mutta ei poista
  const sel=await p.evaluate(()=>{ S.settings.tracking={weight:true}; selectAllTracking(); const a=S.settings.tracking.photos===true; S.settings.tracking={body:true,photos:true}; const bo=isBodyOnly();
    S.settings.tracking={weight:true}; setTab('historia'); renderMeasurements(); return {a,bo,sec:document.getElementById('photos-sec').innerHTML,n:PH.list.length}; });
  ok(!sel.a&&sel.bo&&sel.sec===''&&sel.n===5,'Valitse kaikki ei ota kuvia; mitat+kuvat = mittatila; pois päältä piilottaa osion, kuvat säilyvät');
  // 10b) yli 3 viikkoa: oletuksena 3 uusinta + Näytä kaikki
  const mw=await p.evaluate(async()=>{ S.settings.tracking={weight:true,photos:true}; const b=await phBlob(PH.list[0].id); const recs=[1,2,3].map(i=>{ const d=new Date(today()+'T00:00:00'); d.setDate(d.getDate()-7*(i+1)); return {id:'phx'+i,date:iso(d),angle:'front',w:1200,h:1600,createdAt:Date.now(),blob:b}; });
    await phTx('readwrite',st=>{ recs.forEach(r=>st.put(r)); }); recs.forEach(r=>PH.list.push(phMeta(r))); PH.list.sort(phSort); setTab('historia'); renderMeasurements();
    const a=document.querySelectorAll('.ph-wk').length, t=document.querySelector('.ph-more')?.innerText.replace(/\u00a0/g,' '); document.querySelector('.ph-more').click(); return {a,t,b:document.querySelectorAll('.ph-wk').length,weeks:phWeeks().length}; });
  ok(mw.a===3&&mw.b===mw.weeks&&/Näytä kaikki \(\d+ viikkoa\)/.test(mw.t),'yli 3 viikkoa: 3 uusinta ja Näytä kaikki ('+mw.t+')');
  // 12) v2.18.209: ohje ensimmäisellä kerralla, tallennusmuistutus, kameralla otetun alkuperäinen talteen
  const inf=await p.evaluate(()=>{ localStorage.removeItem(PH_INFO); S.settings.tracking={weight:true,photos:true}; setTab('historia'); renderMeasurements(); const a=!!document.querySelector('.ph-info')&&/eivät ole tavallisessa varmuuskopiossa/.test(document.querySelector('.ph-info').innerText);
    document.querySelector('.ph-info button').click(); return {a,b:!document.querySelector('.ph-info'),c:localStorage.getItem(PH_INFO)}; });
  ok(inf.a&&inf.b&&inf.c==='1','selitys ensimmäisellä kerralla, Selvä kuittaa pysyvästi');
  const rem=await p.evaluate(()=>{ const t=()=>document.querySelector('#photos-sec .ph-sub').innerText.replace(/\u00a0/g,' ');
    localStorage.setItem(PH_EXP,String(Date.now())); renderPhotos(); const fresh=t();
    PH.list[0].createdAt=Date.now()-40*864e5; PH.list[1].createdAt=Date.now(); localStorage.setItem(PH_EXP,String(Date.now()-35*864e5)); renderPhotos(); const old=t();
    localStorage.removeItem(PH_EXP); renderPhotos(); const never=t(); return {fresh,old,never}; });
  ok(/Tallennettu viimeksi/.test(rem.fresh)&&!/ei ole/.test(rem.fresh),'tuore tallennus: ei muistutusta ('+rem.fresh+')');
  ok(/Kuvia ei ole tallennettu 5 viikkoon/.test(rem.old)&&/ei ole vielä tallennettu/.test(rem.never),'muistutus 30 päivän jälkeen ja jos ei koskaan ('+rem.old+' | '+rem.never+')');
  const camDl=[]; const cl=d=>camDl.push(d.suggestedFilename()); p.on('download',cl);
  await p.setInputFiles('#ph-file',[{name:'kamera.png',mimeType:'image/png',buffer:sm}]); await p.waitForFunction(()=>PH.draft&&!PH.draft.busy);
  const camTxt=await p.evaluate(()=>({cam:PH.draft.items[0].cam,t:document.querySelector('.ph-draft .ph-sub').innerText}));
  await p.evaluate(()=>phSave()); await p.waitForTimeout(900); p.off('download',cl);
  ok(camTxt.cam&&/pienennetyn kopion/.test(camTxt.t)&&/latauksiin/.test(camTxt.t)&&camDl.length===1&&/^jarkale-\d{4}-\d{2}-\d{2}-edesta\.jpg$/.test(camDl[0]),'kameralla otettu: alkuperäinen latauksiin ja siitä kerrotaan ('+camDl.join(',')+')');
  // 11) v2.18.210: pilotissa näkyy, uutiskortti ottaa käyttöön ja avaa Mitat-sivun
  const pl=await p.evaluate(async()=>{ document.documentElement.classList.add('pilot'); S.settings.tracking={weight:true}; const k=getTrackingGroups().flatMap(g=>g.items.map(i=>i.key)).includes('photos');
    const n=PILOT_NEWS.find(x=>x.id==='2026-11-kuvat'); const sk=n.skip(); newsGo('photos'); await new Promise(r=>setTimeout(r,200));
    const r={k,sk,on:S.settings.tracking.photos===true,tab:S.tab,sec:/Kehityskuvat/.test(document.getElementById('photos-sec').innerText),skip2:n.skip()}; document.documentElement.classList.remove('pilot'); return r; });
  ok(pl.k&&!pl.sk&&pl.on&&pl.tab==='historia'&&pl.sec&&pl.skip2,'pilotissa: valinta, uutiskortti ottaa käyttöön ja avaa Mitat-sivun');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
