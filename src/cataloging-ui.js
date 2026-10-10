import {readState,execute,getActorId,getInstitutionId} from './storage.js?v=20261010-6';
import {canCatalog,QUEUE_LABELS,SESSION_LABELS,classifyCapture,catalogingSummary,planCataloging} from './cataloging.js?v=20261010-6';
import {previewMarc} from './cataloging-import.js?v=20261010-6';
import {lookupISBN} from './metadata.js?v=20261010-6';
import {scanISBN,scanMaterialFromFile,createMaterialDetector} from './scanner.js?v=20261010-6';
import {drawLabel} from './labels.js?v=20261010-6';
import {locationPath} from './inventory.js?v=20261010-6';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const date=v=>new Date(v).toLocaleString('es-AR');
const route=()=>location.hash.slice(1);
const href=(j,suffix='')=>'#jornada-catalogacion/'+j.id+(suffix?'/'+suffix:'');
const feedback=message=>{const el=$('#cataloging-feedback');if(el)el.textContent=message;};
let camera=null,selection=new Set(),selectionSession='',filter='',preview=null,marc=null,refreshApp;
const processing=new Set();let activeLookups=0;
function stopCamera(){camera?.abort();camera=null;const v=$('#cataloging-video');if(v){v.srcObject?.getTracks?.().forEach(t=>t.stop());v.srcObject=null;v.hidden=true;}$('#cataloging-stop')?.setAttribute('hidden','');}

