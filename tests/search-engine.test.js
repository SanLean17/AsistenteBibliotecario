import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSearch,searchCatalog,searchSummary,suggestedQueries} from '../src/search-engine.js';

const books=[
  {
    id:'a',title:'Antología de la noche',subtitle:'',materialType:'libro',author:'Ana Pérez',authors:['Ana Pérez'],
    subjects:['Monstruos','Miedo'],sourceSubjects:[],contents:['El monstruo del aula'],contentEntries:[{title:'El monstruo del aula',author:'',page:'',kind:'cuento'}],
    audience:'5° B',courseLevel:'',publication:'',publicationDate:'2026-01-01',year:'2026',description:'Cuentos breves para compartir.',
    copies:2,exemplars:[{id:'e1',status:'available',location:'Infantil',physicalLocation:{}},{id:'e2',status:'loaned',location:'Infantil',physicalLocation:{}}]
  },
  {
    id:'b',title:'Historia contemporánea',subtitle:'',materialType:'libro',author:'Luis Gómez',authors:['Luis Gómez'],
    subjects:['Segunda Guerra Mundial'],sourceSubjects:[],contents:[],contentEntries:[],
    audience:'',courseLevel:'',publication:'',publicationDate:'',year:'2010',description:'Historia general del siglo XX.',
    copies:1,exemplars:[{id:'e3',status:'available',location:'Historia',physicalLocation:{}}]
  },
  {
    id:'c',title:'Edición del 9 de mayo',subtitle:'',materialType:'diario',author:'',authors:[],
    subjects:['Historia'],sourceSubjects:[],contents:['La paz en Europa'],contentEntries:[{title:'La paz en Europa',author:'',page:'1',kind:'titular'}],
    audience:'',courseLevel:'',publication:'Diario Escolar',publicationDate:'1945-05-09',year:'',description:'',
    copies:1,exemplars:[{id:'e4',status:'loaned',location:'Hemeroteca',physicalLocation:{}}]
  },
  {
    id:'d',title:'Memoria y escuela',subtitle:'',materialType:'articulo',author:'María Suárez',authors:['María Suárez'],
    subjects:['Memoria'],sourceSubjects:[],contents:[],contentEntries:[],
    audience:'',courseLevel:'5° B',publication:'',containerTitle:'Revista Educación',publicationDate:'2024-03-01',year:'',description:'',
    copies:0,exemplars:[]
  }
];

const available=book=>book.copies===0||book.exemplars.some(e=>e.status==='available');

test('normaliza sinónimos y equivalencias escolares seguras',()=>{
  assert.equal(normalizeSearch('WWII'),'segunda guerra mundial');
  assert.equal(normalizeSearch('5° B'),'quinto b');
  assert.equal(normalizeSearch('cuentos con criaturas'),'cuento con monstruo');
});

test('prioriza coincidencias de título y contenido sobre descripción genérica',()=>{
  const results=searchCatalog(books,'monstruo');
  assert.equal(results[0].book.id,'a');
  assert.match(searchSummary(results[0]),/Contenido interno|Temas/);
});

test('entiende tipo de material explícito sin exigir esa palabra en los metadatos',()=>{
  const results=searchCatalog(books,'diario 1945');
  assert.equal(results.length,1);
  assert.equal(results[0].book.id,'c');
  assert.ok(results[0].matches.includes('Fecha'));
});

test('WWII encuentra Segunda Guerra Mundial',()=>{
  const results=searchCatalog(books,'WWII');
  assert.equal(results[0].book.id,'b');
});

test('quinto encuentra audiencia registrada como 5°',()=>{
  const results=searchCatalog(books,'quinto');
  assert.ok(results.some(r=>r.book.id==='a'));
  assert.ok(results.some(r=>r.book.id==='d'));
});

test('filtro implícito disponible respeta disponibilidad real',()=>{
  const results=searchCatalog(books,'diario disponible',{isAvailable:available});
  assert.equal(results.length,0);
  const digital=searchCatalog(books,'artículo disponible',{isAvailable:available});
  assert.equal(digital.length,1);
  assert.equal(digital[0].book.id,'d');
});

test('los temas sugeridos salen del catálogo y no de datos inventados',()=>{
  const suggestions=suggestedQueries(books,3);
  assert.ok(suggestions.includes('Monstruos')||suggestions.includes('Historia')||suggestions.includes('Memoria'));
  assert.equal(suggestions.length,3);
});
