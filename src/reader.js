import {hasPermission} from './permissions.js?v=20261010-6';
import {activeLoan,activeReservation,config} from './local-domain.js?v=20261010-6';
import {renewalRequestStatus} from './loan-policy.js?v=20261010-6';

export const operationalProfile=actor=>Boolean(actor?.mainAdmin||['biblioteca','autoridad'].includes(actor?.accessProfile));
export const reservationLabels={requested:'Solicitada',approved:'Aprobada',ready:'Lista para retirar',expired:'Vencida',cancelled:'Cancelada',collected:'Retirada'};
export const renewalLabels={pending:'Pendiente de autorización',approved:'Aprobada',rejected:'Rechazada'};
export const renewalReasons={inactive:'Este préstamo ya finalizó.',disabled:'La institución no habilitó extensiones.',material:'Este material no admite renovación.',limit:'Alcanzaste el límite de renovaciones.',pending:'Tu solicitud está pendiente de autorización.',overdue:'El préstamo está vencido. Consultá a Biblioteca.',reserved:'Otra persona está esperando este material.','too-early':'Podés pedir la extensión más cerca de la fecha de devolución.'};
const historyNames={'loan.created':'Préstamo registrado','loan.returned':'Devolución registrada','loan.renewal.requested':'Extensión solicitada','loan.renewal.approved':'Extensión aprobada','loan.renewal.rejected':'Extensión rechazada','reservation.requested':'Reserva solicitada','reservation.approved':'Reserva aprobada','reservation.ready':'Reserva lista para retirar','reservation.expired':'Reserva vencida','reservation.cancelled':'Reserva cancelada','reservation.collected':'Reserva retirada'};

// Input is the current institution's state. Ownership is determined by patron,
// never by the operator who registered an event. Return no third-party payloads.
export function personalLibrary(state,actor){
 const permitted=hasPermission(actor,'catalog.view',state.grants||[]),id=permitted?actor.id:null;
 const loans=id?(state.loans||[]).filter(l=>l.patron?.id===id):[];
 const reservations=id?(state.reservations||[]).filter(r=>r.patron?.id===id):[];
 const loanIds=new Set(loans.map(l=>l.id)),reservationIds=new Set(reservations.map(r=>r.id));
 const books=permitted?state.books||[]:[];
 const savedIds=new Set(id?(state.saved||[]).filter(x=>x.personId===id).map(x=>x.bookId):[]);
 const history=(state.activity||[]).filter(e=>historyNames[e.type]&&(e.type.startsWith('loan.')?loanIds.has(e.loanId):reservationIds.has(e.reservationId))).map(e=>{
  const record=e.type.startsWith('loan.')?loans.find(l=>l.id===e.loanId):reservations.find(r=>r.id===e.reservationId);
  return {id:e.id,label:historyNames[e.type],createdAt:e.createdAt,bookId:books.some(b=>b.id===record.bookId)?record.bookId:null,title:books.find(b=>b.id===record.bookId)?.title||record.title||'Material retirado del catálogo'};
 }).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 return {loans,reservations,activeLoans:loans.filter(activeLoan),activeReservations:reservations.filter(activeReservation),saved:books.filter(b=>savedIds.has(b.id)),recommendations:permitted?(state.recommendations||[]).filter(r=>r.status==='active'&&books.some(b=>b.id===r.bookId)):[],history};
}

export function materialActions(state,actor,book){
 const own=personalLibrary(state,actor),loan=own.activeLoans.find(l=>l.bookId===book.id),reservation=own.activeReservations.find(r=>r.bookId===book.id);
 const policy=config(state).policy||{};
 let reason='';
 if(!hasPermission(actor,'reservations.create',state.grants||[]))reason='Tu perfil no tiene habilitadas las reservas.';
 else if(policy.allowReservations===false)reason='La institución no habilitó las reservas.';
 else if(reservation)reason='Ya tenés una reserva de este material.';
 else if(loan)reason='Ya tenés este material en préstamo.';
 else if(book.circulationPolicy==='room-only')reason='Solo consulta en sala. Consultá a Biblioteca.';
 else if(!(book.exemplars||[]).some(e=>!['lost','withdrawn'].includes(e.status)))reason='No hay ejemplares físicos habilitados para reservar.';
 return {loan,reservation,saved:own.saved.some(b=>b.id===book.id),canReserve:!reason,reservationReason:reason,renewal:loan?renewalRequestStatus(loan,policy,{book,reservations:state.reservations}):null};
}

