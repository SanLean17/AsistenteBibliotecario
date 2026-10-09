const {setup,save,assert,noOverflow}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish}=await setup({deviceScaleFactor:1});
 await go('agregar');await page.getByRole('button',{name:'No puedo usar la cámara'}).click();await page.getByRole('button',{name:'Incorporar manualmente'}).click();
 const type=page.locator('[name=materialType]'),copies=page.locator('[name=copies]');
 await type.selectOption('diario');assert.equal(await page.locator('[name=publication]').isVisible(),true);assert.equal(await page.locator('[name=issn]').isVisible(),true);assert.equal(await page.locator('[name=isbn]').isVisible(),false);
 await page.locator('[name=title]').fill('Edición especial');await page.locator('[name=publication]').fill('Diario Escolar');await page.locator('[name=publicationDate]').fill('2026-10-09');await page.locator('[name=issueNumber]').fill('42');await page.locator('[name=subjects]').fill('historia\nescuela');await page.locator('[name=contents]').fill('Titular principal\nSuplemento educativo');await save(page);
 await go('biblioteca');await page.locator('#material-filter').selectOption('diario');await page.locator('.book-card').waitFor();assert.equal(await page.locator('.book-card').count(),1);
 await page.locator('#search').fill('Suplemento educativo');await page.locator('.book-card').waitFor();assert.equal(await page.locator('.book-card').count(),1);
 await page.locator('.book-card').click();await page.getByText('Diario Escolar',{exact:true}).waitFor();await page.getByText('Titulares, artículos, suplementos o secciones',{exact:false}).waitFor();

 await go('agregar');await page.getByRole('button',{name:'No puedo usar la cámara'}).click();await page.getByRole('button',{name:'Incorporar manualmente'}).click();await type.selectOption('digital');assert.equal(await copies.inputValue(),'0');assert.equal(await page.locator('[name=resourceUrl]').isVisible(),true);assert.equal(await page.locator('[name=publisher]').isVisible(),false);
 await page.locator('[name=title]').fill('Archivo digital');await page.locator('[name=resourceUrl]').fill('https://escuela.example/recurso');await save(page);
 await go('biblioteca');await page.locator('#material-filter').selectOption('digital');await page.locator('.book-card').waitFor();assert.equal(await page.locator('.book-card').count(),1);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page,'material catalog '+width);}
 await finish();console.log('PASS material-specific forms, defaults, filtering, content search and responsive catalog');
})().catch(e=>{console.error(e);process.exit(1);});
