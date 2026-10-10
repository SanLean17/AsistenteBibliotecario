const {setup,assert,noOverflow,fs}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish,context}=await setup({deviceScaleFactor:1});
 try{
 const requests=[];context.on('request',r=>requests.push(r.url()));
 const routes=['inicio','biblioteca','agregar','jornada-catalogacion','asistencia','mostrador','circulacion','reservas','mi-biblioteca','guardados','ejemplares','inventario','atencion','usuarios','permisos','organizacion','coleccion','avisos','calidad','puesta-en-marcha','piloto','actividad','etiquetas','interoperabilidad','configuracion'];
 for(const route of routes){
  await go(route);
  const audit=await page.evaluate(()=>{
   const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
   const named=e=>e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')?.split(' ').some(id=>document.getElementById(id)?.textContent.trim())||[...(e.labels||[])].some(l=>l.textContent.trim());
   return {heading:document.querySelector('main h1')?.textContent,title:document.title,labels:[...document.querySelectorAll('main input,main select,main textarea')].filter(e=>visible(e)&&!['submit','button','hidden'].includes(e.type)&&!named(e)).map(e=>e.outerHTML),buttons:[...document.querySelectorAll('main button')].filter(e=>visible(e)&&!e.textContent.trim()&&!named(e)).map(e=>e.outerHTML)};
  });
  assert.ok(audit.title.includes(audit.heading),route+' title');assert.deepEqual(audit.labels,[],route+' labels');assert.deepEqual(audit.buttons,[],route+' buttons');
  for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await noOverflow(page,route+' '+width+' '+theme);}
 }
 assert.ok(!requests.some(u=>u.includes('/vendor/ocr-')),'OCR stays unloaded throughout navigation');
 await go('configuracion');await page.locator('[data-action=import]').click(); // File chooser can be cancelled without losing the route.
 await go('inicio');
 const seeded=await page.evaluate(async()=>{
  const st=await import('../src/storage.js?v=20261010-rc1'),{validateBook}=await import('../src/catalog.js?v=20261010-rc1'),{command}=await import('../src/local-domain.js?v=20261010-rc1');
  const actor=st.getActorId(),start=performance.now();
  await st.mutate(s=>{for(let i=0;i<1500;i++)s.books.push(validateBook({title:'Material de prueba '+i,author:'Autora '+i,subjects:['Historia'],contents:['Capítulo océanos'],copies:1}));});
  const seedMs=performance.now()-start;
  await st.mutate(s=>{const j=command(s,actor,'cataloging.start',{});for(let i=0;i<300;i++)command(s,actor,'cataloging.capture',{sessionId:j.id,raw:'captura-'+i});});
  let s=await st.readState();const inv=await st.execute('inventory.start',{});await st.execute('inventory.scan',{id:inv.id,code:s.books[0].exemplars[0].internalCode});
  const patron=await st.execute('person.save',{name:'Lector de prueba',cargo:'Estudiante',accessProfile:'lector',status:'active'}),copy=s.books[0].exemplars[0];
  const concurrent=await Promise.allSettled([st.execute('loan.create',{exemplarId:copy.id,patronId:patron.id}),st.execute('loan.create',{exemplarId:copy.id,patronId:patron.id})]);
  if(concurrent.filter(r=>r.status==='fulfilled').length!==1)throw new Error('Concurrent loan accepted twice');
  const loan=concurrent.find(r=>r.status==='fulfilled').value;await st.execute('loan.return',{id:loan.id});
  const second=await st.execute('loan.return',{id:loan.id}).then(()=>true,()=>false);
  s=await st.readState();if(s.activity.filter(a=>a.type==='loan.returned'&&a.loanId===loan.id).length>1)throw new Error('Double return event');
  const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;await st.savePhoto({id:copy.id,bookId:s.books[0].id,dataUrl:canvas.toDataURL('image/jpeg'),takenAt:new Date().toISOString()});
  await st.execute('schoolPilot.start',{pilotName:'RC1',expectedActor:actor,expectedInstitution:st.getInstitutionId()});
  await st.execute('schoolPilot.feedback',{title:'Prueba de restauración',type:'question',severity:'low',expectedActor:actor,expectedInstitution:st.getInstitutionId()});
  await st.execute('location.save',{name:'Sala',type:'sector'});
  const need=await st.execute('collection.need.create',{title:'Atlas regional'});
  await st.execute('resource.share.create',{title:'Atlas regional',direction:'request',targetInstitution:'Escuela de prueba',needId:need.id});
  await st.execute('assistance.start',{target:'material',materialId:s.books[0].id,captureKind:'cover'});
  const reservation=await st.execute('reservation.create',{bookId:s.books[1].id,patronId:patron.id});
  await st.execute('reservation.transition',{id:reservation.id,status:'cancelled'});
  return {seedMs,queue:s.catalogingSessions[0].id,book:s.books[0].id,actor,patron:patron.id};
 });
 const timings={seed:seeded.seedMs};
 for(const route of ['inicio','biblioteca','mostrador','jornada-catalogacion/'+seeded.queue,'inventario']){const start=Date.now();await go(route);timings[route.split('/')[0]]=Date.now()-start;assert.ok(timings[route.split('/')[0]]<15000,route+' exceeded generous smoke budget');}
 assert.equal(await page.evaluate(async()=> (await(await import('../src/storage.js?v=20261010-rc1')).readState()).inventorySessions[0].expectedExemplarIds.length),1500);
 await go('biblioteca');let start=Date.now();await page.locator('#search').fill('océanos');await page.waitForFunction(()=>document.querySelector('.catalog-summary')?.textContent.includes('1500'));timings.search=Date.now()-start;
 await go('jornada-catalogacion/'+seeded.queue);assert.equal(await page.locator('[data-queue-item]').count(),300);await page.reload();await page.locator('#cataloging-capture').waitFor();assert.equal(await page.locator('[data-queue-item]').count(),300);
 const grant=await page.evaluate(async ids=>{const st=await import('../src/storage.js?v=20261010-rc1');const g=await st.execute('grant.add',{userId:ids.patron,permission:'catalog.edit',expiresAt:new Date(Date.now()+3600000).toISOString()});st.setActorId(ids.patron);return g.id;},seeded);
 await go('editar/'+seeded.book);await page.locator('#book-form').waitFor();assert.equal(await page.locator('[data-delete]:visible').count(),0);
 await page.evaluate(async({ids,grant})=>{const st=await import('../src/storage.js?v=20261010-rc1');st.setActorId(ids.actor);await st.execute('grant.revoke',{id:grant});st.setActorId(ids.patron);let denied=false;try{await st.saveBook((await st.getBooks())[0]);}catch{denied=true;}if(!denied)throw new Error('Revocation did not apply immediately');},{ids:seeded,grant});
 await page.reload();await page.getByRole('heading',{name:'Acceso no habilitado'}).waitFor();await page.evaluate(async id=>(await import('../src/storage.js?v=20261010-rc1')).setActorId(id),seeded.actor);
 const roundtrip=await page.evaluate(async()=>{
  const st=await import('../src/storage.js?v=20261010-rc1'),{STORES}=await import('../src/local-domain.js?v=20261010-rc1'),{restoreIntegrity}=await import('../src/recovery.js?v=20261010-rc1');
  let blocked=false;try{await st.deleteBook((await st.readState()).books[0].id);}catch{blocked=true;}if(!blocked)throw new Error('Active inventory allowed deletion');const inventory=(await st.readState()).inventorySessions[0];await st.execute('inventory.close',{id:inventory.id});if((await st.getBooks()).some(b=>b.exemplars.some(e=>e.status==='lost')))throw new Error('Inventory automatically marked loss');
  const archive=await st.exportArchive();
  for(const change of [a=>a.books[0].workId='missing',a=>a.settings.find(c=>c.id==='local').sequence=1,a=>a.photos[0].bookId='missing']){const invalid=structuredClone(archive);change(invalid);const before=JSON.stringify(await st.readAll());let rejected=false;try{await st.restoreArchive(invalid);}catch{rejected=true;}if(!rejected||JSON.stringify(await st.readAll())!==before)throw new Error('Invalid backup changed data');}
  await st.clearCatalog();await st.restoreArchive(archive);const after=await st.exportArchive();
  const stable=value=>JSON.stringify(value,(key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  const differences=STORES.filter(k=>k!=='activity'&&stable([...archive[k]].sort((a,b)=>a.id.localeCompare(b.id)))!==stable([...after[k]].sort((a,b)=>a.id.localeCompare(b.id))));
  if(after.activity.length!==archive.activity.length+1||archive.activity.some(a=>stable(a)!==stable(after.activity.find(b=>b.id===a.id))))differences.push('activity');
  return {differences,integrity:restoreIntegrity(after)};
 });
 assert.deepEqual(roundtrip.differences,[]);assert.deepEqual(roundtrip.integrity.errors,[]);
 await go('ficha/'+seeded.book);await page.locator('[data-delete]').click();await page.locator('#confirm-action').waitFor({state:'visible'});assert.equal(await page.locator('#confirm-cancel').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Escape');await page.locator('#confirm-action').waitFor({state:'hidden'});assert.equal(await page.locator('.record-page').count(),1);
 fs.writeFileSync('qa/rc1-performance.json',JSON.stringify(timings,null,2));console.log('PASS RC1: 25 routes × 8 layouts, basic accessibility, lazy OCR, 1500 materials, 300 captures, concurrent circulation, invalid restore atomicity, full-store roundtrip',timings);
 }finally{await finish();}
})().catch(e=>{console.error(e);process.exitCode=1;});
