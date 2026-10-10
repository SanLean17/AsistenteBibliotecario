import {pilotManager,pilotScope,deriveReadiness,deriveDataQuality} from './pilot.js?v=20261010-7';

export const FEEDBACK_TYPES={ux:'Uso y navegación',error:'Error',idea:'Idea',question:'Pregunta',data:'Datos',performance:'Lentitud'};
export const FEEDBACK_STATUS={open:'Abierta',reviewed:'Revisada',resolved:'Resuelta',discarded:'Descartada'};
export const FEEDBACK_SEVERITY={low:'Baja',medium:'Media',high:'Alta'};
export const PILOT_TASKS={title:'Buscar por título',author:'Buscar por autor',topic:'Buscar por tema',content:'Encontrar un texto dentro de una antología',scan:'Escanear un ejemplar',loan:'Registrar un préstamo',return:'Registrar una devolución',reserve:'Solicitar una reserva',collect:'Retirar una reserva'};
const routes=new Set(['inicio','biblioteca','agregar','jornada-catalogacion','asistencia','mostrador','circulacion','reservas','ejemplares','ejemplar','ficha','editar','inventario','atencion','usuarios','permisos','organizacion','coleccion','avisos','calidad','puesta-en-marcha','actividad','etiquetas','interoperabilidad','configuracion','mi-biblioteca','guardados','piloto']);
export const pilotConfig=s=>s.settings?.find(x=>x.id==='local')||{};
export const safeRoute=value=>routes.has(String(value||'').replace(/^#/,'').split(/[/?]/)[0])?String(value).replace(/^#/,'').split(/[/?]/)[0]:'inicio';
// Only an allowlist, never a URL, raw user agent, stack or record identifier.
export function safePilotContext({route,width,theme,userAgent,browser,timestamp}={}){
 return {route:safeRoute(route),width:Math.max(0,Math.min(10000,Math.round(Number(width)||0))),theme:theme==='dark'?'dark':'light',browser:['Edge','Firefox','Chrome','Safari'].includes(browser)?browser:/Edg\//.test(userAgent||'')?'Edge':/Firefox\//.test(userAgent||'')?'Firefox':/Chrome\//.test(userAgent||'')?'Chrome':/Safari\//.test(userAgent||'')?'Safari':'Otro',timestamp:Number.isFinite(Date.parse(timestamp))?new Date(timestamp).toISOString():new Date().toISOString()};
}
export function safeErrorSummary(error){return ({QuotaExceededError:'Almacenamiento sin espacio',SecurityError:'Almacenamiento bloqueado',InvalidStateError:'Almacenamiento no disponible',NotAllowedError:'Permiso de dispositivo denegado',AbortError:'Operación interrumpida',TypeError:'Error de interfaz',NetworkError:'Conexión no disponible'})[error?.name]||'Error inesperado de interfaz';}
export function schoolPilotCommand(s,actorId,action,data,{audit}){
 const actor=s.patrons.find(p=>p.id===actorId);
 if(!pilotManager(s,actor))throw new Error('El piloto requiere un perfil de Biblioteca o Autoridad habilitado.');
 if(data.expectedInstitution!==s.institutionId||data.expectedActor!==actorId)throw new Error('Cambió la institución o el perfil. Volvé a abrir el piloto.');
 const c=pilotConfig(s),now=new Date().toISOString();
 if(action==='start'){
  if(c.pilotMode?.enabled)throw new Error('Ya hay un piloto activo.');
  const pilotName=String(data.pilotName||'').trim().slice(0,120);if(!pilotName)throw new Error('Ingresá un nombre para el piloto.');
  c.pilotMode={id:crypto.randomUUID(),enabled:true,startedAt:now,startedBy:actorId,pilotName,notes:String(data.notes||'').trim().slice(0,2000),tasks:{}};
  audit(s,'schoolPilot.started',actorId);return c.pilotMode;
 }
 const p=c.pilotMode;if(!p)throw new Error('Primero iniciá el piloto.');
 if(action==='end'){if(!p.enabled)return p;p.enabled=false;p.endedAt=now;audit(s,'schoolPilot.ended',actorId);return p;}
 if(action==='feedback-status'){
  const f=s.pilotFeedback.find(x=>x.id===data.id&&x.institutionId===s.institutionId);
  if(!f||!Object.hasOwn(FEEDBACK_STATUS,data.status))throw new Error('Observación o estado inválido.');
  f.status=data.status;f.updatedAt=now;return f;
 }
 if(!p.enabled)throw new Error('El piloto está finalizado. Sus observaciones se conservan.');
 if(action==='task'){
  if(!Object.hasOwn(PILOT_TASKS,data.task)||!['pending','completed','difficulty'].includes(data.status))throw new Error('Tarea inválida.');
  p.tasks||={};p.tasks[data.task]={status:data.status,at:now};return p.tasks[data.task];
 }
 if(action==='feedback'){
  if(!Object.hasOwn(FEEDBACK_TYPES,data.type)||!Object.hasOwn(FEEDBACK_SEVERITY,data.severity))throw new Error('Elegí tipo y severidad.');
  const title=String(data.title||'').trim().slice(0,160),description=String(data.description||'').trim().slice(0,2000);if(!title)throw new Error('Ingresá un título.');
  const context=safePilotContext(data.context),f={id:crypto.randomUUID(),institutionId:s.institutionId,pilotId:p.id,createdAt:now,createdBy:actorId,area:safeRoute(data.area),type:data.type,severity:data.severity,title,description,route:context.route,context,status:'open'};
  s.pilotFeedback.push(f);return f;
 }
 throw new Error('Acción de piloto desconocida.');
}
export function validatePilotBackup(data){
 data.pilotFeedback??=[];
 if(!Array.isArray(data.pilotFeedback))throw new Error('Observaciones de piloto inválidas.');
 for(const f of data.pilotFeedback){if(!f.id||!f.pilotId||!f.createdBy||!Number.isFinite(Date.parse(f.createdAt))||!Object.hasOwn(FEEDBACK_TYPES,f.type)||!Object.hasOwn(FEEDBACK_STATUS,f.status)||!Object.hasOwn(FEEDBACK_SEVERITY,f.severity)||typeof f.title!=='string'||!f.title.trim()||f.title.length>160||typeof f.description!=='string'||f.description.length>2000)throw new Error('Observación de piloto inválida.');f.context=safePilotContext({...f.context,userAgent:({Edge:'Edg/',Firefox:'Firefox/',Chrome:'Chrome/',Safari:'Safari/'})[f.context?.browser]});f.route=safeRoute(f.route);f.area=safeRoute(f.area);}
 const p=data.settings?.find(x=>x.id==='local')?.pilotMode;
 if(p){if(typeof p.enabled!=='boolean'||!p.id||!p.startedBy||!Number.isFinite(Date.parse(p.startedAt))||typeof p.pilotName!=='string'||p.pilotName.length>120||typeof p.notes!=='string'||p.notes.length>2000)throw new Error('Modo piloto inválido.');if(p.tasks)for(const [key,t]of Object.entries(p.tasks))if(!Object.hasOwn(PILOT_TASKS,key)||!['pending','completed','difficulty'].includes(t.status))throw new Error('Tarea de piloto inválida.');}
}
export function pilotTasks(state){
 const s=pilotScope(state),p=pilotConfig(s).pilotMode,events=s.activity.filter(e=>p&&e.createdAt>=p.startedAt&&(!p.endedAt||e.createdAt<=p.endedAt));
 const eventTypes={loan:'loan.created',return:'loan.returned',reserve:'reservation.requested',collect:'reservation.collected',scan:'inventory.scanned'};
 return Object.entries(PILOT_TASKS).map(([id,label])=>{const evidence=eventTypes[id]&&events.some(e=>e.type===eventTypes[id]);return {id,label,status:evidence?'completed':p?.tasks?.[id]?.status||'pending',evidence:Boolean(evidence)};});
}
export function pilotReport(state,at=new Date()){
 const s=pilotScope(state),c=pilotConfig(s),p=c.pilotMode,events=s.activity.filter(e=>p&&e.createdAt>=p.startedAt&&(!p.endedAt||e.createdAt<=p.endedAt)),feedback=(s.pilotFeedback||[]).filter(f=>f.pilotId===p?.id);
 const quality=deriveDataQuality(s);
 const count=type=>events.filter(e=>e.type===type).length,group=field=>Object.fromEntries([...new Set(feedback.map(f=>f[field]))].map(k=>[k,feedback.filter(f=>f[field]===k).length]));
 return {format:'piloto-escolar-1',institution:s.institutions[0]?.name||c.institutionName,period:{from:p?.startedAt||null,to:p?.endedAt||at.toISOString()},pilotName:p?.pilotName||'',enabled:Boolean(p?.enabled),current:{materials:s.books.length,copies:s.books.reduce((n,b)=>n+(b.exemplars||[]).length,0),activeLoans:s.loans.filter(l=>!l.returnedAt&&['loaned','overdue'].includes(l.status)).length,reservations:s.reservations.length,catalogingSessions:s.catalogingSessions.length,captures:s.catalogingSessions.reduce((n,j)=>n+(j.captures||[]).length,0),pendingCaptures:s.catalogingSessions.reduce((n,j)=>n+(j.items||[]).filter(i=>!i.incorporatedAt&&i.status!=='incorporated').length,0),ocrSessions:s.assistanceSessions.length,inventories:s.inventorySessions.length},duringPilot:{loans:count('loan.created'),returns:count('loan.returned'),reservations:count('reservation.requested'),searches:count('search.performed')+count('search.no_results'),noResults:count('search.no_results')},quality:Object.fromEntries(['error','warning','suggestion'].map(k=>[k,quality.filter(q=>q.severity===k).length])),feedback:{total:feedback.length,open:feedback.filter(f=>f.status==='open').length,byArea:group('area'),byType:group('type'),bySeverity:group('severity')},tasks:pilotTasks(s),lastExportInitiatedAt:c.lastExportInitiatedAt||null};
}
export function pilotClosing(state){const s=pilotScope(state);return [{label:'Préstamos activos para revisar',count:s.loans.filter(l=>!l.returnedAt&&['loaned','overdue'].includes(l.status)).length},{label:'Jornadas abiertas, guardadas localmente',count:s.catalogingSessions.filter(j=>j.status==='open').length},{label:'Inventarios abiertos, guardados localmente',count:s.inventorySessions.filter(i=>i.status==='open'||i.status==='draft').length},{label:'Observaciones abiertas',count:(s.pilotFeedback||[]).filter(f=>f.status==='open').length}];}
export function pilotPhases(s){return {preparation:deriveReadiness(s),tasks:pilotTasks(s),closing:pilotClosing(s)};}
