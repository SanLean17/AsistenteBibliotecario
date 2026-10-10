import {requirePermission} from './permissions.js?v=20261010-5';
import {pilotManager} from './pilot.js?v=20261010-5';

// Called inside the existing institution-scoped IndexedDB transaction.
export function pilotAction(s,actorId,type,data,{audit,normalizeHoldings}){
 if(data.expectedInstitution&&data.expectedInstitution!==s.institutionId||data.expectedActor&&data.expectedActor!==actorId)throw new Error('Cambió la institución o el perfil. Revisá el diagnóstico.');
 const actor=s.patrons.find(p=>p.id===actorId);
 if(!pilotManager(s,actor))throw new Error('Solo Biblioteca o Autoridad puede gestionar la preparación.');
 if(data.confirm!==true)throw new Error('Confirmá la corrección masiva antes de continuar.');
 if(!['pilot.codes','pilot.care'].includes(type))throw new Error('Corrección desconocida.');
 requirePermission(s,actorId,'holdings.edit');
 const changes=[];
 for(const b of s.books){
  if(b.institutionId&&b.institutionId!==s.institutionId)continue;
  for(const e of b.exemplars||[]){
   if(e.institutionId&&e.institutionId!==s.institutionId)continue;
   if(type==='pilot.codes'&&!e.internalCode)changes.push({bookId:b.id,exemplarId:e.id,before:''});
   if(type==='pilot.care'&&e.careLevel==='restricted'&&e.status==='available')changes.push({bookId:b.id,exemplarId:e.id,before:e.status,after:'damaged'});
  }
 }
 if(!changes.length)return {count:0};
 if(type==='pilot.codes'){
  // Reuse the monotonic sequencer, preserving every existing AB code.
  normalizeHoldings(s);
  for(const change of changes)change.after=s.books.find(b=>b.id===change.bookId).exemplars.find(e=>e.id===change.exemplarId).internalCode;
 }else for(const change of changes)s.books.find(b=>b.id===change.bookId).exemplars.find(e=>e.id===change.exemplarId).status=change.after;
 audit(s,type,actorId,{count:changes.length,changes});
 return {count:changes.length};
}
