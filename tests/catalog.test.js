import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBook, searchBooks, parseBackup } from '../src/catalog.js';
const raw = {title:'Cuentos de la selva',author:'Horacio Quiroga',copies:2,category:'Cuentos',contents:'La tortuga gigante\nLas medias de los flamencos'};
test('search includes chapters, ignores accents and combines filters',()=>{
  const book=validateBook(raw); assert.equal(searchBooks([book],'tórtuga Quiroga','Cuentos').length,1); assert.equal(searchBooks([book],'tortuga','Poesía').length,0);
});
test('validates ISBN checksum and copy counts',()=>{
  assert.equal(validateBook({...raw,isbn:'978-0-306-40615-7'}).isbn,'9780306406157');
  assert.equal(validateBook({...raw,isbn:'0-8044-2957-X'}).isbn,'080442957X');
  for(const isbn of ['9780306406158','123','ABCDEFGHIJ'])assert.throws(()=>validateBook({...raw,isbn}));
  for(const copies of [0,-1,1.5,10000])assert.throws(()=>validateBook({...raw,copies}));
  assert.throws(()=>validateBook({...raw,title:' '}));
});
test('backups validate all entries and preserve IDs',()=>{
  const book=validateBook(raw); const backup={app:'asistente-bibliotecario',version:1,books:[book]};
  assert.equal(parseBackup(JSON.stringify(backup))[0].id,book.id);
  assert.throws(()=>parseBackup(JSON.stringify({...backup,version:2})));
  assert.throws(()=>parseBackup(JSON.stringify({...backup,books:[book,book]})));
  assert.throws(()=>parseBackup(JSON.stringify({...backup,books:[book,{title:''}]})));
});
