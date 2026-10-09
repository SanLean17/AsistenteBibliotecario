import test from 'node:test';
import assert from 'node:assert/strict';
import {command} from '../src/local-domain.js';
import {inventorySummary,scopeContainsLocation,locationLabelsFromNode} from '../src/inventory.js';

function base(){
  return {
    settings:[{id:'local',institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection',institutionName:'Escuela',libraryName:'Biblioteca',sequence:10}],
    institutions:[{id:'local-institution',name:'Escuela'}],libraries:[],collections:[],works:[],editions:[],
    photos:[],loans:[],reservations:[],activity:[],grants:[],memberships:[],invitations:[],saved:[],people:[],
    collectionNeeds:[],recommendations:[],resourceSharingRequests:[],libraryLocations:[],inventorySessions:[],
    patrons:[{id:'lib',name:'Biblioteca',accessProfile:'biblioteca',active:true,status:'active',institutionId:'local-institution'}],
    books:[{
      id:'b1',title:'Libro A',workId:'w1',editionId:'b1',subjects:[],contents:[],contentEntries:[],
      exemplars:[
        {id:'e1',internalCode:'AB-000001',inventoryCode:'AB-000001',status:'available',condition:'Bueno',physicalLocation:{}},
        {id:'e2',internalCode:'AB-000002',inventoryCode:'AB-000002',status:'available',condition:'Bueno',physicalLocation:{}},
        {id:'e3',internalCode:'AB-000003',inventoryCode:'AB-000003',status:'available',condition:'Bueno',physicalLocation:{}}
      ]
    }]
  };
}

function configure(s){
  const sector=command(s,'lib','location.save',{type:'sector',name:'Sala principal'});
  const shelving=command(s,'lib','location.save',{type:'shelving',name:'Estantería A',parentId:sector.id});
  const shelfA=command(s,'lib','location.save',{type:'shelf',name:'Estante 1',parentId:shelving.id});
  const shelfB=command(s,'lib','location.save',{type:'shelf',name:'Estante 2',parentId:shelving.id});
  command(s,'lib','copy.location.assign',{id:'e1',locationId:shelfA.id});
  command(s,'lib','copy.location.assign',{id:'e2',locationId:shelfA.id});
  command(s,'lib','copy.location.assign',{id:'e3',locationId:shelfB.id});
  return {sector,shelving,shelfA,shelfB};
}

test('ubicaciones configuran una jerarquía y proyectan etiquetas en el ejemplar',()=>{
  const s=base(),{shelfA}=configure(s);
  const copy=s.books[0].exemplars[0];
  assert.equal(copy.physicalLocation.shelfId,shelfA.id);
  assert.equal(copy.location,'Sala principal · Estantería A · Estante 1');
  assert.deepEqual(locationLabelsFromNode(s.libraryLocations,shelfA.id),copy.physicalLocation);
});

test('inventario parcial distingue encontrado, fuera de lugar y no escaneado',()=>{
  const s=base(),{shelfA}=configure(s);
  const inv=command(s,'lib','inventory.start',{locationId:shelfA.id});
  assert.equal(inv.expectedExemplarIds.length,2);
  command(s,'lib','inventory.scan',{id:inv.id,code:'AB-000001'});
  const misplaced=command(s,'lib','inventory.scan',{id:inv.id,code:'AB-000003'});
  assert.equal(misplaced.status,'misplaced');
  command(s,'lib','inventory.close',{id:inv.id});
  const summary=inventorySummary(inv);
  assert.equal(summary.found,1);
  assert.equal(summary.misplaced,1);
  assert.equal(summary.unscanned,1);
  assert.equal(s.books[0].exemplars.find(e=>e.id==='e2').status,'available');
});

test('un préstamo activo conocido no se considera faltante del estante',()=>{
  const s=base(),{shelfA}=configure(s);
  s.loans.push({id:'l1',bookId:'b1',exemplarId:'e2',status:'loaned',returnedAt:null,dueAt:new Date(Date.now()+86400000).toISOString(),patron:{id:'x',name:'Persona'}});
  const inv=command(s,'lib','inventory.start',{locationId:shelfA.id});
  assert.deepEqual(inv.expectedExemplarIds,['e1']);
  command(s,'lib','inventory.scan',{id:inv.id,code:'AB-000001'});
  command(s,'lib','inventory.close',{id:inv.id});
  assert.equal(inv.summary.unscanned,0);
});

test('inventario de toda la biblioteca incluye ejemplares en cualquier ubicación salvo los conocidos fuera de estante',()=>{
  const s=base();configure(s);
  const inv=command(s,'lib','inventory.start',{});
  assert.equal(inv.expectedExemplarIds.length,3);
});

test('no permite eliminar una ubicación usada por ejemplares o con descendientes',()=>{
  const s=base(),{sector,shelfA}=configure(s);
  assert.throws(()=>command(s,'lib','location.delete',{id:sector.id}),/dependen/);
  assert.throws(()=>command(s,'lib','location.delete',{id:shelfA.id}),/ejemplares asignados/);
});

test('scope all acepta cualquier ubicación',()=>{
  assert.equal(scopeContainsLocation({type:'all'},{sector:'X'}),true);
});


test('modo rápido captura ejemplares sin zona y los reclasifica al configurarla',()=>{
  const s=base(),{shelfA}=configure(s);
  const inv=command(s,'lib','inventory.quick.start',{});
  assert.equal(inv.status,'draft');
  assert.equal(inv.scope,null);
  const f1=command(s,'lib','inventory.scan',{id:inv.id,code:'AB-000001'});
  const f2=command(s,'lib','inventory.scan',{id:inv.id,code:'AB-000003'});
  assert.equal(f1.status,'captured');
  assert.equal(f2.status,'captured');
  assert.throws(()=>command(s,'lib','inventory.close',{id:inv.id}),/completá la zona/i);
  command(s,'lib','inventory.scope.assign',{id:inv.id,locationId:shelfA.id});
  assert.equal(inv.status,'open');
  assert.equal(inv.scope.id,shelfA.id);
  assert.equal(inv.findings.find(f=>f.exemplarId==='e1').status,'found');
  assert.equal(inv.findings.find(f=>f.exemplarId==='e3').status,'misplaced');
  command(s,'lib','inventory.close',{id:inv.id});
  assert.equal(inv.summary.unscanned,1);
});

test('modo rápido puede configurarse como inventario de toda la biblioteca',()=>{
  const s=base();configure(s);
  const inv=command(s,'lib','inventory.quick.start',{});
  command(s,'lib','inventory.scan',{id:inv.id,code:'AB-000001'});
  command(s,'lib','inventory.scope.assign',{id:inv.id,locationId:''});
  assert.equal(inv.scope.type,'all');
  assert.equal(inv.expectedExemplarIds.length,3);
  assert.equal(inv.findings[0].status,'found');
});
