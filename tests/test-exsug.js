// v2.18.170: liikkeen nimen ehdotukset kirjoitettaessa (editori, treenin lisäys, Vaihda liike)
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const p=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));localStorage.setItem('jarkale-news-seen','999');localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({tracking:{weight:true,training:true},gym:{enabled:true}}));});
  await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(async()=>{ const pr=newProgram('A'); pr.days[0].name='Ylä'; [['Penkkipunnerrus',3,6,10],['Kulmasoutu',3,8,12]].forEach(([n,s,a,c])=>pr.days[0].exercises.push(newEx({name:n,sets:s,repsMin:a,repsMax:c})));
    touchProg(pr); G.curProgramId=pr.id; gymSave();
    for(let k=2;k>=0;k--){ await startSession(pr.id,pr.days[0].id); const s=activeSession(); s.date=new Date(Date.now()-(k+1)*864e5).toISOString().slice(0,10); s.exercises.forEach(e=>e.sets.forEach(r=>{r.kg=60;r.reps=8;r.done=true;})); finishSession(true); } });
  const sg=await p.evaluate(()=>({sp:exSuggest('penkki punnerrus').map(o=>o.name), pre:exSuggest('kulma').map(o=>o.name), exact:exSuggest('Penkkipunnerrus').length, short:exSuggest('pe').length, none:exSuggest('Hauiskääntö').length}));
  ok(sg.sp[0]==='Penkkipunnerrus','eri kirjoitusasu ehdottaa vanhaa liikettä');
  ok(sg.pre[0]==='Kulmasoutu','nimen alku ehdottaa');
  ok(sg.exact===0,'täsmälleen sama nimi ei ehdota');
  ok(sg.short===0&&sg.none===0,'liian lyhyt tai tuntematon ei ehdota');
  // editori: uusi ohjelma, lisäysrivi
  await p.evaluate(()=>{ const p2=newProgram('B'); touchProg(p2); gymSave(); setTab('treeni'); gOpenEdit(p2.id); });
  await p.waitForTimeout(300);
  const inp=p.locator('[id^="g-add-"]').first(); await inp.fill('penkki punnerrus 3x8-10');
  ok(await p.locator('.ex-sug .tr-pill').count()>=1,'editorin lisäysrivi näyttää ehdotuksen');
  await p.locator('.ex-sug .tr-pill').first().click();
  ok(await inp.inputValue()==='Penkkipunnerrus 3x8-10','napautus vaihtaa nimen ja säilyttää tavoitteen');
  ok(await p.locator('.ex-sug').count()===0,'valinnan jälkeen ehdotus poistuu');
  await inp.press('Enter'); await p.waitForTimeout(200);
  const k=await p.evaluate(()=>{ const pr=G.programs.find(x=>x.name==='B'); const e=pr.days[0].exercises[0]; return [e.key,G.programs[0].days[0].exercises[0].key]; });
  ok(k[0]===k[1],'lisätty liike jatkaa vanhaa historiaa (sama avain)');
  // editori: nimen muokkaus täsmälleen tunnetuksi liittää historian
  await p.evaluate(()=>{ gEdit(pr=>pr.days[0].exercises.push({...newEx({name:'Kulma soutu tanko',sets:3}),key:exKey('Kulma soutu tanko')})); renderGym(); });
  const r=await p.evaluate(()=>{ const pr=G.programs.find(x=>x.name==='B'); const e=pr.days[0].exercises[1]; GU.openEx=e.id; renderGym(); const el=document.getElementById('g-exn-'+e.id); el.value='kulma'; el.dispatchEvent(new Event('input')); const b=document.querySelector('#g-exn-sug-'+e.id+' .tr-pill'); if(b) b.click(); const e2=G.programs.find(x=>x.name==='B').days[0].exercises[1]; return [!!b,e2.name,e2.key===G.programs[0].days[0].exercises[1].key]; });
  ok(r[0]&&r[1]==='Kulmasoutu'&&r[2],'nimen muokkaus ehdotuksesta liittää historian ('+r[1]+')');
  // treeni: lisäys ja Vaihda liike
  await p.evaluate(async()=>{ GU.mode='home'; const pr=G.programs[0]; await startSession(pr.id,pr.days[0].id); renderGym(); });
  await p.waitForTimeout(200);
  await p.locator('#g-addex').fill('kulma');
  ok(await p.locator('#g-addex-sug .tr-pill').count()===1,'treenin lisäysrivi ehdottaa');
  const rn=await p.evaluate(()=>{ const s=activeSession(); GU.rename=s.exercises[0].id; renderGym(); const el=document.getElementById('g-rename'); el.value='kulmasout'; el.dispatchEvent(new Event('input')); return document.querySelectorAll('#g-rename-sug .tr-pill').length; });
  ok(rn===1,'Vaihda liike ehdottaa');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
