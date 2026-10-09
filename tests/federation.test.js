import test from 'node:test';
import assert from 'node:assert/strict';
import {shareableCatalogRecord,validateSharedCatalogRecord,buildFederatedSearchDocument} from '../src/federation.js';

test('proyección compartida excluye personas y circulación individual',()=>{
  const book={id:'b1',workId:'w1',editionId:'e1',title:'Historia local',author:'A. Autor',materialType:'libro',isbn:'9780000000002',subjects:['Historia'],copies:2};
  const record=shareableCatalogRecord(book,{institutionId:'i1',institutionName:'Escuela 1',libraryName:'Biblioteca',availability:{status:'available',label:'Disponible'}});
  const raw=JSON.stringify(record);
  assert.doesNotMatch(raw,/patron|loan|email|userId|actorId/i);
  assert.equal(record.material.title,'Historia local');
  assert.equal(record.holdings.status,'available');
});

test('contrato compartido puede formar un documento federado mínimo',()=>{
  const record=shareableCatalogRecord({id:'b1',workId:'w1',editionId:'e1',title:'Historia local',materialType:'libro',subjects:[],copies:1},{institutionId:'i1',institutionName:'Escuela 1'});
  assert.equal(validateSharedCatalogRecord(record),record);
  const docs=buildFederatedSearchDocument([record]);
  assert.equal(docs[0].institutionName,'Escuela 1');
  assert.equal(docs[0].title,'Historia local');
});

test('validador rechaza datos internos agregados por error',()=>{
  const record=shareableCatalogRecord({id:'b1',title:'Material',subjects:[],copies:1},{institutionId:'i1',institutionName:'Escuela'});
  record.loan={patron:'Alumno'};
  assert.throws(()=>validateSharedCatalogRecord(record),/datos internos/);
});
