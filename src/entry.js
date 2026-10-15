import {isEnabled,requirePermission,hasPermission} from './permissions.js?v=20261015-field2';
import {projectState,mergeScope} from './access-model.js?v=20261015-field2';
import {normalizeHoldings,config} from './local-domain.js?v=20261015-field2';
import {logAccess} from './access-domain.js?v=20261015-field2';
import {normalizeLoanPolicy} from './loan-policy.js?v=20261015-field2';

export const INITIAL_PERMISSIONS=['institution.edit','profiles.manage','sensitive.export','catalog.clear','institution.transfer','institution.disable'];
export const INTRO_FLAGS={biblioteca:'seenLibraryIntro',docente:'seenTeacherIntro',autoridad:'seenAuthorityIntro'};
const clean=v=>String(v??'').trim().slice(0,160);
export const hasInstitutionData=s=>s.institutions.length>0||s.books.length>0||s.patrons.length>0||s.settings.some(c=>c.id==='local');
export function saveEntryDraft(s,data){
 const old=s.settings.find(c=>c.id==='entry-draft');
 const draft={...old,id:'entry-draft',institutionId:'',requestId:old?.requestId||crypto.randomUUID(),step:Math.max(0,Math.min(2,Number(data.step)||0))};
 for(const key of ['institutionName','libraryName','name','cargo','initialRole','level','shift','locality','province'])if(data[key]!==undefined)draft[key]=clean(data[key]);
 if(old)s.settings.splice(s.settings.indexOf(old),1,draft);else s.settings.push(draft);
 return draft;
}
export function createEntryInstitution(all,d,{actorId='',now=new Date().toISOString()}={}){
 const existing=d.requestId&&all.institutions.find(i=>i.setupRequestId===d.requestId);
 if(existing)return {id:existing.id,personId:existing.createdByPersonId};
 for(const key of ['institutionName','libraryName','name','cargo'])if(!clean(d[key]))throw Error('Completá institución, biblioteca, nombre y cargo.');
 if(!['biblioteca','autoridad'].includes(d.initialRole))throw Error('El primer responsable debe ser Biblioteca o Autoridad Institucional.');
 if(d.personId&&d.personId!==actorId)throw Error('Solo podés vincular tu identidad actual.');
 const person=d.personId?all.people.find(p=>p.id===d.personId):null;
 if(d.personId&&!person)throw Error('Persona inexistente.');
 const p=person||{id:crypto.randomUUID(),name:clean(d.name),email:''},id=crypto.randomUUID();
 if(!person)all.people.push(p);
 const institution={id,name:clean(d.institutionName),status:'active',accessModel:'local-profiles-v1',createdByPersonId:p.id,createdAt:now,initialRole:d.initialRole,primaryInstitutionResponsibleId:p.id,setupRequestId:d.requestId||crypto.randomUUID()};
 for(const key of ['level','shift','locality','province'])institution[key]=clean(d[key]);
 all.institutions.push(institution);
 all.memberships.push({id:crypto.randomUUID(),personId:p.id,institutionId:id,cargo:clean(d.cargo),accessProfile:d.initialRole,status:'active',createdAt:now});
 all.settings.push({id:'config:'+id,institutionId:id,institutionName:institution.name,libraryName:clean(d.libraryName),libraryNameConfirmedAt:now,libraryId:crypto.randomUUID(),collectionId:crypto.randomUUID(),sequence:1,entrySetup:{step:3,createdAt:now}});
 if(!all.settings.some(c=>c.id==='access-model-v5'))all.settings.push({id:'access-model-v5'});
 for(const permission of INITIAL_PERMISSIONS)all.grants.push({id:crypto.randomUUID(),institutionId:id,userId:p.id,permission,grantedBy:p.id,reason:'Configuración inicial confirmada',note:'Configuración inicial confirmada',startsAt:now,expiresAt:'',active:true,createdAt:now,source:'institution-setup'});
 const s=projectState(all,id,p.id);normalizeHoldings(s);logAccess(s,'institution.created',p.id,{userId:p.id,initialRole:d.initialRole});mergeScope(all,s,id);
 all.settings=all.settings.filter(c=>c.id!=='entry-draft');
 return {id,personId:p.id};
}
export function responsibleStatus(s){
 const i=s.institutions[0],id=i?.primaryInstitutionResponsibleId||i?.mainAdminId;
 const person=s.patrons.find(p=>p.id===id),managers=s.patrons.filter(p=>isEnabled(p)&&['biblioteca','autoridad'].includes(p.accessProfile));
 return {person,managers,warning:!isEnabled(person)?(managers.length?'Responsable principal ausente o inactivo. Otra persona de Biblioteca/Autoridad puede registrar el relevo.':'No quedan responsables activos. Conservá los datos y buscá un respaldo; no hay recuperación por correo.'):''};
}
export function entryCommand(s,actorId,type,d={}){
 const actor=requirePermission(s,actorId,'catalog.view'),c=config(s),now=new Date().toISOString();
 if(type==='entry.intro'){const flag=INTRO_FLAGS[actor.accessProfile];if(flag)s.memberships.find(m=>m.personId===actorId)[flag]=true;return;}
 if(type==='entry.responsible'){
  if(!['biblioteca','autoridad'].includes(actor.accessProfile))throw Error('Se requiere Biblioteca o Autoridad.');
  const inst=s.institutions[0],next=responsibleStatus(s).managers.find(p=>p.id===d.userId);
  if(!next||next.expiresAt)throw Error('Elegí una persona de gestión activa sin vencimiento.');
  if(d.confirm!==inst.name)throw Error('Escribí el nombre de la institución para confirmar.');
  const before=inst.primaryInstitutionResponsibleId||inst.mainAdminId;
  if(before===next.id)throw Error('Esa persona ya es responsable principal.');
  if(d.transferPermissions==='yes'){
   requirePermission(s,actorId,'institution.transfer');
   if(next.id===actorId)throw Error('No podés transferirte permisos a vos mismo.');
   const grants=s.grants.filter(g=>g.userId===actorId&&g.source==='institution-setup'&&isEnabled(g)&&INITIAL_PERMISSIONS.includes(g.permission));
   if(!grants.length)throw Error('No tenés permisos iniciales vigentes para transferir.');
   for(const g of grants){
    g.active=false;g.revokedAt=now;g.revokedBy=actorId;
    s.grants.push({...g,id:crypto.randomUUID(),userId:next.id,active:true,revokedAt:'',revokedBy:'',grantedBy:actorId,createdAt:now,startsAt:now,reason:'Relevo administrativo confirmado',note:'Relevo administrativo confirmado'});
    logAccess(s,'permission.revoked',actorId,{userId:actorId,permission:g.permission,grantId:g.id});
    logAccess(s,'permission.granted',actorId,{userId:next.id,permission:g.permission,reason:'Relevo administrativo confirmado'});
   }
  }
  inst.primaryInstitutionResponsibleId=next.id;
  logAccess(s,'institution.responsible.changed',actorId,{before,userId:next.id});return;
 }
 if(!c.entrySetup)throw Error('No hay configuración inicial pendiente.');
 requirePermission(s,actorId,'library.configure');
 if(type==='entry.policy'){
  requirePermission(s,actorId,'policy.configure');
  const days=Number(d.loanDays);if(!Number.isInteger(days)||days<1||days>180)throw Error('Indicá un plazo de 1 a 180 días.');
  c.policy=normalizeLoanPolicy({allowReservations:d.allowReservations==='true',profiles:{docente:{loanDays:days},lector:{loanDays:days}}});c.policyReviewedAt=now;c.entrySetup.step=4;
 }else if(type==='entry.finish'){
  if(!c.policyReviewedAt)throw Error('Revisá la política básica antes de terminar.');
  c.entrySetup.step=5;c.entrySetup.completedAt=now;
 }else throw Error('Acción de ingreso desconocida.');
 logAccess(s,type,actorId);
}
export function setupState(s){const c=s.settings.find(c=>c.id==='local');return !c?.libraryNameConfirmedAt||!isEnabled(responsibleStatus(s).person)||c.entrySetup&&!c.entrySetup.completedAt?'Configuración incompleta':c.pilotMode?.enabled?'En piloto':'Lista para empezar';}
