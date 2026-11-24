// v2.18.198: saman treenin muokkaus kahdella laitteella synkronointien välissä. Treeni ratkaistaan aikaleimalla kokonaisena,
// joten ilman yhdistämistä toisen laitteen kuitattu sarja katosi. Nyt: jos molemmat laitteet muuttivat treeniä edellisen
// synkronoinnin jälkeen, uudempi voittaa ristiriidoissa, mutta toisen laitteen kuitatut sarjat ja lisätyt liikkeet säilyvät.
// Jos vain toinen muutti (toisella vanha kopio), poisto pysyy poistettuna (vanha kopio ei palauta sarjaa).
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const p=await (await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(()=>typeof syncMerge==='function');
  const r=await p.evaluate(()=>{
    const T0=1_800_000_000_000, sync=T0+1000;
    const base=()=>({id:'s1',date:'2026-11-20',dayName:'Ylä',startedAt:T0,endedAt:T0+3600e3,updatedAt:T0+500,exercises:[
      {id:'e1',key:'penkki',name:'Penkki',goal:{sets:3},sets:[{kg:80,reps:8,done:true},{kg:80,reps:8,done:true},{kg:80,reps:7,done:true}]},
      {id:'e2',key:'soutu',name:'Soutu',goal:{sets:2},sets:[{kg:60,reps:10,done:true},{kg:60,reps:10,done:true}]}]});
    const pack=s=>({format:'jarkale-sync',version:1,entries:{},measurements:[],settings:{},gym:{programs:[],sessions:[s],exMeta:{}},tombs:{}});
    const res={};
    // 1) puhelin lisää sarjan 4, tabletti korjaa sarjan 2 painon (tabletti uudempi)
    const ph=base(); ph.exercises[0].sets.push({kg:80,reps:6,done:true}); ph.updatedAt=sync+100;
    const tb=base(); tb.exercises[0].sets[1].kg=82.5; tb.updatedAt=sync+200;
    let m=syncMerge(pack(ph),pack(tb),true,sync).gym.sessions[0];
    res.a={n:m.exercises[0].sets.length,kg2:m.exercises[0].sets[1].kg,kg4:m.exercises[0].sets[3]&&m.exercises[0].sets[3].reps,ts:m.updatedAt};
    // sama toisinpäin (paikallinen tabletti, Drivessa puhelimen versio)
    m=syncMerge(pack(tb),pack(ph),true,sync).gym.sessions[0];
    res.b={n:m.exercises[0].sets.length,kg2:m.exercises[0].sets[1].kg};
    // 2) toisella laitteella lisätty liike säilyy
    const ph2=base(); ph2.exercises.push({id:'e3',key:'hauis',name:'Hauis',goal:{sets:1},sets:[{kg:15,reps:12,done:true}]}); ph2.updatedAt=sync+100;
    const tb2=base(); tb2.exercises[1].sets[0].reps=11; tb2.updatedAt=sync+300;
    m=syncMerge(pack(ph2),pack(tb2),true,sync).gym.sessions[0];
    res.c={names:m.exercises.map(e=>e.name).join(','),r:m.exercises[1].sets[0].reps};
    // 3) poisto pysyy: tabletti poisti sarjan 3 synkronoinnin jälkeen, puhelimella vanha kopio (ei muutettu synkronoinnin jälkeen)
    const old=base(); old.updatedAt=T0+500;
    const del=base(); del.exercises[0].sets.pop(); del.updatedAt=sync+50;
    m=syncMerge(pack(old),pack(del),false,sync).gym.sessions[0];
    res.d={n:m.exercises[0].sets.length};
    // 4) kumpikin ehtii yhdistää: tulos sama (konvergoi), toinen kierros ei muuta
    const m1=syncMerge(pack(ph),pack(tb),true,sync); const again=syncMerge(pack(m1.gym.sessions[0]),m1,false,m1.gym.sessions[0].updatedAt).gym.sessions[0];
    res.e=JSON.stringify(again)===JSON.stringify(m1.gym.sessions[0]);
    // 5) ensimmäinen synkronointi (ei aiempaa): ennallaan, uudempi voittaa
    m=syncMerge(pack(ph),pack(tb),false,0).gym.sessions[0];
    res.f={n:m.exercises[0].sets.length};
    return res;
  });
  ok(r.a.n===4&&r.a.kg2===82.5&&r.a.kg4===6,`puhelimen lisäämä sarja säilyy ja tabletin korjaus voittaa (${r.a.n} sarjaa, sarja 2 ${r.a.kg2} kg)`);
  ok(r.b.n===4&&r.b.kg2===82.5,'sama tulos kummaltakin laitteelta katsottuna');
  ok(r.a.ts>1_800_000_001_200,'yhdistetty treeni saa uudemman aikaleiman (lähtee molemmille laitteille)');
  ok(r.c.names==='Penkki,Soutu,Hauis'&&r.c.r===11,'toisella laitteella lisätty liike säilyy ('+r.c.names+')');
  ok(r.d.n===2,'vain toisella laitteella muutettu: poistettu sarja ei palaa vanhasta kopiosta');
  ok(r.e,'yhdistetty tila on vakaa (toinen synkronointi ei muuta)');
  ok(r.f.n===3,'ilman aiempaa synkronointia uudempi voittaa kuten ennen');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
