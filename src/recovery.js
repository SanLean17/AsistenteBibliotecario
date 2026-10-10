export function backupPreview(a){return {institution:a.institutions?.[0]?.name||a.settings?.find(c=>c.id==='local')?.institutionName||'Catálogo antiguo',exportedAt:a.exportedAt||null,materials:a.books.length,copies:a.books.reduce((n,b)=>n+(b.exemplars||[]).length,0),people:a.patrons?.length||0,activeLoans:(a.loans||[]).filter(l=>!l.returnedAt&&['loaned','overdue'].includes(l.status)).length,reservations:a.reservations?.length||0,catalogingSessions:a.catalogingSessions?.length||0,inventories:a.inventorySessions?.length||0};}
export function restoreIntegrity(s){
 const warnings=[],errors=[],books=s.books||[],copies=books.flatMap(b=>b.exemplars||[]),c=s.settings?.find(x=>x.id==='local'),iid=c?.institutionId;
 if(!iid||s.institutions?.[0]?.id!==iid)errors.push('Identidad institucional inconsistente.');
 if(new Set(copies.map(e=>e.id)).size!==copies.length||new Set(copies.map(e=>e.internalCode)).size!==copies.length||copies.some(e=>!/^AB-\d{6,}$/.test(e.internalCode||'')||Number(e.internalCode.slice(3))<1))errors.push('Identidad de ejemplares inconsistente.');
 const max=copies.reduce((n,e)=>Math.max(n,Number(e.internalCode?.slice(3))||0),0);if(!Number.isSafeInteger(c?.sequence)||c.sequence<=max)errors.push('Secuencia de ejemplares regresiva.');
 for(const b of books)if(b.institutionId!==iid||(b.exemplars||[]).some(e=>e.institutionId!==iid))errors.push('Material de otra institución.');
 const locations=s.libraryLocations||[];
 for(const l of locations){const parent=locations.find(x=>x.id===l.parentId);if((l.type==='shelving'&&parent?.type!=='sector')||(l.type==='shelf'&&parent?.type!=='shelving')||(l.type==='sector'&&l.parentId))errors.push('Jerarquía de ubicaciones inválida.');}
 for(const e of copies)if(e.physicalLocation?.shelfId&&!locations.some(l=>l.id===e.physicalLocation.shelfId&&l.type==='shelf'))warnings.push('Un ejemplar requiere revisar su ubicación.');
 for(const l of s.loans||[]){const exists=books.some(b=>b.id===l.bookId&&b.exemplars?.some(e=>e.id===l.exemplarId));if(!exists){if(!l.returnedAt&&['loaned','overdue'].includes(l.status))errors.push('Préstamo activo sin ejemplar.');else warnings.push('Un préstamo histórico conserva una referencia retirada.');}}
 for(const r of s.reservations||[])if(!books.some(b=>b.id===r.bookId)){if(['requested','approved','ready'].includes(r.status))errors.push('Reserva activa sin material.');else warnings.push('Una reserva histórica conserva una referencia retirada.');}
 return {errors:[...new Set(errors)],warnings};
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
