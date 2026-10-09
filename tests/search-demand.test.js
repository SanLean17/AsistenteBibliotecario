import test from 'node:test';
import assert from 'node:assert/strict';
import {command} from '../src/local-domain.js';

function state(){
  return {
    settings:[{id:'local',institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection',institutionName:'Escuela',libraryName:'Biblioteca',sequence:1}],
    institutions:[{id:'local-institution',name:'Escuela'}],libraries:[],collections:[],works:[],editions:[],
    books:[],photos:[],loans:[],reservations:[],grants:[],activity:[],memberships:[],invitations:[],saved:[],people:[],
    patrons:[{id:'teacher',name:'Docente',accessProfile:'docente',active:true,status:'active',institutionId:'local-institution'}]
  };
}

test('registra una búsqueda explícita con cantidad de resultados',()=>{
  const s=state();
  command(s,'teacher','search.record',{query:'San Martín para quinto',results:3});
  assert.equal(s.activity.length,1);
  assert.equal(s.activity[0].type,'search.performed');
  assert.equal(s.activity[0].query,'San Martín para quinto');
  assert.equal(s.activity[0].resultCount,3);
});

test('distingue búsquedas sin resultados',()=>{
  const s=state();
  command(s,'teacher','search.record',{query:'astronomía guaraní',results:0});
  assert.equal(s.activity[0].type,'search.no_results');
  assert.equal(s.activity[0].resultCount,0);
});
