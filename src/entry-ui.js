import {projectState} from './access-model.js?v=20261015-entry1';
import {readAll,readState,getActorId,createInstitution,saveOnboardingDraft,executeEntry,chooseLocalPerson,closeLocalSession,restoreAtEntry,exportArchive,markExportInitiated,getInstitutionId,exportRecoveryArchive} from './storage.js?v=20261015-entry1';
import {INTRO_FLAGS,responsibleStatus,setupState} from './entry.js?v=20261015-entry1';
import {PROFILES,LABELS,hasPermission,isEnabled} from './permissions.js?v=20261015-entry1';
import {JsonBackupProvider} from './imports.js?v=20261015-entry1';
import {deriveReadiness} from './pilot.js?v=20261015-entry1';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice='<p class="notice">Los datos se guardan en este dispositivo. Todavía no hay sincronización entre equipos. Modo local / simulación de acceso: no es un inicio de sesión con contraseña.</p>';
const field=(label,name,value='',required=true,type='text')=>`<label>${label}<input name="${name}" type="${type}" maxlength="160" value="${esc(value)}" ${required?'required':''}></label>`;
const button=(route,label)=>`<a class="button secondary" href="#${route}">${label}</a>`;
const form=(action,body,label='Continuar')=>`<form class="local-form" data-entry-form="${action}">${body}<p class="error" role="alert" aria-live="assertive"></p><button class="button primary">${label}</button></form>`;
const tours={biblioteca:[['biblioteca','Catálogo'],['jornada-catalogacion','Jornada de catalogación'],['mostrador','Mostrador'],['inventario','Inventario'],['configuracion','Backup']],docente:[['biblioteca','Buscar'],['reservas','Reservar'],['mi-biblioteca','Mi biblioteca'],['mis-proyectos','Mis proyectos']],autoridad:[['organizacion','Organización'],['usuarios','Personas y permisos'],['analitica','Analítica'],['configuracion','Backup']]};
let refresh,preview=null;
function show(title,body){$('#main').innerHTML=`<section class="panel settings-panel entry-panel"><h1 tabindex="-1">${title}</h1>${body}</section>`;$('#main h1').focus();}
export function initEntryUI(callback){
 refresh=callback;
 document.addEventListener('click',async e=>{const action=e.target.closest('[data-entry-action]')?.dataset.entryAction;if(!action)return;try{
  if(action==='logout'){closeLocalSession();location.replace(location.pathname+'#ingreso');location.reload();return;}
  if(action==='backup'){const iid=getInstitutionId(),pid=getActorId(),archive=await exportArchive(),url=URL.createObjectURL(new Blob([JSON.stringify(archive,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='biblioteca-respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);await markExportInitiated(iid,pid);$('#entry-backup-status').textContent='Descarga solicitada. Comprobá que guardaste el archivo: no podemos verificarlo desde aquí.';return;}
  if(action==='seen'){await executeEntry('entry.intro',{});location.hash='#biblioteca';await refresh();}
 }catch(error){const target=$('#entry-error')||$('#toast');target.textContent=error.message;}});
 document.addEventListener('input',async e=>{const f=e.target.closest('[data-entry-form="draft"]');if(!f)return;try{await saveOnboardingDraft(Object.fromEntries(new FormData(f)));const status=$('#entry-progress');if(status)status.textContent='Progreso guardado en este dispositivo.';}catch(error){const message=f.querySelector('[role=alert]');if(message)message.textContent=error.message;}});
 document.addEventListener('change',async e=>{if(e.target.id==='entry-file'){preview=null;try{const file=e.target.files[0];if(!file)return;if(file.size>50*1024*1024)throw Error('El archivo supera 50 MB.');preview=JsonBackupProvider.parse(await file.text());if(preview.version!==5)throw Error('Elegí un respaldo institucional versión 5.');await refresh();}catch(error){$('#entry-error').textContent=error.message;}return;}
  const f=e.target.closest('[data-entry-form="draft"]');if(f){try{await saveOnboardingDraft(Object.fromEntries(new FormData(f)));$('#entry-progress').textContent='Progreso guardado en este dispositivo.';}catch(error){f.querySelector('[role=alert]').textContent=error.message;}}
 });
 document.addEventListener('submit',async e=>{const f=e.target.closest('[data-entry-form]');if(!f)return;e.preventDefault();const d=Object.fromEntries(new FormData(f)),action=f.dataset.entryForm,submit=f.querySelector('button[type=submit],button');submit.disabled=true;try{
  if(action==='draft'){const draft=await saveOnboardingDraft(d);if(Number(d.step)===2){await createInstitution({...draft,initialRole:d.initialRole});location.hash='#ingreso';}else{await saveOnboardingDraft({...draft,step:Number(d.step)+1});location.hash=(await readAll()).institutions.length?'#registro':'#ingreso';}}
  else if(action==='choose'){const [iid,pid]=JSON.parse(d.context);await chooseLocalPerson(iid,pid);location.hash='#inicio';}
  else if(action==='recovery-export'){const archive=await exportRecoveryArchive(d.institutionId,d.confirm),url=URL.createObjectURL(new Blob([JSON.stringify(archive,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='biblioteca-recuperacion.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);f.querySelector('[role=alert]').textContent='Descarga solicitada. Guardá y comprobá el archivo. No se reactivó ningún acceso.';submit.disabled=false;return;}
  else if(action==='restore'){await restoreAtEntry(preview,d.confirm);preview=null;location.hash='#inicio';}
  else{await executeEntry(action,d);if(action==='entry.responsible')location.hash='#organizacion';}
  await refresh();
 }catch(error){f.querySelector('[role=alert]').textContent=error.message;submit.disabled=false;}});
}
export async function renderEntry(route){
 const all=await readAll(),s=projectState(all,getInstitutionId(),getActorId()),actor=s.patrons.find(p=>p.id===getActorId()),c=s.settings.find(c=>c.id==='local'),draft=all.settings.find(c=>c.id==='entry-draft')||{step:0};
 if(route!==(location.hash.slice(1)||'inicio'))return true;
 const logged=Boolean(isEnabled(actor)&&s.institutions[0]?.status==='active');
 const entry=!all.institutions.length||!logged||['ingreso','registro','recuperacion'].includes(route.split('/')[0])||c?.entrySetup&&!c.entrySetup.completedAt;
 document.body.classList.toggle('entry-mode',Boolean(entry));if(entry)$('#school-pilot-banner').hidden=true;
 if(route==='recuperacion'){
  show('Recuperar acceso o datos',notice+'<p>El cierre de sesión local conserva el catálogo. Volvé a seleccionar una persona activa para continuar. Si se perdió el navegador o el dispositivo, necesitás el archivo de respaldo. Todavía no existe recuperación por email.</p><p>Si no quedan perfiles de gestión activos, conservá este navegador y sus datos. No borres el almacenamiento ni inventes una nueva identidad para recuperar permisos. Podés restaurar un respaldo previo en un navegador vacío.</p>'+button('ingreso','Volver al ingreso')+(logged?button('configuracion','Exportar o restaurar respaldo'):'')+all.institutions.filter(i=>!all.memberships.some(m=>m.institutionId===i.id&&isEnabled(m)&&['biblioteca','autoridad'].includes(m.accessProfile))).map(i=>`<h2>Preservar datos de ${esc(i.name)}</h2><p>Esta institución no tiene perfiles de gestión activos. Podés descargar sus datos locales sin reactivar personas ni cambiar permisos. Es un respaldo de emergencia, no recuperación de identidad.</p>${form('recovery-export',`<input type="hidden" name="institutionId" value="${esc(i.id)}">${field('Confirmá el nombre de la institución','confirm')}`,'Descargar copia de emergencia')}`).join(''));return true;
 }
 if(!all.institutions.length||route==='registro'||route.startsWith('registro/')){
  const step=Math.max(0,Math.min(2,draft.step||0));
  const fields=step===0?field('Nombre de la institución','institutionName',draft.institutionName)+field('Nivel/es (opcional)','level',draft.level,false)+field('Turno (opcional)','shift',draft.shift,false)+field('Localidad (opcional)','locality',draft.locality,false)+field('Provincia (opcional)','province',draft.province,false):step===1?field('Nombre de la biblioteca','libraryName',draft.libraryName):field('Nombre del responsable','name',draft.name)+field('Cargo institucional','cargo',draft.cargo)+`<label>Perfil inicial<select name="initialRole"><option value="biblioteca" ${draft.initialRole==='biblioteca'?'selected':''}>Biblioteca</option><option value="autoridad" ${draft.initialRole==='autoridad'?'selected':''}>Autoridad Institucional</option></select></label><p>El perfil tendrá permisos explícitos para configurar la institución, administrar perfiles y generar/restaurar respaldos. La responsabilidad principal queda registrada por separado.</p>`;
  show('Crear institución',notice+stepper(step)+form('draft',`<input type="hidden" name="step" value="${step}">${fields}`,step===2?'Crear y continuar':'Guardar y continuar')+`<p id="entry-progress" role="status">${draft.requestId?'Continuar configuración: tu progreso está guardado.':''}</p>`+(step?form('draft',`<input type="hidden" name="step" value="${step-2}">`,'Volver atrás'):'')+(!all.institutions.length?restorePanel():'')+button('recuperacion','Recuperar acceso o datos'));return true;
 }
 if(!logged){
  const choices=all.memberships.filter(m=>m.status==='active'&&all.institutions.some(i=>i.id===m.institutionId&&i.status==='active')&&isEnabled(m));
  show('Elegir persona local',notice+(choices.length?form('choose',`<label>Persona e institución<select name="context">${choices.map(m=>`<option value="${esc(JSON.stringify([m.institutionId,m.personId]))}">${esc(all.people.find(p=>p.id===m.personId)?.name)} · ${esc(PROFILES[m.accessProfile])} · ${esc(all.institutions.find(i=>i.id===m.institutionId)?.name)}</option>`).join('')}</select></label>`,'Entrar en modo local'):'<p role="alert">No quedan accesos activos. Los datos siguen guardados. Revisá las opciones de recuperación.</p>')+button('recuperacion','Recuperar acceso o datos'));return true;
 }
 if(c?.entrySetup&&!c.entrySetup.completedAt){
  const step=c.entrySetup.step;
  show('Continuar configuración',notice+stepper(step)+(step===3?form('entry.policy',field('Plazo básico de préstamo (días)','loanDays','14',true,'number')+'<label>Permitir reservas<select name="allowReservations"><option value="true">Sí</option><option value="false">No</option></select></label><p>Podés ajustar los plazos y máximos de cada perfil en Organización.</p>','Guardar política y continuar'):`<p>Creá un respaldo inicial y guardalo fuera de este navegador. La descarga es opcional y no podemos comprobar que conservaste el archivo.</p><button class="button secondary" data-entry-action="backup">Descargar backup inicial</button><p id="entry-backup-status" role="status"></p><p id="entry-error" role="alert"></p>${form('entry.finish','<p>La institución y la biblioteca ya están creadas. Podés empezar sin cargar materiales.</p>','Finalizar configuración')}`));return true;
 }
 if(route==='ingreso'){
  show('Institución lista para empezar',notice+`<p>${esc(setupState(s))}</p><div class="button-row">${hasPermission(actor,'catalog.create',s.grants)?button('agregar','Cargar primer material')+button('migracion','Importar Aguapey o CSV'):''}${button('configuracion','Restaurar backup')}${button('usuarios','Crear docentes/personas')}${button('puesta-en-marcha','Ver puesta en marcha')}${button('biblioteca','Empezar desde cero')}</div>`);return true;
 }
 if(route==='guia'||route==='inicio'&&s.institutions[0]?.accessModel==='local-profiles-v1'&&INTRO_FLAGS[actor.accessProfile]&&!actor[INTRO_FLAGS[actor.accessProfile]]){
  show('Guía de '+(PROFILES[actor.accessProfile]||'acceso local'),notice+`<ol>${(tours[actor.accessProfile]||[['biblioteca','Buscar materiales']]).map(([r,t])=>`<li>${button(r,t)}</li>`).join('')}</ol><button class="button primary" data-entry-action="seen">Entendido, ir al catálogo</button><p id="entry-error" role="alert"></p>`);return true;
 }
 return false;
}
function stepper(step){return `<ol class="entry-steps" aria-label="Configuración inicial">${['Institución','Biblioteca','Responsable','Política básica','Backup','Listo'].map((s,i)=>`<li ${i===step?'aria-current="step"':''}>${i+1}. ${s}</li>`).join('')}</ol>`;}
function restorePanel(){return `<section><h2>Restaurar una biblioteca existente</h2><label>Elegir backup<input id="entry-file" type="file" accept=".json,application/json"></label><p id="entry-error" role="alert"></p>${preview?`<h3>Vista previa</h3><p>${esc(preview.institutions[0]?.name)} · ${preview.books.length} materiales · ${preview.memberships.length} personas · ${preview.loans.length} préstamos.</p>${form('restore',field('Confirmá escribiendo el nombre de la institución','confirm'),'Confirmar restauración')}`:''}</section>`;}
export async function enhanceEntry(route){
 if(document.body.classList.contains('entry-mode'))return;
 const s=await readState(),actor=s.patrons.find(p=>p.id===getActorId());if(!actor)return;
 const context=$('#entry-context');if(context)context.textContent=`${actor.name} · ${PROFILES[actor.accessProfile]||'Sin perfil'} · ${actor.cargo||''} · ${s.institutions[0]?.name||''}`;
 if(!['biblioteca','autoridad'].includes(actor.accessProfile)||!['inicio','organizacion'].includes(route.split('/')[0]))return;
 if(route!==(location.hash.slice(1)||'inicio'))return;$('#entry-responsibility')?.remove();
 const state=responsibleStatus(s),panel=document.createElement('section');panel.className='panel settings-panel';panel.id='entry-responsibility';
 panel.innerHTML=`<h2>Responsable principal</h2><p>${esc(state.person?.name||'Sin responsable registrado')} · ${esc(setupState(s))}</p>${state.warning?`<p role="alert">${esc(state.warning)}</p>`:''}`;
 if(route.startsWith('organizacion'))panel.innerHTML+=form('entry.responsible',`<label>Nuevo responsable<select name="userId">${state.managers.filter(p=>p.id!==state.person?.id&&!p.expiresAt).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(PROFILES[p.accessProfile])}</option>`).join('')}</select></label><p>Revisá el perfil y los <a href="#permisos">permisos actuales</a>. Cambiar solamente el responsable no modifica permisos.</p>${hasPermission(actor,'institution.transfer',s.grants)&&s.grants.some(g=>g.userId===actor.id&&g.source==='institution-setup'&&isEnabled(g))?'<label><input type="checkbox" name="transferPermissions" value="yes"> Transferir además mis permisos iniciales de configuración, perfiles, respaldo, vaciado y desactivación. Se revocarán para mí.</label>':''}${field('Confirmá escribiendo el nombre de la institución','confirm')}`,'Cambiar responsable principal');
 else {const readiness=deriveReadiness(s);panel.innerHTML+=`<h3>Primer día</h3><ul>${readiness.steps.filter(i=>['institution','library','responsible','locations','catalog','backup'].includes(i.id)).map(i=>`<li>${esc(i.label||i.title)}: ${i.done?'completo':'pendiente'} ${button(i.route,'Revisar')}</li>`).join('')}</ul>`;}
 $('#main').append(panel);
}
