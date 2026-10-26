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
  ok(errs.length===0,'ei sivuvirheitä '+(errs.join(' | ')||''));
  await b.close();
  console.log(`\n${pass}/${pass+fail} läpi`);
  process.exit(fail?1:0);
})();
