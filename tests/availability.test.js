import test from 'node:test';
import assert from 'node:assert/strict';
import {materialAvailability,exemplarAvailability} from '../src/availability.js';

const book=(overrides={})=>({id:'b1',title:'Libro',copies:1,exemplars:[{id:'e1',status:'available',condition:'Bueno'}],...overrides});

test('material con copia libre aparece disponible',()=>{
  const a=materialAvailability(book());
  assert.equal(a.status,'available');
  assert.equal(a.availableCount,1);
});

test('material prestado conserva fecha estimada',()=>{
  const due='2030-05-10T23:59:59.999Z';
  const a=materialAvailability(book(),{loans:[{exemplarId:'e1',bookId:'b1',status:'loaned',dueAt:due,returnedAt:null}],now:new Date('2030-05-01T00:00:00Z')});
  assert.equal(a.status,'unavailable');
  assert.equal(a.estimatedAt.toISOString(),due);
});

test('préstamo vencido no inventa fecha de disponibilidad',()=>{
  const a=materialAvailability(book(),{loans:[{exemplarId:'e1',bookId:'b1',status:'overdue',dueAt:'2030-04-01T00:00:00Z',returnedAt:null}],now:new Date('2030-05-01T00:00:00Z')});
  assert.equal(a.status,'unavailable');
  assert.equal(a.estimatedAt,null);
  assert.match(a.note,/vencido/);
});

test('si existe una copia libre el material sigue disponible aunque otra esté prestada',()=>{
  const b=book({copies:2,exemplars:[{id:'e1',status:'available',condition:'Bueno'},{id:'e2',status:'available',condition:'Bueno'}]});
  const a=materialAvailability(b,{loans:[{exemplarId:'e1',bookId:'b1',status:'loaned',dueAt:'2030-05-10',returnedAt:null}],now:new Date('2030-05-01')});
  assert.equal(a.status,'available');
  assert.equal(a.availableCount,1);
});

test('recurso digital con enlace aparece disponible en línea',()=>{
  const a=materialAvailability(book({copies:0,exemplars:[],resourceUrl:'https://escuela.example/recurso'}));
  assert.equal(a.status,'online');
});

test('ejemplar deteriorado no expone fecha inventada',()=>{
  const a=exemplarAvailability({id:'e1',status:'damaged',condition:'Deteriorado'});
  assert.equal(a.label,'Deteriorado');
  assert.equal(a.estimatedAt,null);
});
