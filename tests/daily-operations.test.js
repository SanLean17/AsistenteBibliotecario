import test from 'node:test';
import assert from 'node:assert/strict';
import {findHoldingByCode,searchPeople,deskHoldingSnapshot,personOperations,todayOperations} from '../src/daily-operations.js';

function state(){
 return {
  institutionId:'i1',
  settings:[{id:'local',institutionId:'i1',policy:{renewalRequestWindowDays:1}}],
  books:[{id:'b1',title:'Libro',institutionId:'i1',exemplars:[{id:'e1',internalCode:'AB-000001',institutionId:'i1',condition:'Bueno',careLevel:'normal',status:'available',location:'Sala'}]}],
  patrons:[
   {id:'lib',institutionId:'i1',name:'Biblioteca',cargo:'Bibliotecario/a',accessProfile:'biblioteca',status:'active',active:true},
   {id:'p1',institutionId:'i1',name:'Ana Pérez',cargo:'Docente',course:'5° B',accessProfile:'docente',status:'active',active:true},
   {id:'p2',institutionId:'i1',name:'Juan López',cargo:'Preceptor/a',course:'',accessProfile:'personal',status:'inactive',active:false}
  ],
  loans:[],reservations:[],activity:[],grants:[],inventorySessions:[]
 };
}

test('encuentra ejemplar por AB y no crea coincidencias con códigos inválidos',()=>{
 const s=state();
 assert.equal(findHoldingByCode(s,'AB-000001').copy.id,'e1');
 assert.equal(findHoldingByCode(s,'AB000001'),null);
 assert.equal(findHoldingByCode(s,'AB-999999'),null);
});

test('búsqueda de personas usa nombre cargo curso y excluye perfiles inactivos',()=>{
 const s=state();
 assert.equal(searchPeople(s,'ana')[0].person.id,'p1');
 assert.equal(searchPeople(s,'docente 5')[0].person.id,'p1');
 assert.equal(searchPeople(s,'preceptor').length,0);
});

test('snapshot de mostrador incorpora préstamo y reserva asignada',()=>{
 const s=state();
 s.loans.push({id:'l1',bookId:'b1',exemplarId:'e1',status:'loaned',returnedAt:null,dueAt:'2030-10-11T23:59:00',patron:{id:'p1',name:'Ana Pérez'}});
 s.reservations.push({id:'r1',bookId:'b1',exemplarId:'e1',status:'ready',patron:{id:'p1',name:'Ana Pérez'}});
 const snap=deskHoldingSnapshot(s,'AB-000001');
 assert.equal(snap.loan.id,'l1');
 assert.equal(snap.assigned.id,'r1');
});

test('historial por persona separa préstamos activos y devueltos',()=>{
 const s=state();
 s.loans=[
  {id:'a',status:'loaned',returnedAt:null,dueAt:'2030-10-11',loanedAt:'2030-10-01',patron:{id:'p1'}},
  {id:'b',status:'returned',returnedAt:'2030-09-01',dueAt:'2030-09-01',loanedAt:'2030-08-20',patron:{id:'p1'}}
 ];
 const p=personOperations(s,'p1',{at:new Date('2030-10-10')});
 assert.equal(p.activeLoans.length,1);
 assert.equal(p.history.length,1);
});

test('vista de hoy deriva devoluciones, vencidos, reservas listas y actividad',()=>{
 const s=state(),at=new Date('2030-10-10T12:00:00');
 s.loans=[
  {id:'today',bookId:'b1',exemplarId:'e1',title:'Libro',status:'loaned',returnedAt:null,dueAt:'2030-10-10T20:00:00',patron:{id:'p1',name:'Ana Pérez'}},
  {id:'late',bookId:'b1',exemplarId:'x',title:'Otro',status:'loaned',returnedAt:null,dueAt:'2030-10-09T20:00:00',patron:{id:'p1',name:'Ana Pérez'}}
 ];
 s.reservations=[{id:'r1',bookId:'b1',status:'ready',expiresAt:'2030-10-11T23:00:00',patron:{id:'p1',name:'Ana Pérez'}}];
 s.activity=[{id:'x',type:'loan.created',createdAt:'2030-10-10T10:00:00',institutionId:'i1'}];
 const view=todayOperations(s,s.patrons[0],{at});
 assert.equal(view.dueToday.length,1);
 assert.equal(view.overdue.length,1);
 assert.equal(view.readyReservations.length,1);
 assert.equal(view.activity.length,1);
});
