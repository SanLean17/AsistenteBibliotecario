import test from 'node:test';
import assert from 'node:assert/strict';
import {personalLibrary,materialActions,readerNavigation,renderPersonalLibrary} from '../src/reader.js';
import {hasPermission} from '../src/permissions.js';
function fixture(){
 const actor={id:'me',institutionId:'school',accessProfile:'docente',status:'active'};
 const book={id:'book',title:'Atlas <b>real</b>',exemplars:[{id:'copy',status:'available'}]};
 const loan={id:'mine',bookId:'book',patron:{id:'me'},status:'loaned',dueAt:new Date(Date.now()+3600000).toISOString()};
 const state={books:[book],loans:[loan,{...loan,id:'other',patron:{id:'someone'},title:'PRIVATE'}],reservations:[],saved:[{personId:'me',bookId:'book'},{personId:'me',bookId:'deleted'}],recommendations:[{id:'r',bookId:'book',status:'active',reason:'Motivo real'},{bookId:'deleted',status:'active'},{bookId:'book',status:'archived'}],grants:[],settings:[{id:'local',policy:{allowRenewals:true,maxRenewals:1,renewalRequestWindowDays:2}}],activity:[{id:'a',type:'loan.created',loanId:'mine',actorId:'librarian',createdAt:'2026-10-01',secret:'PRIVATE'},{id:'b',type:'loan.created',loanId:'other',actorId:'me',createdAt:'2026-10-02'}]};
 return {actor,book,loan,state};
}
test('personal view derives ownership, removes orphan saves and recommendations, and projects safe history',()=>{
 const {state,actor}=fixture(),before=JSON.stringify(state),own=personalLibrary(state,actor);
 assert.deepEqual(own.loans.map(x=>x.id),['mine']);assert.equal(own.saved.length,1);assert.equal(own.recommendations.length,1);assert.deepEqual(own.history.map(x=>x.id),['a']);assert.ok(!JSON.stringify(own.history).includes('PRIVATE'));assert.equal(JSON.stringify(state),before);
 assert.ok(!renderPersonalLibrary(state,actor).includes('PRIVATE'));assert.ok(!renderPersonalLibrary(state,actor).includes('<b>real</b>'));
});
test('reader and staff navigation exposes exactly the granted capability, including expiry',()=>{
 for(const accessProfile of ['docente','lector','personal']){
  const {actor,state}=fixture();actor.accessProfile=accessProfile;
  let can=p=>hasPermission(actor,p,state.grants);
  for(const route of ['configuracion','usuarios','inventario','mostrador','actividad','calidad','permisos'])assert.equal(readerNavigation(route,actor,can),false,route);
  assert.ok(readerNavigation('mi-biblioteca',actor,can));
  state.grants.push({userId:'me',institutionId:'school',permission:'catalog.create',active:true,expiresAt:new Date(Date.now()+3600000).toISOString()});
  assert.ok(readerNavigation('agregar',actor,can));assert.equal(readerNavigation('inventario',actor,can),false);assert.equal(readerNavigation('usuarios',actor,can),false);
  state.grants[0].expiresAt='2000-01-01';assert.equal(readerNavigation('agregar',actor,can),false);
 }
});
test('reservation and renewal actions follow own records and policy without hiding unavailable books',()=>{
 const {state,actor,book,loan}=fixture();assert.ok(materialActions(state,actor,book).renewal.allowed);assert.equal(materialActions(state,actor,book).canReserve,false);
 loan.renewalRequest={status:'pending'};assert.equal(materialActions(state,actor,book).renewal.reason,'pending');
 loan.renewalRequest=null;book.circulationPolicy='non-renewable';assert.equal(materialActions(state,actor,book).renewal.reason,'material');
 state.loans=[];assert.ok(materialActions(state,actor,book).canReserve);
 book.exemplars[0].status='loaned';assert.ok(materialActions(state,actor,book).canReserve);
 book.circulationPolicy='room-only';assert.equal(materialActions(state,actor,book).canReserve,false);
 book.circulationPolicy='standard';state.reservations=[{id:'r',bookId:'book',patron:{id:'me'},status:'ready'}];assert.equal(materialActions(state,actor,book).canReserve,false);
 state.reservations=[];state.settings[0].policy.allowReservations=false;assert.equal(materialActions(state,actor,book).canReserve,false);
});
test('disabled identities receive no personal records or recommendations',()=>{
 const {state,actor}=fixture();actor.status='inactive';const own=personalLibrary(state,actor);for(const list of Object.values(own))assert.deepEqual(list,[]);
});
