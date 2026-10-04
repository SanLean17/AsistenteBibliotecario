const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
  fs.mkdirSync('qa',{recursive:true});
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');await page.getByText('Tu primera historia empieza acá').waitFor();
  await page.screenshot({path:'qa/desktop-inicio.png',fullPage:true});
  await page.getByRole('button',{name:'Agregar mi primer libro'}).click();
  await page.locator('[name=title]').fill('Cuentos de la selva');await page.locator('[name=author]').fill('Horacio Quiroga');await page.locator('[name=copies]').fill('2');await page.locator('[name=contents]').fill('La tortuga gigante\nLas medias de los flamencos');await page.locator('[name=location]').fill('Estante A');
  await page.getByRole('button',{name:'Guardar libro',exact:true}).click();await page.locator('#editor').waitFor({state:'hidden'});await page.getByRole('button',{name:'Ver Cuentos de la selva',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Ver Cuentos de la selva',exact:true}).waitFor();
  await page.getByRole('link',{name:'Ver biblioteca'}).click();await page.getByRole('searchbox').fill('tórtuga');await page.getByRole('button',{name:'Ver Cuentos de la selva',exact:true}).click();
  await page.getByRole('button',{name:'Editar ficha'}).click();await page.locator('[name=copies]').fill('3');await page.getByRole('button',{name:'Guardar libro',exact:true}).click();await page.locator('#editor').waitFor({state:'hidden'});
  await page.getByRole('searchbox').fill('inexistente');await page.getByText('No encontramos ese libro').waitFor();await page.getByRole('button',{name:'Limpiar búsqueda'}).click();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar respaldo'}).click();const download=await downloaded;await download.saveAs('qa/backup.json');assert.equal(JSON.parse(fs.readFileSync('qa/backup.json')).books[0].copies,3);
  await page.getByRole('button',{name:'Ver Cuentos de la selva',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Eliminar libro'}).click();await page.getByText('Tu primera historia empieza acá').waitFor();
  page.once('dialog',d=>d.accept());await page.locator('#import-file').setInputFiles('qa/backup.json');await page.getByRole('button',{name:'Ver Cuentos de la selva',exact:true}).waitFor();
  await page.locator('.sidebar [data-action=add]').click();await page.locator('[name=title]').fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'Guardar libro',exact:true}).click();await page.locator('#editor').waitFor({state:'hidden'});assert.equal(await page.locator('.book-card img').count(),0);
  for(const width of [320,390,740,1440]){
    await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:4173/#biblioteca');await page.getByRole('searchbox').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`library overflow ${width}`);await page.screenshot({path:`qa/library-${width}.png`,fullPage:true});
    await page.goto('http://127.0.0.1:4173/#inicio');await page.getByText('Grandes historias.').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`home overflow ${width}`);
    if(width===390)await page.screenshot({path:'qa/mobile-inicio.png',fullPage:true});
  }
  await page.setViewportSize({width:320,height:740});await page.locator('.mobile-nav [data-action=add]').click();await page.locator('[name=title]').fill('Libro móvil');await page.getByRole('button',{name:'Guardar libro',exact:true}).click();await page.locator('#editor').waitFor({state:'hidden'});await page.getByRole('button',{name:'Ver Libro móvil',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS: persistence, search, edit, delete, backup restore, escaped content, mobile form and responsive layouts at 320/390/740/1440px.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


