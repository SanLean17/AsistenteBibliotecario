import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolState,schoolFixtures} from './fixtures/federation-schools.js';
import {command,config} from '../src/local-domain.js';
import {validateBook} from '../src/catalog.js';
import {createFederationSnapshot,parseFederationFile,verifyFederationSnapshot,validateFederationSnapshot,FORBIDDEN_FIELDS,snapshotAge,searchFederation,compareFederation} from '../src/federation.js';
import {validateFederationBackup} from '../src/federation-domain.js';
const run=(s,type,data={},actor='lib')=>command(s,actor,'federation.'+type,{expectedInstitution:s.institutionId,expectedActor:actor,...data});
const add=(s,snapshot,extra={})=>run(s,'import',{snapshot,confirmed:true,...extra});
const ask=(s,snapshot,extra={})=>run(s,'request',{snapshotId:snapshot.id,recordId:snapshot.records[0].material.localRecordId,snapshotImportedAt:snapshot.importedAt,type:'interlibrary',remoteExemplarId:snapshot.records[0].holdings.items[0].exemplarId,...extra});
const step=(s,r,status,extra={})=>run(s,'transition',{id:r.id,previousStatus:r.status,status,...extra});

test('federated snapshot exports allowlists, no remote PII, and explicit visibility only',async()=>{
 const s=schoolState();s.people=[{id:'p',name:'Persona secreta',email:'privado@example.invalid'}];s.photos=[{id:'x',data:'foto privada'}];
 const p=await createFederationSnapshot(s,{includeHoldings:true});assert.equal(p.records.length,1);
 const scan=v=>{if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){assert.ok(!FORBIDDEN_FIELDS.has(k.toLowerCase()),k);scan(x);}};scan(p);
 assert.doesNotMatch(JSON.stringify(p),/secreta|privad|example.invalid/);assert.equal(p.records[0].holdings.items.length,1);
 assert.equal(validateBook({title:'Nuevo',copies:0}).federationVisibility,'local-only');
 delete s.books[0].federationVisibility;assert.equal((await createFederationSnapshot(s)).records.length,0);
 run(s,'visibility',{ids:[s.books[0].id],visibility:'shared'});assert.equal((await createFederationSnapshot(s)).records.length,1);
 run(s,'visibility',{ids:[s.books[0].id],visibility:'local-only'});assert.equal((await createFederationSnapshot(s)).records.length,0);
});
test('strict snapshot rejects private keys, malformed identity, duplicates, versions, unsafe URL and nested/oversized input',async()=>{
 const [p]=await schoolFixtures();
 for(const key of FORBIDDEN_FIELDS){const x=structuredClone(p);Object.defineProperty(x.records[0].material,key,{value:'PII',enumerable:true});assert.throws(()=>validateFederationSnapshot(x),key);}
 for(const change of [x=>x.contractVersion=2,x=>x.records.push(x.records[0]),x=>x.records[0].holdings.items[0].institutionId='wrong',x=>x.records[0].holdings.items[0].globalHoldingRef+='x',x=>x.records[0].material.title='',x=>x.records[0].material.materialType=undefined,x=>x.records[0].material.subjects=Array(101).fill('Tema'),x=>x.records[0].material.title='x'.repeat(301),x=>x.records[0].holdings.available=-1,x=>x.records[0].material.resourceUrl='javascript:alert(1)',x=>x.records[0].material.resourceUrl='data:text/html,test',x=>x.records[0].material.resourceUrl=0]){const x=structuredClone(p);change(x);assert.throws(()=>validateFederationSnapshot(x));}
 await assert.rejects(parseFederationFile('{bad'));await assert.rejects(parseFederationFile(' '.repeat(10*1024*1024+1)),/10 MB/);
 const deep={};let cursor=deep;for(let i=0;i<15;i++)cursor=cursor.next={};await assert.rejects(parseFederationFile(JSON.stringify(deep)),/niveles/);
});
test('SHA256 survives key ordering and detects altered snapshot, never serves as authentication',async()=>{
 const [p]=await schoolFixtures();assert.equal((await parseFederationFile(JSON.stringify(p))).checksum,p.checksum);
 const sorted=Object.fromEntries(Object.entries(p).reverse());await verifyFederationSnapshot(sorted);
 p.records[0].material.title='Alterado';await assert.rejects(verifyFederationSnapshot(p),/checksum/);
 delete p.checksum;await verifyFederationSnapshot(p);
});
test('three school snapshots, same AB independent refs, replacement is confirmed and own catalog remains intact',async()=>{
 const s=schoolState(),fixtures=await schoolFixtures(),before=JSON.stringify(s.books);
 const imported=fixtures.map(p=>add(s,p));assert.equal(s.federationSnapshots.length,3);assert.equal(JSON.stringify(s.books),before);
 assert.equal(new Set(imported.map(p=>p.records[0].holdings.items[0].globalHoldingRef)).size,3);
 assert.deepEqual(imported.map(p=>p.records[0].holdings.items[0].internalCode),Array(3).fill('AB-000001'));
 assert.throws(()=>add(s,fixtures[0]),/cambió/);assert.throws(()=>add(s,fixtures[0],{previousImportedAt:imported[0].importedAt}),/reemplazo/);
 const newer=structuredClone(fixtures[0]);delete newer.checksum;newer.records=[];
 add(s,newer,{replaceConfirmed:true,previousImportedAt:imported[0].importedAt});assert.equal(s.federationSnapshots.length,3);assert.equal(s.federationSnapshots[0].records.length,0);assert.equal(s.federationSnapshots[0].updates.length,1);
 assert.throws(()=>add(s,{...fixtures[0],institution:{...fixtures[0].institution,id:s.institutionId},records:[],checksum:undefined}),/checksum|propio/);
 assert.throws(()=>run(s,'visibility',{ids:[],visibility:'shared'},'teacher'),/permiso/);
 assert.throws(()=>run(s,'visibility',{ids:[],visibility:'shared',expectedActor:'other'}),/Cambió/);
});
test('old snapshot, filters, ISBN10/13 comparison and unmet needs are pure projections',async()=>{
 const s=schoolState();for(const p of await schoolFixtures())add(s,p);
 const before=JSON.stringify(s);assert.equal(snapshotAge('2026-01-01T00:00:00Z',new Date('2026-01-08')).stale,true);
 assert.equal(searchFederation(s.federationSnapshots,{query:'segunda guerra mundial',institution:'belgrano',topic:'Historia',availability:'available',materialType:'libro'}).length,1);
 assert.equal(searchFederation(s.federationSnapshots,{query:'inexistente'}).length,0);
 s.books[0].isbn='9789505470631';const c=compareFederation(s.books,s.federationSnapshots[0],[{id:'need',title:'Segunda Guerra Mundial',status:'detected'}]);assert.equal(c.matches.length,1);assert.equal(c.needs.length,1);s.books[0].isbn='9505470630';assert.equal(JSON.stringify(s),before);
});
test('room-only, restricted, deteriorated, withdrawn and active loans never advertise lendable copies',async()=>{
 for(const change of [b=>b.circulationPolicy='room-only',b=>b.exemplars[0].careLevel='restricted',b=>b.exemplars[0].condition='Deteriorado',b=>b.exemplars[0].status='withdrawn',b=>b.exemplars[0].status='lost']){const s=schoolState();change(s.books[0]);const p=await createFederationSnapshot(s,{includeHoldings:true});assert.equal(p.records[0].holdings.interlibraryAllowed,false);assert.equal(p.records[0].holdings.items.length,0);assert.equal(p.records[0].holdings.available,0);const [remote]=await schoolFixtures();add(s,remote);assert.throws(()=>run(s,'offer',{bookId:s.books[0].id,externalInstitutionId:'belgrano',type:'interlibrary'}),/impide/);}
 const s=schoolState();s.loans=[{id:'private',bookId:s.books[0].id,exemplarId:s.books[0].exemplars[0].id,patronId:'private',status:'loaned',dueAt:'2099-01-01T00:00:00Z'}];const p=await createFederationSnapshot(s);assert.equal(p.records[0].holdings.available,0);assert.ok(p.records[0].holdings.estimatedAt);assert.doesNotMatch(JSON.stringify(p),/private/);
});
test('request receives and returns external material without local AB allocation or need resolution',async()=>{
 const s=schoolState(),[p]=await schoolFixtures(),snapshot=add(s,p),sequence=config(s).sequence,books=JSON.stringify(s.books);
 s.collectionNeeds.push({id:'need',title:'Historia',status:'detected'});const r=ask(s,snapshot,{needId:'need'});assert.equal(r.status,'draft');assert.equal(s.collectionNeeds[0].status,'detected');
 assert.throws(()=>step(s,r,'received'),/Transición/);step(s,r,'prepared');step(s,r,'agreed');
 assert.throws(()=>step(s,r,'received'),/estado físico/);step(s,r,'received',{condition:'Bueno',expectedReturnAt:'2027-01-01',observation:'Revisado'});
 assert.equal(s.externalHoldings.length,1);assert.equal(s.externalHoldings[0].internalCode,'AB-000001');assert.equal(s.externalHoldings[0].ownerInstitutionId,'belgrano');assert.equal(config(s).sequence,sequence);assert.equal(JSON.stringify(s.books),books);
 const duplicate=ask(s,snapshot);step(s,duplicate,'prepared');step(s,duplicate,'agreed');assert.throws(()=>step(s,duplicate,'received',{condition:'Bueno'}),/ya está recibido/);step(s,duplicate,'cancelled');
 assert.throws(()=>command(s,'lib','resource.share.update',{id:r.id,status:'returned'}),/Red Escolar/);
 step(s,r,'returned',{condition:'Regular',observation:'Observación local'});assert.ok(s.externalHoldings[0].returnedAt);assert.equal(s.externalHoldings[0].conditionAtReturn,'Regular');assert.equal(r.status,'returned');validateFederationBackup(s);
 const restored=JSON.parse(JSON.stringify(s));validateFederationBackup(restored);restored.externalHoldings[0].ownerInstitutionId='forged';assert.throws(()=>validateFederationBackup(restored));
});
test('offers are local drafts and blocked requests remain reference-only',async()=>{
 const s=schoolState(),[p]=await schoolFixtures(),snapshot=add(s,p),before=JSON.stringify(s.books);
 const offer=run(s,'offer',{bookId:s.books[0].id,exemplarId:s.books[0].exemplars[0].id,externalInstitutionId:'belgrano',type:'donation'});assert.equal(offer.direction,'offer');assert.equal(offer.holding.institutionId,s.institutionId);assert.equal(s.loans.length,0);assert.equal(JSON.stringify(s.books),before);validateFederationBackup(s);const invalid=structuredClone(s);invalid.resourceSharingRequests[0].globalHoldingRef='wrong';assert.throws(()=>validateFederationBackup(invalid),/incoherente/);
 snapshot.records[0].holdings.interlibraryAllowed=false;assert.throws(()=>ask(s,snapshot),/prestable/);assert.equal(ask(s,snapshot,{type:'reference'}).type,'reference');
 assert.throws(()=>ask(s,snapshot,{snapshotImportedAt:'stale',type:'reference'}),/cambió/);
});