const selectedIds=j=>j.items.filter(i=>selection.has(i.id)&&i.status!=='incorporated').map(i=>i.id);
function stats(j){const s=catalogingSummary(j);return `<div class="cataloging-stats"><span><strong>${s.captures}</strong> códigos capturados</span><span><strong>${s.newEditions}</strong> fichas nuevas</span><span><strong>${s.newCopies}</strong> ejemplares nuevos</span><span><strong>${s.addedCopies}</strong> agregados a ediciones existentes</span><span><strong>${s.duplicatesAvoided}</strong> duplicados evitados</span><span><strong>${s.pending}</strong> pendientes</span><span><strong>${s.missing}</strong> sin metadatos</span><span><strong>${s.invalid}</strong> inválidos</span></div>`;}
function row(s,j,item){
 const c=classifyCapture(s.books,item),book=s.books.find(b=>b.id===c.targetId),draft=book||item.draft||{},done=item.status==='incorporated';
 const recommendation=({'ready-new':'Crear ficha nueva y los ejemplares confirmados.','existing-edition':'Agregar ejemplares; conservar la ficha existente.','same-work':'Confirmar otra edición y su vinculación de obra.',similar:'Comparar; decidir si es una ficha distinta.','metadata-missing':'Completar los datos bibliográficos.','needs-review':c.reason||'Revisar y confirmar los datos.',invalid:'Corregir el código; no se incorporará.',pending:'La captura ya está guardada. La consulta continúa.',incorporated:'Incorporación registrada; no se repetirá.'})[c.status];
 return `<article class="cataloging-item" data-queue-item="${esc(item.id)}" data-status="${c.status}"><label class="cataloging-select"><input type="checkbox" data-select-item="${esc(item.id)}" ${selection.has(item.id)?'checked':''} ${done||j.status!=='open'?'disabled':''} aria-label="Seleccionar ${esc(draft.title||item.isbn||item.raw||'captura ilegible')}"></label><div><span class="eyebrow">${esc(item.isbn||item.raw||'Sin código legible')}</span><h3>${esc(draft.title||'Sin título recuperado')}</h3><p>${esc([draft.author||(draft.authors||[]).join('; '),draft.publisher,draft.year].filter(Boolean).join(' · ')||'Datos pendientes')}</p><strong class="queue-state">${QUEUE_LABELS[c.status]}</strong><p>${esc(recommendation)}</p><small>${item.captureCount} captura${item.captureCount===1?'':'s'} · ${item.quantity} ejemplares detectados / confirmados</small></div><div class="button-row">${!done&&j.status==='open'?`<a class="button secondary" href="${href(j,'revisar/'+item.id)}">Revisar detalle</a>${['metadata-missing','needs-review','invalid'].includes(c.status)?`<a class="button secondary" href="#asistencia/jornada/${esc(j.id)}/${esc(item.id)}">Resolver con foto</a>`:''}`:done?`<a class="button secondary" href="${href(j,'etiquetas')}">Ver etiquetas</a>`:''}</div></article>`;
}
function commonForm(s,j){
 return `<details class="panel cataloging-common"><summary>Aplicar datos comunes a la selección</summary><form id="cataloging-common"><div class="form-grid"><label>Ubicación configurada<select name="locationId"><option value="">No cambiar</option>${s.libraryLocations.map(l=>`<option value="${esc(l.id)}">${esc(locationPath(s.libraryLocations,l.id).map(x=>x.name).join(' · '))}</option>`).join('')}</select></label>${[['location','Ubicación / texto libre'],['sector','Sector'],['shelving','Estantería'],['shelf','Estante']].map(([name,label])=>`<label>${label}<input name="${name}" maxlength="120" placeholder="No cambiar"></label>`).join('')}<label>Condición inicial<select name="condition"><option value="">No cambiar</option>${['Nuevo','Bueno','Regular','Deteriorado'].map(v=>`<option>${v}</option>`).join('')}</select></label><label>Ejemplares por ítem<input name="quantity" type="number" min="0" max="9999" placeholder="No cambiar"></label><label>Política de fichas nuevas<select name="circulationPolicy"><option value="">No cambiar</option><option value="standard">Préstamo normal</option><option value="room-only">Consulta en sala</option><option value="non-renewable">Sin renovación</option></select></label></div><p>Solo afecta ejemplares nuevos. Las fichas existentes conservan su política y sus datos bibliográficos. Dejá vacío lo que no quieras cambiar.</p><button class="button secondary">Aplicar a seleccionados</button></form></details>`;
}
function queue(s,j){
 const items=j.items.filter(i=>!filter||classifyCapture(s.books,i).status===filter);
 return `<section id="cataloging-queue"><div class="section-heading"><h2>Revisar cola</h2><label>Filtrar por estado<select id="cataloging-filter"><option value="">Todos los estados</option>${Object.entries(QUEUE_LABELS).map(([v,label])=>`<option value="${v}" ${v===filter?'selected':''}>${label}</option>`).join('')}</select></label></div>${j.status==='open'?`<div class="button-row"><button class="button secondary" data-cataloging="select-safe">Seleccionar seguros visibles</button><button class="button secondary" data-cataloging="clear-selection">Quitar selección</button><span id="cataloging-selected">${selectedIds(j).length} seleccionados</span></div>${commonForm(s,j)}<button class="button primary" data-cataloging="preview">Incorporar seleccionados</button>`:''}<div class="cataloging-items">${items.map(i=>row(s,j,i)).join('')||'<p>No hay capturas con este filtro.</p>'}</div></section>`;
}
function review(s,j,id){
 const i=j.items.find(i=>i.id===id);if(!i)return '<p>Ítem no encontrado.</p>';
 const c=classifyCapture(s.books,i),draft=c.targetId?s.books.find(b=>b.id===c.targetId):i.draft||{},matches=c.matches;
 return `<a class="button secondary" href="${href(j,'cola')}">Volver a la cola</a><section class="panel"><h2>Revisar captura</h2><p>${esc(QUEUE_LABELS[c.status])} · ${esc(c.reason||'')}</p>${matches.map(m=>`<article class="notice"><strong>${esc(m.book.title)}</strong><p>${esc([m.book.author,m.book.publisher,m.book.year,m.book.isbn].filter(Boolean).join(' · '))}</p><p>${esc(m.reasons.join(' · '))}</p><a href="#ficha/${esc(m.book.id)}">Consultar ficha existente</a></article>`).join('')}<form id="cataloging-review" data-item-id="${esc(i.id)}"><div class="form-grid">${[['isbn','ISBN'],['title','Título'],['author','Autoría'],['publisher','Editorial'],['year','Año'],['edition','Edición']].map(([name,label])=>`<label>${label}<input name="${name}" value="${esc(draft[name]||'')}" ${name==='title'?'required':''} maxlength="${name==='title'?180:1000}"></label>`).join('')}<label>Temas (uno por línea)<textarea name="subjects">${esc((draft.subjects||[]).join('\n'))}</textarea></label><label>Descripción<textarea name="description">${esc(draft.description||'')}</textarea></label><label>Cantidad de ejemplares<input name="quantity" type="number" min="0" max="9999" required value="${i.quantity}"></label><label>Decisión<select name="resolution"><option value="new">${c.status==='existing-edition'?'Conservar ficha existente; agregar ejemplares':'Confirmar como ficha / edición distinta'}</option>${matches.filter(m=>m.kind==='same-work').map(m=>`<option value="${esc(m.book.workId)}">Vincular a la obra: ${esc(m.book.title)}</option>`).join('')}</select></label></div><p>Vincular una obra conserva sus campos compartidos existentes. No fusiona ediciones ni modifica las fichas anteriores. Los registros originales de las fuentes se conservan.</p>${draft.conflicts?.length?`<details open><summary>Diferencias entre fuentes</summary>${draft.conflicts.map(x=>`<p>${esc(x.field)} · ${esc(x.source)}: ${esc(JSON.stringify(x.value))}</p>`).join('')}</details>`:''}<details><summary>Procedencia por campo y fuentes originales</summary><pre>${esc(JSON.stringify({fieldSources:draft.fieldSources||{},sourceRecords:draft.sourceRecords||[]},null,2))}</pre></details><button class="button primary">Confirmar revisión</button></form></section>`;
}
function confirmation(j){
 if(!preview||preview.sessionId!==j.id)return '<p>Volvé a la cola y seleccioná los ítems.</p>';
 const p=preview.plan;return `<section class="panel"><h2>Confirmar incorporación</h2><ul><li>${p.newEditions} fichas nuevas</li><li>${p.newCopies} ejemplares nuevos en total</li><li>${p.addedCopies} ejemplares agregados a fichas existentes</li><li>${p.pending} pendientes sin incorporar</li></ul><p>La incorporación se guarda completa en una transacción. Si algo falla, no se aplica ningún cambio del lote.</p><div class="button-row"><button class="button primary" data-cataloging="commit">Confirmar e incorporar lote</button><a class="button secondary" href="${href(j,'cola')}">Volver a revisar</a></div></section>`;
}
async function labels(s,j){
 const ids=new Set(j.items.flatMap(i=>i.result?.exemplarIds||[])),copies=s.books.flatMap(b=>(b.exemplars||[]).filter(e=>ids.has(e.id)).map(e=>({b,e})));
 return `<section class="cataloging-label-controls"><h2>Etiquetas de esta jornada</h2><p>QR y CODE128 contienen el código local AB. Seleccioná uno o varios ejemplares. Imprimí en A4 al 100%.</p><div class="button-row"><button class="button secondary" data-cataloging="labels-all">Seleccionar todos</button><button class="button secondary" data-cataloging="labels-none">Quitar selección</button><button class="button primary" data-cataloging="print">Imprimir seleccionados</button><a class="button secondary" href="${href(j)}">Volver a jornada</a></div></section><div class="print-labels cataloging-labels">${copies.map(({b,e})=>`<article class="print-label" data-label-code="${esc(e.internalCode)}"><label class="label-choice"><input type="checkbox" data-label-select checked> Imprimir este ejemplar</label><strong>${esc(s.institutions[0]?.name||'Biblioteca')}</strong><span>${esc(b.title.slice(0,70))}</span><small>${esc(e.location||'')}</small><div class="label-qr"></div><svg class="label-bars"></svg><b>${esc(e.internalCode)}</b></article>`).join('')}</div>${!copies.length?'<p>No hay ejemplares incorporados disponibles para etiquetar en esta jornada.</p>':''}`;
}
async function redraw(){if(camera)return;await renderCataloging(route());}
async function refreshQueue(){
 const current=route(),[base,id]=current.split('/');if(base!=='jornada-catalogacion')return;
 const iid=getInstitutionId(),aid=getActorId(),s=await readState(),j=s.catalogingSessions.find(j=>j.id===id);
 if(!j||current!==route()||iid!==getInstitutionId()||aid!==getActorId())return;
 if($('#cataloging-counter'))$('#cataloging-counter').textContent=j.captures.length+' códigos capturados';
 if($('.cataloging-stats'))$('.cataloging-stats').outerHTML=stats(j);
 if($('#cataloging-queue')){const template=document.createElement('template');template.innerHTML=queue(s,j);$('.cataloging-items').replaceWith(template.content.querySelector('.cataloging-items'));if($('#cataloging-selected'))$('#cataloging-selected').textContent=selectedIds(j).length+' seleccionados';}
}
async function processMetadata(){
 if(!route().startsWith('jornada-catalogacion'))return;
 const aid=getActorId(),iid=getInstitutionId(),s=await readState(),j=s.catalogingSessions.find(j=>j.status==='open');
 if(!j||!canCatalog(s,s.patrons.find(p=>p.id===aid)))return;
 for(const item of j.items.filter(i=>i.status==='pending')){
  const key=iid+':'+item.id;if(processing.has(key)||activeLookups>=2)continue;
  processing.add(key);activeLookups++;
  (async()=>{try{const found=await lookupISBN(item.isbn);if(aid===getActorId()&&iid===getInstitutionId())await execute('cataloging.metadata',{sessionId:j.id,itemId:item.id,revision:item.revision,book:found.book,results:found.results});}
   catch(error){if(aid===getActorId()&&iid===getInstitutionId()){try{await execute('cataloging.metadata',{sessionId:j.id,itemId:item.id,revision:item.revision,book:null,results:[{status:'error',message:error.message}]});}catch{}feedback('La captura sigue guardada. '+error.message);}}
   finally{processing.delete(key);activeLookups--;if(aid===getActorId()&&iid===getInstitutionId()){await refreshQueue();processMetadata();}}
  })();
 }
}
export async function renderCataloging(current){
 const [base,id,view,itemId]=current.split('/');if(base!=='jornada-catalogacion')return false;
 const aid=getActorId(),iid=getInstitutionId(),s=await readState(),actor=s.patrons.find(p=>p.id===aid);
 if(current!==route()||aid!==getActorId()||iid!==getInstitutionId())return true;
 if(!canCatalog(s,actor)){$('#main').innerHTML='<h1>Acceso no habilitado</h1>';return true;}
 const j=id?s.catalogingSessions.find(x=>x.id===id):s.catalogingSessions.find(x=>x.status==='open');
 if(!id&&j){location.hash=href(j);return true;}
 if(selectionSession!==j?.id){selection=new Set();filter='';selectionSession=j?.id;preview=null;}
 let html=`<div class="page-heading"><div><span class="eyebrow">CAPTURAR → REVISAR → INCORPORAR</span><h1>Jornada de catalogación</h1><p>La jornada vive en este navegador y dispositivo. Para continuar en otra PC, exportá e importá un respaldo completo desde Configuración con permiso de respaldo.</p></div></div><p id="cataloging-feedback" role="status" aria-live="polite"></p>`;
 if(!j){html+=`<button class="button primary" data-cataloging="start">Iniciar jornada</button>${s.catalogingSessions.slice().reverse().map(x=>`<article class="holding-row"><div><strong>${SESSION_LABELS[x.status]}</strong><p>${date(x.startedAt)} · ${x.captures.length} capturas</p></div><a class="button secondary" href="${href(x)}">Ver resumen y etiquetas</a></article>`).join('')}`;}
 else{
  html+=`<nav class="button-row cataloging-tabs"><a class="button secondary" href="${href(j)}">Capturar</a><a class="button secondary" href="${href(j,'cola')}">Revisar cola</a><a class="button secondary" href="${href(j,'etiquetas')}">Etiquetas</a></nav><p><strong>${SESSION_LABELS[j.status]}</strong> · ${date(j.startedAt)} · Inició ${esc(s.patrons.find(p=>p.id===j.startedBy)?.name||'Persona registrada')}</p>`;
  if(view==='revisar'&&j.status==='open')html+=review(s,j,itemId);
  else if(view==='confirmar'&&j.status==='open')html+=confirmation(j);
  else if(view==='etiquetas')html+=await labels(s,j);
  else{
   
   if(j.status==='open'&&view!=='cola')html+=`<section class="panel cataloging-capture"><h2>Capturar códigos</h2><strong id="cataloging-counter">${j.captures.length} códigos capturados</strong><video id="cataloging-video" hidden playsinline muted></video><div class="button-row"><button class="button primary" data-cataloging="camera">Abrir cámara continua</button><button id="cataloging-stop" class="button secondary" data-cataloging="stop" hidden>Cerrar cámara</button><label class="button secondary">Leer fotografía<input id="cataloging-photo" type="file" accept="image/*" capture="environment" hidden></label></div><p>Retirá el código del encuadre antes de escanear otro ejemplar igual. No se crea ninguna ficha al capturar.</p><form id="cataloging-capture"><label>ISBN · lector USB o teclado<input name="code" autocomplete="off" inputmode="text" maxlength="2000" required placeholder="Escaneá o escribí y presioná Enter"></label><button class="button primary">Agregar a cola</button></form><div class="button-row"><label class="button secondary">Revisar archivo Aguapey / MARC<input id="cataloging-marc" type="file" accept=".iso,.mrc,application/octet-stream" hidden></label></div></section>`;
   html+=stats(j)+queue(s,j);
   if(j.status==='open')html+=`<div class="button-row cataloging-close"><button class="button secondary" data-cataloging="complete">Finalizar jornada</button><button class="button danger" data-cataloging="cancel">Cancelar jornada</button></div>`;
   else html+='<a class="button primary" href="#jornada-catalogacion">Volver a jornadas</a>';
  }
 }
 if(marc?.institutionId===iid&&view!=='revisar')html+=`<section class="panel" id="cataloging-marc-preview"><h2>Vista previa Aguapey / MARC</h2><ul>${Object.entries({records:'Registros detectados',newEditions:'Fichas nuevas propuestas',exactMatches:'Coincidencias exactas',existingISBN:'ISBN ya existentes',newCopies:'Ejemplares nuevos propuestos',conflicts:'Conflictos / similitudes',needsReview:'Necesitan revisión',repeated:'Registros repetidos agrupados'}).map(([key,label])=>`<li>${label}: ${marc.parsed.summary[key]}</li>`).join('')}</ul><p>Este paso solo guarda la cola. Revisá e incorporá después. No se sobrescriben registros del catálogo.</p><button class="button primary" data-cataloging="import-marc">Agregar archivo a la jornada</button><button class="button secondary" data-cataloging="dismiss-marc">Descartar vista previa</button></section>`;
 if(current!==route()||aid!==getActorId()||iid!==getInstitutionId())return true;
 $('#main').innerHTML='<div id="cataloging-root">'+html+'</div>';
 if(view==='etiquetas')for(const host of document.querySelectorAll('[data-label-code]'))await drawLabel(host,host.dataset.labelCode);
 if(j?.status==='open')processMetadata();return true;
}
export async function openMarcCataloging(file){
 if(file.size>25*1024*1024)throw new Error('El archivo ISO supera 25 MB.');
 const iid=getInstitutionId(),s=await readState(),parsed=previewMarc(await file.arrayBuffer(),s.books);
 if(iid!==getInstitutionId())return;
 marc={institutionId:iid,parsed};location.hash='#jornada-catalogacion';if(route()==='jornada-catalogacion')await redraw();
}
async function capture(raw,source='manual'){
 const id=route().split('/')[1];if(!id)throw new Error('Iniciá una jornada primero.');
 await execute('cataloging.capture',{sessionId:id,raw,source});await refreshQueue();feedback('Guardado en cola · seguí escaneando');const input=$('#cataloging-capture input');if(input){input.value='';input.focus();}processMetadata();
}
export function initCatalogingUI(refresh){
 refreshApp=refresh;
 window.addEventListener('hashchange',stopCamera);window.addEventListener('pagehide',stopCamera);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();});
 document.addEventListener('submit',async event=>{
  const form=event.target;if(!form.matches('#cataloging-capture,#cataloging-common,#cataloging-review'))return;event.preventDefault();const button=form.querySelector('button[type=submit],button');if(button.disabled)return;button.disabled=true;
  const sessionId=route().split('/')[1],data=Object.fromEntries(new FormData(form));
  try{
   if(form.matches('#cataloging-capture'))await capture(data.code,'manual');
   else if(form.matches('#cataloging-common')){await execute('cataloging.common',{sessionId,ids:[...selection],common:data});await refreshQueue();feedback('Datos comunes aplicados a la selección.');}
   else{const {quantity,resolution,...fields}=data;fields.subjects=fields.subjects.split('\n').map(x=>x.trim()).filter(Boolean);await execute('cataloging.review',{sessionId,itemId:form.dataset.itemId,quantity,fields,resolution:resolution==='new'?'new':'link-work',workId:resolution==='new'?'':resolution});location.hash='#jornada-catalogacion/'+sessionId+'/cola';}
  }catch(error){feedback(error.message);}finally{button.disabled=false;}
 });
 document.addEventListener('change',async event=>{
  const input=event.target;if(['local-actor','institution-context'].includes(input.id))stopCamera();
  if(input.dataset.selectItem){input.checked?selection.add(input.dataset.selectItem):selection.delete(input.dataset.selectItem);$('#cataloging-selected').textContent=selection.size+' seleccionados';}
  if(input.id==='cataloging-filter'){filter=input.value;await refreshQueue();}
  if(input.hasAttribute('data-label-select'))input.closest('.print-label').classList.toggle('print-excluded',!input.checked);
  try{if(input.id==='cataloging-photo'&&input.files[0]){let raw='',message='';try{raw=await scanMaterialFromFile(input.files[0]);}catch(error){message=error.message;}await capture(raw,'photo');if(message)feedback(message+' Captura marcada como ilegible.');input.value='';}
   if(input.id==='cataloging-marc'&&input.files[0]){stopCamera();await openMarcCataloging(input.files[0]);input.value='';}
  }catch(error){feedback(error.message);}
 });
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-cataloging]');if(!button||button.disabled)return;const action=button.dataset.cataloging;button.disabled=true;
  try{
   const sessionId=route().split('/')[1],s=await readState(),j=s.catalogingSessions.find(x=>x.id===sessionId);
   if(action==='start'){const started=await execute('cataloging.start',{});location.hash=href(started);}
   if(action==='stop')stopCamera();
   if(action==='camera'){
    stopCamera();camera=new AbortController();$('#cataloging-video').hidden=false;$('#cataloging-stop').hidden=false;
    await scanISBN($('#cataloging-video'),{signal:camera.signal,continuous:true,repeatAfterAbsence:true,detectorFactory:createMaterialDetector,accept:v=>Boolean(v),onISBN:raw=>capture(raw,'camera'),onError:error=>{stopCamera();feedback(error.message);}});
   }
   if(action==='select-safe'){for(const i of j.items)if((!filter||classifyCapture(s.books,i).status===filter)&&['ready-new','existing-edition'].includes(classifyCapture(s.books,i).status))selection.add(i.id);await refreshQueue();}
   if(action==='clear-selection'){selection.clear();await refreshQueue();}
   if(action==='preview'){stopCamera();await execute('cataloging.refresh',{sessionId});const fresh=await readState(),current=fresh.catalogingSessions.find(x=>x.id===sessionId);preview={sessionId,ids:selectedIds(current),plan:planCataloging(fresh,current,selectedIds(current)),batchId:crypto.randomUUID()};location.hash=href(j,'confirmar');}
   if(action==='commit'){if(!preview||preview.sessionId!==sessionId)throw new Error('Revisá la selección primero.');await execute('cataloging.incorporate',{sessionId,ids:preview.ids,signature:preview.plan.signature,batchId:preview.batchId});selection.clear();preview=null;location.hash=href(j,'etiquetas');await refreshApp();}
   if(action==='cancel'||action==='complete'){stopCamera();if(confirm(action==='cancel'?'¿Cancelar la jornada? Se conserva la trazabilidad. Las incorporaciones ya realizadas permanecen en el catálogo.':'¿Finalizar la jornada? Los pendientes quedarán conservados sin incorporar.')){await execute('cataloging.'+action,{sessionId,confirmed:true});await redraw();}}
   if(action==='labels-all'||action==='labels-none'){for(const input of document.querySelectorAll('[data-label-select]')){input.checked=action==='labels-all';input.closest('.print-label').classList.toggle('print-excluded',!input.checked);}}
   if(action==='print'){if(!document.querySelector('[data-label-select]:checked'))throw new Error('Seleccioná al menos una etiqueta.');window.print();}
   if(action==='dismiss-marc'){marc=null;await redraw();}
   if(action==='import-marc'){if(marc?.institutionId!==getInstitutionId())throw new Error('Volvé a elegir el archivo.');const current=j?.status==='open'?j:await execute('cataloging.start',{});await execute('cataloging.import',{sessionId:current.id,entries:marc.parsed.entries});marc=null;location.hash=href(current,'cola');await redraw();}
  }catch(error){if(action==='camera')stopCamera();feedback(error.message);}finally{button.disabled=false;}
 });
}
