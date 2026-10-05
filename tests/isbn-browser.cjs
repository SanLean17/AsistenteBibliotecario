const {setup,fixture,lookup,save,assert}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish}=await setup();await fixture(page);await go('agregar');await lookup(page);await page.locator('#confirm-isbn').click();
 assert.ok((await page.locator('[name=title]').inputValue()).includes('Hobbit'));assert.equal(await page.locator('[name=category]').inputValue(),'Novela');
 // The hidden control named id must never bypass submit or navigate with query data.
 await page.locator('[name=copies]').fill('1.5');await page.getByRole('button',{name:'Guardar en el catálogo'}).click();assert.ok(await page.locator('#form-error').textContent());await page.locator('[name=copies]').fill('2');
 // Force an IndexedDB write failure: retain form and offer a retry.
 await page.evaluate(()=>{window.originalTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(stores,mode,...args){if(mode==='readwrite')throw new DOMException('full','QuotaExceededError');return window.originalTransaction.call(this,stores,mode,...args);};});
 await page.getByRole('button',{name:'Guardar en el catálogo'}).click();await page.getByText('No hay espacio disponible para guardar.',{exact:false}).waitFor();assert.ok((await page.locator('[name=title]').inputValue()).includes('Hobbit'));assert.equal(await page.locator('[type=submit]').isDisabled(),false);
 await page.evaluate(()=>IDBDatabase.prototype.transaction=window.originalTransaction);await save(page);await page.reload();await page.locator('.record-page').waitFor();assert.ok((await page.locator('.record-info h1').textContent()).includes('Hobbit'));
 await go('agregar');await lookup(page);assert.equal(await page.locator('#confirm-isbn').textContent(),'Abrir registro existente');await page.locator('#confirm-isbn').click();await page.locator('.record-page').waitFor();
 await go('agregar');await page.locator('#isbn-query').fill('123');await page.locator('#isbn-search').click();await page.getByText('Revisá el ISBN:',{exact:false}).waitFor();
 await page.route('https://openlibrary.org/api/books?**',r=>r.fulfill({status:503,json:{}}));await lookupWithoutResult();
 async function lookupWithoutResult(){await page.locator('#isbn-query').fill('9505470630');await page.locator('#isbn-search').click();await page.getByText('No encontramos una ficha automática',{exact:false}).waitFor();}
 await page.getByRole('button',{name:'Continuar con carga manual'}).click();assert.equal(await page.locator('[name=isbn]').inputValue(),'9505470630');
 await finish();console.log('PASS: ISBN10 lookup, autofill, submit regression, numeric validation, IndexedDB failure/retry, persistence, duplicate handling and unavailable-source fallback.');
})().catch(e=>{console.error(e);process.exit(1)});
