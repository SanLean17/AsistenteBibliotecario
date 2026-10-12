import {validateFederationSnapshot,FEDERATION_LIMITS,federationId,federationString} from './federation.js?v=20261011-network1';
import {holdingReference,validateSharedHolding,shareableHolding} from './holding-identity.js?v=20261011-network1';
import {requirePermission} from './permissions.js?v=20261011-network1';
import {materialAvailability,exemplarAvailability} from './availability.js?v=20261011-network1';

export const COOPERATION_TYPES={interlibrary:'Préstamo interbibliotecario',exchange:'Intercambio',reference:'Consulta / referencia',donation:'Donación ofrecida',other:'Otro'};
export const COOPERATION_STATUS={draft:'Borrador',prepared:'Preparado',agreed:'Acordado',received:'Recibido',returned:'Devuelto',cancelled:'Cancelado'};
const transitions={draft:['prepared','cancelled'],prepared:['agreed','cancelled'],agreed:['received','cancelled'],received:['returned'],returned:[],cancelled:[]};
const conditions=['Nuevo','Bueno','Regular','Deteriorado'];
const date=v=>{if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v).toISOString().slice(0,10)!==v))throw Error('Fecha de devolución inválida.');return v||'';};
export function snapshotPayload(s){return {app:'asistente-bibliotecario-federation',contractVersion:s.contractVersion,institution:{id:s.externalInstitutionId,name:s.institutionName,libraryName:s.libraryName},exportedAt:s.exportedAt,records:s.records,...(s.checksum?{checksum:s.checksum}:{})};}
export function federationCommand(s,actorId,type,data,{config,audit}){
 requirePermission(s,actorId,'resource.sharing.manage');const c=config(s),now=new Date().toISOString();
 if(data.expectedInstitution!==s.institutionId||data.expectedActor!==actorId)throw Error('Cambió la institución o el perfil. Volvé a revisar.');
 s.federationSnapshots??=[];s.externalHoldings??=[];
 if(type==='import'){
  if(data.confirmed!==true)throw Error('Confirmá la importación del catálogo compartido.');
  const incoming=validateFederationSnapshot(data.snapshot),iid=incoming.institution.id;if(iid===c.federationInstitutionId)throw Error('No podés cargar tu propio catálogo como remoto.');
  const old=s.federationSnapshots.find(x=>x.externalInstitutionId===iid);
  if((old?.importedAt||'')!==(data.previousImportedAt||''))throw Error('El catálogo cargado cambió. Revisá la vista previa de nuevo.');
  if(old&&!data.replaceConfirmed)throw Error('Confirmá el reemplazo del catálogo anterior.');
  if(!old&&s.federationSnapshots.length>=FEDERATION_LIMITS.snapshots)throw Error('Máximo 20 instituciones por espacio local.');
  if(s.federationSnapshots.filter(x=>x!==old).reduce((n,x)=>n+x.records.length,0)+incoming.records.length>FEDERATION_LIMITS.totalRecords)throw Error('La red local supera 50.000 registros.');
  const snapshot={id:old?.id||crypto.randomUUID(),institutionId:s.institutionId,externalInstitutionId:iid,institutionName:incoming.institution.name,libraryName:incoming.institution.libraryName,exportedAt:incoming.exportedAt,importedAt:now,contractVersion:incoming.contractVersion,records:structuredClone(incoming.records),...(incoming.checksum?{checksum:incoming.checksum}:{}),updates:[...(old?.updates||[]),...(old?[{importedAt:old.importedAt,exportedAt:old.exportedAt,recordCount:old.records.length}]:[])].slice(-5)};
  if(old)s.federationSnapshots.splice(s.federationSnapshots.indexOf(old),1,snapshot);else s.federationSnapshots.push(snapshot);audit(s,'federation.imported',actorId,{snapshotId:snapshot.id,count:snapshot.records.length});return snapshot;
 }
 if(type==='visibility'){
  if(!['shared','local-only'].includes(data.visibility)||!Array.isArray(data.ids)||data.ids.length>10000)throw Error('Selección inválida.');
  const ids=new Set(data.ids),known=new Set(s.books.map(b=>b.id));if([...ids].some(id=>!known.has(id)))throw Error('Material inexistente.');for(const b of s.books)if(ids.has(b.id)){b.federationVisibility=data.visibility;b.updatedAt=now;}audit(s,'federation.visibility',actorId,{count:ids.size,visibility:data.visibility});return;
 }
 if(type==='request'||type==='offer'){
  if(!Object.hasOwn(COOPERATION_TYPES,data.type))throw Error('Elegí el tipo de cooperación.');
  if(data.needId&&!s.collectionNeeds.some(n=>n.id===data.needId))throw Error('Necesidad inexistente.');
  let identity,title,remote,holding,bookId='';
  if(type==='request'){
   if(data.type==='donation')throw Error('La donación se registra como oferta propia.');
   const snapshot=s.federationSnapshots.find(x=>x.id===data.snapshotId);remote=snapshot?.records.find(r=>r.material.localRecordId===data.recordId);if(!remote)throw Error('Material remoto inexistente.');
   if(snapshot.importedAt!==data.snapshotImportedAt)throw Error('El catálogo remoto cambió. Revisá la ficha.');
   if(['interlibrary','exchange'].includes(data.type)&&!remote.holdings.interlibraryAllowed)throw Error('El material no figura como prestable. Podés preparar una consulta.');
   if(data.remoteExemplarId){holding=remote.holdings.items?.find(h=>h.exemplarId===data.remoteExemplarId);if(!holding)throw Error('Ejemplar remoto inexistente.');}
   identity=remote.institution;title=remote.material.title;
  }else{
   const b=s.books.find(b=>b.id===data.bookId);if(!b)throw Error('Material propio inexistente.');
   const snapshot=s.federationSnapshots.find(x=>x.externalInstitutionId===data.externalInstitutionId);if(!snapshot)throw Error('Elegí una institución cargada.');
   identity={id:snapshot.externalInstitutionId,name:snapshot.institutionName};title=b.title;bookId=b.id;
   if(['interlibrary','exchange'].includes(data.type)&&(b.circulationPolicy==='room-only'||materialAvailability(b,s).availableCount<1))throw Error('La política o disponibilidad local impide preparar este préstamo.');
   if(data.exemplarId){const e=b.exemplars.find(e=>e.id===data.exemplarId);if(!e||(['interlibrary','exchange'].includes(data.type)&&exemplarAvailability(e,s).status!=='available'))throw Error('Ejemplar no disponible para la oferta.');holding=shareableHolding(e,c.federationInstitutionId);}
  }
  const req={id:crypto.randomUUID(),institutionId:s.institutionId,networkVersion:1,direction:type,type:data.type,status:'draft',title,targetInstitution:identity.name,externalInstitutionId:identity.id,externalInstitutionName:identity.name,bookId,needId:data.needId||'',remoteRecordId:remote?.material.localRecordId||'',remoteEditionId:remote?.material.editionId||'',remoteWorkId:remote?.material.workId||'',remoteExemplarId:type==='request'?holding?.exemplarId||'':'',globalHoldingRef:holding?.globalHoldingRef||'',...(holding?{holding:structuredClone(holding)}:{}),sourceExportedAt:remote?s.federationSnapshots.find(x=>x.id===data.snapshotId).exportedAt:'',expectedReturnAt:'',notes:'',createdAt:now,createdBy:actorId,updatedAt:now,updatedBy:actorId};
  s.resourceSharingRequests.push(req);if(req.needId)s.collectionNeeds.find(n=>n.id===req.needId).resourceSharingRequestId=req.id;
  audit(s,'resource.share.created',actorId,{requestId:req.id,direction:req.direction});return req;
 }
 if(type==='transition'){
  const req=s.resourceSharingRequests.find(r=>r.id===data.id);if(!req?.networkVersion)throw Error('Cooperación de Red Escolar inexistente.');
  if(req.status!==data.previousStatus)throw Error('El estado cambió. Revisá el acuerdo.');
  if(!transitions[req.status]?.includes(data.status))throw Error('Transición de cooperación no permitida.');
  const expectedReturnAt=date(data.expectedReturnAt||req.expectedReturnAt),note=federationString(data.observation||'','Observación',1200);
  if(data.status==='received'&&req.direction==='request'){
   if(!conditions.includes(data.condition))throw Error('Indicá el estado físico al recibir.');
   const code=req.holding?.internalCode||data.internalCode;federationId(code);if(!req.holding&&!/^AB-?\d{5,}$/.test(code))throw Error('Registrá el código AB de la escuela propietaria.');
   const ref=holdingReference(req.externalInstitutionId,code);if(req.globalHoldingRef&&req.globalHoldingRef!==ref)throw Error('Identidad propietaria inconsistente.');
   if(s.externalHoldings.some(h=>h.globalHoldingRef===ref&&h.status==='received'))throw Error('Ese ejemplar externo ya está recibido.');
   const h={id:crypto.randomUUID(),institutionId:s.institutionId,requestId:req.id,ownerInstitutionId:req.externalInstitutionId,ownerInstitutionName:req.externalInstitutionName,globalHoldingRef:ref,internalCode:code,exemplarId:req.remoteExemplarId,title:req.title,receivedAt:now,expectedReturnAt,returnedAt:'',conditionAtReceipt:data.condition,conditionAtReturn:'',observation:note,status:'received'};
   s.externalHoldings.push(h);req.externalHoldingId=h.id;req.globalHoldingRef=ref;
  }
  if(data.status==='returned'&&req.direction==='request'){
   const h=s.externalHoldings.find(h=>h.id===req.externalHoldingId&&h.status==='received');if(!h)throw Error('No hay material externo recibido para devolver.');if(!conditions.includes(data.condition))throw Error('Indicá la condición de devolución.');h.status='returned';h.returnedAt=now;h.conditionAtReturn=data.condition;h.observation=note;
  }
  req.status=data.status;req.expectedReturnAt=expectedReturnAt;req.updatedAt=now;req.updatedBy=actorId;if(data.status==='received')req.receivedAt=now;if(data.status==='returned')req.returnedAt=now;if(note)req.notes=note;
  audit(s,'resource.share.updated',actorId,{requestId:req.id,status:req.status});return req;
 }
 throw Error('Operación de Red Escolar desconocida.');
}

