import test from 'node:test';
import assert from 'node:assert/strict';
import {command,effectiveState,normalizeHoldings} from '../src/local-domain.js';
import {conditionWorsened,careLabel} from '../src/condition.js';

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
