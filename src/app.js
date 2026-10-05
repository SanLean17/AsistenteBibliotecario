import { localizeBook } from './subjects.js?v=20261005-1';
import { preparePhoto, validPhotoURL } from './photos.js?v=20261004-2';
import { lookupISBN, safeCover, OFFICIAL_CATALOGS } from './metadata.js?v=20261005-1';
import { scanISBN, scanISBNFromFile } from './scanner.js?v=20261005-1';
import { canonicalISBN, cleanISBN } from './isbn.js?v=20261005-1';
import { categories, searchBooks, validateBook, parseArchive } from './catalog.js?v=20261005-2';
import { openDatabase, getBooks, saveBook, deleteBook, clearCatalog, mergeBooks, getPhotos, savePhoto } from './storage.js?v=20261005-2';

const $=s=>document.querySelector(s);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let books=[],ready=false,query='',category='',lookupController,scanController,lookupVersion=0,draft=null,detailPhotos=[],photoTarget=null,toastTimer;
const readBooks=async()=> (await getBooks()).map(localizeBook);
const route=()=>location.hash.slice(1)||'inicio';
const routeBase=()=>route().split('/')[0];

function notify(message){$('#toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').textContent='',5000);}
function storageMessage(error){
  if(error?.name==='QuotaExceededError')return 'No hay espacio disponible para guardar. Exportá un respaldo y liberá espacio en el dispositivo. La ficha sigue aquí para reintentar.';
  if(['InvalidStateError','SecurityError','UnknownError'].includes(error?.name))return 'El almacenamiento del navegador no está disponible. Conservamos la ficha en pantalla: revisá los permisos y volvé a intentar.';
  return error?.message||'No se pudo guardar. La ficha sigue en pantalla para reintentar.';
}
function confirmAction(title,message,label='Eliminar definitivamente'){
  const dialog=$('#confirm-action');$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-accept').textContent=label;
  dialog.returnValue='';dialog.showModal();$('#confirm-cancel').focus();
  return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}));
}
function dangerZone(title,message,button){return `<section class="danger-zone"><h2>Zona de peligro</h2><div class="danger-row"><div><h3>${title}</h3><p>${message}</p></div>${button}</div></section>`;}
function renderSettings(){
  $('#main').innerHTML=`<div class="page-heading"><div><span class="eyebrow">TU ESPACIO DE TRABAJO</span><h1>Configuración</h1><p class="muted">Cuidá el catálogo de tu biblioteca y elegí cómo trabajar.</p></div></div><section class="panel settings-panel"><h2>Una copia, mucha tranquilidad.</h2><p>Los registros y las fotos se guardan en este navegador. Exportá un respaldo antes de cambiar de dispositivo o borrar datos.</p><div class="button-row"><button class="button primary" data-action="export">Exportar respaldo</button><button class="button secondary" data-action="import">Importar respaldo</button><button class="button secondary" data-action="theme">Cambiar tema claro / oscuro</button></div></section>${dangerZone('Vaciar el catálogo de este dispositivo','Se eliminarán todos los registros, ejemplares y fotografías guardados en este navegador. Esta acción no se puede deshacer. Exportá primero un respaldo.',`<button class="button danger" data-action="clear-catalog" ${books.length?'':'disabled'}>Vaciar catálogo</button>`)}`;
}
function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem('ab-theme',theme);}catch{}document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0A112F':'#EBF3FF');}
let savedTheme;try{savedTheme=localStorage.getItem('ab-theme');}catch{}
setTheme(savedTheme|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));

