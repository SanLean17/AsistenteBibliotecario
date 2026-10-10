import test from 'node:test';
import assert from 'node:assert/strict';
import {detectCatalogMatches,strongestMatch} from '../src/duplicates.js';

const base={
  id:'a',title:'El Hobbit',author:'J. R. R. Tolkien',materialType:'libro',
  isbn:'9505470630',publisher:'Minotauro',year:'1991',workId:'work-hobbit',copies:2
};

test('detecta ISBN-10 e ISBN-13 equivalentes como la misma edición',()=>{
  const matches=detectCatalogMatches([base],{title:'El Hobbit',author:'J. R. R. Tolkien',materialType:'libro',isbn:'9789505470631'});
  assert.equal(matches[0].kind,'exact-edition');
  assert.match(matches[0].reasons[0],/ISBN/);
});

test('detecta DOI equivalente aunque venga como URL',()=>{
  const existing={id:'d1',title:'Memoria escolar',materialType:'articulo',doi:'10.1234/ABC.55',workId:'w1'};
  const match=strongestMatch([existing],{title:'Otro título',materialType:'articulo',doi:'https://doi.org/10.1234/abc.55'});
  assert.equal(match.kind,'exact-edition');
  assert.equal(match.book.id,'d1');
});

test('mismo título y autor con otro ISBN se propone como otra edición de la misma obra',()=>{
  const matches=detectCatalogMatches([base],{title:'El Hobbit',author:'J. R. R. Tolkien',materialType:'libro',isbn:'9780261102217'});
  assert.equal(matches[0].kind,'same-work');
  assert.ok(matches[0].reasons.includes('Posible otra edición'));
});

test('si ya se eligió la misma obra no repite la advertencia de obra',()=>{
  const matches=detectCatalogMatches([base],{title:'El Hobbit',author:'J. R. R. Tolkien',materialType:'libro',isbn:'9780261102217',workId:'work-hobbit'});
  assert.equal(matches.length,0);
});

test('un título parecido solo genera advertencia y nunca coincidencia exacta sin identificador fuerte',()=>{
  const existing={...base,id:'b',isbn:'',title:'Historia de la escuela argentina',author:'Ana López',publisher:'Aula',year:'2024'};
  const matches=detectCatalogMatches([existing],{title:'Historia escuela argentina',author:'Ana López',materialType:'libro',publisher:'Aula',year:'2024'});
  assert.equal(matches[0].kind,'similar');
  assert.notEqual(matches[0].kind,'exact-edition');
});

test('ISSN solo identifica una edición exacta cuando coincide también número o fecha',()=>{
  const existing={id:'r1',title:'Revista escolar',materialType:'revista',issn:'1234-5679',issueNumber:'12',publicationDate:'2026-05-01'};
  const exact=detectCatalogMatches([existing],{title:'Revista escolar',materialType:'revista',issn:'12345679',issueNumber:'12'});
  assert.equal(exact[0].kind,'exact-edition');
  const other=detectCatalogMatches([existing],{title:'Revista escolar',materialType:'revista',issn:'12345679',issueNumber:'13'});
  assert.notEqual(other[0]?.kind,'exact-edition');
});
