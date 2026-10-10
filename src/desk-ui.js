import {readState,execute,getActorId} from './storage.js?v=20261010-3';
import {hasPermission,isEnabled,PROFILES} from './permissions.js?v=20261010-3';
import {deskHoldingSnapshot,searchPeople,personOperations} from './daily-operations.js?v=20261010-3';
import {normalizeLoanPolicy,dueDateFromPolicy} from './loan-policy.js?v=20261010-3';
import {careLabel,PHYSICAL_CONDITIONS,CARE_LEVELS,nextWorseCondition} from './condition.js?v=20261010-3';
import {scanISBN} from './scanner.js?v=20261010-3';
import {internalDetector,internalFromPhoto} from './labels.js?v=20261010-3';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const activeReservation=r=>['requested','approved','ready'].includes(r.status);
let scanner=null,currentState=null,selectedPersonId='',refreshCallback=null;

const option=(id,label,selected='')=>`<option value="${esc(id)}" ${id===selected?'selected':''}>${esc(label)}</option>`;
function can(permission){const actor=currentState?.patrons?.find(p=>p.id===getActorId());return hasPermission(actor,permission,currentState?.grants||[]);}
function stopScanner(){scanner?.abort();scanner=null;const v=$('#desk-video');if(v){v.srcObject?.getTracks?.().forEach(t=>t.stop());v.srcObject=null;v.hidden=true;}const stop=$('[data-desk-stop]');if(stop)stop.hidden=true;}
function stateName(copy,snapshot){if(snapshot?.loan)return Date.parse(snapshot.loan.dueAt)<Date.now()?'Vencido':'Prestado';if(snapshot?.assigned)return 'Reservado';if(copy.status==='damaged'||copy.careLevel==='restricted')return 'No prestar';if(copy.status==='lost')return 'Extraviado';if(copy.status==='withdrawn')return 'Dado de baja';return 'Disponible';}
function personResult(x){
  const p=x.person;
  return `<button type="button" class="desk-person-result" data-desk-person="${esc(p.id)}"><span><strong>${esc(p.name)}</strong><small>${esc([p.cargo,PROFILES[p.accessProfile],p.course].filter(Boolean).join(' · '))}</small></span><span>${x.activeLoans} préstamos${x.overdueLoans?` · ${x.overdueLoans} vencidos`:''}</span></button>`;
}
function personSummary(state,id){
  const info=personOperations(state,id);if(!info)return '';
  return `<section class="desk-person-card"><div><span class="eyebrow">PERSONA SELECCIONADA</span><strong>${esc(info.person.name)}</strong><small>${esc([info.person.cargo,info.person.course,PROFILES[info.person.accessProfile]].filter(Boolean).join(' · '))}</small></div><div><b>${info.activeLoans.length}</b><span>préstamos activos</span></div><div><b>${info.overdue.length}</b><span>vencidos</span></div></section>`;
}
function reservationActions(state,snapshot){
  if(!can('reservations.manage'))return '';
  const {book,copy}=snapshot,waiting=(state.reservations||[]).filter(r=>r.bookId===book.id&&['requested','approved'].includes(r.status)&&!r.exemplarId);
  if(!waiting.length)return '';
  return `<section class="desk-subsection"><h3>Reservas esperando ejemplar</h3>${waiting.slice(0,6).map(r=>`<article class="desk-reservation-row"><div><strong>${esc(r.patron?.name||'Persona')}</strong><small>${r.status==='requested'?'Solicitada':'Aprobada'} · ${esc(book.title)}</small></div><button class="button secondary" data-desk-reservation-assign="${esc(r.id)}" data-copy="${esc(copy.id)}">Asignar este ejemplar</button></article>`).join('')}</section>`;
}
function returnForm(snapshot){
  const loan=snapshot.loan,copy=snapshot.copy;if(!loan||!can('circulation.return'))return '';
  const base=loan.conditionAtLoan||copy.condition||'Bueno',worse=nextWorseCondition(base);
  return `<section class="desk-action-panel"><div><span class="eyebrow">DEVOLUCIÓN</span><h2>${esc(loan.patron?.name||'Persona')}</h2><p>Salió en estado <strong>${esc(base)}</strong> · devolución prevista ${new Date(loan.dueAt).toLocaleDateString('es-AR')}${Date.parse(loan.dueAt)<Date.now()?' · VENCIDO':''}</p></div><form id="desk-return-form"><input type="hidden" name="id" value="${esc(loan.id)}"><input type="hidden" name="worsenedExplicit" value="false"><input type="hidden" name="status" value="available"><div class="return-presets"><button type="button" class="button secondary" data-desk-return-preset="same" data-condition="${esc(base)}" data-care="${esc(loan.careLevelAtLoan||copy.careLevel||'normal')}">Sin cambios</button><button type="button" class="button secondary" data-desk-return-preset="worse" data-condition="${esc(worse)}">Volvió peor</button><button type="button" class="button secondary" data-desk-return-preset="careful">Usar con cuidado</button><button type="button" class="button secondary" data-desk-return-preset="restricted">No prestar</button></div><div class="desk-form-grid"><label>Estado físico<select name="condition">${PHYSICAL_CONDITIONS.map(v=>option(v,v,copy.condition||base)).join('')}</select></label><label>Cuidado<select name="careLevel">${CARE_LEVELS.map(v=>option(v,careLabel(v),copy.careLevel||'normal')).join('')}</select></label></div><label>Observación<input name="note" maxlength="1200" placeholder="Opcional"></label><button class="button primary">Registrar devolución</button></form></section>`;
}
function loanForm(state,snapshot){
  if(snapshot.loan||!can('circulation.loan'))return '';
  const assigned=snapshot.assigned;
  if(assigned?.status==='ready'){
    const p=state.patrons.find(x=>x.id===assigned.patron?.id),policy=normalizeLoanPolicy(state.settings?.find(x=>x.id==='local')?.policy||{}),due=p?dueDateFromPolicy(policy,p):null;
    return `<section class="desk-action-panel"><span class="eyebrow">RESERVA LISTA PARA RETIRAR</span><h2>${esc(assigned.patron?.name||'Persona')}</h2><p>${esc(snapshot.book.title)} · devolver ${due?due.toLocaleDateString('es-AR'):'según política institucional'}</p><form id="desk-loan-form"><input type="hidden" name="exemplarId" value="${esc(snapshot.copy.id)}"><input type="hidden" name="patronId" value="${esc(assigned.patron.id)}"><input type="hidden" name="reservationId" value="${esc(assigned.id)}"><button class="button primary">Entregar y registrar préstamo</button></form></section>`;
  }
  if(assigned)return `<section class="notice"><strong>Este ejemplar está reservado.</strong><p>${esc(assigned.patron?.name||'Persona')} · estado ${esc(assigned.status)}.</p></section>`;
  return `<section class="desk-action-panel"><span class="eyebrow">PRÉSTAMO RÁPIDO</span><h2>¿Quién retira este ejemplar?</h2><label class="desk-person-search">Buscar persona<input id="desk-person-query" type="search" autocomplete="off" placeholder="Nombre, cargo o curso"></label><div id="desk-person-results" class="desk-person-results"></div><div id="desk-person-selected"></div><form id="desk-loan-form"><input type="hidden" name="exemplarId" value="${esc(snapshot.copy.id)}"><input type="hidden" name="patronId" value=""><button class="button primary" disabled>Confirmar préstamo</button></form></section>`;
}
function holdingCard(state,snapshot){
  const {book,copy,loan,assigned}=snapshot;
  return `<section class="desk-holding"><div class="desk-holding-main"><span class="eyebrow">${esc(copy.internalCode)}</span><h2>${esc(book.title)}</h2><p>${esc(book.author||book.publication||'Responsable no informado')}</p><div class="desk-pills"><span>${esc(stateName(copy,snapshot))}</span><span>${esc(copy.condition||'Bueno')}</span><span>${esc(careLabel(copy.careLevel||'normal'))}</span></div><small>${esc(copy.location||'Ubicación pendiente')}</small></div><div class="desk-holding-actions"><a class="button secondary" href="#ficha/${esc(book.id)}/${esc(copy.id)}">Abrir ficha</a>${can('holdings.edit')?`<button class="button secondary" data-desk-condition="careful" data-copy="${esc(copy.id)}">Usar con cuidado</button><button class="button secondary" data-desk-condition="restricted" data-copy="${esc(copy.id)}">No prestar</button>`:''}</div></section>${loan?returnForm(snapshot):loanForm(state,snapshot)}${reservationActions(state,snapshot)}${assigned?.status==='approved'&&can('reservations.manage')?`<button class="button secondary" data-desk-reservation-ready="${esc(assigned.id)}">Marcar reserva lista para retirar</button>`:''}`;
}
function reservationQueue(state){
  if(!can('reservations.manage'))return '';
  const active=(state.reservations||[]).filter(activeReservation).slice().sort((a,b)=>Date.parse(a.requestedAt||0)-Date.parse(b.requestedAt||0));
  if(!active.length)return '';
  return `<section class="desk-queue"><div class="section-heading"><div><span class="eyebrow">COLA OPERATIVA</span><h2>Reservas</h2></div><a class="button secondary" href="#reservas">Ver todas</a></div>${active.slice(0,12).map(r=>{const b=state.books.find(x=>x.id===r.bookId),copy=b?.exemplars?.find(e=>e.id===r.exemplarId);return `<article><div><strong>${esc(b?.title||r.title||'Material')}</strong><small>${esc(r.patron?.name||'Persona')} · ${esc(({requested:'Solicitada',approved:'Asignada',ready:'Lista para retirar'})[r.status]||r.status)}${r.expiresAt?' · hasta '+new Date(r.expiresAt).toLocaleDateString('es-AR'):''}</small></div>${copy?`<a class="button secondary" href="#mostrador/${esc(copy.internalCode)}">${r.status==='ready'?'Entregar':'Abrir ejemplar'}</a>`:''}</article>`;}).join('')}</section>`;
}

