import {PERMISSIONS} from './permissions.js?v=20261012-teaching1';
export function backupPreview(a){return {institution:a.institutions?.[0]?.name||a.settings?.find(c=>c.id==='local')?.institutionName||'Catálogo antiguo',exportedAt:a.exportedAt||null,materials:a.books.length,copies:a.books.reduce((n,b)=>n+(b.exemplars||[]).length,0),people:a.patrons?.length||0,activeLoans:(a.loans||[]).filter(l=>!l.returnedAt&&['loaned','overdue'].includes(l.status)).length,reservations:a.reservations?.length||0,catalogingSessions:a.catalogingSessions?.length||0,inventories:a.inventorySessions?.length||0,pilotFeedback:a.pilotFeedback?.length||0,assistance:a.assistanceSessions?.length||0,locations:a.libraryLocations?.length||0,federationSnapshots:a.federationSnapshots?.length||0,externalHoldings:a.externalHoldings?.length||0,cooperation:a.resourceSharingRequests?.length||0};}
export function restoreIntegrity(s){
 const warnings=[],errors=[],books=s.books||[],copies=books.flatMap(b=>b.exemplars||[]),c=s.settings?.find(x=>x.id==='local'),iid=c?.institutionId;
 if(!iid||s.institutions?.[0]?.id!==iid)errors.push('Identidad institucional inconsistente.');
 if(new Set(copies.map(e=>e.id)).size!==copies.length||new Set(copies.map(e=>e.internalCode)).size!==copies.length||copies.some(e=>!/^AB-\d{6,}$/.test(e.internalCode||'')||Number(e.internalCode.slice(3))<1))errors.push('Identidad de ejemplares inconsistente.');
 const max=copies.reduce((n,e)=>Math.max(n,Number(e.internalCode?.slice(3))||0),0);if(!Number.isSafeInteger(c?.sequence)||c.sequence<=max)errors.push('Secuencia de ejemplares regresiva.');
 for(const b of books)if(b.institutionId!==iid||(b.exemplars||[]).some(e=>e.institutionId!==iid))errors.push('Material de otra institución.');
 const locations=s.libraryLocations||[];
 const byBook=new Map(books.map(b=>[b.id,b])),byCopy=new Map(books.flatMap(b=>(b.exemplars||[]).map(e=>[e.id,{book:b,copy:e}]))),byLocation=new Map(locations.map(l=>[l.id,l]));
 for(const l of locations){const parent=byLocation.get(l.parentId);if((l.type==='shelving'&&parent?.type!=='sector')||(l.type==='shelf'&&parent?.type!=='shelving')||(l.type==='sector'&&l.parentId))errors.push('Jerarquía de ubicaciones inválida.');}
 for(const e of copies)if(e.physicalLocation?.shelfId&&byLocation.get(e.physicalLocation.shelfId)?.type!=='shelf')warnings.push('Un ejemplar requiere revisar su ubicación.');
 for(const l of s.loans||[]){const exists=byCopy.get(l.exemplarId)?.book.id===l.bookId;if(!exists){if(!l.returnedAt&&['loaned','overdue'].includes(l.status))errors.push('Préstamo activo sin ejemplar.');else warnings.push('Un préstamo histórico conserva una referencia retirada.');}}
 for(const r of s.reservations||[])if(!byBook.has(r.bookId)){if(['requested','approved','ready'].includes(r.status))errors.push('Reserva activa sin material.');else warnings.push('Una reserva histórica conserva una referencia retirada.');}

 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(copies.some(e=>typeof e.id!=='string'||!e.id.trim()))errors.push('Ejemplar sin identidad.');
 else if(copies.some(e=>!uuid.test(e.id)))warnings.push('Hay identificadores anteriores al formato UUID; se conservan sin modificarlos.');
 // Legacy archives may predate the derived work/edition stores.
 if(s.version===5||s.works?.length||s.editions?.length){
  const works=new Set((s.works||[]).map(w=>w.id)),editions=new Map((s.editions||[]).map(e=>[e.id,e]));
  if(new Set(books.map(b=>b.editionId)).size!==books.length)errors.push('Edición compartida por fichas distintas.');
  for(const b of books){const e=editions.get(b.editionId);if(!works.has(b.workId)||!e||e.workId!==b.workId||e.recordId!==b.id)errors.push('Referencia de obra o edición inválida.');if(b.exemplars?.some(e=>e.editionId!==b.editionId))errors.push('Ejemplar vinculado a otra edición.');}
 }
 for(const [name,rows] of Object.entries(s))if(Array.isArray(rows)&&!['people','availableInstitutions'].includes(name))for(const r of rows)if(r?.institutionId&&r.institutionId!==iid)errors.push('Datos de otra institución en '+name+'.');
 for(const p of s.photos||[])if(byCopy.get(p.id)?.book.id!==p.bookId)errors.push('Fotografía sin ejemplar válido.');
 for(const e of copies){const l=e.physicalLocation||{},sector=byLocation.get(l.sectorId),shelving=byLocation.get(l.shelvingId),shelf=byLocation.get(l.shelfId);if((l.sectorId&&sector?.type!=='sector')||(l.shelvingId&&(shelving?.type!=='shelving'||shelving.parentId!==l.sectorId))||(l.shelfId&&(shelf?.type!=='shelf'||shelf.parentId!==l.shelvingId)))warnings.push('Un ejemplar requiere revisar su ubicación estructurada.');}
 const inventories=s.inventorySessions||[];
 if(inventories.filter(i=>['draft','open'].includes(i.status)).length>1)errors.push('Hay varios inventarios activos.');
 for(const i of inventories){if(new Set(i.expectedExemplarIds||[]).size!==(i.expectedExemplarIds||[]).length||new Set((i.findings||[]).map(f=>f.exemplarId)).size!==(i.findings||[]).length)errors.push('Inventario con ejemplares repetidos.');if((i.expectedExemplarIds||[]).some(id=>!byCopy.has(id))||(i.findings||[]).some(f=>byCopy.get(f.exemplarId)?.book.id!==f.bookId))warnings.push('Un inventario conserva referencias a ejemplares retirados.');}
 for(const j of s.catalogingSessions||[]){const items=new Set((j.items||[]).map(i=>i.id));if(items.size!==(j.items||[]).length)errors.push('Jornada con ítems repetidos.');for(const capture of j.captures||[])if(capture.itemId&&!items.has(capture.itemId))errors.push('Captura sin ítem de jornada.');for(const item of j.items||[])if(item.status==='incorporated'&&item.result?.bookId&&!byBook.has(item.result.bookId))warnings.push('Una jornada conserva un material retirado.');}
 const needs=new Set((s.collectionNeeds||[]).map(n=>n.id));
 for(const r of s.resourceSharingRequests||[])if((r.needId&&!needs.has(r.needId))||(r.bookId&&!byBook.has(r.bookId)))errors.push('Referencia de cooperación inválida.');
 const activeCopies=new Set(),assigned=new Set(),people=new Set((s.patrons||[]).map(p=>p.id));
 for(const l of s.loans||[])if(!l.returnedAt&&['loaned','overdue'].includes(l.status)){if(activeCopies.has(l.exemplarId)||!people.has(l.patron?.id))errors.push('Préstamo activo duplicado o sin persona.');activeCopies.add(l.exemplarId);}
 for(const r of s.reservations||[])if(['requested','approved','ready'].includes(r.status)){if(!people.has(r.patron?.id))errors.push('Reserva sin persona.');if(['approved','ready'].includes(r.status)){if(byCopy.get(r.exemplarId)?.book.id!==r.bookId||activeCopies.has(r.exemplarId)||assigned.has(r.exemplarId))errors.push('Reserva asignada sin ejemplar disponible.');assigned.add(r.exemplarId);}}
 for(const g of s.grants||[])if(!people.has(g.userId)||!PERMISSIONS.includes(g.permission)||[g.startsAt,g.expiresAt].some(v=>v&&!Number.isFinite(Date.parse(v)))||(g.startsAt&&g.expiresAt&&Date.parse(g.startsAt)>=Date.parse(g.expiresAt))||(g.revokedAt&&g.active!==false))errors.push('Permiso inconsistente.');
 for(const r of s.resourceSharingRequests||[])if(r.exemplarId&&byCopy.get(r.exemplarId)?.book.id!==r.bookId)errors.push('Cooperación sin ejemplar válido.');
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}

