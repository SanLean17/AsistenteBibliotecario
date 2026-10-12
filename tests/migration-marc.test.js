import test from 'node:test';
import assert from 'node:assert/strict';
import {marcFixtures} from './fixtures/migration-marc.js';
import {analyzeFile,planMigration} from '../src/migration.js';
test('representative MARC records retain authors, subjects, series, notes, contents and holdings',async()=>{
 const analyze=k=>analyzeFile(marcFixtures[k](),{name:k+'.iso'}).records[0];
 assert.equal(analyze('simple').identifiers.marc001,'CAT-1');assert.deepEqual(analyze('authors').authors,['Núñez, Ana','Pérez, José']);
 assert.deepEqual(analyze('subjects').subjects,['Vocabulario escolar','Ñandú']);assert.equal(analyze('subjects').issn,'0378-5955');
 const content=analyze('contents');assert.deepEqual(content.contents,['La niña -- El árbol','Un capítulo']);assert.equal(content.contentEntries.length,2);assert.match(content.notes,/Nota institucional.*\nSerie: Serie escolar/);
 assert.equal(analyze('holding').exemplars[0].inventoryCode,'ANT-001');assert.equal(analyze('holding').exemplars[0].location,'Estantería Ñ');assert.equal(analyze('local').exemplars[0].shelfmark,'ABC');
 const p=await planMigration({records:[analyze('simple'),analyze('isbn13')],format:'marc',mapping:[],warnings:[]},[]);assert.equal(p.entries[1].kind,'exact-edition');
 assert.throws(()=>analyze('invalid'),/inválid|truncado/);assert.throws(()=>analyze('marc8'),/MARC-8.*UTF-8/);
});
