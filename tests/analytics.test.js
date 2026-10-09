import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryAnalytics} from '../src/analytics.js';

test('deriva estadísticas útiles desde circulación y búsquedas reales',()=>{
  const state={
    books:[
      {id:'b1',title:'Uno',exemplars:[{id:'e1',condition:'Bueno',status:'available'}]},
      {id:'b2',title:'Dos',exemplars:[{id:'e2',condition:'Deteriorado',status:'damaged'}]},
      {id:'b3',title:'Tres',exemplars:[{id:'e3',condition:'Bueno',status:'available'}]}
    ],
    loans:[
      {bookId:'b1',exemplarId:'e1',status:'returned',returnedAt:'2026-01-01',patron:{id:'x'}},
      {bookId:'b1',exemplarId:'e1',status:'loaned',returnedAt:null,dueAt:'2000-01-01',patron:{id:'y'}}
    ],
    reservations:[],
    activity:[
      {type:'search.no_results',query:'astronomía',createdAt:'2026-01-01'},
      {type:'search.no_results',query:'Astronomía',createdAt:'2026-02-01'},
      {type:'search.no_results',query:'mapas',createdAt:'2026-03-01'}
    ]
  };
  const a=libraryAnalytics(state);
  assert.equal(a.topLoaned[0].book.id,'b1');
  assert.equal(a.topLoaned[0].count,2);
  assert.deepEqual(a.neverLoaned.map(x=>x.id).sort(),['b2','b3']);
  assert.equal(a.damaged.length,1);
  assert.equal(a.unmetDemand[0].query.toLowerCase(),'astronomía');
  assert.equal(a.unmetDemand[0].count,2);
  assert.equal(a.totals.searchesWithoutResults,3);
});