export function validateFederationBackup(s){
 const c=s.settings.find(x=>x.id==='local'),seen=new Set();
 if(!Array.isArray(s.federationSnapshots)||!Array.isArray(s.externalHoldings)||s.federationSnapshots.length>20)throw Error('Almacenes de Red Escolar inválidos.');
 let records=0;for(const snapshot of s.federationSnapshots){validateFederationSnapshot(snapshotPayload(snapshot));if(snapshot.institutionId!==c.institutionId||snapshot.externalInstitutionId===c.federationInstitutionId||seen.has(snapshot.externalInstitutionId)||!Number.isFinite(Date.parse(snapshot.importedAt)))throw Error('Identidad de snapshot inválida.');if(!Array.isArray(snapshot.updates)||snapshot.updates.length>5||snapshot.updates.some(u=>!Number.isFinite(Date.parse(u.importedAt))||!Number.isFinite(Date.parse(u.exportedAt))||!Number.isSafeInteger(u.recordCount)||u.recordCount<0||u.recordCount>10000))throw Error('Historial de snapshot inválido.');seen.add(snapshot.externalInstitutionId);records+=snapshot.records.length;}if(records>50000)throw Error('Demasiados registros remotos.');
 const active=new Set();for(const h of s.externalHoldings){const req=s.resourceSharingRequests.find(r=>r.id===h.requestId);if(req?.networkVersion!==1||req.externalHoldingId!==h.id||req.direction!=='request'||h.institutionId!==c.institutionId||h.ownerInstitutionId===c.federationInstitutionId||h.globalHoldingRef!==holdingReference(h.ownerInstitutionId,h.internalCode)||h.globalHoldingRef!==req.globalHoldingRef||h.ownerInstitutionId!==req.externalInstitutionId||!['received','returned'].includes(h.status)||req.status!==h.status||!Number.isFinite(Date.parse(h.receivedAt))||!conditions.includes(h.conditionAtReceipt))throw Error('Material externo inválido.');date(h.expectedReturnAt);if(h.status==='received'){if(active.has(h.globalHoldingRef)||h.returnedAt)throw Error('Material externo activo repetido.');active.add(h.globalHoldingRef);}else if(!Number.isFinite(Date.parse(h.returnedAt))||!conditions.includes(h.conditionAtReturn))throw Error('Devolución externa inválida.');}
 for(const req of s.resourceSharingRequests.filter(r=>r.networkVersion)){if(req.networkVersion!==1||!Object.hasOwn(COOPERATION_TYPES,req.type))throw Error('Tipo de cooperación inválido.');federationId(req.externalInstitutionId);if(req.externalInstitutionId===c.federationInstitutionId)throw Error('Cooperación con la misma institución.');if(req.holding){validateSharedHolding(req.holding,req.direction==='request'?req.externalInstitutionId:c.federationInstitutionId);if(req.globalHoldingRef!==req.holding.globalHoldingRef||(req.direction==='request'&&req.remoteExemplarId!==req.holding.exemplarId))throw Error('Referencia de cooperación incoherente.');}if(req.direction==='request'){for(const k of ['remoteRecordId','remoteWorkId','remoteEditionId'])federationId(req[k]);if(['received','returned'].includes(req.status)&&!s.externalHoldings.some(h=>h.id===req.externalHoldingId))throw Error('Cooperación sin recepción externa.');}}
}
