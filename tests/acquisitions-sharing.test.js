import test from 'node:test';
import assert from 'node:assert/strict';
import {command} from '../src/local-domain.js';

function state(){
  return {
    settings:[{id:'local',institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection',institutionName:'Escuela',libraryName:'Biblioteca',sequence:2}],
    institutions:[{id:'local-institution',name:'Escuela'}],libraries:[],collections:[],works:[],editions:[],
    books:[{id:'b1',title:'Atlas argentino',workId:'w1',editionId:'b1',subjects:[],contents:[],contentEntries:[],exemplars:[]}],
    photos:[],loans:[],reservations:[],activity:[],grants:[],memberships:[],invitations:[],saved:[],people:[],
    collectionNeeds:[],recommendations:[],resourceSharingRequests:[],
    patrons:[
      {id:'lib',name:'Biblioteca',accessProfile:'biblioteca',active:true,status:'active',institutionId:'local-institution'},
      {id:'teacher',name:'Docente',accessProfile:'docente',active:true,status:'active',institutionId:'local-institution'}
    ]
  };
}

test('necesidad registra compra, donación u otra forma de resolución sin comprar automáticamente',()=>{
  const s=state();
  const need=command(s,'lib','collection.need.create',{title:'Atlas escolar',priority:'high'});
  command(s,'lib','collection.need.update',{id:need.id,status:'planned',resolutionMethod:'purchase',provider:'Librería escolar',estimatedCost:'12500',plannedDate:'2030-04-20'});
  assert.equal(need.status,'planned');
  assert.equal(need.resolutionMethod,'purchase');
  assert.equal(need.provider,'Librería escolar');
  assert.equal(need.estimatedCost,12500);
  assert.equal(need.resolvedAt,undefined);
});

test('necesidad se resuelve con material existente y conserva método',()=>{
  const s=state();
  const need=command(s,'lib','collection.need.create',{title:'Atlas'});
  command(s,'lib','collection.need.update',{id:need.id,status:'resolved',resolutionMethod:'existing',bookId:'b1',resolution:'Ya estaba disponible en otra colección.'});
  assert.equal(need.bookId,'b1');
  assert.equal(need.resolutionMethod,'existing');
  assert.ok(need.resolvedAt);
});

test('cooperación interbibliotecaria queda como borrador local y puede avanzar',()=>{
  const s=state();
  const need=command(s,'lib','collection.need.create',{title:'Enciclopedia regional'});
  const req=command(s,'lib','resource.share.create',{direction:'request',title:'Enciclopedia regional',targetInstitution:'Escuela Vecina',needId:need.id,notes:'Consultar disponibilidad.'});
  assert.equal(req.status,'draft');
  assert.equal(need.resourceSharingRequestId,req.id);
  command(s,'lib','resource.share.update',{id:req.id,status:'prepared',expectedReturnAt:'2030-05-10'});
  assert.equal(req.status,'prepared');
  assert.equal(req.expectedReturnAt,'2030-05-10');
});

test('docente no administra cooperación entre bibliotecas',()=>{
  const s=state();
  assert.throws(()=>command(s,'teacher','resource.share.create',{title:'Libro',targetInstitution:'Otra escuela'}),/No tenés permiso/);
});