// Keep basic navigation short; every extra entry requires its own capability.
export function readerNavigation(route,actor,can){
 if(operationalProfile(actor))return true;
 if(['inicio','biblioteca','mi-biblioteca','guardados','avisos'].includes(route))return true;
 const grants={'jornada-catalogacion':['catalog.create','holdings.create'],agregar:['catalog.create'],ejemplares:['holdings.create','holdings.edit','inventory.manage'],mostrador:['circulation.loan','circulation.return','reservations.manage','holdings.edit'],circulacion:['circulation.loan','circulation.return','circulation.renew.approve'],reservas:['reservations.manage'],usuarios:['users.manage','people.invite','people.validate','profiles.manage'],organizacion:['institution.edit','library.configure','policy.configure'],coleccion:['collection.needs.manage','recommendations.manage','resource.sharing.manage'],interoperabilidad:['catalog.create'],inventario:['inventory.manage','holdings.create','holdings.edit'],atencion:['holdings.edit','inventory.manage'],etiquetas:['inventory.manage'],actividad:['reports.view','institution.stats'],configuracion:['library.configure','sensitive.export','catalog.clear']};
 return (grants[route]||[]).some(can);
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('es-AR'):'Sin fecha registrada';
const link=b=>`<a href="#ficha/${esc(b.id)}">${esc(b.title)}</a>`;
const titleLink=(s,record)=>{const b=s.books.find(b=>b.id===record.bookId);return b?link(b):esc(record.title||'Material retirado del catálogo');};
const section=(id,title,body)=>`<section class="panel reader-section" id="${id}"><h2>${title}</h2>${body}</section>`;
export function renderRenewal(loan,status){
 const request=loan.renewalRequest;
 return `${request?`<p>Solicitud de extensión: <strong>${esc(renewalLabels[request.status]||request.status)}</strong>${request.status==='approved'?' · nueva devolución '+date(loan.dueAt):''}</p>`:''}${status.allowed?`<button class="button secondary" data-reader-command="loan.renew.request" data-id="${esc(loan.id)}">Solicitar extensión</button>`:`<p class="muted">${esc(renewalReasons[status.reason]||'Consultá a Biblioteca.')}</p>`}`;
}
export function renderMaterialActions(state,actor,book){
 const a=materialActions(state,actor,book);
 return `<section class="reader-material" aria-label="Mi actividad con este material"><p id="reader-feedback" role="status"></p><div class="button-row"><button class="button secondary" data-reader-command="saved.toggle" data-book-id="${esc(book.id)}" aria-pressed="${a.saved}">${a.saved?'Quitar de guardados':'Guardar material'}</button>${a.canReserve?`<button class="button primary" data-reader-command="reservation.create" data-book-id="${esc(book.id)}">Reservar material</button>`:''}</div>${a.reservation?`<p>Tu reserva: <strong>${esc(reservationLabels[a.reservation.status])}</strong>${a.reservation.status==='ready'&&a.reservation.expiresAt?' · Retirá hasta '+date(a.reservation.expiresAt):''}. <a href="#mis-reservas">Ver mis reservas</a></p>`:!a.canReserve?`<p>${esc(a.reservationReason)}</p>`:''}${a.loan?`<p><strong>Lo tenés en préstamo</strong> · Devolver ${date(a.loan.dueAt)}</p>${renderRenewal(a.loan,a.renewal)}`:''}${book.circulationPolicy==='non-renewable'?'<p>Préstamo sin renovación.</p>':''}</section>`;
}
export function renderSaved(state,actor){
 const saved=personalLibrary(state,actor).saved;
 return saved.length?saved.map(b=>`<article class="holding-row"><strong>${link(b)}</strong><button class="button secondary" data-reader-command="saved.toggle" data-book-id="${esc(b.id)}">Quitar de guardados</button></article>`).join(''):'<p>Todavía no guardaste materiales disponibles en el catálogo. Podés guardarlos desde su ficha.</p><a class="button secondary" href="#biblioteca">Buscar materiales</a>';
}
export function renderRecommendations(state,actor){
 const recs=personalLibrary(state,actor).recommendations;
 return recs.length?`<div class="recommendation-grid">${recs.map(r=>`<article><strong>${link(state.books.find(b=>b.id===r.bookId))}</strong>${r.audience?`<p>${esc(r.audience)}</p>`:''}<p>${esc(r.reason||'Recomendado por la biblioteca.')}</p></article>`).join('')}</div>`:'<p>Biblioteca todavía no publicó recomendaciones activas.</p>';
}
export function renderPersonalLibrary(state,actor,view='mi-biblioteca'){
 const own=personalLibrary(state,actor),policy=config(state).policy||{};
 const loans=own.activeLoans.map(l=>{const book=state.books.find(b=>b.id===l.bookId),late=Date.parse(l.dueAt)<Date.now();return `<article class="holding-row" data-personal-loan="${esc(l.id)}" data-overdue="${late}"><div><strong>${titleLink(state,l)}</strong><p>${late?'<strong>Vencido</strong> · ':''}Devolver ${date(l.dueAt)}</p>${renderRenewal(l,renewalRequestStatus(l,policy,{book,reservations:state.reservations}))}</div></article>`;}).join('')||'<p>No tenés préstamos activos.</p>';
 const reservations=own.reservations.slice().reverse().map(r=>`<article class="holding-row" data-personal-reservation="${esc(r.id)}"><div><strong>${titleLink(state,r)}</strong><p>${esc(reservationLabels[r.status]||r.status)}${r.status==='ready'&&r.expiresAt?' · Retirá hasta '+date(r.expiresAt):''}</p></div></article>`).join('')||'<p>No tenés reservas registradas.</p>';
 const returned=own.loans.filter(l=>l.returnedAt||l.status==='returned').map(l=>`<article class="holding-row"><div><strong>${titleLink(state,l)}</strong><p>Devuelto · ${date(l.returnedAt)}</p></div></article>`).join('')||'<p>No tenés devoluciones registradas.</p>';
 const history=own.history.length?`<ol class="reader-history">${own.history.map(e=>`<li><strong>${esc(e.label)}</strong> · ${esc(e.title)} <time>${date(e.createdAt)}</time></li>`).join('')}</ol>`:'<p>Todavía no hay movimientos personales registrados.</p>';
 const heading=({'mis-prestamos':'Mis préstamos','mis-reservas':'Mis reservas',guardados:'Materiales guardados'})[view]||'Mi biblioteca';
 let html=`<div class="page-heading" data-reader-view="${view}"><div><span class="eyebrow">TU ACTIVIDAD</span><h1>${heading}</h1><p>Préstamos, reservas y guardados de tu perfil en esta institución.</p></div></div><p id="reader-feedback" role="status"></p><nav class="button-row reader-tabs" aria-label="Mi biblioteca"><a class="button secondary" href="#mi-biblioteca">Mi biblioteca</a><a class="button secondary" href="#mis-prestamos">Mis préstamos</a><a class="button secondary" href="#mis-reservas">Mis reservas</a><a class="button secondary" href="#guardados">Guardados</a></nav>`;
 if(view==='mis-prestamos')return html+section('mis-prestamos','Préstamos activos',loans)+section('mis-devoluciones','Devoluciones',returned);
 if(view==='mis-reservas')return html+section('mis-reservas','Mis reservas',reservations);
 if(view==='guardados')return html+section('mis-guardados','Guardados',renderSaved(state,actor));
 return html+section('mis-prestamos','Mis préstamos',loans)+section('mis-reservas','Mis reservas',reservations)+section('mis-guardados','Guardados',renderSaved(state,actor))+section('mis-recomendaciones','Recomendados por la biblioteca',renderRecommendations(state,actor))+section('mis-devoluciones','Devoluciones',returned)+section('mi-historial','Mi historial',history);
}
