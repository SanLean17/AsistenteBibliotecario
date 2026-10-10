import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveReadiness,deriveDataQuality,pilotManager,validAB} from '../src/pilot.js';
import {command,STORES} from '../src/local-domain.js';
const at=new Date('2026-10-10T12:00:00Z');
function state(){return {...Object.fromEntries(STORES.map(k=>[k,[]])),institutionId:'school',institutions:[{id:'school',name:'Escuela',status:'active'}],settings:[{id:'local',institutionId:'school',libraryName:'Biblioteca',libraryNameConfirmedAt:at.toISOString(),policy:{},policyReviewedAt:at.toISOString(),sequence:1}],patrons:[{id:'lib',institutionId:'school',accessProfile:'biblioteca',active:true}],libraryLocations:[{id:'shelf',type:'shelf',name:'Estante'}],books:[{id:'book',title:'Atlas escolar',author:'Equipo',subjects:['Geografía'],description:'Mapas',exemplars:[{id:'copy',internalCode:'AB-000001',careLevel:'normal',status:'available',physicalLocation:{shelfId:'shelf'}}]}]};}
test('objective readiness is pure, optional backup and people do not block, removed data regresses',()=>{
 const s=state(),before=structuredClone(s),r=deriveReadiness(s,{at});assert.equal(r.ready,true);assert.deepEqual(s,before);assert.equal(r.steps.find(x=>x.id==='backup').done,false);
 s.books=[];assert.equal(deriveReadiness(s,{at}).missing,1);s.libraryLocations=[];assert.equal(deriveReadiness(s,{at}).missing,2);
 s.patrons[0].expiresAt='2026-10-09';assert.equal(deriveReadiness(s,{at}).missing,3);
 s.settings[0].libraryNameConfirmedAt='';s.settings[0].policyReviewedAt='';assert.equal(deriveReadiness(s,{at}).missing,5);
});
test('diagnostics cover legacy identifiers, holdings, inventories, grants and suggestions without mutations',()=>{
 const s=state(),b=s.books[0];b.subjects=[];b.description='';b.isbn='bad';b.issn='1234-5678';b.doi='no';b.exemplars[0]={id:'copy',careLevel:'restricted',status:'available'};
 s.books.push({id:'orphan',title:'Otro',exemplars:[]});s.inventorySessions=[{id:'old',status:'draft',createdAt:'2026-08-01'},{id:'new',status:'open',createdAt:'2026-10-09'}];
 s.grants=[{id:'expired',userId:'lib',permission:'catalog.view',active:true,expiresAt:'2026-10-09'},{id:'bad',userId:'missing',permission:'invalid'}];
 const before=structuredClone(s),q=deriveDataQuality(s,{at});for(const type of ['topics','description','isbn','issn','doi','code','care','location','orphan','inventory','grant-expired','grant-invalid'])assert.ok(q.some(x=>x.type===type),type);
 assert.equal(q.filter(x=>x.type==='inventory').length,1);assert.deepEqual(s,before);assert.ok(q.every(x=>x.route));assert.equal(deriveReadiness(s,{at}).ready,false);
});
test('duplicate pairs reuse existing matching, do not merge, detect repeated codes',()=>{
 const s=state();s.books[0].isbn='9789505470635';s.books.push({...structuredClone(s.books[0]),id:'second',exemplars:[{...s.books[0].exemplars[0],id:'second-copy'}]});
 const q=deriveDataQuality(s,{at});assert.equal(q.filter(x=>x.type==='duplicate').length,1);assert.ok(q.find(x=>x.type==='duplicate').relatedRoute);assert.equal(q.filter(x=>x.type==='code-duplicate').length,1);
 s.books[1].isbn='';s.books[0].isbn='';assert.match(deriveDataQuality(s,{at}).find(x=>x.type==='duplicate').title,/misma obra/);
});
test('scope and role checks exclude foreign data and disabled profiles',()=>{
 const s=state();s.books.push({id:'foreign',institutionId:'other',isbn:'bad'});assert.deepEqual(deriveDataQuality(s,{at}),[]);
 for(const profile of ['lector','docente','personal'])assert.equal(pilotManager(s,{...s.patrons[0],accessProfile:profile},at),false);
 assert.equal(pilotManager(s,{...s.patrons[0],institutionId:'other'},at),false);assert.equal(pilotManager(s,{...s.patrons[0],active:false},at),false);
});
test('bulk codes require confirmation and holding permissions, preserve IDs/codes, grow and audit once',()=>{
 const s=state();s.settings[0].sequence=1000000;s.books[0].exemplars.push({id:'missing',status:'available'});
 const before=structuredClone(s);assert.throws(()=>command(s,'lib','pilot.codes'),/Confirmá/);assert.deepEqual(s,before);
 s.patrons[0].accessProfile='autoridad';assert.throws(()=>command(s,'lib','pilot.codes',{confirm:true}),/permiso/);s.patrons[0].accessProfile='biblioteca';
 assert.equal(command(s,'lib','pilot.codes',{confirm:true}).count,1);assert.equal(s.books[0].exemplars[0].internalCode,'AB-000001');assert.equal(s.books[0].exemplars[1].internalCode,'AB-1000000');assert.equal(s.activity.length,1);assert.equal(s.activity[0].changes[0].exemplarId,'missing');
 assert.equal(command(s,'lib','pilot.codes',{confirm:true}).count,0);assert.equal(s.activity.length,1);assert.ok(validAB('AB-10000000'));assert.equal(validAB('AB-000000'),false);
});
test('bulk care preserves circulation, lost/withdrawn copies and bibliography; repeat is no-op',()=>{
 const s=state();s.books[0].exemplars[0].careLevel='restricted';s.books[0].exemplars.push({id:'lost',careLevel:'restricted',status:'lost'},{id:'withdrawn',careLevel:'restricted',status:'withdrawn'});s.loans=[{id:'loan',exemplarId:'copy',status:'loaned'}];s.reservations=[{id:'reservation',status:'requested'}];
 const loans=structuredClone(s.loans),reservations=structuredClone(s.reservations);assert.equal(command(s,'lib','pilot.care',{confirm:true}).count,1);assert.deepEqual(s.books[0].exemplars.map(e=>e.status),['damaged','lost','withdrawn']);assert.deepEqual(s.loans,loans);assert.deepEqual(s.reservations,reservations);assert.equal(s.books[0].title,'Atlas escolar');assert.equal(command(s,'lib','pilot.care',{confirm:true}).count,0);assert.equal(s.activity.length,1);
});
test('stale institution or actor confirmation cannot execute a batch',()=>{
 const s=state(),before=structuredClone(s);
 for(const payload of [{expectedInstitution:'other'},{expectedActor:'other'}])assert.throws(()=>command(s,'lib','pilot.care',{confirm:true,...payload}),/Cambió/);
 assert.deepEqual(s,before);
});
test('present malformed codes remain unchanged; digital-only records need no invented holdings',()=>{
 const s=state();s.books[0].exemplars[0].internalCode='legacy-code';
 assert.equal(command(s,'lib','pilot.codes',{confirm:true}).count,0);assert.equal(s.books[0].exemplars[0].internalCode,'legacy-code');assert.equal(deriveReadiness(s,{at}).ready,false);
 s.books[0].exemplars=[];s.books[0].resourceUrl='https://example.org/resource';assert.equal(deriveReadiness(s,{at}).ready,true);assert.equal(deriveDataQuality(s,{at}).some(x=>x.type==='orphan'),false);
});
