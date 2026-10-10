import test from 'node:test';
import assert from 'node:assert/strict';
import { parseISO2709, marcRecordToCatalog } from '../src/marc.js';

function field(tag,indicators,subfields){
 const body=indicators+subfields.map(([code,value])=>'\x1f'+code+value).join('');
 return {tag,data:body+'\x1e'};
}
function isoRecord(){
 const fs=[
  {tag:'001',data:'123\x1e'},
  field('020','  ',[['a','9505470630']]),
  field('100','1 ',[['a','Tolkien, J. R. R.']]),
  field('245','10',[['a','El Hobbit /']]),
  field('260','  ',[['b','Minotauro'],['c','1991.']]),
  field('300','  ',[['a','309 p.']]),
  field('650',' 4',[['a','Fantasía']]),
  field('505','0 ',[['t','Una tertulia inesperada'],['t','Carnero asado']]),
  field('852','  ',[['n','Buenos Aires'],['z','CABA'],['a','Escuela de prueba']]),
  field('859','  ',[['a','000121'],['h','B'],['l','LIJ'],['m','82-3'],['n','TOL']])
 ];
 let data='',directory='',start=0;
 for(const f of fs){directory+=f.tag+String(new TextEncoder().encode(f.data).length).padStart(4,'0')+String(start).padStart(5,'0');data+=f.data;start+=new TextEncoder().encode(f.data).length;}
 const base=24+directory.length+1;
 let leader='00000nam a2200000   4500';
 leader=leader.slice(0,12)+String(base).padStart(5,'0')+leader.slice(17);
 const record=leader+directory+'\x1e'+data+'\x1d';
 return String(new TextEncoder().encode(record).length).padStart(5,'0')+record.slice(5);
}

test('parsea ISO 2709 MARC y conserva inventario Aguapey',()=>{
 const records=parseISO2709(new TextEncoder().encode(isoRecord()));
 assert.equal(records.length,1);
 const book=marcRecordToCatalog(records[0]);
 assert.equal(book.title,'El Hobbit');
 assert.equal(book.isbn,'9505470630');
 assert.equal(book.publisher,'Minotauro');
 assert.equal(book.pages,309);
 assert.deepEqual(book.contents,['Una tertulia inesperada','Carnero asado']);
 assert.equal(book.exemplars[0].inventoryCode,'000121');
 assert.equal(book.exemplars[0].location,'LIJ');
 assert.equal(book.sourceRecords[0].institution.name,'Escuela de prueba');
});

import {previewMarc} from '../src/cataloging-import.js';
import {validateBook} from '../src/catalog.js';
test('cataloging MARC preview groups repeats, keeps raw sources and counts only new origin copies',()=>{const bytes=new TextEncoder().encode(isoRecord()+isoRecord()),p=previewMarc(bytes,[]);assert.equal(p.summary.records,2);assert.equal(p.summary.repeated,1);assert.equal(p.entries.length,1);assert.equal(p.entries[0].draft.sourceRecords.length,2);const book=validateBook(p.entries[0].draft),again=previewMarc(bytes,[book]);assert.equal(again.summary.exactMatches,1);assert.equal(again.summary.existingISBN,1);assert.equal(again.summary.newCopies,0);});

test('RC1 rejects empty and explicitly MARC-8 input before preview',()=>{assert.throws(()=>parseISO2709(new Uint8Array()),/vacío/);const bytes=new TextEncoder().encode(isoRecord());bytes[9]=32;assert.throws(()=>parseISO2709(bytes),/MARC-8.*UTF-8/);});
