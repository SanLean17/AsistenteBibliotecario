const {setup,assert,fs,noOverflow}=require('./ui-helpers.cjs');
(async()=>{
 const {fieldState}=await import('./fixtures/field-state.js');
 const {page,go,finish}=await setup({deviceScaleFactor:1});const report={};
 try{
  await go('inicio');
  report.medium=await page.evaluate(async archive=>{const st=await import('./src/storage.js?v=20261015-field2');let t=performance.now();await st.restoreArchive(archive,'RESTAURAR');const restoreMs=performance.now()-t;t=performance.now();const backup=await st.exportArchive(),json=JSON.stringify(backup),exportMs=performance.now()-t;
   const before=await st.readAll();let failed=false;try{await st.rawMutate(s=>{s.books=[];s.settings=[];throw Error('Injected transaction failure');});}catch{failed=true;}if(!failed||JSON.stringify(before)!==JSON.stringify(await st.readAll()))throw Error('Rollback failed');
   await st.clearCatalog('VACIAR');t=performance.now();await st.restoreArchive(JSON.parse(json),'RESTAURAR');const roundtripMs=performance.now()-t,after=await st.exportArchive();const stable=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
   for(const key of Object.keys(backup).filter(k=>Array.isArray(backup[k])&&k!=='activity'))if(stable(backup[key])!==stable(after[key]))throw Error('Roundtrip changed '+key);
   let puts=0,deletes=0;const put=IDBObjectStore.prototype.put,del=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.put=function(...a){puts++;return put.apply(this,a);};IDBObjectStore.prototype.delete=function(...a){deletes++;return del.apply(this,a);};try{await st.rawMutate(()=>{});}finally{IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.delete=del;}if(puts||deletes)throw Error('Unchanged stores were rewritten');
   return {materials:backup.books.length,bytes:new Blob([json]).size,restoreMs,exportMs,roundtripMs,unchangedWrites:puts,rollback:true};},fieldState('medium'));
  await page.evaluate(async archive=>(await import('./src/storage.js?v=20261015-field2')).restoreArchive(archive,'RESTAURAR'),fieldState('large'));
  report.large={};for(const route of ['inicio','biblioteca','mostrador','mi-biblioteca','avisos','inventario','calidad']){const t=Date.now();await go(route);report.large[route]=Date.now()-t;assert.ok(report.large[route]<20000,route+' exceeds generous 20 s regression budget');await noOverflow(page,route);}
  await go('biblioteca');assert.equal(await page.locator('.book-card').count(),48);
  await page.getByRole('button',{name:'Página siguiente',exact:true}).click();await page.getByText('Página 2 de 209',{exact:true}).waitFor();const title=await page.locator('.book-card h3').first().textContent();
  await page.locator('.book-card').first().click();await page.locator('.record-page').waitFor();await page.goBack();await page.locator('#search').waitFor();assert.equal(await page.locator('.book-card h3').first().textContent(),title);
  let t=Date.now();await page.locator('#search').fill('océanos');await page.waitForFunction(()=>document.querySelector('.catalog-summary')?.textContent.includes('5000'));report.large.search=Date.now()-t;assert.ok(await page.locator('.book-card').count()<=48);await page.getByText('Página 1 de 105',{exact:true}).waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:900});await noOverflow(page,'320 reduced motion');await page.evaluate(()=>document.documentElement.style.fontSize='200%');await noOverflow(page,'320 large text');await page.evaluate(()=>document.documentElement.style.fontSize='');
  await page.screenshot({path:'qa/field-catalog-320.png',fullPage:false,animations:'disabled'});
  await go('inicio');
  report.session=await page.evaluate(async archive=>{const st=await import('./src/storage.js?v=20261015-field2');await st.restoreArchive(archive,'RESTAURAR');const state=await st.readState(),copy=state.books[0].exemplars[0],person=state.patrons.find(p=>p.accessProfile==='docente');let t=performance.now();const loanIds=new Set();for(let n=0;n<100;n++){const l=await st.execute('loan.create',{exemplarId:copy.id,patronId:person.id});loanIds.add(l.id);await st.execute('loan.return',{id:l.id});}const elapsed=performance.now()-t,s=await st.readState();if(loanIds.size!==100||s.loans.filter(l=>loanIds.has(l.id)&&l.status==='returned').length!==100)throw Error('Lost/repeated desk operation');return {operations:200,milliseconds:elapsed,book:state.books[0].id,code:copy.internalCode,copy:copy.id,person:person.id};},fieldState('small'));
  // Actual form, duplicated submit and immediate navigation while the transaction commits.
  await go('mostrador/'+report.session.code);await page.locator('#desk-person-query').fill('Persona de prueba 1');await page.locator('[data-desk-person]').first().click();
  await page.evaluate(()=>{const form=document.querySelector('#desk-loan-form');form.requestSubmit();form.requestSubmit();location.hash='#biblioteca';});
  await page.locator('#search').waitFor();await page.waitForFunction(async()=>{const s=await(await import('./src/storage.js?v=20261015-field2')).readState();return s.loans.filter(l=>l.status==='loaned').length===1;});assert.ok(page.url().endsWith('#biblioteca'));
  await page.reload();await page.locator('#search').waitFor();const active=await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261015-field2'),s=await st.readState();const loans=s.loans.filter(l=>l.status==='loaned');if(loans.length!==1)throw Error('Wrong active count');await st.execute('loan.return',{id:loans[0].id});return loans[0];});assert.equal(active.exemplarId,report.session.copy);
  // Imported text stays inert through the real card/detail templates.
  await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261015-field2'),{validateBook}=await import('./src/catalog.js?v=20261015-field2');await st.saveBook(validateBook({title:'<img src=x onerror="globalThis.FIELD_XSS=1">',author:'<script>globalThis.FIELD_XSS=2</script>',subjects:['<svg onload="globalThis.FIELD_XSS=3">'],notes:'<iframe srcdoc="bad">',copies:1}));});
  await go('biblioteca');await page.locator('#search').fill('onerror');await page.waitForFunction(()=>document.querySelectorAll('.book-card').length===1);await page.locator('.book-card').click();await page.locator('.record-page').waitFor();assert.equal(await page.evaluate(()=>globalThis.FIELD_XSS),undefined);assert.equal(await page.locator('main iframe, main svg[onload], main img[onerror]').count(),0);
  fs.writeFileSync('qa/field-volume.json',JSON.stringify(report,null,2));console.log('PASS FIELD medium roundtrip and rollback, 10k catalog, pagination, 200 desk operations, navigate during save, hostile text',report);
  await finish();
 }catch(e){await page.screenshot({path:'qa/field-volume-failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await page.context().browser().close();}
})().catch(e=>{console.error(e);process.exit(1);});

