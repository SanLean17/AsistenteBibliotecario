const {setup,assert,noOverflow,base}=require('./ui-helpers.cjs');
(async()=>{
 const {page,finish}=await setup({deviceScaleFactor:1});
 const go=async hash=>{await page.goto('about:blank');await page.goto(base+'app.html#'+hash);await page.locator('main h1').waitFor();};
 await go('inicio');
 const ids=await page.evaluate(async()=>{
  const st=await import('./src/storage.js?v=20261010-7'),{validateBook}=await import('./src/catalog.js?v=20261010-7');
  const ids={admin:st.getActorId()};
  for(const [profile,cargo] of [['docente','Docente'],['lector','Estudiante'],['personal','Preceptor/a'],['biblioteca','Bibliotecario/a'],['autoridad','Director/a']])ids[profile]=(await st.execute('person.save',{name:profile,cargo,accessProfile:profile,status:'active'})).id;
  for(const [key,title,policy] of [['free','Atlas de mares','standard'],['own','Mi préstamo cercano','standard'],['late','Mi préstamo vencido','standard'],['foreign','PRIVATE MATERIAL','standard'],['room','Consulta en sala','room-only'],['fixed','Sin renovación','non-renewable']]){
   const b=validateBook({title,copies:1,subjects:['Océanos'],materialType:'libro',circulationPolicy:policy});await st.saveBook(b);ids[key]=b.id;
  }
  await st.execute('settings.save',{allowRenewals:'true',allowReservations:'true',renewalRequestWindowDays:'2',maxRenewals:'1'});
  await st.execute('recommendation.save',{bookId:ids.free,reason:'Lecturas sobre el océano',audience:'Proyecto documentado por Biblioteca'});
  await st.mutate(s=>{
   const at=h=>new Date(Date.now()+h*3600000).toISOString();
   for(const [key,owner,h] of [['own',ids.docente,12],['late',ids.docente,-12],['foreign',ids.lector,12],['fixed',ids.docente,12]]){
    const b=s.books.find(b=>b.id===ids[key]);s.loans.push({id:key,bookId:b.id,title:b.title,exemplarId:b.exemplars[0].id,internalCode:b.exemplars[0].internalCode,patron:{id:owner,name:owner},status:'loaned',loanedAt:at(-72),dueAt:at(h)});
    s.activity.push({id:'event-'+key,type:'loan.created',loanId:key,actorId:ids.admin,createdAt:at(-72),note:'PRIVATE NOTE'});
   }
   s.reservations.push({id:'ready',bookId:ids.room,title:'Consulta en sala',patron:{id:ids.docente},status:'ready',expiresAt:at(24)});
   s.saved.push({id:'orphan',personId:ids.docente,bookId:'deleted'});
  });
  st.setActorId(ids.docente);return ids;
 });
 await go('inicio');await page.getByRole('heading',{name:'¿Qué necesitás encontrar hoy?',exact:true}).waitFor();
 const navRoutes=()=>page.locator('nav[aria-label="Principal"] a:not([hidden])').evaluateAll(nodes=>nodes.map(n=>n.hash));
 assert.deepEqual(await navRoutes(),['#inicio','#avisos','#biblioteca','#mi-biblioteca','#guardados']);
 for(const route of ['configuracion','usuarios','inventario','actividad','calidad','ejemplar/anything']){await go(route);await page.getByRole('heading',{name:'Acceso no habilitado',exact:true}).waitFor();}
 await go('mi-biblioteca');assert.equal(await page.locator('[data-personal-loan]').count(),3);assert.equal(await page.locator('[data-overdue=true]').count(),1);assert.ok(!(await page.locator('main').innerText()).includes('PRIVATE'));
 await page.locator('[data-personal-loan="own"]').getByRole('button',{name:'Solicitar extensión'}).click();await page.getByText('Extensión solicitada. Pendiente de autorización.',{exact:true}).waitFor();
 await page.locator('[data-personal-loan="own"]').getByText('Pendiente de autorización',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-personal-loan="fixed"] button').count(),0);
 await page.getByText('Este material no admite renovación.',{exact:true}).waitFor();
 await page.getByText(/Retirá hasta/).waitFor();
 assert.equal(await page.locator('#mis-recomendaciones').getByText('Lecturas sobre el océano').count(),1);
 await go('ficha/'+ids.free);await page.getByRole('button',{name:'Guardar material',exact:true}).click();await page.getByRole('button',{name:'Quitar de guardados',exact:true}).waitFor();
 await page.getByRole('button',{name:'Reservar material',exact:true}).click();await page.getByText('Reserva solicitada. Biblioteca confirmará su estado.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Reservar material',exact:true}).count(),0);
 await go('guardados');assert.equal(await page.locator('main .holding-row').count(),1);await page.getByRole('button',{name:'Quitar de guardados'}).click();await page.getByText(/Todavía no guardaste/).waitFor();
 await go('ficha/'+ids.room);assert.equal(await page.getByRole('button',{name:'Reservar material',exact:true}).count(),0);
 await go('ficha/'+ids.foreign);await page.getByRole('button',{name:'Reservar material',exact:true}).waitFor();assert.ok(!(await page.locator('main').innerText()).includes(ids.lector));assert.equal(await page.locator('a[href^="#editar"]:visible').count(),0);
 // Search input, real topic filter, explanation and recovery from zero results.
 await go('inicio');await page.locator('#home-query').fill('mares');await page.locator('#home-search button').click();await page.locator('#search').waitFor();assert.equal(await page.locator('.book-card').count(),1);await page.getByText(/Coincide en:/).waitFor();
 await page.locator('#search').fill('zzzinexistente');await page.getByText('No encontramos materiales con esa búsqueda',{exact:true}).waitFor();await page.getByRole('button',{name:'Océanos',exact:true}).click();await page.locator('.book-card').first().waitFor();
 await page.locator('#topic-filter').selectOption('Océanos');await page.locator('#availability-filter').selectOption('available');assert.ok(await page.locator('.book-card').count()>0);
 for(const profile of ['docente','lector','personal']){
  await page.evaluate(async id=>{(await import('./src/storage.js?v=20261010-7')).setActorId(id);},ids[profile]);
  await go('inicio');assert.deepEqual(await navRoutes(),['#inicio','#avisos','#biblioteca','#mi-biblioteca','#guardados']);
  await go('mi-biblioteca');assert.equal(await page.locator('[data-personal-loan]').count(),profile==='docente'?3:profile==='lector'?1:0);
  if(profile==='lector')assert.ok(!(await page.locator('main').innerText()).includes('Mi préstamo cercano'));
 }
 // Temporary grant opens only catalog creation and expires without changing profile.
 await page.evaluate(async ids=>{const st=await import('./src/storage.js?v=20261010-7');st.setActorId(ids.admin);await st.execute('grant.add',{userId:ids.lector,permission:'catalog.create',expiresAt:new Date(Date.now()+3600000).toISOString()});st.setActorId(ids.lector);},ids);
 await go('inicio');assert.ok((await navRoutes()).includes('#agregar'));assert.ok(!(await navRoutes()).includes('#usuarios'));assert.ok(!(await navRoutes()).includes('#inventario'));
 await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-7');await st.mutate(s=>s.grants.forEach(g=>g.expiresAt='2000-01-01'));});await go('agregar');await page.getByRole('heading',{name:'Acceso no habilitado',exact:true}).waitFor();
 for(const profile of ['docente','lector']){
  await page.evaluate(async id=>{(await import('./src/storage.js?v=20261010-7')).setActorId(id);},ids[profile]);
  for(const route of ['inicio','biblioteca','mi-biblioteca','ficha/'+ids.free])for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
   await go(route);await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await noOverflow(page,`${profile} ${route} ${theme} ${width}`);
   if(route==='biblioteca'){const box=await page.locator('#search').boundingBox(),tools=await page.locator('.catalog-tools').boundingBox();assert.ok(box.width>=tools.width*.9,'Search spans the filter row');}
   if(route==='inicio'&&width===320){await page.locator('#app-menu-toggle').click();await page.locator('nav[aria-label="Principal"] a[href="#mi-biblioteca"]').click();await page.locator('[data-reader-view="mi-biblioteca"]').waitFor();assert.equal(await page.locator('#app-menu-toggle').getAttribute('aria-expanded'),'false');await go(route);await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);}
   if(profile==='docente'&&['inicio','biblioteca','mi-biblioteca'].includes(route))await page.screenshot({path:`qa/reader-${route}-${theme}-${width}.png`,fullPage:true});
  }
 }
 for(const profile of ['biblioteca','autoridad']){await page.evaluate(async id=>{(await import('./src/storage.js?v=20261010-7')).setActorId(id);},ids[profile]);await go('inicio');await page.getByRole('heading',{name:'¿Qué necesitás hacer hoy?',exact:true}).waitFor();}
 // No orphan saved links after deletion and no cross-institution personal history.
 await page.evaluate(async ids=>{const st=await import('./src/storage.js?v=20261010-7');st.setActorId(ids.docente);await st.execute('saved.toggle',{bookId:ids.free});await st.mutate(s=>s.books=s.books.filter(b=>b.id!==ids.free));},ids);await go('guardados');assert.equal(await page.locator('main a[href="#ficha/'+ids.free+'"]').count(),0);
 await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-7');await st.createInstitution({institutionName:'Nueva escuela',name:'Docente',cargo:'Docente',personId:st.getActorId()});});await go('mi-biblioteca');assert.equal(await page.locator('[data-personal-loan]').count(),0);assert.equal(await page.locator('.reader-history li').count(),0);
 await finish();console.log('PASS reader: roles, grants, privacy, real discovery, own renewal/reservations/saved, search and 320/390/768/1440 light/dark');
})().catch(e=>{console.error(e);process.exit(1);});
