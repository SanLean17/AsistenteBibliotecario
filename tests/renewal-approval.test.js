import test from 'node:test';
import assert from 'node:assert/strict';
import {command} from '../src/local-domain.js';

const isoIn=hours=>new Date(Date.now()+hours*3600000).toISOString();
function baseState(){
 return {
  settings:[{id:'local',institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection',institutionName:'Escuela',libraryName:'Biblioteca',sequence:2,policy:{allowRenewals:true,maxRenewals:1,renewalRequestWindowDays:1,renewalExtensionDays:7,reservationPickupDays:2,profiles:{docente:{loanDays:14,maxLoans:5}}}}],
  institutions:[{id:'local-institution',name:'Escuela'}],libraries:[],collections:[],works:[],editions:[],photos:[],activity:[],grants:[],memberships:[],invitations:[],saved:[],people:[],
  patrons:[
   {id:'teacher',name:'Docente',accessProfile:'docente',active:true,status:'active',institutionId:'local-institution'},
   {id:'library',name:'Biblioteca',accessProfile:'biblioteca',active:true,status:'active',institutionId:'local-institution'}
  ],
  reservations:[],
  loans:[],
  books:[{id:'book',workId:'work',editionId:'edition',title:'Libro',circulationPolicy:'standard',exemplars:[{id:'copy',internalCode:'AB-000001',inventoryCode:'AB-000001',status:'available',condition:'Bueno',physicalLocation:{}}]}]
 };
}

test('una extensión cercana al vencimiento requiere autorización',()=>{
 const s=baseState();
 s.loans.push({id:'loan',bookId:'book',exemplarId:'copy',internalCode:'AB-000001',title:'Libro',patron:{id:'teacher',name:'Docente',accessProfile:'docente'},loanedAt:new Date().toISOString(),dueAt:isoIn(12),status:'loaned',returnedAt:null,renewals:0});
 const before=s.loans[0].dueAt;
 command(s,'teacher','loan.renew.request',{id:'loan'});
 assert.equal(s.loans[0].dueAt,before);
 assert.equal(s.loans[0].renewalRequest.status,'pending');
 command(s,'library','loan.renew.approve',{id:'loan'});
 assert.equal(s.loans[0].renewalRequest.status,'approved');
 assert.equal(s.loans[0].renewals,1);
 assert.ok(Date.parse(s.loans[0].dueAt)>Date.parse(before));
 assert.ok(s.activity.some(e=>e.type==='loan.renewal.requested'));
 assert.ok(s.activity.some(e=>e.type==='loan.renewal.approved'));
});

test('la extensión puede rechazarse sin modificar el vencimiento',()=>{
 const s=baseState();
 s.loans.push({id:'loan',bookId:'book',exemplarId:'copy',internalCode:'AB-000001',title:'Libro',patron:{id:'teacher',name:'Docente',accessProfile:'docente'},loanedAt:new Date().toISOString(),dueAt:isoIn(12),status:'loaned',returnedAt:null,renewals:0});
 const before=s.loans[0].dueAt;
 command(s,'teacher','loan.renew.request',{id:'loan'});
 command(s,'library','loan.renew.reject',{id:'loan'});
 assert.equal(s.loans[0].dueAt,before);
 assert.equal(s.loans[0].renewalRequest.status,'rejected');
 assert.equal(s.loans[0].renewals,0);
});

test('un material solo consulta en sala no puede prestarse',()=>{
 const s=baseState();
 s.books[0].circulationPolicy='room-only';
 assert.throws(()=>command(s,'library','loan.create',{exemplarId:'copy',patronId:'teacher'}),/consulta en sala/);
 assert.equal(s.loans.length,0);
});

test('un material no renovable rechaza la solicitud',()=>{
 const s=baseState();
 s.books[0].circulationPolicy='non-renewable';
 s.loans.push({id:'loan',bookId:'book',exemplarId:'copy',internalCode:'AB-000001',title:'Libro',patron:{id:'teacher',name:'Docente',accessProfile:'docente'},loanedAt:new Date().toISOString(),dueAt:isoIn(12),status:'loaned',returnedAt:null,renewals:0});
 assert.throws(()=>command(s,'teacher','loan.renew.request',{id:'loan'}),/no admite renovación/);
});