export async function renderDesk(route){
  const [base,code]=route.split('/');if(base!=='mostrador')return false;
  stopScanner();currentState=await readState();selectedPersonId='';const currentCode=decodeURIComponent(code||'').toUpperCase();
  const actor=currentState.patrons.find(p=>p.id===getActorId());
  if(!actor||!isEnabled(actor)||!['circulation.loan','circulation.return','reservations.manage','holdings.edit'].some(p=>hasPermission(actor,p,currentState.grants||[]))){
    $('#main').innerHTML='<h1>Acceso no habilitado</h1><p>Este perfil no tiene permisos operativos para el mostrador.</p>';return true;
  }
  const snapshot=currentCode?deskHoldingSnapshot(currentState,currentCode):null;
  $('#main').innerHTML=`<div class="page-heading"><div><span class="eyebrow">OPERACIÓN DIARIA</span><h1>Mostrador</h1><p class="muted">Escaneá un ejemplar y resolvé la operación sin recorrer formularios largos.</p></div></div><section class="desk-scan panel"><form id="desk-scan-form"><label>Código interno AB<input name="code" value="${esc(currentCode)}" placeholder="AB-000001" autocomplete="off" required></label><button class="button primary">Buscar ejemplar</button></form><div class="button-row"><button class="button primary" data-desk-camera>Abrir cámara</button><label class="button secondary">Leer foto<input id="desk-photo" type="file" accept="image/*" capture="environment" hidden></label></div><video id="desk-video" hidden playsinline muted></video><button class="button secondary" data-desk-stop hidden>Cerrar cámara</button><p id="desk-feedback" role="status">${currentCode&&!snapshot?'No existe un ejemplar local con ese código.':''}</p></section>${snapshot?holdingCard(currentState,snapshot):currentCode?'<section class="notice"><strong>Código no encontrado</strong><p>No se creó ningún ejemplar. Revisá la etiqueta o buscá otro código.</p></section>':'<section class="desk-empty"><strong>Listo para escanear</strong><p>Usá la cámara del celular, un lector USB o escriní el código AB.</p></section>'}${reservationQueue(currentState)}`;
  return true;
}
async function rerender(){await renderDesk(location.hash.slice(1)||'mostrador');refreshCallback?.();}
export function initDeskUI(onRefresh){refreshCallback=onRefresh;
  document.addEventListener('submit',async e=>{
    if(e.target.id==='desk-scan-form'){e.preventDefault();const code=new FormData(e.target).get('code');location.hash='#mostrador/'+encodeURIComponent(String(code||'').trim().toUpperCase());return;}
    if(e.target.id==='desk-loan-form'){e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(!d.patronId)return;const b=e.target.querySelector('button');b.disabled=true;try{await execute('loan.create',d);location.hash='#mostrador';await rerender();$('#desk-feedback').textContent='Préstamo registrado. Escaneá el siguiente ejemplar.';}catch(err){$('#desk-feedback').textContent=err.message;b.disabled=false;}return;}
    if(e.target.id==='desk-return-form'){e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const b=e.target.querySelector('button');b.disabled=true;try{await execute('loan.return',d);location.hash='#mostrador';await rerender();$('#desk-feedback').textContent='Devolución registrada. Escaneá el siguiente ejemplar.';}catch(err){$('#desk-feedback').textContent=err.message;b.disabled=false;}return;}
  });
  document.addEventListener('input',e=>{if(e.target.id==='desk-person-query'){const host=$('#desk-person-results');if(host)host.innerHTML=searchPeople(currentState,e.target.value,{limit:10}).map(personResult).join('');}});
  document.addEventListener('change',async e=>{if(e.target.id==='desk-photo'&&e.target.files?.[0]){try{const value=await internalFromPhoto(e.target.files[0]);location.hash='#mostrador/'+encodeURIComponent(value);}catch(err){$('#desk-feedback').textContent=err.message;}finally{e.target.value='';}}});
  document.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-desk-stop')){stopScanner();return;}
    if(b.hasAttribute('data-desk-camera')){stopScanner();scanner=new AbortController();const video=$('#desk-video');video.hidden=false;$('[data-desk-stop]').hidden=false;try{await scanISBN(video,{signal:scanner.signal,detectorFactory:internalDetector,accept:v=>/^AB-\d{6,}$/.test(v),onISBN:code=>{stopScanner();location.hash='#mostrador/'+encodeURIComponent(code);},onError:err=>{$('#desk-feedback').textContent=err.message;}});}catch(err){$('#desk-feedback').textContent=err.message;}return;}
    if(b.dataset.deskPerson){selectedPersonId=b.dataset.deskPerson;$('#desk-person-selected').innerHTML=personSummary(currentState,selectedPersonId);$('#desk-loan-form [name=patronId]').value=selectedPersonId;$('#desk-loan-form button').disabled=false;$('#desk-person-results').innerHTML='';return;}
    if(b.dataset.deskReturnPreset){const form=b.closest('form'),condition=form.querySelector('[name=condition]'),care=form.querySelector('[name=careLevel]'),status=form.querySelector('[name=status]'),explicit=form.querySelector('[name=worsenedExplicit]');if(b.dataset.deskReturnPreset==='same'){condition.value=b.dataset.condition;care.value=b.dataset.care||'normal';status.value='available';explicit.value='false';}if(b.dataset.deskReturnPreset==='worse'){condition.value=b.dataset.condition;care.value='careful';status.value='available';explicit.value='true';}if(b.dataset.deskReturnPreset==='careful'){care.value='careful';status.value='available';explicit.value='false';}if(b.dataset.deskReturnPreset==='restricted'){care.value='restricted';status.value='damaged';explicit.value='false';}return;}
    if(b.dataset.deskCondition){b.disabled=true;try{await execute('copy.condition.quick',{id:b.dataset.copy,action:b.dataset.deskCondition});await rerender();}catch(err){$('#desk-feedback').textContent=err.message;b.disabled=false;}return;}
    if(b.dataset.deskReservationAssign){b.disabled=true;try{await execute('reservation.transition',{id:b.dataset.deskReservationAssign,status:'approved',exemplarId:b.dataset.copy});await rerender();}catch(err){$('#desk-feedback').textContent=err.message;b.disabled=false;}return;}
    if(b.dataset.deskReservationReady){b.disabled=true;try{await execute('reservation.transition',{id:b.dataset.deskReservationReady,status:'ready'});await rerender();}catch(err){$('#desk-feedback').textContent=err.message;b.disabled=false;}return;}
  });
}
