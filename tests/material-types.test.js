import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIAL_PROFILES,profileForMaterial,normalizeContentEntries,contentSearchText,createAssistanceDraft,normalizeAssistanceProposal} from '../src/material-types.js';
import {validateBook,searchBooks} from '../src/catalog.js';

test('cada tipo de material tiene perfil propio de carga',()=>{
  assert.equal(profileForMaterial('libro').identifierHint,'ISBN cuando exista');
  assert.equal(profileForMaterial('diario').contentsLabel,'Titulares, artículos, suplementos o secciones');
  assert.equal(profileForMaterial('articulo').physicalDefault,0);
  assert.equal(profileForMaterial('digital').physicalDefault,0);
  assert.ok(MATERIAL_PROFILES.produccion.fields.includes('courseLevel'));
});

test('contenidos internos se normalizan sin convertirse en ejemplares',()=>{
  const entries=normalizeContentEntries(['Titular principal',{title:'Nota especial',author:'Ana',page:'4'}]);
  assert.equal(entries.length,2);
  assert.equal(entries[1].author,'Ana');
  const d=validateBook({title:'Diario escolar',materialType:'diario',publication:'La Escuela',publicationDate:'2026-10-09',contents:entries,copies:1});
  assert.equal(d.exemplars.length,1);
  assert.equal(d.contentEntries.length,2);
  assert.match(contentSearchText(d),/Nota especial/);
});

test('búsqueda encuentra campos específicos de revistas, artículos y producciones',()=>{
  const revista=validateBook({title:'Número especial',materialType:'revista',publication:'Ciencia Hoy',volume:'12',issueNumber:'4',subjects:'astronomía',copies:1});
  const articulo=validateBook({title:'Memoria y escuela',materialType:'articulo',containerTitle:'Revista Educación',doi:'10.1000/test',pageRange:'22-30',copies:0});
  const produccion=validateBook({title:'Proyecto barrial',materialType:'produccion',schoolArea:'Ciencias Sociales',courseLevel:'5° B',copies:1});
  assert.equal(searchBooks([revista],'Ciencia Hoy','', 'revista')[0].id,revista.id);
  assert.equal(searchBooks([articulo],'Revista Educación')[0].id,articulo.id);
  assert.equal(searchBooks([produccion],'5 B')[0].id,produccion.id);
});

test('asistencia por foto solo crea propuestas revisables',()=>{
  const draft=createAssistanceDraft({materialId:'m1',captureKind:'front-page',imageRef:'photo-1'});
  assert.equal(draft.status,'not-requested');
  assert.deepEqual(draft.proposals,[]);
  const proposal=normalizeAssistanceProposal({field:'contents',value:['Titular A','Titular B'],confidence:.82});
  assert.equal(proposal.status,'proposed');
  assert.equal(proposal.confidence,.82);
  assert.deepEqual(proposal.value,['Titular A','Titular B']);
});
