import test from 'node:test';
import assert from 'node:assert/strict';
import {command,effectiveState,normalizeHoldings} from '../src/local-domain.js';
import {conditionWorsened,careLabel,conditionAttentionItems} from '../src/condition.js';

function state(){
  return {
    settings:[{id:'local',institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection',institutionName:'Escuela',libraryName:'Biblioteca',sequence:2,policy:{profiles:{docente:{loanDays:14,maxLoans:5}}}}],
    institutions:[{id:'local-institution',name:'Escuela'}],libraries:[],collections:[],works:[],editions:[],
    photos:[],reservations:[],activity:[],grants:[],memberships:[],invitations:[],saved:[],people:[],
    collectionNeeds:[],recommendations:[],resourceSharingRequests:[],libraryLocations:[],inventorySessions:[],
    patrons:[
      {id:'lib',name:'Biblioteca',accessProfile:'biblioteca',active:true,status:'active',institutionId:'local-institution'},
      {id:'teacher',name:'Docente',accessProfile:'docente',active:true,status:'active',institutionId:'local-institution'}
    ],
    books:[{id:'b1',title:'Libro',workId:'w1',editionId:'b1',subjects:[],contents:[],contentEntries:[],circulationPolicy:'standard',exemplars:[{id:'e1',internalCode:'AB-000001',inventoryCode:'AB-000001',status:'available',condition:'Bueno',careLevel:'normal',physicalLocation:{}}]}],
    loans:[]
  };
}

test('detecta cuando un ejemplar vuelve en peor estado',()=>{
  assert.equal(conditionWorsened('Bueno','Regular'),true);
  assert.equal(conditionWorsened('Regular','Regular'),false);
});

test('préstamo guarda el estado de salida y devolución registra empeoramiento',()=>{
  const s=state();normalizeHoldings(s);
  const loan=command(s,'lib','loan.create',{exemplarId:'e1',patronId:'teacher'});
  assert.equal(loan.conditionAtLoan,'Bueno');
  command(s,'lib','loan.return',{id:loan.id,status:'available',condition:'Regular',careLevel:'careful',note:'Volvió con el lomo más flojo.'});
  const copy=s.books[0].exemplars[0];
  assert.equal(loan.conditionWorsened,true);
  assert.equal(copy.condition,'Regular');
  assert.equal(copy.careLevel,'careful');
  assert.equal(effectiveState(copy,s),'available');
  assert.ok(s.activity.some(a=>a.type==='holding.condition.worsened'));
});

test('usar con cuidado sigue disponible pero no prestar lo retira de circulación',()=>{
  const s=state();normalizeHoldings(s);
  const copy=s.books[0].exemplars[0];
  copy.condition='Deteriorado';copy.careLevel='careful';copy.status='available';
  assert.equal(effectiveState(copy,s),'available');
  assert.equal(careLabel(copy.careLevel),'Usar con cuidado');
  copy.careLevel='restricted';copy.status='damaged';
  assert.equal(effectiveState(copy,s),'damaged');
});

test('devolución marcada no prestar bloquea el ejemplar',()=>{
  const s=state();normalizeHoldings(s);
  const loan=command(s,'lib','loan.create',{exemplarId:'e1',patronId:'teacher'});
  command(s,'lib','loan.return',{id:loan.id,status:'available',condition:'Deteriorado',careLevel:'restricted',note:'Tapa desprendida.'});
  const copy=s.books[0].exemplars[0];
  assert.equal(copy.status,'damaged');
  assert.equal(effectiveState(copy,s),'damaged');
});


test('cola de atención detecta devoluciones peores y se limpia al revisar como uso normal',()=>{
  const s=state();normalizeHoldings(s);
  const loan=command(s,'lib','loan.create',{exemplarId:'e1',patronId:'teacher'});
  command(s,'lib','loan.return',{id:loan.id,status:'available',condition:'Regular',careLevel:'careful',note:'Volvió marcado.'});
  let items=conditionAttentionItems(s);
  assert.equal(items.length,1);
  assert.ok(items[0].reasons.includes('Volvió en peor estado'));
  assert.ok(items[0].reasons.includes('Usar con cuidado'));
  command(s,'lib','copy.care.review',{id:'e1',condition:'Regular',careLevel:'normal',note:'Revisado por Biblioteca.'});
  items=conditionAttentionItems(s);
  assert.equal(items.length,0);
  assert.ok(s.books[0].exemplars[0].conditionReviewedAt);
  assert.ok(s.activity.some(a=>a.type==='holding.condition.reviewed'));
});

test('no prestar permanece en la cola aunque ya haya sido revisado',()=>{
  const s=state();normalizeHoldings(s);
  command(s,'lib','copy.care.review',{id:'e1',condition:'Deteriorado',careLevel:'restricted',note:'Tapa muy floja.'});
  const items=conditionAttentionItems(s);
  assert.equal(items.length,1);
  assert.equal(items[0].careLevel,'restricted');
  assert.deepEqual(items[0].reasons,['No prestar']);
  assert.equal(effectiveState(s.books[0].exemplars[0],s),'damaged');
});


test('acción rápida de inventario marca peor estado y lo agrega a atención',()=>{
  const s=state();normalizeHoldings(s);
  const copy=s.books[0].exemplars[0];
  command(s,'lib','copy.condition.quick',{id:copy.id,action:'worse'});
  assert.equal(copy.condition,'Regular');
  assert.equal(copy.careLevel,'careful');
  const items=conditionAttentionItems(s);
  assert.equal(items.length,1);
  assert.ok(items[0].reasons.includes('Volvió en peor estado'));
  assert.ok(items[0].reasons.includes('Usar con cuidado'));
});

test('acciones rápidas de inventario permiten cuidado o no prestar',()=>{
  const s=state();normalizeHoldings(s);
  const copy=s.books[0].exemplars[0];
  command(s,'lib','copy.condition.quick',{id:copy.id,action:'careful'});
  assert.equal(copy.careLevel,'careful');
  assert.equal(effectiveState(copy,s),'available');
  command(s,'lib','copy.condition.quick',{id:copy.id,action:'restricted'});
  assert.equal(copy.careLevel,'restricted');
  assert.equal(copy.status,'damaged');
  assert.equal(effectiveState(copy,s),'damaged');
});

test('devolución puede registrar explícitamente peor estado aunque ya sea Deteriorado',()=>{
  const s=state();normalizeHoldings(s);
  const copy=s.books[0].exemplars[0];
  copy.condition='Deteriorado';copy.careLevel='careful';copy.status='available';
  const loan=command(s,'lib','loan.create',{exemplarId:'e1',patronId:'teacher'});
  command(s,'lib','loan.return',{id:loan.id,status:'available',condition:'Deteriorado',careLevel:'careful',worsenedExplicit:'true',note:'La tapa quedó aún más floja.'});
  assert.equal(loan.conditionWorsened,true);
  assert.ok(s.activity.some(a=>a.type==='holding.condition.worsened'&&a.exemplarId==='e1'));
});
