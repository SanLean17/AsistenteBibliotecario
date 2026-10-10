import {deriveReadiness,deriveDataQuality,pilotManager,SEVERITIES} from './pilot.js?v=20261010-6';
import {readState,getActorId,execute} from './storage.js?v=20261010-6';
import {hasPermission} from './permissions.js?v=20261010-6';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(route,label)=>`<a class="button secondary" href="#${esc(route)}">${label}</a>`;
export function renderPilotSummary(s,actor){
 if(!pilotManager(s,actor))return '';
 const r=deriveReadiness(s);
 return `<a class="notice-summary" data-pilot-summary href="#puesta-en-marcha"><span><strong>Preparación para piloto · ${r.label}</strong><small>Guía de puesta en marcha y revisión del catálogo local.</small></span><span aria-hidden="true">↗</span></a>`;
}
function checklist(s){
 const r=deriveReadiness(s);
 return `<h1>Puesta en marcha</h1><p class="notice" data-readiness>${r.label}</p><p>Esta guía no bloquea el uso. La preparación se calcula desde los datos de esta institución; las recomendaciones son opcionales.</p>${link('calidad','Revisar calidad de datos')}<div class="pilot-grid">${[...new Set(r.steps.map(x=>x.category))].map(category=>`<section class="panel settings-panel"><h2>${category}</h2><ul class="pilot-steps">${r.steps.filter(x=>x.category===category).sort((a,b)=>Number(b.required)-Number(a.required)||Number(a.done)-Number(b.done)).map(x=>`<li data-step="${x.id}"><strong>${x.done?'✓ Completado':x.required?'Pendiente':'Recomendado'} · ${x.label}</strong>${x.detail?`<p>${x.detail}</p>`:''}${link(x.route,'Revisar sección')}</li>`).join('')}</ul></section>`).join('')}</div>`;
}
function issueList(issues,severity='',type=''){
 const visible=issues.filter(x=>(!severity||x.severity===severity)&&(!type||x.type===type));
 return `<p role="status">${visible.length} de ${issues.length} incidencias</p><div class="pilot-grid">${visible.map(x=>`<article class="panel settings-panel quality-issue" data-severity="${x.severity}"><small>${SEVERITIES[x.severity]}</small><h2>${esc(x.title)}</h2><p>${esc(x.detail)}</p><div class="button-row">${link(x.route,'Revisar registro')}${x.relatedRoute?link(x.relatedRoute,'Ver coincidencia'):''}</div></article>`).join('')||'<p>No hay incidencias con estos filtros.</p>'}</div>`;
}
export async function renderPilot(route){
 if(!['puesta-en-marcha','calidad','diagnostico'].includes(route))return false;
 const s=await readState(),actor=s.patrons.find(p=>p.id===getActorId());
 if(location.hash.slice(1)!==route)return true;
 const main=document.querySelector('#main');
 if(!pilotManager(s,actor)){main.innerHTML='<h1>Acceso no habilitado</h1>';return true;}
 if(route==='puesta-en-marcha'){main.innerHTML=checklist(s);return true;}
 const issues=deriveDataQuality(s),canFix=hasPermission(actor,'holdings.edit',s.grants),copies=s.books.flatMap(b=>b.exemplars||[]);
 main.innerHTML=`<h1>Calidad de datos</h1><p>Diagnóstico local de esta institución. Las sugerencias enriquecen la búsqueda; no son requisitos. Los duplicados requieren revisión humana: nunca se fusionan automáticamente.</p>${link('puesta-en-marcha','Ver preparación para piloto')}<p>${Object.entries(SEVERITIES).map(([key,label])=>`${label}: ${issues.filter(x=>x.severity===key).length}`).join(' · ')}</p><div class="notice-filters"><label>Severidad<select id="quality-severity"><option value="">Todas</option>${Object.entries(SEVERITIES).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label>Tipo de incidencia<select id="quality-type"><option value="">Todos</option>${[...new Map(issues.map(x=>[x.type,x.title])).entries()].map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select></label></div>${canFix?`<section class="panel settings-panel"><h2>Correcciones seguras</h2><p>Exportá un respaldo antes de corregir. Cada lote pide confirmación y queda en el historial. Los códigos existentes se conservan. Los permisos vencidos se cierran mediante la conciliación habitual del sistema.</p><div class="button-row"><button class="button secondary" data-pilot-action="pilot.codes" ${copies.some(e=>!e.internalCode)?'':'disabled'}>Asignar códigos faltantes</button><button class="button secondary" data-pilot-action="pilot.care" ${issues.some(x=>x.type==='care')?'':'disabled'}>Aplicar No prestar</button></div></section>`:''}<p id="pilot-feedback" role="status"></p><div id="quality-results">${issueList(issues)}</div>`;
 if(hasPermission(actor,'catalog.edit',s.grants)||hasPermission(actor,'contents.manage',s.grants)||hasPermission(actor,'topics.manage',s.grants)){const optional=s.books.filter(b=>!b.subjects?.length||!b.contentEntries?.length||!b.description||!b.isbn);main.insertAdjacentHTML('beforeend',`<section class="panel settings-panel"><h2>Enriquecimiento opcional con foto</h2><p>Ayuda para sumar temas, contenidos o identificadores. No son campos obligatorios.</p>${optional.slice(0,30).map(b=>`<p>${esc(b.title)} ${link('asistencia/material/'+b.id,'Asistir con foto')}</p>`).join('')}</section>`);}
 const update=()=>{document.querySelector('#quality-results').innerHTML=issueList(issues,document.querySelector('#quality-severity').value,document.querySelector('#quality-type').value);};
 for(const id of ['quality-severity','quality-type'])document.getElementById(id).onchange=update;
 for(const button of main.querySelectorAll('[data-pilot-action]'))button.onclick=async()=>{
  const action=button.dataset.pilotAction;
  const count=action==='pilot.codes'?copies.filter(e=>!e.internalCode).length:issues.filter(x=>x.type==='care').length;
  const dialog=document.querySelector('#confirm-action');
  document.querySelector('#confirm-title').textContent='Confirmar corrección masiva';
  document.querySelector('#confirm-message').textContent=`${count} ejemplares detectados. ${action==='pilot.codes'?'Se asignarán códigos AB solo a los que no tengan código.':'Se cambiará a No prestar la situación de ejemplares restringidos que figuran disponibles; no se alteran préstamos ni reservas.'} El lote se vuelve a calcular al confirmar. Exportá un respaldo antes de continuar.`;
  document.querySelector('#confirm-accept').textContent='Confirmar corrección';dialog.returnValue='';dialog.showModal();document.querySelector('#confirm-cancel').focus();
  const confirmed=await new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));
  if(!confirmed)return;
  button.disabled=true;
  try{
   if((await readState()).institutionId!==s.institutionId||getActorId()!==actor.id)throw new Error('Cambió la institución o el perfil. Volvé a revisar el diagnóstico.');
   const result=await execute(action,{confirm:true,expectedInstitution:s.institutionId,expectedActor:actor.id});
   if(location.hash.slice(1)===route){await renderPilot(route);document.querySelector('#pilot-feedback').textContent=`${result.count} ejemplar${result.count===1?' corregido':'es corregidos'}. Acción registrada en el historial.`;}
  }catch(e){document.querySelector('#pilot-feedback')?.replaceChildren(document.createTextNode(e.message));button.disabled=false;}
 };
 return true;
}
