const {start}=require('./field-server.cjs');
(async()=>{
 const server=await start();process.env.TEST_BASE_URL=server.base;let browser;
 try{
  const {setup,assert,fs}=require('./ui-helpers.cjs'),env=await setup({serviceWorkers:'allow',viewport:{width:390,height:844}});browser=env.browser;let {page}=env;const {context,errors}=env;
  await page.goto(server.base+'app.html#inicio');await page.locator('main h1').waitFor();
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.getByText('Preparada para abrir sin conexión en este navegador.',{exact:true}).waitFor();
  const ids=await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261011-network2'),{validateBook}=await import('./src/catalog.js?v=20261011-network2');const b=validateBook({title:'Escuela sin conexión',copies:2});await st.saveBook(b);const p=await st.execute('person.save',{name:'Participante de prueba',cargo:'Docente',accessProfile:'docente',status:'active'});return {book:b.id,person:p.id,copy:(await st.getBooks())[0].exemplars[0].id};});
  await context.setOffline(true);await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.base+'app.html#biblioteca');await page.getByRole('heading',{name:'Escuela sin conexión'}).waitFor();
  assert.equal(await page.evaluate(()=>fetch('./package.json?offline-proof').then(()=>false,()=>true)),true,'Uncached request must fail without network');
  // Chromium 151/Playwright 1.62 can block requests but leave navigator.onLine true
  // on a page born offline (microsoft/playwright#42174). Keep real network blocking
  // above, and explicitly emulate the navigator state for the banner/event checks.
  const network=await context.newCDPSession(page);
  const navigatorOffline=offline=>network.send('Network.overrideNetworkState',{offline,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await navigatorOffline(true);await page.waitForFunction(()=>navigator.onLine===false);
  await page.getByText(/Sin conexión. Podés seguir trabajando/).waitFor();
  for(const route of ['inicio','mostrador','mi-biblioteca','jornada-catalogacion','inventario','atencion','etiquetas','migracion','red-escolar','configuracion']){await page.goto(server.base+'app.html#'+route);await page.waitForFunction(()=>document.querySelector('main h1')&&document.title.startsWith(document.querySelector('main h1').textContent));}
  const offline=await page.evaluate(async ids=>{const st=await import('./src/storage.js?v=20261011-network2');const l=await st.execute('loan.create',{exemplarId:ids.copy,patronId:ids.person});await st.execute('loan.return',{id:l.id});const r=await st.execute('reservation.create',{bookId:ids.book,patronId:ids.person});await st.execute('reservation.transition',{id:r.id,status:'cancelled'});const i=await st.execute('inventory.quick.start');const s=await st.readState();await st.execute('inventory.scan',{id:i.id,code:s.books[0].exemplars[0].internalCode});return {loan:l.id,inventory:i.id,archive:await st.exportArchive()};},ids);
  assert.equal(offline.archive.loans[0].status,'returned');assert.equal(offline.archive.inventorySessions[0].findings.length,1);
  await navigatorOffline(false);await context.setOffline(false);server.state.release='B';
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
  await page.getByRole('button',{name:'Aplicar actualización',exact:true}).waitFor();
  await page.goto(server.base+'app.html#mostrador');await page.getByRole('button',{name:'Aplicar actualización',exact:true}).click();await page.getByText(/Terminá tu operación y abrí Configuración/).waitFor();assert.equal(await page.locator('body').getAttribute('data-qa-release'),null);
  await page.goto(server.base+'app.html#configuracion');await page.locator('[data-action=export]').waitFor();
  const other=await context.newPage();await other.goto(server.base+'app.html#inicio');await other.locator('main h1').waitFor();
  await page.getByRole('button',{name:'Aplicar actualización',exact:true}).click();await page.getByText(/Cerrá las otras pestañas/).waitFor();await other.close();
  await page.getByRole('button',{name:'Aplicar actualización',exact:true}).click();await page.waitForFunction(()=>document.body.dataset.qaRelease==='B').catch(async e=>{console.log(await page.evaluate(async()=>({status:document.querySelector('.field-status')?.textContent,url:location.href,reg:(await navigator.serviceWorker.getRegistration())?.waiting?.state,controller:navigator.serviceWorker.controller?.state,caches:await caches.keys(),release:document.body.dataset.qaRelease})));throw e;});await page.locator('[data-action=export]').waitFor();
  const after=await page.evaluate(async()=>await(await import('./src/storage.js?v=20261011-network2')).exportArchive());assert.deepEqual(after.books,offline.archive.books);assert.deepEqual(after.loans,offline.archive.loans);assert.deepEqual(after.inventorySessions,offline.archive.inventorySessions);
  server.state.release='C';server.state.broken=true;
  const state=await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();const changed=new Promise(resolve=>reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker.addEventListener('statechange',()=>{if(['installed','redundant'].includes(worker.state))resolve(worker.state);});},{once:true}));await reg.update();return changed;});assert.equal(state,'redundant','Mixed release must fail installation');
  await context.setOffline(true);await page.reload();await page.locator('[data-action=export]').waitFor();assert.equal(await page.locator('body').getAttribute('data-qa-release'),'B');
  const urls=await page.evaluate(async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async k=>(await(await caches.open(k)).keys()).map(r=>r.url)))).flat();});assert.ok(urls.every(u=>u.startsWith(server.base)));assert.ok(!urls.some(u=>/\/photos\/|\.json$|googleapis|openlibrary|\/tests\//.test(u)));
  fs.writeFileSync('qa/field-offline.json',JSON.stringify({offlineRoutes:10,operations:['loan','return','reservation','inventory'],update:'A → B preserves data',mixedRelease:'C rejected, B opens offline',cachedURLs:urls.length},null,2));
  assert.deepEqual(errors,[]);console.log('PASS FIELD offline cold tab, local operations, controlled update, multi-tab guard, mixed deploy rejected, no data cached');
 }finally{await browser?.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

