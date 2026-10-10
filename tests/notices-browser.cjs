const {setup,assert,noOverflow}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go:visit,finish}=await setup({deviceScaleFactor:1});
 const go=async route=>{await page.goto("about:blank");await visit(route);};
 await page.clock.install();
 await go('inicio');
 assert.equal(await page.locator('[data-notice-summary] .notice-count').textContent(),'0');
 const ids=await page.evaluate(async()=>{
  const st=await import('./src/storage.js?v=20261010-4');
  const {validateBook}=await import('./src/catalog.js?v=20261010-4');
  const ids={};
  for(const [profile,cargo] of [['biblioteca','Bibliotecario/a'],['autoridad','Director/a'],['docente','Docente'],['lector','Estudiante']])ids[profile]=(await st.execute('person.save',{name:profile,cargo,accessProfile:profile,status:'active'})).id;
  await st.saveBook(validateBook({title:'Atlas <b>escolar</b>',copies:4}));
  await st.mutate(s=>{
   const book=s.books[0],copies=book.exemplars,iso=h=>new Date(Date.now()+h*3600000).toISOString();
   const loan=(id,owner,h,copy)=>({id,bookId:book.id,exemplarId:copy.id,internalCode:copy.internalCode,title:book.title,patron:{id:owner,name:owner},status:'loaned',dueAt:iso(h)});
   s.loans=[{...loan('due',ids.docente,12,copies[0]),renewalRequest:{status:'pending'}},loan('late',ids.lector,-2,copies[1])];
   s.reservations=[{id:'pickup',status:'ready',bookId:book.id,exemplarId:copies[2].id,patron:{id:ids.docente},expiresAt:iso(12)}];
   s.grants=[{id:'grant',userId:ids.docente,permission:'catalog.create',active:true,expiresAt:iso(12)}];
   copies[3].careLevel='restricted';
   s.inventorySessions=[{id:'inventory',status:'draft',scope:null,findings:[],expectedExemplarIds:[]}];
  });
  return ids;
 });
 await go('inicio');
 assert.equal(await page.locator('[data-notice-summary] .notice-count').textContent(),'7');
 await page.locator('[data-notice-summary] a').click();await page.locator('#notice-results').waitFor();
 assert.equal(await page.locator('.notice-card').count(),7);
 assert.equal(await page.locator('.notice-card b').count(),0,'HTML is escaped');
 const audit=()=>page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-4');return (await st.readState()).activity.length;});
 const before=await audit();
 for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await noOverflow(page,`notices ${theme} ${width}`);
  await page.screenshot({path:`qa/notices-${theme}-${width}.png`,fullPage:true});
 }
 await page.locator('#notice-priority').selectOption('high');
 await page.waitForFunction(()=>document.querySelectorAll('.notice-card').length===3);
 await page.locator('#notice-area').selectOption('inventory');await page.getByText('No hay avisos con estos filtros').waitFor();
 await page.locator('#notice-priority').selectOption('');await page.getByRole('heading',{name:'Inventario pendiente de configuración',exact:true}).waitFor();
 await page.getByRole('link',{name:'Continuar inventario',exact:true}).click();await page.locator('#local-inventory-scope').waitFor();
 await page.locator('#local-inventory-scope button').click();await page.getByText('INVENTARIO EN CURSO',{exact:true}).waitFor();
 await go('avisos');assert.equal(await page.getByRole('heading',{name:'Inventario incompleto',exact:true}).count(),1);
 // Return a loan through the actual circulation action.
 await page.locator('.notice-card').filter({has:page.getByRole('heading',{name:'Préstamo vencido',exact:true})}).getByRole('link').click();
 await page.locator('#local-return button[type=submit],#local-return button.primary').click();
 await page.getByText('No hay préstamos activos.',{exact:true}).waitFor();
 await go('avisos');assert.equal(await page.getByRole('heading',{name:'Préstamo vencido',exact:true}).count(),0);
 // Filter survives periodic refresh; no notice records/activity are written.
 await page.locator('#notice-area').selectOption('permissions');await page.getByRole('heading',{name:'Permiso temporal por vencer',exact:true}).waitFor();
 const activityBeforeTick=await audit();
 await page.clock.fastForward(31000);
 await page.waitForFunction(()=>document.querySelector('#notice-results')?.dataset.rendered);
 assert.equal(await page.locator('#notice-area').inputValue(),'permissions');assert.equal(await audit(),activityBeforeTick);
 // A persisted change is reflected while staying on the page.
 await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-4');await st.mutate(s=>{s.grants[0].active=false;s.grants[0].revokedAt=new Date().toISOString();});});
 await page.clock.fastForward(31000);await page.getByText('No hay avisos con estos filtros').waitFor();
 for(const [profile,count] of [['docente',3],['lector',0],['biblioteca',5],['autoridad',5]]){
  await page.evaluate(async id=>{const st=await import('./src/storage.js?v=20261010-4');st.setActorId(id);},ids[profile]);
  await go('avisos');assert.equal(await page.locator('.notice-card').count(),count,profile);
  if(profile==='autoridad'){
   assert.equal(await page.getByRole('link',{name:'Continuar inventario',exact:true}).count(),0,'no unauthorized action');
   await page.getByRole('link',{name:'Ver reserva',exact:true}).click();await page.getByText('Lista para retirar',{exact:false}).first().waitFor();
   assert.equal(await page.getByRole('button',{name:'Retirar y prestar',exact:true}).count(),0,'authority view is read-only');
  }
 }
 // Date-only transition without navigating: soon becomes overdue; pickup expires.
 await page.evaluate(async id=>{const st=await import('./src/storage.js?v=20261010-4');st.setActorId(id);},ids.docente);
 await go('avisos');const stable=await page.locator('.notice-card').filter({has:page.getByRole('heading',{name:'Préstamo por vencer',exact:true})}).getAttribute('data-notice-id');
 await page.clock.fastForward(13*3600000);
 await page.getByRole('heading',{name:'Préstamo vencido',exact:true}).waitFor();
 assert.equal(await page.locator('.notice-card').filter({has:page.getByRole('heading',{name:'Préstamo vencido',exact:true})}).getAttribute('data-notice-id'),stable);
 assert.equal(await page.getByRole('heading',{name:'Retiro de reserva por vencer',exact:true}).count(),0);
 assert.ok(await audit()>=before); // Only underlying domain actions were audited.
 const stores=await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-4');const s=await st.readState();return {keys:Object.keys(s),events:s.activity.filter(a=>/notice|aviso/.test(a.type))};});
 assert.equal(stores.keys.includes('notices'),false);assert.deepEqual(stores.events,[]);
 // The same person switches institutions: none of the previous school's notices follow.
 await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-4');await st.createInstitution({institutionName:'Otra escuela',name:'docente',cargo:'Docente',personId:st.getActorId()});});
 await go('avisos');assert.equal(await page.locator('.notice-card').count(),0);await page.getByRole('heading',{name:'Todo al día',exact:true}).waitFor();
 await go('inicio');assert.equal(await page.locator('[data-notice-summary] .notice-count').textContent(),'0');
 await finish();console.log('PASS notices: roles, actions, clock, filters, no writes, responsive 320/390/768/1440 light/dark');
})().catch(e=>{console.error(e);process.exit(1);});
