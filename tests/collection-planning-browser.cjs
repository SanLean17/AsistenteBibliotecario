const {setup,save,assert}=require('./ui-helpers.cjs');
(async()=>{
  const {page,go,finish}=await setup({deviceScaleFactor:1});

  await go('agregar');
  await page.getByRole('button',{name:'No puedo usar la cámara'}).click();
  await page.getByRole('button',{name:'Incorporar manualmente'}).click();
  await page.locator('[name=title]').fill('Historias del barrio');
  await page.locator('[name=subjects]').fill('Historia local');
  await page.locator('[name=copies]').fill('1');
  await save(page);

  let s=await page.evaluate(async()=>await(await import('./src/storage.js?v=20261010-rc1')).readState());
  const book=s.books.find(b=>b.title==='Historias del barrio');

  await go('coleccion');
  await page.locator('[data-access-form="collection.need.create"] [name=title]').last().fill('Mapas históricos');
  await page.locator('[data-access-form="collection.need.create"] [name=priority]').last().selectOption('high');
  await page.locator('[data-access-form="collection.need.create"] button').last().click();
  await page.locator('.holding-row strong').filter({hasText:'Mapas históricos'}).waitFor();

  await page.locator('[data-access-form="recommendation.save"] [name=bookId]').selectOption(book.id);
  await page.locator('[data-access-form="recommendation.save"] [name=audience]').fill('5° grado');
  await page.locator('[data-access-form="recommendation.save"] [name=reason]').fill('Para trabajar historia local.');
  await page.locator('[data-access-form="recommendation.save"] button').click();
  await page.getByText('5° grado · Para trabajar historia local.',{exact:true}).waitFor();

  // Create a teacher and switch role.
  await go('usuarios');
  const personForm=page.locator('[data-access-form="person.save"]').last();
  await personForm.locator('[name=name]').fill('Docente de prueba');
  await personForm.locator('[name=cargo]').selectOption('Docente');
  await personForm.locator('[name=accessProfile]').selectOption('docente');
  await personForm.locator('button').click();
  await page.locator('.holding-row strong').filter({hasText:'Docente de prueba'}).waitFor();

  s=await page.evaluate(async()=>await(await import('./src/storage.js?v=20261010-rc1')).readState());
  const teacher=s.patrons.find(p=>p.name==='Docente de prueba');
  await page.locator('#app-menu-toggle').click();
  await page.locator('#local-actor').selectOption(teacher.id);
  await go('inicio');
  await page.getByRole('heading',{name:'Recomendados por la biblioteca',exact:true}).waitFor();
  await page.locator('.dashboard-recommendations').getByText('Historias del barrio',{exact:true}).waitFor();
  assert.equal(await page.getByText('Para trabajar historia local.',{exact:true}).count(),1);

  await finish();
  console.log('PASS collection need creation, recommendation management and teacher recommendation view');
})().catch(e=>{console.error(e);process.exit(1);});
