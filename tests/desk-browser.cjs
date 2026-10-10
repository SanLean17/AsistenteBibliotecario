const {setup,save,assert,base,noOverflow}=require('./ui-helpers.cjs');
(async()=>{
 const {page,finish}=await setup({deviceScaleFactor:1});
 await page.goto(base+'app.html#agregar');
 await page.getByRole('button',{name:'No puedo usar la cámara'}).click();
 await page.getByRole('button',{name:'Incorporar manualmente'}).click();
 await page.locator('[name=title]').fill('Libro del mostrador');
 await page.locator('[name=copies]').fill('1');
 await save(page);

 await page.goto(base+'app.html#usuarios');
 await page.getByRole('heading',{name:'Personas',exact:true}).waitFor();
 await page.locator('[data-access-form="person.save"] [name=name]').fill('Docente mostrador');
 await page.locator('[data-access-form="person.save"] [name=cargo]').selectOption('Docente');
 await page.locator('[data-access-form="person.save"] [name=course]').fill('6° A');
 await page.locator('[data-access-form="person.save"] button').click();
 await page.locator('.holding-row').filter({hasText:'Docente mostrador'}).getByRole('link',{name:'Editar persona',exact:true}).waitFor();

 const state=()=>page.evaluate(async()=>await(await import('./src/storage.js?v=20261010-rc1')).readState());
 let s=await state(),copy=s.books.find(b=>b.title==='Libro del mostrador').exemplars[0];

 await page.goto(base+'app.html#mostrador/'+copy.internalCode);
 await page.getByRole('heading',{name:'Mostrador',exact:true}).waitFor();
 await page.getByText(copy.internalCode,{exact:true}).waitFor();
 await page.locator('#desk-person-query').fill('Docente mostrador');
 await page.getByRole('button',{name:/Docente mostrador/}).click();
 await page.getByRole('button',{name:'Confirmar préstamo'}).click();
 await page.getByText(/Préstamo registrado/).waitFor();
 assert.equal((await state()).loans.filter(l=>l.status==='loaned').length,1);

 await page.goto(base+'app.html#mostrador/'+copy.internalCode);
 await page.getByRole('button',{name:'Sin cambios'}).waitFor();
 await page.getByRole('button',{name:'Registrar devolución'}).click();
 await page.getByText(/Devolución registrada/).waitFor();
 assert.equal((await state()).loans.filter(l=>l.status==='returned').length,1);

 await page.goto(base+'app.html#mostrador/AB-999999');
 await page.getByText('Código no encontrado',{exact:true}).waitFor();
 assert.equal((await state()).books.length,1);

 for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(base+'app.html#mostrador');
   await page.getByRole('heading',{name:'Mostrador',exact:true}).waitFor();
   await noOverflow(page,'mostrador '+width);
 }
 await finish();
 console.log('PASS mostrador quick loan, return, unknown code guard and responsive layout');
})().catch(e=>{console.error(e);process.exit(1);});
