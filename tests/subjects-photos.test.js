import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeBook, spanishSubjects, suggestCategory } from '../src/subjects.js';
import { validateBook,parseArchive } from '../src/catalog.js';
import { validPhotoURL } from '../src/photos.js';
const subjects=['Fantasy','dragons','Magic','Juvenile Fantasy fiction','Novela fantástica','Open Library Staff Picks','Translations into Russian'];
test('source labels summarized in Spanish; explicit novel wins over adaptations',()=>{
 const b=localizeBook({category:'Otros',subjects,sources:['Open Library']});assert.equal(b.category,'Novela');assert.ok(b.categorySuggested);assert.ok(b.subjects.includes('Fantasía'));assert.ok(b.subjects.includes('Dragones'));assert.deepEqual(b.sourceSubjects,subjects);assert.equal(b.subjects.some(s=>s.includes('Translations')),false);assert.deepEqual(localizeBook(b),b);
 assert.equal(suggestCategory(['Fiction']),'Otros');assert.deepEqual(spanishSubjects(['Unknown foreign heading']),[]);
 const manual={subjects:['Tema propio'],category:'Poesía',sources:[]};assert.deepEqual(localizeBook(manual),manual);
});
test('photo backups preserve stable copy association and reject unsafe/orphan photos',()=>{
 const b=validateBook({title:'Libro',copies:2});const p={id:b.exemplars[1].id,bookId:b.id,dataUrl:'data:image/jpeg;base64,/9j/2Q==',takenAt:'2026-10-04'};
 const raw={app:'asistente-bibliotecario',version:3,books:[b],photos:[p]};assert.deepEqual(parseArchive(JSON.stringify(raw)).photos,[p]);
 for(const bad of [{...p,id:'missing'}, {...p,bookId:'unknown'},{...p,dataUrl:'data:image/svg+xml;base64,PHN2Zz4='}])assert.throws(()=>parseArchive(JSON.stringify({...raw,photos:[bad]})));
 assert.throws(()=>parseArchive(JSON.stringify({...raw,photos:[p,p]})));
 assert.equal(validPhotoURL('https://example.com/photo.jpg'),false);
 assert.equal(parseArchive(JSON.stringify({...raw,version:2})).photos.length,0);
});
