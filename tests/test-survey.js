// v2.18.175: kysely kehittäjälle – näkyvyys, mukautuvat kysymykset, kulku ja sähköpostin sisältö
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const p=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  const setup=async(days,gym,trkBody)=>{ await p.evaluate(([days,gym,trkBody])=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now())); localStorage.setItem('jarkale-fb-later',String(Date.now()));
      localStorage.setItem('seuranta-settings',JSON.stringify({tracking:trkBody?{weight:true,sleep:true,training:true}:{training:true},gym:{enabled:gym}}));
      const E={},now=new Date().toISOString(); for(let i=1;i<=days;i++){ const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10); E[d]={date:d,weight:80,sleep:7,created_at:now,updated_at:now}; }
      localStorage.setItem('seuranta-entries',JSON.stringify(E)); },[days,gym,trkBody]);
    await p.reload(); await p.waitForTimeout(400);
    await p.evaluate(()=>localStorage.setItem(NEWS_KEY,JSON.stringify(PILOT_NEWS.map(n=>n.id)))); };
  await setup(10,false,true);
  ok(await p.evaluate(()=>surveyCardHTML()==="")===true,'oma versio: ei kyselyä');
  await p.evaluate(()=>document.documentElement.classList.add('pilot'));
  ok(await p.evaluate(()=>surveyCardHTML().includes('Kysely kehittäjälle')),'käyttäjien versio, 10 kirjauspäivää: kortti näkyy');
  ok(await p.evaluate(()=>{ renderNewsCard(); return !!document.querySelector('#news-card .sv'); }),'kortti Kirjaa-näkymässä');
  const q1=await p.evaluate(()=>surveyQs().map(q=>q.id).join(','));
  ok(q1==='why,daily,themes,extra,switch,rec','ilman salia: ei salikysymystä ('+q1+')');
  await setup(3,false,true); await p.evaluate(()=>document.documentElement.classList.add('pilot'));
  ok(await p.evaluate(()=>surveyCardHTML()==="")===true,'alle viikon käyttö: ei kyselyä');
  await setup(10,true,false); await p.evaluate(()=>document.documentElement.classList.add('pilot'));
  const q2=await p.evaluate(()=>surveyQs().map(q=>q.id).join(','));
  ok(q2==='why,slow,themes,extra,switch,rec','vain sali: salikysymys, ei päiväseurantakysymystä ('+q2+')');
  // kulku
  const flow=await p.evaluate(()=>{ surveyGo(0); const a=document.querySelector('#news-card .sv .nk').textContent;
    surveyAns('why','Kirjaus on nopeaa'); surveyAns('slow',''); surveyToggle('themes','Lasi'); surveyToggle('themes','Järkäle'); surveyToggle('themes','Lasi'); const th=document.querySelectorAll('#news-card .sv-th').length; surveyAns('themes',surveyState().a.themes); surveyAns('extra','Liikaa teemoja'); surveyAns('switch',''); surveyAns('rec','En kenellekään vielä');
    const done=surveyCardHTML().includes('Avaa sähköposti'); const body=surveyBody(); return {a,done,body,th}; });
  ok(flow.th===9,'teemakysymyksessä kaikki 9 teemaa värimalleineen');
  ok(/Teemoja karsitaan[^\n]*\n\s*Järkäle$/m.test(flow.body),'monivalinta: valinta ja poisto toimivat (Järkäle)');
  ok(/1\/6/.test(flow.a),'kysymysnumero näkyy ('+flow.a.trim()+')');
  ok(flow.done,'viimeisen jälkeen lähetysnäkymä');
  ok(flow.body.includes('Kirjaus on nopeaa')&&flow.body.includes('Liikaa teemoja')&&flow.body.includes('(ei vastausta)'),'viestissä vastaukset ja ohitetut');
  ok(/kirjauspäiviä 10/.test(flow.body)&&/salitreenejä 0/.test(flow.body)&&/Drive ei käytössä/.test(flow.body),'viestissä lukumäärät');
  ok(!/80|weight/.test(flow.body.split('Tausta:')[1]||'x'),'viestissä ei kirjausten arvoja');
  const sent=await p.evaluate(()=>{ const st=surveyState(); st.sent=true; st.sentQs=SURVEY_QS.map(q=>q.id); surveySave(st); return surveyCardHTML(); });
  ok(sent==='','lähetyksen jälkeen kortti ei näy');
  // v2.18.175:n jo lähettäneet: vain teemakysymys lisäkysymyksenä
  await setup(10,true,true); await p.evaluate(()=>document.documentElement.classList.add('pilot'));
  const ex=await p.evaluate(()=>{ localStorage.setItem(SURVEY_KEY,JSON.stringify({a:{why:'X'},sent:true,step:6,started:true})); const st=surveyState(); st.started=false; surveySave(st);
    const intro=surveyCardHTML(); surveyGo(0); surveyToggle('themes','Lasi'); surveyAns('themes',surveyState().a.themes); const body=surveyBody(); const st2=surveyState(); surveySend(); return {intro,body,after:surveyCardHTML()}; });
  ok(ex.intro.includes('Yksi lisäkysymys'),'aiemmin vastanneelle: Yksi lisäkysymys');
  ok(ex.body.includes('Teemoja karsitaan')&&ex.body.includes('Lasi')&&!ex.body.includes('Miksi käytät'),'lisäkysymyksen viestissä vain uusi kysymys');
  ok(ex.after==='','lähetyksen jälkeen ei enää korttia');
  // Ei nyt
  await setup(10,false,true); await p.evaluate(()=>document.documentElement.classList.add('pilot'));
  ok(await p.evaluate(()=>{ surveySnooze(); return surveyCardHTML(); })==='','Ei nyt piilottaa kortin');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
