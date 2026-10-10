const {setup,fixture,assert,noOverflow}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish,context}=await setup();await fixture(page);
 await go('inicio');
 const ids=await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-6'),{validateBook}=await import('./src/catalog.js?v=20261010-6');const b=validateBook({title:'Matilda existente',isbn:'9780140328721',copies:1});await st.saveBook(b);return {book:b.id,admin:st.getActorId()};});
 await go('jornada-catalogacion');await page.getByRole('button',{name:'Iniciar jornada',exact:true}).click();await page.locator('#cataloging-capture').waitFor();
 const hash=new URL(page.url()).hash.slice(1);
 const add=async code=>{await page.locator('#cataloging-capture input').fill(code);await page.locator('#cataloging-capture button').click();await page.waitForFunction(()=>document.querySelector('#cataloging-capture input')?.value==='');};
 await add('950-547-063-0');await page.locator('[data-status=ready-new]').waitFor();
 await add('9789505470631');await add('9780140328721');await add('invalid-code');
 assert.equal(await page.locator('[data-queue-item]').count(),3);
 await page.locator('[data-status=existing-edition]').waitFor();await page.locator('[data-status=invalid]').waitFor();
 assert.equal(await page.evaluate(async()=> (await(await import('./src/storage.js?v=20261010-6')).readState()).books.length),1);
 await go('inicio');await page.getByRole('link',{name:'Continuar jornada'}).click();await page.locator('#cataloging-capture').waitFor();
 await page.reload();await page.locator('[data-status=invalid]').waitFor();assert.equal(await page.locator('[data-queue-item]').count(),3);
 await page.locator('#cataloging-filter').selectOption('existing-edition');await page.waitForFunction(()=>document.querySelectorAll('[data-queue-item]').length===1);assert.equal(await page.locator('[data-queue-item]').count(),1);
 await page.locator('#cataloging-filter').selectOption('');await page.waitForFunction(()=>document.querySelectorAll('[data-queue-item]').length===3);
 for(const width of [320,390,768,1440])for(const theme of ['light','dark']){await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await noOverflow(page,'jornada '+width+' '+theme);if(width===390)await page.screenshot({path:'qa/cataloging-'+theme+'.png',fullPage:true});}
 await page.locator('[data-cataloging=select-safe]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-select-item]:checked').length===2);assert.equal(await page.locator('[data-select-item]:checked').count(),2);
 await page.locator('.cataloging-common summary').click();await page.locator('#cataloging-common [name=location]').fill('Sala de lectura');await page.locator('#cataloging-common [name=condition]').selectOption('Regular');await page.locator('#cataloging-common button').click();await page.getByText('Datos comunes aplicados a la selección.',{exact:true}).waitFor();
 await page.locator('[data-cataloging=preview]').click();await page.getByRole('heading',{name:'Confirmar incorporación'}).waitFor();await page.getByText('1 fichas nuevas',{exact:true}).waitFor();await page.getByText('3 ejemplares nuevos en total',{exact:true}).waitFor();
 // Dispatch two events while the first transaction is awaiting IndexedDB.
 await page.locator('[data-cataloging=commit]').evaluate(b=>{b.click();b.click();});await page.getByRole('heading',{name:'Etiquetas de esta jornada'}).waitFor();await page.locator('.label-qr svg').first().waitFor();assert.equal(await page.locator('.print-label').count(),3);
 const state=await page.evaluate(async()=> (await import('./src/storage.js?v=20261010-6')).readState());assert.equal(state.books.length,2);assert.equal(state.books.flatMap(b=>b.exemplars).length,4);assert.equal(state.catalogingSessions[0].batches.length,1);assert.equal(new Set(state.books.flatMap(b=>b.exemplars.map(e=>e.internalCode))).size,4);assert.equal(state.books.find(b=>b.id===ids.book).title,'Matilda existente');
 await page.locator('[data-cataloging=labels-none]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-label-select]:checked').length===0);await page.locator('[data-label-select]').first().check();await page.evaluate(()=>{window.print=()=>window.printCalled=true;});await page.locator('[data-cataloging=print]').click();await page.waitForFunction(()=>window.printCalled);assert.ok(await page.evaluate(()=>window.printCalled));
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('.print-label:visible').count(),1);await page.emulateMedia({media:'screen'});
 // Backup is the explicit transfer mechanism; restore the pending queue too.
 const archive=await page.evaluate(async()=>JSON.stringify(await(await import('./src/storage.js?v=20261010-6')).exportArchive()));
 const other=await setup();await other.go('inicio');await other.page.evaluate(async archive=>{const st=await import('./src/storage.js?v=20261010-6'),{JsonBackupProvider}=await import('./src/imports.js?v=20261010-6');await st.restoreArchive(JsonBackupProvider.parse(archive));},archive);await other.go(hash);await other.page.locator('[data-status=invalid]').waitFor();assert.equal(await other.page.locator('[data-status=incorporated]').count(),2);await other.finish();
 await page.evaluate(async archive=>{const st=await import('./src/storage.js?v=20261010-6'),{JsonBackupProvider}=await import('./src/imports.js?v=20261010-6');await st.restoreArchive(JsonBackupProvider.parse(archive));},archive);
 await go(hash);await page.locator('[data-status=invalid]').waitFor();assert.equal(await page.locator('[data-status=incorporated]').count(),2);
 // Review an unresolved item from the queue view and correct it into a known edition.
 await go(hash+'/cola');await page.locator('[data-status=invalid]').getByRole('link',{name:'Revisar detalle',exact:true}).click();await page.locator('#cataloging-review').waitFor();await page.locator('#cataloging-review [name=isbn]').fill('9780140328721');await page.locator('#cataloging-review [name=title]').fill('Matilda existente');await page.locator('#cataloging-review [name=quantity]').fill('2');await page.locator('#cataloging-review button').click();await page.locator('[data-status=existing-edition]').waitFor();await page.locator('[data-cataloging=select-safe]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-select-item]:checked').length===1);await page.locator('[data-cataloging=preview]').click();await page.getByText('2 ejemplares nuevos en total',{exact:true}).waitFor();await go(hash);
 page.once('dialog',d=>d.accept());await page.locator('[data-cataloging=cancel]').click();await page.getByText('Jornada cancelada',{exact:true}).waitFor();
 await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-6');const p=await st.execute('person.save',{name:'Lector',cargo:'Estudiante',accessProfile:'lector',status:'active'});st.setActorId(p.id);});
 await go('jornada-catalogacion');await page.getByRole('heading',{name:'Acceso no habilitado'}).waitFor();
 await finish();console.log('Cataloging browser OK: persistence, classification, selection, atomic batch, labels, backup, roles and responsive themes');
})().catch(error=>{console.error(error);process.exit(1);});

