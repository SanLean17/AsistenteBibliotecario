import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldState} from './fixtures/field-state.js';
import {searchCatalog,createSearchIndex} from '../src/search-engine.js';
import {restoreIntegrity,diagnosticSummary} from '../src/recovery.js';
import {searchPeople} from '../src/daily-operations.js';
import {JsonBackupProvider} from '../src/imports.js';
import {command,normalizeHoldings} from '../src/local-domain.js';
import {catalogDuplicatePairs,detectCatalogMatches} from '../src/duplicates.js';
import {materialAvailability} from '../src/availability.js';
import {validateBook} from '../src/catalog.js';

test('FIELD scale: 10k integrity, 2k indexed search, 1k people, medium backup',()=>{
 const start=performance.now(),large=fieldState('large');
 assert.equal(large.books.length,10000);assert.equal(large.books.reduce((n,b)=>n+b.copies,0),15000);
 assert.deepEqual(restoreIntegrity(large).errors,[]);
 assert.equal(searchPeople(large,'Persona de prueba 999',{limit:10})[0].person.id,'qa-person-999');
 assert.ok(searchPeople(large,'quinto',{limit:10}).length<=10);
 const medium=fieldState('medium'),index=createSearchIndex(medium.books);
 for(const q of ['oceános','murciélagos','Material sintético 00042','Autoría 6','no existe xyz'])assert.deepEqual(searchCatalog(medium.books,q,{index}),searchCatalog(medium.books,q));
 assert.equal(searchCatalog(medium.books,'oceános',{index}).length,1000);
 const parsed=JsonBackupProvider.parse(JSON.stringify(medium));assert.equal(parsed.books.length,2000);assert.equal(parsed.loans.length,500);assert.deepEqual(parsed.books.map(b=>b.exemplars.map(e=>[e.id,e.internalCode])),medium.books.map(b=>b.exemplars.map(e=>[e.id,e.internalCode])));
 assert.ok(performance.now()-start<20000,'Generous regression budget, not a benchmark SLA');
});
test('FIELD 300 captures persist and repeated ISBN does not create an edition per scan',()=>{
 const s=fieldState(),j=command(s,'local-admin','cataloging.start');
 for(let n=0;n<300;n++)command(s,'local-admin','cataloging.capture',{sessionId:j.id,raw:n%3?'9505470630':'sin código '+n});
 assert.equal(j.captures.length,300);assert.equal(j.items.filter(i=>i.isbn).length,1);assert.equal(j.items.find(i=>i.isbn).quantity,200);
 const a=JsonBackupProvider.parse(JSON.stringify(s));assert.equal(a.catalogingSessions[0].captures.length,300);assert.equal(a.books.length,100);
});
test('FIELD bounded duplicate index preserves matching predicates and reports partial work',()=>{
 const books=[{id:'a',title:'Historia del mundo moderno',author:'Autora'},{id:'b',title:'Historia mundo moderno',author:'Autora'},{id:'c',title:'Otra cosa',isbn:'9505470630'},{id:'d',title:'Diferente',isbn:'9789505470634'}];
 const expected=[];for(let n=0;n<books.length;n++)for(const m of detectCatalogMatches(books.slice(n+1),books[n]))expected.push(books[n].id+':'+m.book.id);
 const got=catalogDuplicatePairs(books);assert.deepEqual(got.pairs.map(p=>p.book.id+':'+p.match.book.id).sort(),expected.sort());assert.equal(got.partial,false);
 assert.equal(catalogDuplicatePairs(Array.from({length:1000},(_,n)=>({id:String(n),title:'Atlas escolar',author:'Equipo'})),{maxComparisons:20}).partial,true);
 const large=fieldState('large');assert.equal(catalogDuplicatePairs(large.books).comparisons,0);
});
test('FIELD hostile backups/URLs rejected, diagnostics never include private content',()=>{
 for(const text of ['null','[]','{"__proto__":{"polluted":true}}','{"constructor":{}}','{bad'])assert.throws(()=>JsonBackupProvider.parse(text));
 assert.equal({}.polluted,undefined);
 for(const resourceUrl of ['javascript:alert(1)','data:text/html,hi','https://user:password@example.com'])assert.throws(()=>validateBook({title:'A',resourceUrl}));
 const s=fieldState();s.books[0].title='PRIVATE_TITLE';s.people[0].name='PRIVATE_PERSON';s.patrons[0].email='private@example.com';s.activity.push({message:'PRIVATE_ERROR'});
 const report=JSON.stringify(diagnosticSummary(s,{appVersion:'test',dbVersion:11,browser:'Chromium',viewport:{width:320,height:800}}));assert.doesNotMatch(report,/PRIVATE|private@example|qa-person|local-admin/);assert.equal(JSON.parse(report).counts.materials,100);
});
test('FIELD availability honors a restricted copy even when legacy status says available',()=>{
 const b=validateBook({title:'Atlas',copies:1});b.exemplars[0].careLevel='restricted';assert.equal(materialAvailability(b).status,'unavailable');
});
test('FIELD legacy archives v1–v5 keep material and holding identities',()=>{
 const original=fieldState();
 for(const version of [1,2,3,4,5]){const a=structuredClone(original);a.version=version;
  const result=JsonBackupProvider.parse(JSON.stringify(a));assert.equal(result.books[0].id,original.books[0].id);assert.equal(result.books[0].exemplars[0].id,original.books[0].exemplars[0].id);assert.equal(result.books[0].exemplars[0].internalCode,original.books[0].exemplars[0].internalCode);
  if(version>=4){assert.equal(result.patrons.length,20);assert.equal(result.loans.length,30);}
 }
});
