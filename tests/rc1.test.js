import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreIntegrity} from '../src/recovery.js';
import {STORES,normalizeHoldings,ensureRemovable} from '../src/local-domain.js';
import {migrateAccess} from '../src/access-model.js';
import {validateBook} from '../src/catalog.js';
import {lookupISBN} from '../src/metadata.js';
import {deriveReadiness,deriveDataQuality} from '../src/pilot.js';
import {parseBackup} from '../src/catalog.js';

function state(){const s=Object.fromEntries(STORES.map(k=>[k,[]]));migrateAccess(s);s.books=[validateBook({title:'Atlas',materialType:'libro',copies:2})];normalizeHoldings(s);s.institutionId=s.settings.find(c=>c.id==='local').institutionId;return s;}
test('RC1 readiness does not require pairwise suggestions and restoration preserves modification dates',()=>{
 const s=state();s.books.push(validateBook({title:'Atlas',materialType:'libro',author:'Autora',copies:1}));s.books[0].author='Autora';normalizeHoldings(s);
 assert.ok(deriveDataQuality(s).some(i=>i.type==='duplicate'));
 assert.ok(!deriveDataQuality(s,{includeDuplicates:false}).some(i=>i.type==='duplicate'));
 assert.equal(deriveReadiness(s).steps.find(s=>s.id==='errors').done,true);
 s.books[0].updatedAt='2020-01-02T00:00:00.000Z';assert.equal(parseBackup(JSON.stringify({app:'asistente-bibliotecario',version:5,books:s.books}))[0].updatedAt,s.books[0].updatedAt);
});
test('RC1 protects copies in pending inventories and permits removal after closure',()=>{
 const s=state(),id=s.books[0].exemplars[0].id;s.inventorySessions=[{status:'draft',findings:[{exemplarId:id}]}];assert.throws(()=>ensureRemovable(s,[id]),/inventario/);s.inventorySessions[0].status='closed';assert.doesNotThrow(()=>ensureRemovable(s,[id]));
});
test('RC1 integrity is pure and detects broken derived identities, photos, scope and sequence',()=>{
 const s=state(),before=structuredClone(s);assert.deepEqual(restoreIntegrity(s).errors,[]);assert.deepEqual(s,before);
 for(const [change,message] of [
  [s=>s.books[0].workId='missing',/obra/],
  [s=>s.books[0].exemplars[0].editionId='missing',/edición/],
  [s=>s.photos.push({id:'missing',bookId:s.books[0].id}),/Fotografía/],
  [s=>s.books[0].exemplars[0].institutionId='another',/institución/],
  [s=>s.settings.find(c=>c.id==='local').sequence=1,/regresiva/],
  [s=>s.resourceSharingRequests.push({id:'r',needId:'missing'}),/cooperación/],
  [s=>s.inventorySessions.push({id:'a',status:'open'},{id:'b',status:'draft'}),/inventarios/],
  [s=>s.catalogingSessions.push({id:'j',items:[],captures:[{itemId:'missing'}]}),/Captura/]
 ]){const bad=structuredClone(s);change(bad);assert.match(restoreIntegrity(bad).errors.join(' '),message);}
 const legacy=structuredClone(s);legacy.books[0].exemplars[0].id='old-copy';assert.equal(restoreIntegrity(legacy).errors.length,0);assert.match(restoreIntegrity(legacy).warnings.join(),/UUID/);
});
test('RC1 timeout and either provider outage preserve manual or partial recovery',async()=>{
 for(const failing of ['openlibrary','googleapis','both']){
  const r=await lookupISBN('9780140328721',{timeout:5,fetcher:async(url,{signal})=>{
   if(failing==='both'||url.includes(failing))return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('request did not time out')),1000);const abort=()=>{clearTimeout(timer);reject(signal.reason);};if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
   return {ok:true,json:async()=>url.includes('openlibrary')?{'ISBN:9780140328721':{title:'Matilda'}}:{items:[{volumeInfo:{title:'Matilda',industryIdentifiers:[{identifier:'9780140328721'}]}}]}};
  }});assert.equal(r.book?.title||null,failing==='both'?null:'Matilda');assert.ok(r.results.some(r=>r.status==='error'));
 }
});
