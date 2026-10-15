const {setup,assert,base,fs}=require('./ui-helpers.cjs');
(async()=>{
 const {createSchoolV2,simulateThirtyDays,archiveSchool,at}=await import('./fixtures/school-v2.js');
 const fixture=createSchoolV2();simulateThirtyDays(fixture);
 const {command,config,normalizeHoldings,audit}=await import('../src/local-domain.js'),{analyzeFile,planMigration}=await import('../src/migration.js'),{applyMigration}=await import('../src/migration-commit.js'),{createFederationSnapshot}=await import('../src/federation.js');
 const file=analyzeFile(new TextEncoder().encode('titulo,autor,inventario\nMigrado para backup,Autora QA,LEGADO-BACKUP'),{name:'qa.csv'}),plan=await planMigration(file,fixture.s.books);
 at('2027-08-01T12:00:00Z',()=>applyMigration(fixture.s,fixture.library,{...plan,confirmed:true,institutionId:fixture.s.institutionId,actorId:fixture.library},{config,normalizeHoldings,audit}));
 const remote=createSchoolV2({materials:20,readers:20,name:'Otra escuela FICTICIA de respaldo'});remote.s.books[7].federationVisibility='shared';
 const snapshot=await at('2027-09-01T12:00:00Z',()=>createFederationSnapshot(remote.s,{includeHoldings:true,at:new Date('2027-09-01')}));
 at('2027-09-01T12:00:00Z',()=>{const s=fixture.s,actor=fixture.library,context={expectedInstitution:s.institutionId,expectedActor:actor},imported=command(s,actor,'federation.import',{...context,snapshot,confirmed:true}),record=imported.records[0],request=command(s,actor,'federation.request',{...context,snapshotId:imported.id,recordId:record.material.localRecordId,snapshotImportedAt:imported.importedAt,type:'interlibrary',remoteExemplarId:record.holdings.items[0].exemplarId});for(const status of ['prepared','agreed','received','returned'])command(s,actor,'federation.transition',{...context,id:request.id,previousStatus:request.status,status,condition:'Bueno',expectedReturnAt:'2027-09-20'});});
 const archive=JSON.parse(JSON.stringify(archiveSchool(fixture.s)));
 const {page,finish}=await setup({firstRun:true});try{
  await page.clock.setFixedTime(new Date('2027-10-30T12:00:00Z'));
  await page.goto(base+'app.html');await page.locator('#entry-file').setInputFiles({name:'escuela-ficticia.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
  await page.getByRole('heading',{name:'Vista previa',exact:true}).waitFor();await page.locator('[name=confirm]').fill(archive.institutions[0].name);await page.getByRole('button',{name:'Confirmar restauración',exact:true}).click();await page.locator('main h1').filter({hasText:/Guía/}).waitFor();
  const exported=await page.evaluate(async()=>{const st=await import('./src/storage.js?v=20261015-field2');return st.exportArchive();});
  // Compare every persisted collection, preserving record IDs, histories and contents.
  // Restoration itself legitimately adds one audit event.
  const {STORES}=await import('../src/local-domain.js');const canonical=rows=>[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  for(const key of STORES){if(key==='activity'){for(const row of archive.activity)assert(exported.activity.some(r=>r.id===row.id),row.id);}else assert.deepEqual(canonical(exported[key]||[]),canonical(archive[key]||[]),key);}
  await page.reload();await page.locator('main h1').waitFor();
  const checks=await page.evaluate(async()=>{
   const st=await import('./src/storage.js?v=20261015-field2'),backup=await st.exportArchive(),before=JSON.stringify(await st.readAll()),results=[];
   const cases=[b=>{b.version=999;},b=>{b.books[0].exemplars[0].internalCode=b.books[1].exemplars[0].internalCode;},b=>{b.books[0].exemplars[0].editionId='nonexistent';},b=>{b.books.push(structuredClone(b.books[0]));},b=>{b.loans[0].dueAt='bad-date';},b=>{b.books[0].contentEntries=[{id:'bad',title:''}];}];
   for(const change of cases){const invalid=structuredClone(backup);change(invalid);let rejected=false;try{await st.restoreArchive(invalid,'RESTAURAR');}catch{rejected=true;}results.push({rejected,unchanged:before===JSON.stringify(await st.readAll())});}
   return {results,books:backup.books.length,loans:backup.loans.length,stores:Object.keys(await st.readAll()).length};
  });assert(checks.results.every(r=>r.rejected&&r.unchanged),JSON.stringify(checks));assert.equal(checks.books,2001);assert.equal(checks.loans,3001);assert.equal(exported.federationSnapshots.length,1);assert.equal(exported.externalHoldings.length,1);
  fs.writeFileSync('qa/audit-v2-storage.json',JSON.stringify({archiveBytes:Buffer.byteLength(JSON.stringify(archive)),...checks},null,2));
  console.log('PASS V2 large clean-context UI restore, every store roundtrip, reload and six corrupt archives rejected atomically');
 }finally{await finish();}
})().catch(e=>{console.error(e);process.exit(1);});
