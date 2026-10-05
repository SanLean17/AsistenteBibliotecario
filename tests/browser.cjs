const {setup,save,noOverflow,assert,fs}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish}=await setup();
 await go('agregar');await page.getByRole('button',{name:'Continuar con carga manual'}).click();
 await page.getByRole('button',{name:'Guardar en el catálogo'}).click();assert.ok(await page.locator('#form-error').textContent());
 await page.locator('[name=title]').fill('Cuentos de la selva');await page.locator('[name=author]').fill('Horacio Quiroga');await page.locator('[name=copies]').fill('2');await page.locator('[name=location]').fill('Estante A');
 await page.locator('.optional-section summary').click();await page.locator('[name=contents]').fill('La tortuga gigante\nLas medias de los flamencos');await save(page);const detailHash=new URL(page.url()).hash.slice(1);
 await page.reload();await page.locator('.record-page').waitFor();await page.getByRole('link',{name:'Editar registro',exact:true}).click();await page.locator('[name=copies]').fill('3');await save(page);
 await go('biblioteca');await page.locator('#search').pressSequentially('tortuga');assert.equal(await page.locator('#search').inputValue(),'tortuga');assert.equal(await page.locator('.book-card').count(),1);assert.ok(await page.locator('#search').evaluate(e=>e===document.activeElement));
 await page.locator('#search').fill('no existe');assert.equal(await page.locator('.book-card').count(),0);await page.locator('#search').fill('');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar',exact:false}).click();await(await download).saveAs('qa/backup.json');assert.equal(JSON.parse(fs.readFileSync('qa/backup.json')).books[0].copies,3);
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const width of [320,360,390,430,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of ['inicio','biblioteca','agregar','ejemplares',detailHash,detailHash.replace('ficha/','editar/'),'configuracion']){
    await page.evaluate(h=>location.hash=h,route);await page.waitForTimeout(100);await noOverflow(page,`${theme} ${width} ${route}`);
    assert.ok(await page.locator('input:not([type=hidden]),select,textarea').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width).every(e=>parseFloat(getComputedStyle(e).fontSize)>=16)));
    await page.screenshot({path:`qa/${theme}-${width}-${route.split('/')[0]}.png`,fullPage:true});
   }
  }
 }
 await go(detailHash);await page.getByRole('button',{name:'Eliminar registro',exact:true}).click();await page.locator('#confirm-cancel').click();assert.ok(await page.locator('.record-page').count());
 await page.getByRole('button',{name:'Eliminar registro',exact:true}).click();await page.locator('#confirm-accept').click();await page.locator('.empty').waitFor();
 await page.locator('#import-file').setInputFiles('qa/backup.json');await page.locator('#confirm-accept').click();await page.locator('.book-card').waitFor();
 await go('configuracion');await page.getByRole('button',{name:'Vaciar catálogo',exact:true}).click();await page.locator('#confirm-cancel').click();await go('biblioteca');assert.equal(await page.locator('.book-card').count(),1);
 await go('configuracion');await page.getByRole('button',{name:'Vaciar catálogo',exact:true}).click();await page.locator('#confirm-accept').click();await page.waitForFunction(()=>document.querySelector('[data-action="clear-catalog"]').disabled);
 await go('agregar');await page.getByRole('button',{name:'Continuar con carga manual'}).click();await page.locator('[name=title]').fill('<img src=x onerror=alert(1)>');await save(page);assert.equal(await page.locator('.record-info h1').textContent(),'<img src=x onerror=alert(1)>');assert.equal(await page.locator('.record-info h1 img').count(),0);
 await finish();console.log('PASS: manual save, reload, edit, continuous search, backups, delete/cancel/clear, escaped text; 84 responsive route/theme checks.');
})().catch(e=>{console.error(e);process.exit(1)});
