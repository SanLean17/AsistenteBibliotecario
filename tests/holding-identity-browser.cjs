const {setup,assert}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish}=await setup();
 // Serve repository assets in-process to keep the browser test self-contained.
 const fs=require('node:fs/promises'),path=require('node:path');
 const root=path.resolve(__dirname,'..');
 await page.route('http://127.0.0.1:4173/**',async route=>{
  const url=new URL(route.request().url());const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep))return route.abort();
  const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'};
  try{await route.fulfill({body:await fs.readFile(file),contentType:types[path.extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}
 });
 await go('inicio');
 const copy=await page.evaluate(async()=>{
  const st=await import('./src/storage.js?v=20261010-6');const {validateBook}=await import('./src/catalog.js?v=20261010-6');
  await st.saveBook(validateBook({title:'Atlas intercambio',copies:1}));const s=await st.readState();return s.books[0].exemplars[0];
 });
 await go('coleccion');const form=page.locator('[data-access-form="resource.share.create"]');
 await form.locator('[name=title]').fill('Atlas intercambio');await form.locator('[name=targetInstitution]').fill('Escuela vecina');
 await form.locator('[name=exemplarId]').selectOption(copy.id);await form.locator('button').click();
 await page.getByText(/Institución propietaria:/).waitFor();
 const saved=await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261010-6');return (await st.readState()).resourceSharingRequests[0];});
 assert.equal(saved.holding.exemplarId,copy.id);assert.equal(saved.holding.internalCode,copy.internalCode);
 for(const width of [320,390,740,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);}
 await page.reload();await page.getByText(/Referencia global:/).waitFor();
 assert.ok((await page.getByText(/Referencia global:/).textContent()).includes(saved.holding.globalHoldingRef));
 const restored=await page.evaluate(async()=>{
  const st=await import('./src/storage.js?v=20261010-6');const archive=await st.exportArchive();
  const identity=archive.settings.find(c=>c.id==='local').federationInstitutionId;
  await st.restoreArchive(archive);
  const current=(await st.readState()).settings.find(c=>c.id==='local').federationInstitutionId;
  delete archive.settings.find(c=>c.id==='local').federationInstitutionId;
  await st.restoreArchive(archive);
  return [identity,current,(await st.readState()).settings.find(c=>c.id==='local').federationInstitutionId];
 });assert.equal(restored[0],restored[1]);assert.equal(restored[0],restored[2]);
 await finish();console.log('PASS cooperation identity selection, persistence and responsive widths');
})().catch(e=>{console.error(e);process.exit(1);});