// Deliberate allowlist: no names, identifiers, titles, URLs, messages or stack traces.
export function diagnosticSummary(s,{appVersion,dbVersion,browser,viewport}={}){
 const integrity=restoreIntegrity(s);
 return {format:1,appVersion,dbVersion,browser,viewport,counts:{materials:s.books.length,copies:s.books.reduce((n,b)=>n+(b.exemplars||[]).length,0),people:s.patrons.length,loans:s.loans.length,reservations:s.reservations.length,journals:s.catalogingSessions.length,inventories:s.inventorySessions.length,feedback:s.pilotFeedback.length},integrity:{errors:integrity.errors.length,warnings:integrity.warnings.length},at:new Date().toISOString()};
}
export function storageDiagnostics(s,{version,stores,expectedStores,estimate}={}){
 const integrity=restoreIntegrity(s);
 return [{label:'IndexedDB accesible',status:'correct',detail:'Lectura local completada.'},{label:'Institución actual',status:s.institutions?.some(i=>i.id===s.institutionId)?'correct':'error',detail:s.institutions?.[0]?.name||'Sin institución'},{label:'Catálogo legible',status:Array.isArray(s.books)?'correct':'error',detail:(s.books?.length||0)+' materiales'},{label:'Almacenes y versión',status:expectedStores?.every(k=>stores?.includes(k))?'correct':'error',detail:'Versión '+version},{label:'Integridad y compatibilidad',status:integrity.errors.length?'error':integrity.warnings.length?'attention':'correct',detail:integrity.errors.join(' ')||integrity.warnings.length+' advertencias. Respaldo formato 5.'},{label:'Espacio aproximado',status:'attention',detail:estimate&&Number.isFinite(estimate.usage)&&Number.isFinite(estimate.quota)?Math.round(estimate.usage/1024/1024)+' MB usados de aproximadamente '+Math.round(estimate.quota/1024/1024)+' MB. El navegador puede modificar esta cuota.':'Estimación no disponible en este navegador.'}];
}
const samples=[];let scope='',enabled=false;
export function configureTimings(iid,active){if(scope!==iid||!active)samples.length=0;scope=iid;enabled=Boolean(active);}
export function recordTiming(area,ms){if(enabled&&['catalog','search','loan','desk'].includes(area)&&Number.isFinite(ms)&&ms>=1500){samples.push({area,milliseconds:Math.round(ms),at:new Date().toISOString()});if(samples.length>20)samples.shift();}}
export const timingSnapshot=()=>samples.map(x=>({...x}));
export async function timed(area,fn){const start=performance.now();try{return await fn();}finally{recordTiming(area,performance.now()-start);}}
