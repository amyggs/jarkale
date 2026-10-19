// Järkäle Tracking v2.18.55 – kiinnitetty liikehuomio ja lihasryhmät: hyväksymistestit
const { chromium, devices } = require('playwright');
const URL='http://localhost:8765/index.html';
let pass=0, fail=0;
const ok=(c,msg)=>{ if(c)pass++; else fail++; console.log((c?'  ✓ ':'  ✗ ')+msg); };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(()=>{localStorage.clear();localStorage.setItem('seuranta-setup-done','1');localStorage.setItem('lastExport',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({gender:'male',palette:'ampiainen',theme:'light',gym:{enabled:true}}));
    const d=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
    const ex=(id,key,name,kg)=>({id,key,name,sets:[{kg,reps:10,done:true}]});
    const S=(id,n,exs)=>{const t=Date.parse(d(n)+'T17:00:00');return {id,programId:'p1',dayId:'d1',date:d(n),startedAt:t,endedAt:t+3600000,dayName:'X',exercises:exs};};
    const prog={id:'p1',name:'Testi',createdAt:1,days:[{id:'d1',name:'Koko',exercises:[{id:'x1',key:'penkkipunnerrus',name:'Penkkipunnerrus',sets:2},{id:'x2',key:'hack kyykky',name:'Hack kyykky',sets:2}]}]};
    localStorage.setItem('jarkale-gym',JSON.stringify({v:1,programs:[prog],curProgramId:'p1',activeId:null,sessions:[
      S('s1',5,[ex('a','penkkipunnerrus','Penkkipunnerrus',80),ex('b','hack kyykky','Hack kyykky',100),ex('c','ylatalja','Ylätalja rusettikahvalla',60)]),
      S('s2',3,[ex('d','penkkipunnerrus','Penkkipunnerrus',82),ex('e','hauiskaanto kp','Hauiskääntö KP',14),ex('f','vipunostot','Vipunostot',10),ex('g','farmer walk','Farmer walk',30)])]}));
  });
  await p.reload(); await p.waitForTimeout(600);

  console.log('\nLuokittelu');
  const cls=await p.evaluate(()=>["Penkkipunnerrus","Hack kyykky","Ylätalja rusettikahvalla","Hauiskääntö KP","Vipunostolaite sivuille","Farmer walk","Selänojennus","Punnerrukset","Reverse Pec Deck","RDL","Dippi omalla painolla","Rutistukset taljassa","Pec deck rinnalle","Ojentajat taljassa","Reiden ojennukset","JM press","JM-press"].map(exGroupAuto));
  ok(JSON.stringify(cls)===JSON.stringify(["Rinta","Jalat","Selkä","Kädet","Olkapäät","Muut","Selkä","Rinta","Olkapäät","Jalat","Kädet","Muut","Rinta","Kädet","Jalat","Kädet","Kädet"]),'nimistä oikeat ryhmät ('+cls.join(', ')+')');

  console.log('\nLiikkeiden kehitys ryhmittäin');
  await p.evaluate(()=>{setTab('treeni');GU.mode='home';renderGym();});await p.waitForTimeout(300);
  const heads=await p.locator('#g-exlist .ex-grp-h .n').allInnerTexts();
  ok(JSON.stringify(heads)===JSON.stringify(["Rinta","Selkä","Olkapäät","Kädet","Jalat","Muut"]),'ryhmät järjestyksessä ('+heads.join(', ')+')');
  ok(await p.locator('#g-exlist .tr-row:not(.ex-grp-h)').count()===0,'ryhmät oletuksena kiinni');
  await p.locator('#g-exlist .ex-grp-h',{hasText:'Rinta'}).click();await p.waitForTimeout(150);
  ok((await p.locator('#g-exlist').innerText()).includes('Penkkipunnerrus'),'ryhmä aukeaa napautuksella');
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('jarkale-exgrp-open')).Rinta===true),'avaus muistetaan');
  await p.reload();await p.waitForTimeout(500);await p.evaluate(()=>{setTab('treeni');GU.mode='home';renderGym();});await p.waitForTimeout(200);
  ok((await p.locator('#g-exlist').innerText()).includes('Penkkipunnerrus'),'avattu ryhmä pysyy auki uudelleenlatauksen jälkeen');
  await p.fill('#g-exsearch','vipu');await p.waitForTimeout(150);
  ok(await p.locator('#g-exlist .ex-grp-h').count()===0&&(await p.locator('#g-exlist').innerText()).includes('Vipunostot'),'haku näyttää osumat ilman ryhmiä');
  await p.fill('#g-exsearch','');await p.waitForTimeout(150);

  console.log('\nRyhmän vaihto käsin');
  await p.evaluate(()=>{GU.mode='exercise';GU.exKey='farmer walk';renderGym();});await p.waitForTimeout(200);
  ok(await p.locator('.ex-grp-row select').inputValue()==='Muut','liikkeen sivulla näkyy päätelty ryhmä');
  await p.selectOption('.ex-grp-row select','Selkä');await p.waitForTimeout(150);
  ok(await p.evaluate(()=>exGroup('farmer walk','Farmer walk')==='Selkä'&&G.exMeta['farmer walk'].grp==='Selkä'),'käsin valittu ryhmä tallentuu');
  await p.selectOption('.ex-grp-row select','Muut');await p.waitForTimeout(150);
  ok(await p.evaluate(()=>G.exMeta['farmer walk'].grp===''),'paluu päättelyn ryhmään poistaa ohituksen');

  console.log('\nKiinnitetty huomio');
  await p.evaluate(()=>{GU.mode='home';const pr=curProgram();startSession(pr.id,pr.days[0].id);const s=activeSession();GU.expanded={};s.exercises.forEach(e=>GU.expanded[e.id]=true);renderGym();});await p.waitForTimeout(300);
  const card=p.locator('.ex').first();
  await card.locator('.ex-act button',{hasText:'Huomio'}).click();await p.waitForTimeout(150);
  ok(await card.locator('.g-pinbtn').isDisabled(),'tyhjää huomiota ei voi kiinnittää');
  await card.locator('textarea.g-note').fill('Penkki 4, kahva keskelle');await p.waitForTimeout(100);
  ok(!(await card.locator('.g-pinbtn').isDisabled()),'kirjoitettu huomio voidaan kiinnittää');
  await card.locator('.g-pinbtn').click();await p.waitForTimeout(200);
  ok(await p.evaluate(()=>G.exMeta['penkkipunnerrus'].pin==='Penkki 4, kahva keskelle'&&!activeSession().exercises[0].userNote),'kiinnitys siirtää tekstin liikkeelle, ei treenin huomioksi');
  ok((await p.locator('.ex').first().locator('.ex-pin').innerText()).includes('Penkki 4'),'kiinnitetty huomio näkyy liikkeen kohdalla');
  ok(await p.locator('#undo-toast, .undo-toast').first().isVisible(),'kumoa-ilmoitus näkyy');
  // seuraava treeni: näkyy edelleen
  await p.evaluate(()=>{const s=activeSession();s.exercises[0].sets[0]={kg:85,reps:8,done:true};s.endedAt=Date.now();G.activeId=null;gymSave();const pr=curProgram();startSession(pr.id,pr.days[0].id);const a=activeSession();GU.expanded={};a.exercises.forEach(e=>GU.expanded[e.id]=true);renderGym();});await p.waitForTimeout(300);
  ok((await p.locator('.ex').first().locator('.ex-pin').innerText()).includes('Penkki 4'),'näkyy myös seuraavassa treenissä');
  ok(await p.locator('.ex').nth(1).locator('.ex-pin').count()===0,'ei näy muissa liikkeissä');
  await p.locator('.ex').first().locator('.ex-pin').click();await p.waitForTimeout(150);
  await p.locator('.ex').first().locator('.ex-pin textarea').fill('Penkki 5');
  await p.locator('.ex').first().locator('.ex-pin-a button',{hasText:'Valmis'}).click();await p.waitForTimeout(150);
  ok(await p.evaluate(()=>G.exMeta['penkkipunnerrus'].pin==='Penkki 5'),'muokkaus tallentuu');
  await p.locator('.ex').first().locator('.ex-pin').click();await p.waitForTimeout(150);
  await p.locator('.ex').first().locator('.ex-pin-a button',{hasText:'Irrota'}).click();await p.waitForTimeout(150);
  ok(await p.evaluate(()=>G.exMeta['penkkipunnerrus'].pin==='')&&await p.locator('.ex').first().locator('.ex-pin').count()===0,'irrotus poistaa huomion');
  await p.locator('#undo-toast button, .undo-toast button').first().click();await p.waitForTimeout(150);
  ok(await p.evaluate(()=>G.exMeta['penkkipunnerrus'].pin==='Penkki 5'),'irrotuksen voi kumota');


  console.log('\nTehdyt treenit');
  await p.evaluate(()=>{const a=activeSession();if(a){a.endedAt=Date.now();G.activeId=null;gymSave();}GU.mode='home';renderGym();});await p.waitForTimeout(200);
  ok(await p.locator('.tr-sec',{hasText:'Tehdyt treenit'}).count()===1,'otsikko Tehdyt treenit');
  const hb=p.locator('.tr-sec:has-text("Tehdyt treenit") + .tr-list');
  ok(await hb.locator('.tr-row').count()===1&&(await hb.innerText()).includes('Viimeksi'),'laatikko oletuksena kiinni, otsikossa viimeisin');
  await hb.locator('.ex-grp-h').click();await p.waitForTimeout(150);
  ok(await hb.locator('.tr-row').count()>1,'avautuu napautuksella');
  await hb.locator('.tr-row').nth(1).click();await p.waitForTimeout(200);
  ok(await p.locator('.g-sum').isVisible()&&await p.locator('.ex .set input').count()===0,'tallennettu treeni avautuu vain luettavaksi');
  await p.locator('.g-editpast').click();await p.waitForTimeout(150);
  ok(await p.locator('.ex .set input').count()>0&&await p.locator('.g-editbar').isVisible(),'Muokkaa treeniä avaa muokkauksen');
  await p.locator('.g-editbar .tr-go').click();await p.waitForTimeout(150);
  ok(await p.locator('.ex .set input').count()===0,'Valmis palauttaa lukutilaan');
  console.log('\nSynkronointi ja varmuuskopio');
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('jarkale-gym')).exMeta.penkkipunnerrus.pin==='Penkki 5'),'tallentuu laitteelle salidatan mukana (myös varmuuskopioon)');
  const mg=await p.evaluate(()=>{
    const L={entries:{},measurements:[],settings:{},gym:{programs:[],sessions:[],exMeta:{a:{pin:'vanha',updatedAt:100},b:{pin:'B',updatedAt:300}}}};
    const R={entries:{},measurements:[],settings:{},gym:{programs:[],sessions:[],exMeta:{a:{pin:'uusi',updatedAt:200},c:{grp:'Jalat',updatedAt:50}}}};
    const m=syncMerge(L,R,false);return m.gym.exMeta;});
  ok(mg.a.pin==='uusi'&&mg.b.pin==='B'&&mg.c.grp==='Jalat','synkronointi yhdistää liikkeittäin, uudempi voittaa');
  ok(await p.evaluate(()=>{const m=syncMerge({entries:{},gym:{programs:[],sessions:[]}},{entries:{},gym:{programs:[],sessions:[],exMeta:{z:{pin:'Z',updatedAt:1}}}},false);syncApply(m);return G.exMeta.z&&G.exMeta.z.pin==='Z';}),'synkronoitu tieto otetaan käyttöön');

  ok(errs.length===0,'ei JS-virheitä'+(errs.length?': '+errs.join(' | '):''));
  console.log(`\n${pass} / ${pass+fail} läpi`);
  await b.close(); process.exit(fail?1:0);
})();
