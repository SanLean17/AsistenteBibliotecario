import test from 'node:test';
import assert from 'node:assert/strict';
import {command} from '../src/local-domain.js';

function state(){
  return {
    settings:[{id:'local',institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection',institutionName:'Escuela',libraryName:'Biblioteca',sequence:2}],
    institutions:[{id:'local-institution',name:'Escuela'}],libraries:[],collections:[],works:[],editions:[],
    books:[{id:'b1',title:'Historia argentina',workId:'w1',editionId:'b1',subjects:[],contents:[],contentEntries:[],exemplars:[]}],
    photos:[],loans:[],reservations:[],activity:[],grants:[],memberships:[],invitations:[],saved:[],people:[],
    collectionNeeds:[],recommendations:[],
    patrons:[
      {id:'lib',name:'Biblioteca',accessProfile:'biblioteca',active:true,status:'active',institutionId:'local-institution'},
      {id:'teacher',name:'Docente',accessProfile:'docente',active:true,status:'active',institutionId:'local-institution'}
    ]
  };
}

test('biblioteca convierte demanda en necesidad y evita duplicados activos',()=>{
  const s=state();
  const first=command(s,'lib','collection.need.create',{title:'Astronomía',query:'Astronomía',source:'search',demandCount:4,priority:'high'});
  const second=command(s,'lib','collection.need.create',{title:'astronomia',query:'astronomia',source:'search',demandCount:6});
  assert.equal(first.id,second.id);
  assert.equal(s.collectionNeeds.length,1);
  assert.equal(s.collectionNeeds[0].demandCount,6);
  assert.equal(s.collectionNeeds[0].priority,'high');
});

test('necesidad puede evaluarse, planificarse y resolverse vinculando material',()=>{
  const s=state();
  const need=command(s,'lib','collection.need.create',{title:'Historia argentina'});
  command(s,'lib','collection.need.update',{id:need.id,status:'planned',priority:'normal',note:'Buscar una edición escolar.'});
  assert.equal(need.status,'planned');
  command(s,'lib','collection.need.update',{id:need.id,status:'resolved',bookId:'b1',resolution:'Incorporado al catálogo.'});
  assert.equal(need.status,'resolved');
  assert.equal(need.bookId,'b1');
  assert.ok(need.resolvedAt);
});

test('docente no puede gestionar necesidades ni recomendaciones',()=>{
  const s=state();
  assert.throws(()=>command(s,'teacher','collection.need.create',{title:'Mapas'}),/No tenés permiso/);
  assert.throws(()=>command(s,'teacher','recommendation.save',{bookId:'b1',reason:'Útil'}),/No tenés permiso/);
});

test('recomendación activa se actualiza en lugar de duplicarse y puede archivarse',()=>{
  const s=state();
  const first=command(s,'lib','recommendation.save',{bookId:'b1',audience:'5° grado',reason:'Para trabajar efemérides.'});
  const second=command(s,'lib','recommendation.save',{bookId:'b1',audience:'6° grado',reason:'Para un proyecto anual.'});
  assert.equal(first.id,second.id);
  assert.equal(s.recommendations.length,1);
  assert.equal(s.recommendations[0].audience,'6° grado');
  command(s,'lib','recommendation.archive',{id:first.id});
  assert.equal(s.recommendations[0].status,'archived');
});
