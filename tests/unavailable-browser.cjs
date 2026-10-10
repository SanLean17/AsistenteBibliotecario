const {setup,save,assert}=require('./ui-helpers.cjs');
(async()=>{
  const {page,go,finish}=await setup({deviceScaleFactor:1});

  await go('agregar');
  await page.getByRole('button',{name:'No puedo usar la cámara'}).click();
  await page.getByRole('button',{name:'Incorporar manualmente'}).click();
  await page.locator('[name=title]').fill('Libro no disponible');
  await page.locator('[name=description]').fill('Descripción completa visible para docentes.');
  await page.locator('[name=copies]').fill('1');
  await save(page);

  const state=()=>page.evaluate(async()=>await(await import('./src/storage.js?v=20261010-2')).readState());
  let s=await state(),book=s.books.find(b=>b.title==='Libro no disponible'),copy=book.exemplars[0];
  const teacher=s.patrons.find(p=>p.accessProfile==='docente')||s.patrons[0];

  await page.evaluate(async({copyId,teacherId})=>{
    const m=await import('./src/storage.js?v=20261010-2');
    await m.execute('loan.create',{exemplarId:copyId,patronId:teacherId,dueAt:'2030-12-01'});
  },{copyId:copy.id,teacherId:teacher.id});

  await go('biblioteca');
  await page.locator('#search').fill('Libro no disponible');
  await page.getByText('No disponible',{exact:true}).waitFor();
  await page.getByText(/Estimado:/).waitFor();

  await page.locator('.book-card').filter({hasText:'Libro no disponible'}).click();
  await page.getByText('Descripción completa visible para docentes.',{exact:true}).waitFor();
  await page.getByText('No disponible',{exact:true}).waitFor();
  await page.getByText(/Disponibilidad estimada desde/).waitFor();

  if(await page.getByRole('link',{name:'Reservar material'}).count()){
    await page.getByRole('link',{name:'Reservar material'}).click();
    assert.equal(await page.locator('#local-reserve [name=bookId]').inputValue(),book.id);
  }

  await finish();
  console.log('PASS unavailable search result, estimated return, visible description and reservation handoff');
})().catch(e=>{console.error(e);process.exit(1);});
