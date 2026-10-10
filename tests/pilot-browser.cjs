const {setup,assert,noOverflow}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go:visit,finish}=await setup({deviceScaleFactor:1});
 const go=async route=>{await page.goto('about:blank');await visit(route);};
 await go('inicio');await page.locator('[data-pilot-summary]').waitFor();await page.locator('[data-pilot-summary]').click();await page.getByRole('heading',{name:'Puesta en marcha',exact:true}).waitFor();
 assert.match(await page.locator('[data-readiness]').textContent(),/Falta/);
 const ids=await page.evaluate(async()=>{
  const st=await import('./src/storage.js?v=20261010-rc1');
  const {validateBook}=await import('./src/catalog.js?v=20261010-rc1');
  const original=st.getActorId(),teacher=(await st.execute('person.save',{name:'Docente',cargo:'Docente',accessProfile:'docente',status:'active'})).id;
  const library=(await st.execute('person.save',{name:'Biblioteca',cargo:'Bibliotecario/a',accessProfile:'biblioteca',status:'active'})).id;
  await st.saveBook(validateBook({title:'Atlas <b>de prueba</b>',copies:1}));
  await st.mutate(s=>{s.books[0].exemplars[0].careLevel='restricted';});
  return {original,teacher,library};
 });
 await go('calidad');assert.equal(await page.locator('.quality-issue b').count(),0);
 for(const route of ['puesta-en-marcha','calidad'])for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
  await go(route);await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await noOverflow(page,`${route} ${theme} ${width}`);await page.screenshot({path:`qa/pilot-${route}-${theme}-${width}.png`,fullPage:true});
 }
 await go('calidad');await page.locator('#quality-severity').selectOption('error');assert.equal(await page.locator('.quality-issue').count(),1);
 const audit=()=>page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-rc1');return (await st.readState()).activity.filter(x=>x.type==='pilot.care').length;});
 await page.getByRole('button',{name:'Aplicar No prestar',exact:true}).click();await page.locator('#confirm-cancel').click();assert.equal(await audit(),0);
 await page.getByRole('button',{name:'Aplicar No prestar',exact:true}).click();await page.locator('#confirm-accept').click();await page.getByText('1 ejemplar corregido. Acción registrada en el historial.',{exact:true}).waitFor();assert.equal(await audit(),1);
 await page.locator('#quality-severity').selectOption('error');assert.equal(await page.locator('.quality-issue').count(),0);
 await page.locator('#quality-severity').selectOption('warning');await page.locator('.quality-issue').first().getByRole('link').click();await page.getByRole('heading',{name:'Ejemplar físico',exact:true}).waitFor();
 // Real settings submission marks the name and policy as reviewed.
 await go('organizacion');const nameForm=page.locator('form').filter({has:page.locator('[name="libraryName"]')});await nameForm.locator('[name="institutionName"]').fill('Escuela del piloto');await nameForm.locator('[name="libraryName"]').fill('Biblioteca del piloto');await nameForm.getByRole('button').click();await page.waitForFunction(async()=>{const st=await import('./src/storage.js?v=20261010-rc1');return Boolean((await st.readState()).settings.find(x=>x.id==='local').libraryNameConfirmedAt);});
 await go('organizacion');const policyForm=page.locator('form').filter({has:page.locator('[name="allowRenewals"]')});await policyForm.getByRole('button').click();
 await page.waitForFunction(async()=>{const st=await import('./src/storage.js?v=20261010-rc1');return Boolean((await st.readState()).settings.find(x=>x.id==='local').policyReviewedAt);});
 await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-rc1');await st.execute('location.save',{name:'Sala',type:'sector'});});
 await go('puesta-en-marcha');assert.equal(await page.locator('[data-readiness]').textContent(),'Lista para piloto',await page.locator('.pilot-steps').allTextContents());
 await go('configuracion');await page.getByText(/No hay sincronización ni respaldo automático/).waitFor();
 for(const [actor,allowed] of [[ids.library,true],[ids.teacher,false],[ids.original,true]]){
  await page.evaluate(async id=>{const st=await import('./src/storage.js?v=20261010-rc1');st.setActorId(id);},actor);
  await go('calidad');assert.equal(await page.getByRole('heading',{name:allowed?'Calidad de datos':'Acceso no habilitado',exact:true}).count(),1);
 }
 await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-rc1');await st.createInstitution({institutionName:'Otra escuela',name:'Dirección',cargo:'Director/a',personId:st.getActorId()});});
 await go('calidad');assert.equal(await page.locator('.quality-issue').count(),0);await go('puesta-en-marcha');assert.match(await page.locator('[data-readiness]').textContent(),/Falta/);
 await finish();console.log('PASS pilot: checklist, diagnostics, confirmation, audit, settings, roles, scope, 320/390/768/1440 light/dark');
})().catch(e=>{console.error(e);process.exit(1);});
