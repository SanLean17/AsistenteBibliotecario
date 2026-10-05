import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupISBN, mergeMetadata, googleRecord, safeCover } from '../src/metadata.js';
import { validateBook, parseBackup, searchBooks } from '../src/catalog.js';
import { canonicalISBN, validISBN } from '../src/isbn.js';
const isbn='9780140328721';
const google={items:[{volumeInfo:{title:'Matilda',authors:['Roald Dahl','Ilustrador'],industryIdentifiers:[{identifier:isbn}],publisher:'Puffin',publishedDate:'1988-10-01',pageCount:240,language:'en',categories:['Cuentos']}}]};
const ol={['ISBN:'+isbn]:{title:'Matilda',authors:[{name:'Roald Dahl'}],publishers:[{name:'Puffin'}],number_of_pages:232,subjects:[{name:'Escuela'}],cover:{large:'http://covers.openlibrary.org/b/id/123-L.jpg'},table_of_contents:[{title:'Una niña extraordinaria'}]}};
const fake=async url=>({ok:true,json:async()=>url.includes('googleapis')?google:ol});
test('ISBN-10 and ISBN-13 edition equivalence; rejects non-book EANs',()=>{assert.equal(canonicalISBN('0-14-032872-6'),isbn);assert.equal(validISBN('4006381333931'),false);});
test('merges matching editions, authors, fields, provenance and conflicts',async()=>{
 const {book,results}=await lookupISBN(isbn,{fetcher:fake});assert.equal(book.title,'Matilda');assert.equal(book.authors.length,2);assert.equal(book.pages,232);assert.equal(book.fieldSources.pages,'Open Library');assert.equal(book.cover,'https://covers.openlibrary.org/b/id/123-L.jpg');assert.equal(book.fieldSources.cover,'Open Library');assert.deepEqual(book.subjects,['Cuentos','Escuela']);assert.ok(book.conflicts.some(c=>c.field==='pages'));assert.ok(results.every(r=>r.status==='found'));
 const stored=validateBook({...book,copies:2,condition:'Regular',location:'A'});const roundtrip=parseBackup(JSON.stringify({app:'asistente-bibliotecario',version:2,books:[stored]}))[0];assert.deepEqual(roundtrip.authors,stored.authors);assert.deepEqual(roundtrip.exemplars,stored.exemplars);assert.equal(roundtrip.cover,stored.cover);assert.equal(roundtrip.workId,stored.workId);assert.deepEqual(roundtrip.fieldSources,stored.fieldSources);
});
test('wrong edition is never silently accepted',()=>assert.equal(googleRecord(google,'9780306406157'),null));
test('partial outage retains usable result; total outage and no results are distinct',async()=>{
 const partial=await lookupISBN(isbn,{fetcher:async url=>{if(url.includes('googleapis'))throw Error('offline');return fake(url);}});assert.equal(partial.book.title,'Matilda');assert.equal(partial.results.find(r=>r.source==='Google Books').status,'error');
 const missing=await lookupISBN(isbn,{fetcher:async()=>({ok:true,json:async()=>({})})});assert.equal(missing.book,null);assert.ok(missing.results.every(r=>r.status==='empty'));
 const failed=await lookupISBN(isbn,{fetcher:async()=>({ok:false,status:429})});assert.equal(failed.book,null);assert.ok(failed.results.every(r=>r.status==='error'));
});
test('invalid ISBN makes no request and cancellation rejects',async()=>{
 await assert.rejects(lookupISBN('123',{fetcher:()=>{throw Error('should not call');}}),/Revisá/);
 const c=new AbortController();c.abort();await assert.rejects(lookupISBN(isbn,{signal:c.signal,fetcher:fake}),{name:'AbortError'});
});
test('unsafe covers rejected, search variants include subjects and natural words',()=>{
 for(const url of ['javascript:alert(1)','https://evil.example/a.jpg','data:image/svg+xml,test'])assert.equal(safeCover(url),null);
 const b=validateBook({title:'Historias',copies:1,subjects:['Segunda Guerra Mundial'],contents:['Cuentos de murciélagos']});
 for(const query of ['Guerra Mundial 2','2da Guerra Mundial','II Guerra Mundial','libro de cuentos que tengan murciélago'])assert.equal(searchBooks([b],query).length,1,query);
 assert.equal(searchBooks([b],'Primera Guerra Mundial').length,0);
});
