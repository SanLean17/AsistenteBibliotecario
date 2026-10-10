import {isEnabled,PERMISSIONS} from './permissions.js?v=20261010-3';
import {validISBN,canonicalISBN} from './isbn.js?v=20261010-3';
import {validISSN,recognizeIdentifier} from './recognition.js?v=20261010-3';
import {detectCatalogMatches} from './duplicates.js?v=20261010-3';

export const SEVERITIES={error:'Error',warning:'Advertencia',suggestion:'Sugerencia'};
export const validAB=value=>/^AB-\d{6,}$/.test(value||'')&&Number.isSafeInteger(Number(value.slice(3)))&&Number(value.slice(3))>0;
export const pilotManager=(state,actor,at=new Date())=>Boolean(state.institutionId&&actor?.institutionId===state.institutionId&&['biblioteca','autoridad'].includes(actor.accessProfile)&&isEnabled(actor,new Date(at)));
export function pilotScope(state){
 const scoped=x=>!x.institutionId||x.institutionId===state.institutionId;
 return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,Array.isArray(value)?value.filter(scoped).map(x=>key==='books'?{...x,exemplars:(x.exemplars||[]).filter(scoped)}:x):value]));
}
export function deriveDataQuality(state,{at=new Date()}={}){
 const s=pilotScope(state),issues=[],books=s.books||[],locations=s.libraryLocations||[],codes=new Map();
 const add=(type,severity,entity,title,detail,route,extra={})=>issues.push({id:type+':'+entity,type,severity,title,detail,route,...extra});
 for(const b of books){
  const route='ficha/'+encodeURIComponent(b.id),detail=b.title||'Material sin título';
  if(!(b.subjects||[]).some(x=>String(x).trim()))add('topics','suggestion',b.id,'Sin temas o palabras clave',detail,route);
  if(!String(b.description||'').trim()&&!(b.contents||[]).length)add('description','suggestion',b.id,'Descripción opcional para mejorar la búsqueda',detail,route);
  if(!(b.exemplars||[]).length&&!b.resourceUrl&&!b.doi)add('orphan','warning',b.id,'Sin ejemplares ni acceso digital',detail,route);
  for(const [key,valid] of [['isbn',v=>/^(?:ISBN(?:-1[03])?\s*:?\s*)?[\dXx -]+$/i.test(v)&&validISBN(v.replace(/^ISBN(?:-1[03])?\s*:?\s*/i,''))],['issn',validISSN],['doi',v=>recognizeIdentifier(v).kind==='doi']]){
   if(b[key]&&!valid(String(b[key])))add(key,'error',b.id,key.toUpperCase()+' malformado',detail,route);
  }
  for(const key of ['isbn10','isbn13'])if(b[key]&&!validISBN(b[key]))add(key,'error',b.id,key.toUpperCase()+' malformado',detail,route);
  if(b.isbn&&b.isbn13&&canonicalISBN(b.isbn)!==canonicalISBN(b.isbn13))add('isbn-conflict','error',b.id,'ISBN de edición inconsistentes',detail,route);
  for(const e of b.exemplars||[]){
   const er='ejemplar/'+encodeURIComponent(e.id),ed=detail+' · '+(e.internalCode||'Sin código'),p=e.physicalLocation||{};
   if(!validAB(e.internalCode))add('code','error',e.id,'Código AB ausente o inválido',ed,er);
   if(e.internalCode){if(codes.has(e.internalCode))add('code-duplicate','error',e.id,'Código AB repetido',ed,er);codes.set(e.internalCode,e.id);}
   if(!(p.sector&&p.shelving&&p.shelf)&&!locations.some(l=>l.id===p.shelfId&&l.type==='shelf'&&l.active!==false))add('location','warning',e.id,'Ubicación estructurada incompleta',ed,er);
   if(e.careLevel==='restricted'&&e.status==='available')add('care','error',e.id,'No prestar figura como disponible',ed,er);
  }
 }
 for(let i=0;i<books.length;i++)for(const match of detectCatalogMatches(books.slice(i+1),books[i]))add('duplicate','warning',books[i].id+':'+match.book.id,'Posible duplicado · '+({'exact-edition':'misma edición','same-work':'misma obra',similar:'similar'})[match.kind],(books[i].title||'Material')+' / '+(match.book.title||'Material')+' · '+match.reasons.join(' · '),'ficha/'+encodeURIComponent(books[i].id),{relatedRoute:'ficha/'+encodeURIComponent(match.book.id)});
 for(const inv of s.inventorySessions||[])if(['open','draft'].includes(inv.status)&&(!Number.isFinite(Date.parse(inv.createdAt||inv.startedAt))||+new Date(at)-Date.parse(inv.createdAt||inv.startedAt)>=30*86400000))add('inventory','warning',inv.id,'Inventario abierto antiguo o sin fecha','Revisá la sesión antes de cerrarla.','inventario');
 for(const g of s.grants||[]){
  const invalid=Boolean(g.revokedAt&&g.active!==false)||!s.patrons?.some(p=>p.id===g.userId)||!PERMISSIONS.includes(g.permission)||[g.startsAt,g.expiresAt].some(v=>v&&!Number.isFinite(Date.parse(v)))||(g.startsAt&&g.expiresAt&&Date.parse(g.startsAt)>=Date.parse(g.expiresAt));
  if(invalid)add('grant-invalid','error',g.id,'Permiso inconsistente',g.permission||'Sin permiso','permisos/'+encodeURIComponent(g.userId||''));
  else if(g.active!==false&&!g.revokedAt&&Date.parse(g.expiresAt)<=+new Date(at))add('grant-expired','warning',g.id,'Permiso vencido pendiente de cierre',g.permission,'permisos/'+encodeURIComponent(g.userId));
 }
 return issues.sort((a,b)=>Object.keys(SEVERITIES).indexOf(a.severity)-Object.keys(SEVERITIES).indexOf(b.severity)||a.id.localeCompare(b.id));
}
export function deriveReadiness(state,{at=new Date()}={}){
 const s=pilotScope(state),c=s.settings?.find(x=>x.id==='local')||{},issues=deriveDataQuality(s,{at}),copies=(s.books||[]).flatMap(b=>b.exemplars||[]),steps=[];
 const add=(id,category,label,done,route,required=true,detail='')=>steps.push({id,category,label,done:Boolean(done),route,required,detail});
 add('institution','Configuración básica','Institución creada',s.institutions?.some(i=>i.id===s.institutionId&&i.status!=='disabled'&&i.name?.trim()&&(i.id!=='local-institution'||i.name!=='Mi escuela')),'organizacion');
 add('library','Configuración básica','Nombre de biblioteca guardado',c.libraryName?.trim()&&c.libraryNameConfirmedAt,'organizacion',true,'Guardá el nombre en Institución para confirmarlo.');
 add('locations','Configuración básica','Ubicación física configurada',s.libraryLocations?.some(l=>l.active!==false&&l.name?.trim()),'inventario');
 add('responsible','Operación','Responsable de Biblioteca activo',s.patrons?.some(p=>p.accessProfile==='biblioteca'&&isEnabled(p,new Date(at))),'usuarios');
 add('catalog','Catálogo','Al menos un material incorporado',s.books?.length,'biblioteca');
 add('codes','Catálogo','Códigos AB válidos y únicos',!issues.some(i=>['code','code-duplicate'].includes(i.type)),'calidad',true,copies.length?'Se comprueban todos los ejemplares.':'Sin ejemplares físicos: no aplica.');
 add('errors','Catálogo','Sin errores de integridad detectados',!issues.some(i=>i.severity==='error'),'calidad');
 add('policy','Operación','Política de préstamos guardada',c.policyReviewedAt&&c.policy,'organizacion',true,'Revisá y guardá los plazos y las reglas de préstamo.');
 add('people','Operación','Personas y docentes cargados si se necesitan',s.patrons?.some(p=>['docente','lector','personal'].includes(p.accessProfile)&&isEnabled(p,new Date(at))),'usuarios',false);
 add('backup','Respaldo y seguridad','Exportar y comprobar un respaldo',false,'configuracion',false,'Recomendado. El navegador no permite comprobar que guardaste el archivo. No hay respaldo automático.');
 const missing=steps.filter(x=>x.required&&!x.done).length;
 return {ready:missing===0,missing,steps,issues,label:missing?(missing===1?'Falta 1 paso importante':`Faltan ${missing} pasos importantes`):'Lista para piloto'};
}