function cover(book){
  const url=safeCover(book.cover);
  if(url)return `<div class="cover real-cover"><img src="${escape(url)}" alt="Portada de ${escape(book.title)}" loading="lazy" referrerpolicy="no-referrer"><span class="cover-fallback" hidden>Portada no disponible</span></div>`;
  const color=[...String(book.title||'')].reduce((n,c)=>n+c.charCodeAt(0),0)%4;
  return `<div class="cover" data-color="${color}"><small>${escape(book.category||'Material')}</small><strong>${escape(book.title||'Sin título')}</strong><span>AB</span></div>`;
}
function subjectChips(book,limit=5){
  const topics=book.subjects||[];
  if(!topics.length)return '';
  return `<div class="subject-chips">${topics.slice(0,limit).map(t=>`<span>${escape(t)}</span>`).join('')}${topics.length>limit?`<span class="more-chip">+${topics.length-limit}</span>`:''}</div>`;
}
function cards(list){
  return `<div class="book-grid">${list.map(b=>`<a class="book-card" href="#ficha/${escape(b.id)}">${cover(b)}<h3>${escape(b.title)}</h3><p>${escape(b.author||'Autor no informado')}</p><div class="book-meta"><span>${escape(b.category)}</span><span>${b.copies} ej.</span></div></a>`).join('')}</div>`;
}
function empty(filtered=false){
  return `<div class="empty"><div class="empty-symbol">▥</div><h3>${filtered?'No se encontraron resultados':'El próximo capítulo empieza acá.'}</h3><p>${filtered?'Probá con otro título, autor, ISBN, tema o contenido.':'Sumá el primer libro de la biblioteca. Escaneá su ISBN o completá una ficha: cada historia cuenta.'}</p><a class="button primary" href="${filtered?'#biblioteca':'#agregar'}">${filtered?'Volver al catálogo':'Incorporar material'}</a></div>`;
}
function updateNav(){
  document.querySelectorAll('[data-nav]').forEach(el=>{const active=el.dataset.nav===routeBase()||(el.dataset.nav==='biblioteca'&&['ficha','editar'].includes(routeBase()));el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
}
function render(){
  updateNav();
  if(!ready)return;
  window.scrollTo(0,0);
  cancelLookup();
  const current=route();
  if(current==='biblioteca')return renderLibrary();
  if(current==='agregar')return renderAdd();
  if(current==='configuracion')return renderSettings();
  if(current.startsWith('ficha/'))return renderDetail(current.split('/')[1]);
  if(current.startsWith('editar/'))return renderEditor(current.split('/')[1]);
  renderHome();
}
function renderHome(){
  const recent=[...books].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);
  $('#main').innerHTML=`
    <section class="hero"><div class="hero-copy"><span class="eyebrow">BIBLIOTECAS CON FUTURO</span><h1>Más historias.<br>Menos <span class="highlight">vueltas.</span></h1><p>Una biblioteca que se mueve con vos. Catalogá, encontrá y cuidá cada ejemplar, con más tiempo para conectar lectores e historias.</p><div class="button-row"><a class="button primary" href="#agregar">Incorporar material <span aria-hidden="true">↗</span></a><a class="button secondary" href="#biblioteca">Explorar catálogo</a></div><div class="hero-footnote"><span aria-hidden="true"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 3v94M3 50h94M17 17l66 66M17 83l66-66" fill="none" stroke="currentColor" stroke-width="5"/></svg></span> Tu colección. Nuevas posibilidades.</div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-star"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 3v94M3 50h94M17 17l66 66M17 83l66-66" fill="none" stroke="currentColor" stroke-width="5"/></svg></span><span class="art-spark">✦</span><div class="art-book book-blue"><span>IDEAS<br>QUE<br>VUELAN.</span><i>↗</i></div><div class="art-book book-pink"><small>BIBLIOTECA VIVA / 01</small><strong>Todo un<br>mundo<br>por abrir.</strong><span><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 3v94M3 50h94M17 17l66 66M17 83l66-66" fill="none" stroke="currentColor" stroke-width="5"/></svg></span></div><div class="art-tag">Una historia lleva a otra ↗</div></div></section>
    <section class="stats"><div class="stat"><span class="stat-icon">▥</span><div><strong>${books.length}</strong><small>Registros bibliográficos</small></div></div><div class="stat"><span class="stat-icon">▤</span><div><strong>${books.reduce((n,b)=>n+b.copies,0)}</strong><small>Ejemplares físicos</small></div></div><div class="stat"><span class="stat-icon">☷</span><div><strong>${books.reduce((n,b)=>n+(b.contents?.length||0),0)}</strong><small>Contenidos indexados</small></div></div></section>
    <section><div class="section-heading"><div><h2>Incorporaciones recientes</h2><p class="muted">Últimos materiales registrados en este dispositivo.</p></div><a class="button secondary" href="#biblioteca">Ver catálogo ↗</a></div>${recent.length?cards(recent):empty()}</section>
    <section class="roadmap-card"><span class="roadmap-symbol" aria-hidden="true">↗</span><div><h2>Organizar hoy. Descubrir mañana.</h2><p>Títulos, temas, cuentos y ubicaciones: cada dato ayuda a que el próximo lector encuentre su historia.</p></div><a href="#agregar" class="button secondary">Sumar una historia</a></section>`;
}
function renderLibrary(){
  const list=searchBooks(books,query,category).sort((a,b)=>a.title.localeCompare(b.title,'es'));
  $('#main').innerHTML=`
    <div class="page-heading"><div><span class="eyebrow">CATÁLOGO INSTITUCIONAL</span><h1>Fondo bibliográfico</h1><p class="muted">Buscá por título, autor, ISBN, editorial, tema, ubicación o contenido registrado.</p></div><a class="button primary" href="#agregar">＋ Incorporar material</a></div>
    <div class="catalog-tools"><div class="search-box"><span>⌕</span><input id="search" type="search" placeholder="Ej.: Segunda Guerra Mundial, murciélagos, San Martín…" value="${escape(query)}" aria-label="Buscar en el catálogo"></div><select id="category"><option value="">Todas las categorías</option>${categories.map(c=>`<option ${c===category?'selected':''}>${c}</option>`).join('')}</select></div>
    <p class="catalog-summary" role="status">${list.length} ${list.length===1?'registro':'registros'}${query||category?' encontrados':' en el catálogo'}</p>
    ${list.length?cards(list):empty(Boolean(query||category))}
    <div class="backup-bar"><div><strong>Respaldo institucional local</strong><p>Durante el prototipo, el catálogo se conserva en este navegador.</p></div><div><button class="button secondary" data-action="export">↓ Exportar</button><button class="button secondary" data-action="import">↑ Importar</button></div></div>`;
}
function officialLinks(){
  return `<div class="official-sources"><strong>Fuentes argentinas para verificación</strong><p>Estos catálogos todavía no exponen una API pública estable integrada al prototipo. Se ofrecen como verificación complementaria.</p><div>${OFFICIAL_CATALOGS.map(c=>`<a class="source-link" href="${c.url}" target="_blank" rel="noopener"><span>${escape(c.short)}</span><small>${escape(c.note)}</small>↗</a>`).join('')}</div></div>`;
}
function renderAdd(){
  cancelLookup();
  $('#main').innerHTML=`
    <div class="flow-header"><a href="#biblioteca" class="button secondary back-link">← Catálogo</a><span class="step">INCORPORACIÓN · PASO 1 DE 2</span></div>
    <div class="page-heading"><div><h1>Identificar material</h1><p class="muted">Usá el ISBN de la contratapa correspondiente a esta edición impresa. No hace falta escribir guiones ni espacios.</p></div></div>
    <div class="flow-layout"><section class="panel acquisition-panel">
      <div class="method-grid"><button id="scan-start" class="method-card"><span>▥</span><strong>Escanear código</strong><small>Usar cámara en vivo</small></button><button id="scan-photo" class="method-card"><span>▣</span><strong>Fotografiar código</strong><small>Alternativa si el video no detecta</small></button></div>
      <div id="camera-panel" class="camera-panel" hidden><video id="scanner-video" muted playsinline autoplay></video><div class="scan-frame"></div><p>Encuadrá todo el código de barras, evitá reflejos y mantené el teléfono estable.</p><button id="scan-stop" class="button secondary">Cerrar cámara</button></div>
      <div class="divider"><span>o ingresar ISBN</span></div>
      <form id="isbn-form"><label>ISBN de 10 o 13 dígitos<div class="isbn-row"><input id="isbn-query" inputmode="numeric" maxlength="24" placeholder="9505470630" autocomplete="off" required><button id="isbn-search" class="button primary">Consultar</button></div><small>Podés copiarlo con guiones o espacios: el sistema los elimina. Priorizá el número que figura junto al código de barras de la contratapa.</small></label></form>
      <p id="lookup-status" class="lookup-status" role="status" aria-live="polite"></p><div id="lookup-result"></div>
      <div class="manual-fallback"><strong>Material sin ISBN o sin coincidencias</strong><p>La carga manual queda disponible como respaldo para fondos antiguos, publicaciones institucionales u otros materiales.</p><button class="button secondary" data-action="manual">Continuar con carga manual</button></div>
    </section>
    <aside class="panel source-panel"><h3>Fuentes de consulta</h3><div class="source-status"><span>Google Books</span><small>Consulta por ISBN-10 e ISBN-13</small></div><div class="source-status"><span>Open Library</span><small>Consulta por ambas variantes</small></div>${officialLinks()}</aside></div>`;
}
async function runLookup(value){
  cancelLookup(false);const version=++lookupVersion;lookupController=new AbortController();
  const status=$('#lookup-status'),result=$('#lookup-result');status.textContent='Consultando fuentes bibliográficas…';result.innerHTML='';
  try{
    const data=await lookupISBN(value,{signal:lookupController.signal});
    if(version!==lookupVersion||route()!=='agregar')return;
    status.textContent=data.results.map(r=>r.source+': '+({found:'coincidencia ✓',empty:'sin coincidencia',error:'no disponible'}[r.status])).join(' · ');
    if(!data.book){result.innerHTML=`<div class="notice"><strong>No encontramos una ficha automática para este ISBN.</strong><p>Podés verificarlo en las fuentes argentinas o continuar con carga manual.</p></div>`;return;}
    const b=data.book,duplicate=books.find(x=>canonicalISBN(x.isbn)===canonicalISBN(b.isbn));
    result.innerHTML=`<div class="result-card"><div class="result-cover">${cover({...b,category:b.category||'Material'})}</div><div><span class="result-ok">COINCIDENCIA BIBLIOGRÁFICA</span><h2>${escape(b.title)}</h2><p>${escape(b.author||'Autor no informado')}</p><dl class="mini-data"><div><dt>Editorial</dt><dd>${escape(b.publisher||'Sin información')}</dd></div><div><dt>Año</dt><dd>${escape(b.year||'—')}</dd></div><div><dt>ISBN consultado</dt><dd>${escape(cleanISBN(b.isbn))}</dd></div><div><dt>Idioma</dt><dd>${escape(b.language||'Sin información')}</dd></div><div><dt>Fuentes</dt><dd>${escape((b.sources||[]).join(' · '))}</dd></div></dl>${subjectChips(b)}<p class="muted">Se consultaron también las variantes equivalentes del ISBN cuando correspondía.</p><button id="confirm-isbn" class="button primary">${duplicate?'Abrir registro existente':'Confirmar y registrar ejemplares'}</button></div></div>`;
    $('#confirm-isbn').onclick=()=>{if(duplicate){location.hash='#ficha/'+duplicate.id;}else{draft={copies:1,category:'Otros',...b};location.hash='#editar/nuevo';}};
  }catch(error){if(error.name!=='AbortError'&&version===lookupVersion)status.textContent=error.message;}
}
function formHTML(book={},suggested=false){
  return `<form id="book-form" class="institution-form" novalidate><input type="hidden" name="id" value="${escape(book.id||'')}">
    ${book.sources?.length?`<div class="provenance"><strong>Ficha asistida</strong><span>Datos obtenidos de ${escape(book.sources.join(' · '))}. Revisá la edición antes de guardar.</span></div>`:''}
    <section class="form-section"><div class="form-section-heading"><div><span>DATOS BIBLIOGRÁFICOS</span><h2>Identificación de la edición</h2></div><small>${suggested?'Completados automáticamente cuando la fuente los informó.':'Completá únicamente la información disponible.'}</small></div>
      <label>Título *<input name="title" required maxlength="180" value="${escape(book.title||'')}"></label>
      <label>Autor/es<input name="author" maxlength="1000" value="${escape(book.author||'')}" placeholder="Separar varios autores con punto y coma"></label>
      <div class="form-grid three"><label>ISBN<input name="isbn" maxlength="24" value="${escape(book.isbn||'')}" inputmode="numeric"><small>Sin guiones ni espacios al guardar.</small></label><label>Categoría<select name="category">${categories.map(c=>`<option ${c===(book.category||'Otros')?'selected':''}>${c}</option>`).join('')}</select></label><label>Editorial<input name="publisher" value="${escape(book.publisher||'')}" maxlength="120"></label></div>
      <div class="form-grid three"><label>Año<input name="year" value="${escape(book.year||'')}" inputmode="numeric" maxlength="4"></label><label>Páginas<input name="pages" type="number" min="1" max="100000" value="${escape(book.pages||'')}"></label><label>Idioma<input name="language" value="${escape(book.language||'')}" maxlength="30"></label></div>
      <label>Temas normalizados<textarea name="subjects" rows="3">${escape((book.subjects||[]).join('\n'))}</textarea><small>Se usan para mejorar la recuperación temática en el buscador.</small></label>
    </section>
    <section class="form-section accent-section"><div class="form-section-heading"><div><span>INVENTARIO INSTITUCIONAL</span><h2>Ejemplares físicos</h2></div><small>Estos datos pertenecen a la biblioteca, no a la edición.</small></div>
      <div class="form-grid three"><label>Cantidad de ejemplares *<input name="copies" type="number" min="1" max="9999" value="${escape(book.copies||1)}" required></label><label>Estado general<select name="condition">${['Nuevo','Bueno','Regular','Deteriorado'].map(c=>`<option ${c===(book.condition||'Bueno')?'selected':''}>${c}</option>`).join('')}</select></label><label>Ubicación física<input name="location" maxlength="120" value="${escape(book.location||'')}" placeholder="Ej.: Sector infantil · Estantería 2"></label></div>
    </section>
    <details class="form-section optional-section"><summary>Información complementaria</summary><label>Subtítulo<input name="subtitle" maxlength="300" value="${escape(book.subtitle||'')}"></label><label>Cuentos o capítulos<textarea name="contents" rows="4">${escape((book.contents||[]).join('\n'))}</textarea><small>No es obligatorio transcribirlos. La futura herramienta de IA permitirá analizarlos desde una fotografía del índice.</small></label><label>Notas institucionales<textarea name="notes" rows="3">${escape(book.notes||'')}</textarea></label></details>
    <div class="save-area"><p id="form-error" class="error" role="alert" tabindex="-1"></p><div class="form-actions"><a class="button secondary" href="${book.id?'#ficha/'+book.id:'#agregar'}">Cancelar</a><button class="button primary" type="submit">Guardar en el catálogo</button></div></div>
  </form>`;
}
function renderEditor(id){
  const existing=id==='nuevo'?null:books.find(b=>b.id===id);
  const book=existing||draft||{copies:1,category:'Otros'};
  if(id!=='nuevo'&&!existing){location.hash='#biblioteca';return;}
  $('#main').innerHTML=`<div class="flow-header"><a href="${existing?'#ficha/'+existing.id:'#agregar'}" class="button secondary back-link">← Volver</a><span class="step">${existing?'EDICIÓN DE REGISTRO':'INCORPORACIÓN · PASO 2 DE 2'}</span></div><div class="page-heading"><div><h1>${existing?'Editar registro bibliográfico':'Registrar ejemplares de la institución'}</h1><p class="muted">${existing?'Actualizá los datos bibliográficos o de inventario.':'Revisá la ficha recuperada y completá solamente los datos físicos de la biblioteca.'}</p></div></div>${formHTML(book,!existing&&Boolean(draft?.sources?.length))}`;
}
async function renderDetail(id){
  const b=books.find(x=>x.id===id);if(!b){location.hash='#biblioteca';return;}
  const photos=await getPhotos(id).catch(()=>[]);
  if(route()!=='ficha/'+id)return;
  detailPhotos=photos;
  const photo=detailPhotos.find(p=>p.id===b.exemplars?.[0]?.id);
  $('#main').innerHTML=`<div class="flow-header"><a href="#biblioteca" class="button secondary back-link">← Catálogo</a><span class="step">REGISTRO BIBLIOGRÁFICO</span></div>
  <article class="record-page"><section class="record-main"><div class="record-cover">${safeCover(b.cover)?`<button data-cover="${escape(b.id)}" class="cover-zoom" aria-label="Ampliar portada bibliográfica">${cover(b)}</button>`:cover(b)}<small>Portada bibliográfica${safeCover(b.cover)?' · Tocá para ampliar':''}</small></div><div class="record-info"><div class="record-title-row"><div><span class="eyebrow">${escape(b.category)}</span><h1>${escape(b.title)}</h1><p class="record-author">${escape(b.author||'Autor no informado')}</p></div><a class="button secondary" href="#editar/${escape(b.id)}">Editar registro</a></div>${subjectChips(b)}<div class="availability"><strong>${b.copies} ${b.copies===1?'ejemplar registrado':'ejemplares registrados'}</strong><span>${escape(b.location||'Ubicación pendiente')}</span><span>Estado: ${escape(b.condition||'Bueno')}</span></div><details><summary>Datos de la edición</summary><dl class="detail-data"><div><dt>ISBN</dt><dd>${escape(b.isbn||'Sin ISBN')}</dd></div><div><dt>Editorial</dt><dd>${escape(b.publisher||'Sin información')}</dd></div><div><dt>Año</dt><dd>${escape(b.year||'—')}</dd></div><div><dt>Páginas</dt><dd>${escape(b.pages||'—')}</dd></div><div><dt>Fuentes</dt><dd>${escape((b.sources||[]).join(' · ')||'Carga institucional')}</dd></div></dl></details>${b.contents?.length?`<details><summary>Contenidos indexados (${b.contents.length})</summary><ul class="detail-text">${b.contents.map(c=>`<li>${escape(c)}</li>`).join('')}</ul></details>`:''}</div></section>
  <aside class="record-side panel"><h2>Ejemplar físico</h2><p class="muted">La portada editorial y la foto del ejemplar se mantienen separadas.</p><label>Ejemplar<select id="photo-copy">${(b.exemplars||[]).map((e,i)=>`<option value="${escape(e.id)}">Ejemplar ${i+1}</option>`).join('')}</select></label><div id="photo-preview">${photo&&validPhotoURL(photo.dataUrl)?`<button class="photo-thumbnail" data-view-photo="${escape(photo.id)}"><img src="${photo.dataUrl}" alt="Foto del ejemplar físico"></button>`:'<div class="photo-empty">Sin fotografía del ejemplar</div>'}</div><div class="photo-actions"><button class="button secondary" data-photo="camera">Sacar foto</button><button class="button secondary" data-photo="file">Elegir archivo</button></div></aside></article>${dangerZone('Eliminar este registro','Se perderán la ficha, todos sus ejemplares y sus fotografías. Esta acción no se puede deshacer.',`<button class="button danger" data-delete="${escape(b.id)}">Eliminar registro</button>`)}`;
}
function selectedPhoto(){
 const id=$('#photo-copy')?.value;return detailPhotos.find(p=>p.id===id);
}
function renderSelectedPhoto(){
 const p=selectedPhoto(),box=$('#photo-preview');if(!box)return;
 box.innerHTML=p&&validPhotoURL(p.dataUrl)?`<button class="photo-thumbnail" data-view-photo="${escape(p.id)}"><img src="${p.dataUrl}" alt="Foto del ejemplar físico"></button>`:'<div class="photo-empty">Sin fotografía del ejemplar</div>';
}
function showImage(url,title){
 if(!safeCover(url)&&!validPhotoURL(url))return;
 $('#image-title').textContent=title;$('#large-image').alt=title;$('#large-image').src=url;$('#image-status').textContent='';$('#image-viewer').showModal();
}
function stopScan(){scanController?.abort();scanController=null;const panel=$('#camera-panel');if(panel)panel.hidden=true;}
function cancelLookup(increment=true){if(increment)lookupVersion++;lookupController?.abort();lookupController=null;stopScan();}

document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.close)document.getElementById(button.dataset.close)?.close();
 if(button.dataset.action==='theme')setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
 if(button.dataset.action==='help')$('#help').showModal();
 if(button.dataset.action==='manual'){draft={copies:1,category:'Otros',isbn:cleanISBN($('#isbn-query')?.value||'')};location.hash='#editar/nuevo';}
 if(button.dataset.action==='export'){try{const photos=await getPhotos();const blob=new Blob([JSON.stringify({app:'asistente-bibliotecario',version:3,exportedAt:new Date().toISOString(),books,photos},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='biblioteca-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Respaldo exportado.');}catch{notify('No se pudo exportar el respaldo.');}}
 if(button.dataset.action==='import')$('#import-file').click();
 if(button.id==='scan-start'){
   stopScan();scanController=new AbortController();const controller=scanController;$('#camera-panel').hidden=false;$('#lookup-status').textContent='Solicitando acceso a la cámara…';
   try{await scanISBN($('#scanner-video'),{signal:controller.signal,onReady:()=>{$('#lookup-status').textContent='Cámara lista. Encuadrá el código completo.';},onISBN:isbn=>{stopScan();$('#isbn-query').value=isbn;runLookup(isbn);},onError:()=>{stopScan();$('#lookup-status').textContent='No se pudo leer el código en vivo. Probá con “Fotografiar código”.';}});}catch(error){if(!controller.signal.aborted){stopScan();$('#lookup-status').textContent=error.name==='NotAllowedError'?'El navegador bloqueó la cámara. Revisá el permiso del sitio o usá “Fotografiar código”.':error.message;}}
 }
 if(button.id==='scan-stop')stopScan();
 if(button.id==='scan-photo')$('#barcode-photo').click();
 if(button.dataset.cover){const b=books.find(x=>x.id===button.dataset.cover);showImage(b?.cover,'Portada bibliográfica');}
 if(button.dataset.viewPhoto){const p=detailPhotos.find(x=>x.id===button.dataset.viewPhoto);if(p)showImage(p.dataUrl,'Foto del ejemplar físico');}
 if(button.dataset.photo){const id=route().split('/')[1];photoTarget={bookId:id,id:$('#photo-copy').value};$('#physical-'+(button.dataset.photo==='camera'?'camera':'photo')).click();}
 if(button.dataset.delete){const book=books.find(b=>b.id===button.dataset.delete);if(book&&await confirmAction('Eliminar registro',`Se eliminará “${book.title}”, sus ${book.copies} ejemplares y sus fotografías. Esta acción no se puede deshacer.`)){try{await deleteBook(book.id);books=await readBooks();notify('Registro eliminado.');location.hash='#biblioteca';}catch(error){notify(storageMessage(error));}}}
 if(button.dataset.action==='clear-catalog'&&await confirmAction('Vaciar catálogo',`Se eliminarán ${books.length} registros y todas sus fotografías de este navegador. Necesitarás un respaldo para recuperarlos.`,'Vaciar catálogo definitivamente')){try{await clearCatalog();books=[];renderSettings();notify('Catálogo local vaciado.');}catch(error){notify(storageMessage(error));}}
});
document.addEventListener('submit',async event=>{
 if(event.target.matches('#isbn-form')){event.preventDefault();runLookup($('#isbn-query').value);return;}
 // A form control named "id" shadows HTMLFormElement.id in browsers.
 if(event.target.matches('#book-form')){
   event.preventDefault();const form=event.target,submit=form.querySelector('[type=submit]'),feedback=form.querySelector('#form-error');
   if(submit.disabled)return;
   feedback.textContent='';
   const invalid=[...form.elements].find(field=>field.willValidate&&!field.validity.valid);
   if(invalid){invalid.closest('details')?.setAttribute('open','');invalid.setAttribute('aria-invalid','true');feedback.textContent='Revisá '+(invalid.closest('label')?.firstChild.textContent.trim()||'el campo marcado')+': '+invalid.validationMessage;invalid.focus();return;}
   submit.disabled=true;submit.textContent='Guardando…';form.setAttribute('aria-busy','true');
   try{const raw=Object.fromEntries(new FormData(form)),existing=books.find(b=>b.id===raw.id);const book=validateBook({...existing,...(!existing?draft:null),...raw});const duplicate=book.isbn&&books.find(b=>b.id!==book.id&&canonicalISBN(b.isbn)===canonicalISBN(book.isbn));if(duplicate)throw new Error('Este ISBN ya está registrado en '+duplicate.title+'.');if(existing&&book.copies<existing.copies&&!await confirmAction('Reducir ejemplares',`Se quitarán ${existing.copies-book.copies} ejemplares del final de la lista y sus fotografías. Exportá un respaldo antes de continuar.`,'Reducir ejemplares'))return;await saveBook(book);books=await readBooks();draft=null;notify(existing?'Registro actualizado.':'Material incorporado al catálogo.');location.hash='#ficha/'+book.id;}catch(error){feedback.textContent=storageMessage(error);feedback.focus();}finally{submit.disabled=false;submit.textContent='Guardar en el catálogo';form.removeAttribute('aria-busy');}
 }
});
document.addEventListener('input',event=>{event.target.removeAttribute('aria-invalid');if(event.target.id==='search'){query=event.target.value;const start=event.target.selectionStart,end=event.target.selectionEnd;renderLibrary();const input=$('#search');input.focus();input.setSelectionRange(start,end);}});
document.addEventListener('change',event=>{if(event.target.id==='category'){category=event.target.value;renderLibrary();}if(event.target.id==='photo-copy')renderSelectedPhoto();});
$('#barcode-photo').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;const status=$('#lookup-status');status.textContent='Analizando la fotografía del código…';try{const isbn=await scanISBNFromFile(file);$('#isbn-query').value=isbn;await runLookup(isbn);}catch(error){status.textContent=error.message;}});
$('#import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>50*1024*1024)throw new Error('El archivo supera 50 MB.');const archive=parseArchive(await file.text());if(!await confirmAction('Importar respaldo','Se incorporarán '+archive.books.length+' registros. Los registros y fotos con el mismo identificador serán reemplazados. Exportá el catálogo actual antes de continuar.','Importar y reemplazar coincidencias'))return;await mergeBooks(archive.books.map(localizeBook),archive.photos);books=await readBooks();render();notify('Respaldo importado.');}catch(error){notify(error.message||'No se pudo importar.');}});
for(const input of [$('#physical-photo'),$('#physical-camera')])input.addEventListener('change',async event=>{const file=event.target.files[0],target=photoTarget;event.target.value='';if(!file||!target)return;try{const dataUrl=await preparePhoto(file);await savePhoto({...target,dataUrl,takenAt:new Date().toISOString()});detailPhotos=await getPhotos(target.bookId);renderSelectedPhoto();notify('Foto del ejemplar guardada localmente.');}catch(error){notify(error.message||'No se pudo guardar la foto.');}});
$('#large-image').addEventListener('error',()=>$('#image-status').textContent='No se pudo cargar la imagen.');
$('#image-viewer').addEventListener('close',()=>$('#large-image').removeAttribute('src'));
window.addEventListener('hashchange',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScan();});
window.addEventListener('pagehide',cancelLookup);
document.addEventListener('error',event=>{if(event.target.matches?.('.real-cover img')){event.target.hidden=true;event.target.nextElementSibling.hidden=false;}},true);

$('#main').innerHTML='<p class="muted">Abriendo catálogo institucional…</p>';
try{await openDatabase();const existing=await getBooks();books=existing.map(b=>localizeBook(b.schemaVersion===2?b:validateBook(b)));if(existing.some(b=>b.schemaVersion!==2))await mergeBooks(books);ready=true;render();}catch{$('#main').innerHTML='<div class="notice"><h1>No pudimos abrir el catálogo local</h1><p>Revisá los permisos de almacenamiento del navegador y volvé a cargar la página.</p></div>';}
