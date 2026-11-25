// v2.18.201: mittauslomakkeen luonnos ei katoa, vaikka sovellus suljetaan ennen tallennusta (Android sulkee taustalla).
// Lisäksi FFMI ihopoimuista näkyy Mitoissa omana rivinään.
const { chromium, devices } = require('playwright');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ ')+m);};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const ctx=await b.newContext({...devices['Pixel 7'],serviceWorkers:'block'}); await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await ctx.addInitScript(()=>{ window.__jdlgAuto=true; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('seuranta-setup-done','1'); localStorage.setItem('lastExport',String(Date.now())); localStorage.setItem('jarkale-fb-later',String(Date.now()));
    localStorage.setItem('seuranta-settings',JSON.stringify({gender:'male',profile:{height:185,age:35},tracking:{weight:true,body:true}})); });
  await p.reload(); await p.waitForFunction(()=>typeof measDraftSave==='function'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ S.entries[today()]={date:today(),weight:98}; saveAll(); setTab('historia'); showMeasForm(); });
  await p.waitForTimeout(150);
  await p.locator('#mfd-wn').fill('88'); await p.locator('#mfd-neck').fill('42');
  await p.evaluate(()=>{ MEAS_FORM.sfOpen=true; renderMeasurements(); });
  await p.locator('#mfd-sf_chest').fill('6'); await p.locator('#mfd-sf_abd').fill('12'); await p.locator('#mfd-sf_thigh').fill('9,5');
  ok(await p.evaluate(()=>!!localStorage.getItem('jarkale-meas-draft')),'luonnos tallessa näppäilyjen aikana');
  // sovellus suljetaan ja avataan uudelleen ilman tallennusta
  await p.reload(); await p.waitForTimeout(500); await p.evaluate(()=>setTab('historia')); await p.waitForTimeout(150);
  const r=await p.evaluate(()=>({show:MEAS_FORM.show,wn:document.getElementById('mfd-wn')?.value,sf:document.getElementById('mfd-sf_thigh')?.value,note:/Tallentamaton mittaus palautettiin/.test(document.getElementById('view-historia').innerText)}));
  ok(r.show&&r.wn==='88'&&r.sf==='9,5'&&r.note,'uudelleenavauksen jälkeen lomake auki arvoineen ja ilmoitus palautuksesta');
  await p.evaluate(()=>saveMeasForm()); await p.waitForTimeout(200);
  const sv=await p.evaluate(()=>({n:(S.measurements||[]).length,draft:localStorage.getItem('jarkale-meas-draft'),show:MEAS_FORM.show,t:document.getElementById('view-historia').innerText}));
  ok(sv.n===1&&!sv.draft&&!sv.show,'tallennus: mittaus tallessa, luonnos poistettu');
  ok(/FFMI · Navy/.test(sv.t)&&/FFMI · ihopoimu/.test(sv.t),'Mitoissa FFMI sekä Navy- että ihopoimuarviosta');
  await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>!MEAS_FORM.show),'tallennuksen jälkeen lomake ei avaudu uudelleen');
  // muokkauksen avaus ilman muutoksia ei jätä luonnosta; peruminen muutosten jälkeen kysyy ja poistaa luonnoksen
  const ed=await p.evaluate(async()=>{ setTab('historia'); startEditMeas(S.measurements[0].date); const a=localStorage.getItem('jarkale-meas-draft');
    let asked=0; const oc=window.jConfirm; window.jConfirm=async()=>{ asked++; return true; };
    await cancelMeasForm(); startEditMeas(S.measurements[0].date); MEAS_FORM.values.wn=87; measDirty(); const b=!!localStorage.getItem('jarkale-meas-draft'); await cancelMeasForm(); window.jConfirm=oc;
    return {a,asked,b,after:localStorage.getItem('jarkale-meas-draft')}; });
  ok(ed.a===null&&ed.asked===1&&ed.b&&ed.after===null,'muokkaus ilman muutoksia ei jätä luonnosta; peruminen muutosten jälkeen kysyy ja poistaa luonnoksen');
  // ohjelmatuonnin tekstiluonnos
  await p.evaluate(()=>{ setTab('treeni'); GU.mode='import'; GU.importText=''; GU.importPreview=null; renderGym(); });
  await p.locator('#g-import').fill('1 Ylä\nPenkki 3 x 8\n2 Ala'); await p.reload(); await p.waitForTimeout(400);
  const im=await p.evaluate(()=>{ setTab('treeni'); GU.mode='import'; GU.importText=''; GU.importPreview=null; renderGym(); return {v:document.getElementById('g-import').value,note:/Keskeneräinen teksti palautettiin/.test(document.getElementById('view-treeni').innerText)}; });
  ok(/Penkki 3 x 8/.test(im.v)&&im.note,'ohjelmatuonnin liitetty teksti palautuu uudelleenavauksen jälkeen');
  const im2=await p.evaluate(async()=>{ GU.importText=document.getElementById('g-import').value; GU.importPreview=gMatchImport(parseProgramText(GU.importText)); await gImportSave(); return localStorage.getItem('jarkale-import-draft'); });
  ok(im2===null,'tallennus poistaa tekstiluonnoksen');
  ok(errs.length===0,'ei sivuvirheitä '+errs.join('|'));
  await b.close();console.log(`\n${pass}/${pass+fail} läpi`);process.exit(fail?1:0);
})();
