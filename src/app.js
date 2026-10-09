import {initAccessUI,renderAccess} from './access-ui.js?v=20261009-3';
import {recognizeIdentifier,identifierDraft,MATERIAL_TYPES} from './recognition.js?v=20261009-3';
import {initLocalUI,refreshSession,renderLocal,accessForRoute,holdingState,can} from './local-ui.js?v=20261009-3';
import {execute,exportArchive,restoreArchive} from './storage.js?v=20261009-3';
import {JsonBackupProvider,AguapeyMarcProvider} from './imports.js?v=20261009-3';
import { mobileNavigation } from './navigation.js?v=20261009-3';
import { localizeBook } from './subjects.js?v=20261009-3';
import { preparePhoto, validPhotoURL } from './photos.js?v=20261009-3';
import { lookupISBN, safeCover, OFFICIAL_CATALOGS } from './metadata.js?v=20261009-3';
import { scanISBN, scanMaterialFromFile, createMaterialDetector } from './scanner.js?v=20261009-3';
import { canonicalISBN, cleanISBN } from './isbn.js?v=20261009-3';
import { categories, searchBooks, validateBook, parseArchive } from './catalog.js?v=20261009-3';
import { openDatabase, getBooks, saveBook, deleteBook, clearCatalog, mergeBooks, getPhotos, savePhoto, deletePhoto, deleteExemplar, getLoans, getReservations, getPatrons, getActivity } from './storage.js?v=20261009-3';
import { assignMissingInventoryCodes } from './domain.js?v=20261009-3';

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
  $('#main').innerHTML=`<div class="page-heading"><div><span class="eyebrow">TU ESPACIO DE TRABAJO</span><h1>Configuración</h1><p class="muted">Cuidá el catálogo de tu biblioteca y elegí cómo trabajar.</p></div></div><section class="panel settings-panel"><h2>Una copia, mucha tranquilidad.</h2><p>Los registros y las fotos se guardan en este navegador. Exportá un respaldo antes de cambiar de dispositivo o borrar datos.</p><div class="button-row"><button class="button primary" data-action="export">Exportar respaldo</button><button class="button secondary" data-action="import">Importar respaldo</button><button class="button secondary" data-action="theme">Cambiar tema claro / oscuro</button></div></section>${dangerZone('Vaciar el catálogo de esta institución','Se eliminarán los registros, ejemplares y fotografías de la institución actual. Esta acción no se puede deshacer. Exportá primero un respaldo.',`<button class="button danger" data-action="clear-catalog" ${books.length?'':'disabled'}>Vaciar catálogo</button>`)}`;
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
  return `<div class="empty"><div class="empty-symbol">▥</div><h3>${filtered?'No se encontraron resultados':'Tu catálogo todavía no tiene registros.'}</h3><p>${filtered?'Probá con otro título, autor, ISBN, tema o contenido.':'Sumá el primer material de la biblioteca. Primero intentamos reconocerlo; después completás lo que falta.'}</p><a class="button primary" href="${filtered?'#biblioteca':'#agregar'}">${filtered?'Volver al catálogo':'Agregar al catálogo'}</a></div>`;
}
const closeWorkspaceMenu=mobileNavigation({toggle:$('#app-menu-toggle'),panel:$('#workspace-menu'),breakpoint:760,background:[$('main'),$('footer')],header:$('.topbar')});

function updateNav(){
  document.querySelectorAll('[data-nav]').forEach(el=>{const active=el.dataset.nav===routeBase()||(el.dataset.nav==='biblioteca'&&['ficha','editar'].includes(routeBase()));el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
}
async function render(){
  closeWorkspaceMenu();
  updateNav();
  if(!ready)return;
  window.scrollTo(0,0);
  cancelLookup();
  const current=route();
  await refreshSession();if(current!==route())return;
  if(current.startsWith('registro')){await renderAccess(current);return;}
  if(!accessForRoute(current)){$('#main').innerHTML='<section class="notice"><h1>Acceso no habilitado</h1><p>El perfil seleccionado no tiene permiso vigente. Elegí un perfil local habilitado en el menú.</p></section>';return;}
  if(await renderAccess(current))return;
  if(await renderLocal(current))return;
  if(current==='biblioteca')return renderLibrary();
  if(current==='agregar')return renderAdd();
  if(current==='configuracion')return renderSettings();
  if(current==='ejemplares')return renderExemplars();
  if(current==='interoperabilidad')return renderInteroperability();
  if(current.startsWith('ficha/'))return renderDetail(current.split('/')[1],current.split('/')[2]);
  if(current.startsWith('editar/'))return renderEditor(current.split('/')[1]);
  renderHome();
}
function renderInteroperability(){
 $('#main').innerHTML=`<div class="page-heading"><div><span class="eyebrow">INTEROPERABILIDAD</span><h1>Importar y exportar</h1><p class="muted">Evitá volver a catalogar una biblioteca que ya tiene registros en otro sistema.</p></div></div>
 <section class="panel settings-panel"><span class="eyebrow">AGUAPEY</span><h2>Importar MARC / ISO 2709</h2><p>Aguapey puede exportar su base bibliográfica en formato MARC como archivo ISO 2709. Este prototipo ya puede leer ese archivo y recuperar título, autores, editorial, temas, contenidos y datos locales de inventario cuando están presentes.</p><button class="button primary" data-action="import-aguapey">Elegir archivo .ISO</button><p class="muted">Los campos locales 852 y 859 se conservan cuando aparecen. Antes de confirmar la importación se muestra la cantidad de registros detectados.</p></section>
 <section class="panel settings-panel"><span class="eyebrow">RESPALDO PROPIO</span><h2>Asistente Bibliotecario</h2><p>El respaldo JSON conserva información que MARC no representa directamente en este prototipo, como fotografías, personas, permisos, préstamos y reservas locales.</p><div class="button-row"><button class="button secondary" data-action="export">Exportar respaldo JSON</button><button class="button secondary" data-action="import">Importar respaldo JSON</button></div></section>
 <section class="notice"><strong>Próximo paso</strong><p>La exportación MARC/ISO hacia Aguapey se habilitará cuando validemos el mapeo con archivos reales de escuelas para no generar registros incompatibles.</p></section>`;
}
function renderHome(){
 const recent=[...books].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);
 $('#main').innerHTML=`<div class="page-heading"><div><span class="eyebrow">BIBLIOTECA / PANEL</span><h1>¿Qué necesitás encontrar hoy?</h1><p class="muted">Buscá en los títulos, temas y contenidos de tu colección.</p></div><a href="#agregar" class="button primary">＋ Agregar al catálogo</a></div>
 <form id="home-search" class="home-search"><label for="home-query">¿Qué material o contenido buscás?</label><div class="isbn-row"><input id="home-query" type="search" placeholder="Ej.: cuento con murciélagos" required><button class="button primary">Buscar</button></div></form>
 <div class="query-examples"><span>Probá con</span>${['cuento de monstruos','murciélagos','Segunda Guerra Mundial'].map(q=>`<button data-query="${escape(q)}">${escape(q)} ↗</button>`).join('')}</div>
 <p class="search-note">La búsqueda usa la información registrada. El grado o la edad solo se pueden encontrar si figuran en la ficha; todavía no se infieren con IA.</p>
 <section class="teacher-discovery" aria-labelledby="teacher-title"><div class="section-heading"><div><span class="eyebrow">LECTURAS QUE SE COMPARTEN</span><h2 id="teacher-title">De docente a docente</h2><p>Cuando tu escuela tenga su espacio registrado, acá vas a descubrir lecturas a partir de las reservas y experiencias de su comunidad.</p></div><span class="future-pill">Próximamente · Espacio escolar</span></div><div class="teacher-grid"><article class="teacher-card"><figure class="teacher-cover"><img src="./assets/illustrated-covers/selva.svg" alt="Portada ilustrativa: cuentos de la selva" width="240" height="340" loading="lazy"><figcaption>Ejemplo visual · No es un destacado real</figcaption></figure><h3>Más reservados</h3><p>Los materiales más elegidos por docentes de tu escuela. Se mostrarán cuando haya reservas registradas.</p></article><article class="teacher-card"><figure class="teacher-cover"><img src="./assets/illustrated-covers/principito.svg" alt="Portada ilustrativa: el pequeño explorador" width="240" height="340" loading="lazy"><figcaption>Ejemplo visual · No es un destacado real</figcaption></figure><h3>Cuentos destacados</h3><p>Lecturas recomendadas por la biblioteca y docentes, con el motivo de la elección y la experiencia en el aula.</p></article><article class="teacher-card"><figure class="teacher-cover"><img src="./assets/illustrated-covers/aula.svg" alt="Portada ilustrativa: historias para compartir" width="240" height="340" loading="lazy"><figcaption>Ejemplo visual · No es un destacado real</figcaption></figure><h3>Ideas para tu grado</h3><p>Qué lectura sirvió para qué grado, tema o proyecto, según experiencias compartidas por docentes.</p></article></div></section>
 <section class="stats" aria-label="Resumen de biblioteca"><a class="stat" href="#biblioteca"><strong>${books.length}</strong><small>Registros bibliográficos ↗</small></a><a class="stat" href="#ejemplares"><strong>${books.reduce((n,b)=>n+b.copies,0)}</strong><small>Ejemplares físicos ↗</small></a><div class="stat"><strong>${books.reduce((n,b)=>n+(b.contents?.length||0),0)}</strong><small>Contenidos indexados</small></div></section>
 <section><div class="section-heading"><div><span class="eyebrow">ÚLTIMAS INCORPORACIONES</span><h2>En tu biblioteca</h2></div><a class="button secondary" href="#biblioteca">Ver catálogo</a></div>${recent.length?cards(recent):empty()}</section>`;
}
function renderExemplars(){
 $('#main').innerHTML=`<div class="page-heading"><div><span class="eyebrow">INVENTARIO FÍSICO</span><h1>Ejemplares</h1><p class="muted">Cada copia conserva su identidad, ubicación, estado y fotografía. Préstamos y reservas disponibles en este navegador.</p></div><a class="button primary" href="#agregar">Agregar al catálogo</a></div><div class="holdings-list">${books.flatMap(b=>(b.exemplars||[]).map((e,i)=>`<article class="holding-row"><div><span class="eyebrow">${escape(e.internalCode||e.inventoryCode||'Ejemplar '+(i+1))}</span><h2>${escape(b.title)}</h2><p>${escape(e.location||'Ubicación pendiente')} · ${escape(holdingState(e))} · ${escape(e.condition||'Bueno')}</p></div><a class="button secondary" href="#ficha/${escape(b.id)}/${escape(e.id)}">Ver ejemplar</a></article>`)).join('')||empty()} </div>`;
}
function renderLibrary(){
  const list=searchBooks(books,query,category).sort((a,b)=>a.title.localeCompare(b.title,'es'));
  $('#main').innerHTML=`
    <div class="page-heading"><div><span class="eyebrow">CATÁLOGO INSTITUCIONAL</span><h1>Fondo bibliográfico</h1><p class="muted">Buscá por título, autor, publicación, tema, ubicación, identificador o contenido registrado.</p></div><a class="button primary" href="#agregar">＋ Agregar al catálogo</a></div>
    <div class="catalog-tools"><div class="search-box"><span>⌕</span><input id="search" type="search" placeholder="Ej.: Segunda Guerra Mundial, murciélagos, San Martín…" value="${escape(query)}" aria-label="Buscar en el catálogo"></div><select id="category"><option value="">Todas las categorías</option>${categories.map(c=>`<option ${c===category?'selected':''}>${c}</option>`).join('')}</select></div>
    <p class="catalog-summary" role="status">${list.length} ${list.length===1?'registro':'registros'}${query||category?' encontrados':' en el catálogo'}</p>
    ${list.length?cards(list):empty(Boolean(query||category))}
    <div class="backup-bar"><div><strong>Respaldo institucional local</strong><p>Durante el prototipo, el catálogo se conserva en este navegador.</p></div><div><button class="button secondary" data-action="export">↓ Exportar</button><button class="button secondary" data-action="import">↑ Importar</button></div></div>`;
}
function officialLinks(){
  return `<div class="official-sources"><strong>Fuentes argentinas para verificación</strong><p>La BN Mariano Moreno ofrece Z39.50, que requiere un servidor intermediario. BNM e ISBN Argentina quedan como consultas externas hasta confirmar una integración oficial.</p><div>${OFFICIAL_CATALOGS.map(c=>`<a class="source-link" href="${c.url}" target="_blank" rel="noopener"><span>${escape(c.short)}</span><small>${escape(c.note)}</small>↗</a>`).join('')}</div></div>`;
}
function showRecognitionFallback(message='No pudimos identificar el material.'){const panel=$('#recognition-fallback');if(panel)panel.hidden=false;if($('#lookup-status'))$('#lookup-status').textContent=message;}
function renderAdd(){
 cancelLookup();
 $('#main').innerHTML=`<div class="flow-header"><a href="#biblioteca" class="button secondary back-link">← Catálogo</a><span class="step">INCORPORACIÓN · PASO 1 DE 2</span></div>
 <div class="page-heading"><div><h1>Reconocer material</h1><p class="muted">Primero intentamos reconocer. Después preguntamos. No necesitás elegir el tipo de material ni de código.</p></div></div>
 <div class="flow-layout"><section class="panel acquisition-panel"><button id="scan-start" class="button primary">Abrir cámara</button><p>Encuadrá el código del material. Intentaremos reconocerlo y recuperar la información disponible para que la revises.</p><button class="button secondary" data-action="camera-unavailable">No puedo usar la cámara</button>
 <div id="camera-panel" class="camera-panel" hidden><video id="scanner-video" muted playsinline autoplay></video><div class="scan-frame"></div><p>Encuadrá el código completo, evitá reflejos y mantené el dispositivo estable.</p><button id="scan-stop" class="button secondary">No logra reconocerlo / cerrar cámara</button></div>
 <p id="lookup-status" class="lookup-status" role="status" aria-live="polite"></p><div id="lookup-result"></div>
 <div id="recognition-fallback" hidden><div class="button-row"><button class="button secondary" data-action="retry-recognition">Intentar nuevamente</button><button class="button secondary" data-action="enter-code">Ingresar un código</button><button class="button secondary" data-action="manual">Incorporar manualmente</button></div>
 <form id="isbn-form" hidden><label>Código o enlace<div class="isbn-row"><input id="isbn-query" maxlength="2000" placeholder="Pegá o escribí el código o enlace" autocomplete="off" required><button id="isbn-search" class="button primary">Reconocer</button></div></label></form><button id="scan-photo" class="button secondary">Leer código desde una fotografía</button></div></section>
 <aside class="panel source-panel"><h3>La persona confirma</h3><p>Libros, revistas, diarios, artículos, documentos, producciones escolares, recursos digitales y otros materiales. Todos pueden tener temas, palabras clave y un resumen, con o sin identificador.</p><p>La recuperación bibliográfica automática actual consulta libros por ISBN. Para otros identificadores reconocidos, se conserva el dato y se completa la ficha sin inventar información.</p><small>Leer un código en una foto no es analizar la tapa o la primera plana: esa asistencia queda para una etapa futura.</small><details><summary>Ver fuentes bibliográficas</summary>${officialLinks()}</details></aside></div>`;
}
async function runLookup(value){
  cancelLookup(false);const version=++lookupVersion;lookupController=new AbortController();
  const status=$('#lookup-status'),result=$('#lookup-result'),recognized=recognizeIdentifier(value);result.innerHTML='';
  if(recognized.kind==='internal'){const book=books.find(b=>b.exemplars.some(e=>e.internalCode===recognized.value));if(book){const copy=book.exemplars.find(e=>e.internalCode===recognized.value);location.hash='#ejemplar/'+copy.id;return;}showRecognitionFallback('No encontramos ese código interno en esta institución.');return;}
  if(recognized.kind!=='isbn'){showRecognitionFallback(recognized.kind==='unknown'?'No pudimos identificar el material con ese dato.':'Reconocimos el identificador. Todavía no hay recuperación automática de su ficha; podés conservarlo y completar lo que falta.');if(recognized.kind!=='unknown'){result.innerHTML='<button id="review-recognized" class="button primary">Revisar y completar ficha</button>';$('#review-recognized').onclick=()=>{draft=identifierDraft(value);location.hash='#editar/nuevo';};}return;}
  value=recognized.value;status.textContent='Consultando fuentes bibliográficas…';
  try{
    const data=await lookupISBN(value,{signal:lookupController.signal});
    if(version!==lookupVersion||route()!=='agregar')return;
    status.textContent=data.results.map(r=>r.source+': '+({found:'coincidencia ✓',empty:'sin coincidencia',error:'no disponible'}[r.status])).join(' · ');
    if(!data.book){showRecognitionFallback('Podés intentar nuevamente o completar la ficha con la información disponible.');result.innerHTML=`<div class="notice"><strong>No encontramos una ficha automática para este ISBN.</strong><p>Podés verificarlo en las fuentes argentinas o continuar con carga manual.</p></div>`;return;}
    const b=data.book,duplicate=books.find(x=>canonicalISBN(x.isbn)===canonicalISBN(b.isbn));
    result.innerHTML=`<div class="result-card"><div class="result-cover">${cover({...b,category:b.category||'Material'})}</div><div><span class="result-ok">COINCIDENCIA BIBLIOGRÁFICA</span><h2>${escape(b.title)}</h2><p>${escape(b.author||'Autor no informado')}</p><dl class="mini-data"><div><dt>Editorial</dt><dd>${escape(b.publisher||'Sin información')}</dd></div><div><dt>Año</dt><dd>${escape(b.year||'—')}</dd></div><div><dt>ISBN consultado</dt><dd>${escape(cleanISBN(b.isbn))}</dd></div><div><dt>Idioma</dt><dd>${escape(b.language||'Sin información')}</dd></div><div><dt>Fuentes</dt><dd>${escape((b.sources||[]).join(' · '))}</dd></div></dl>${subjectChips(b)}<p class="muted">Se consultaron también las variantes equivalentes del ISBN cuando correspondía.</p><button id="confirm-isbn" class="button primary">${duplicate?'Abrir registro existente':'Confirmar y registrar ejemplares'}</button></div></div>`;
    $('#confirm-isbn').onclick=()=>{if(duplicate){location.hash='#ficha/'+duplicate.id;}else{draft={copies:1,category:'Otros',materialType:'libro',...b};location.hash='#editar/nuevo';}};
  }catch(error){if(error.name!=='AbortError'&&version===lookupVersion)showRecognitionFallback(error.message);}
}
function formHTML(book={},suggested=false){
  return `<form id="book-form" class="institution-form" novalidate><input type="hidden" name="id" value="${escape(book.id||'')}">
    ${book.sources?.length?`<div class="provenance"><strong>Ficha asistida</strong><span>Datos obtenidos de ${escape(book.sources.join(' · '))}. Revisá la edición antes de guardar.</span></div>`:''}
    ${suggested?`<div class="edition-summary"><span class="eyebrow">EDICIÓN IDENTIFICADA</span><h2>${escape(book.title)}</h2><p>${escape(book.author||'Autor no informado')} · ${escape(book.publisher||'Editorial no informada')}</p><p>Completá los datos físicos. La ficha bibliográfica ya está recuperada y podés revisarla debajo.</p></div>`:''}
    <section class="form-section accent-section"><div class="form-section-heading"><div><span>INVENTARIO INSTITUCIONAL</span><h2>Ejemplares físicos, si corresponde</h2></div><small>${book.id?'Al cambiar ubicación o estado general, se actualizan todos los ejemplares. También podés editar cada copia desde su ficha.':'Para un recurso sin copia física, indicá 0. Cada contenido interno pertenece al material que lo contiene; no agrega ejemplares.'}</small></div>
      <div class="form-grid three"><label>Cantidad de ejemplares *<input name="copies" type="number" min="0" max="9999" value="${escape(book.copies??1)}" required></label><label>Estado general<select name="condition">${['Nuevo','Bueno','Regular','Deteriorado'].map(c=>`<option ${c===(book.condition||'Bueno')?'selected':''}>${c}</option>`).join('')}</select></label><label>Ubicación física<input name="location" maxlength="120" value="${escape(book.location||'')}" placeholder="Ej.: Sector infantil · Estantería 2"></label></div>
    </section>
    <details class="form-section bibliographic-fields" ${suggested?'':'open'}><summary>Revisar o corregir ficha bibliográfica</summary><div class="form-section-heading"><div><span>DATOS BIBLIOGRÁFICOS</span><h2>Identificación del material</h2></div><small>${suggested?'Completados automáticamente cuando la fuente los informó.':'Completá únicamente la información disponible.'}</small></div>
      <label>Tipo de material (revisalo después del reconocimiento)<select name="materialType">${Object.entries(MATERIAL_TYPES).map(([id,label])=>`<option value="${id}" ${id===(book.materialType||(book.isbn?'libro':'otro'))?'selected':''}>${label}</option>`).join('')}</select></label><label>Regla de circulación<select name="circulationPolicy"><option value="standard" ${(book.circulationPolicy||'standard')==='standard'?'selected':''}>Préstamo normal</option><option value="non-renewable" ${book.circulationPolicy==='non-renewable'?'selected':''}>Préstamo sin renovación</option><option value="room-only" ${book.circulationPolicy==='room-only'?'selected':''}>Solo consulta en sala</option></select><small>Esta regla se aplica a todos los ejemplares de este material. Podés cambiarla más adelante.</small></label><label>Obra intelectual<select name="workId"><option value="">Nueva obra</option>${[...new Map(books.filter(b=>b.workId).map(b=>[b.workId,b])).values()].map(b=>`<option value="${escape(b.workId)}" ${b.workId===book.workId?'selected':''}>${escape(b.title)}</option>`).join('')}</select><small>Vinculá ediciones solo si corresponden a la misma obra. Los datos de la obra se comparten; ISBN, editorial y ejemplares son propios de cada edición.</small></label><label>Título *<input name="title" required maxlength="180" value="${escape(book.title||'')}"></label>
      <label>Autor/es<input name="author" maxlength="1000" value="${escape(book.author||'')}" placeholder="Separar varios autores con punto y coma"></label>
      <div class="form-grid three"><label>ISBN (opcional)<input name="isbn" maxlength="24" value="${escape(book.isbn||'')}" inputmode="numeric"><small>Solo si corresponde al material; no es obligatorio.</small></label><label>Categoría<select name="category">${categories.map(c=>`<option ${c===(book.category||'Otros')?'selected':''}>${c}</option>`).join('')}</select></label><label>Editorial / entidad responsable (opcional)<input name="publisher" value="${escape(book.publisher||'')}" maxlength="120"></label></div>
      <div class="form-grid three"><label>Año<input name="year" value="${escape(book.year||'')}" inputmode="numeric" maxlength="4"></label><label>Páginas<input name="pages" type="number" min="1" max="100000" value="${escape(book.pages||'')}"></label><label>Idioma<input name="language" value="${escape(book.language||'')}" maxlength="30"></label></div>
      <div class="form-grid"><label>Publicación / serie<input name="publication" maxlength="300" value="${escape(book.publication||'')}" placeholder="Nombre del diario, revista o publicación"></label><label>Fecha de publicación<input name="publicationDate" type="date" value="${escape(book.publicationDate||'')}"></label><label>Número o edición<input name="edition" maxlength="300" value="${escape(book.edition||'')}"></label><label>ISSN (si existe)<input name="issn" maxlength="20" value="${escape(book.issn||'')}"></label><label>DOI (si existe)<input name="doi" maxlength="500" value="${escape(book.doi||'')}"></label><label>Enlace del recurso<input name="resourceUrl" type="url" maxlength="2000" value="${escape(book.resourceUrl||'')}"></label><label>Otro identificador<input name="otherIdentifier" maxlength="2000" value="${escape(book.otherIdentifier||'')}"></label></div>
      <label>Palabras clave / temas<textarea name="subjects" rows="3">${escape((book.subjects||[]).join('\n'))}</textarea><small>Se usan para mejorar la recuperación temática en el buscador.</small></label>
    </details>
    <details class="form-section optional-section"><summary>Información complementaria</summary><label>Subtítulo<input name="subtitle" maxlength="300" value="${escape(book.subtitle||'')}"></label><label>Contenido interno<textarea name="contents" rows="4">${escape((book.contents||[]).join('\n'))}</textarea><small>Cuentos, capítulos, artículos, titulares, suplementos o secciones: uno por línea. Permiten encontrar el material que los contiene, sin crear copias independientes.</small></label><label>Descripción o resumen<textarea name="description" rows="4">${escape(book.description||'')}</textarea></label><label>Audiencia documentada<input name="audience" maxlength="500" value="${escape(book.audience||'')}" placeholder="Ej.: quinto grado, si está indicado en el material"></label><label>Notas institucionales<textarea name="notes" rows="3">${escape(book.notes||'')}</textarea></label></details>
    <div class="save-area"><p id="form-error" class="error" role="alert" tabindex="-1"></p><div class="form-actions"><a class="button secondary" href="${book.id?'#ficha/'+book.id:'#agregar'}">Cancelar</a><button class="button primary" type="submit">Guardar en el catálogo</button></div></div>
  </form>`;
}
function renderEditor(id){
  const existing=id==='nuevo'?null:books.find(b=>b.id===id);
  const book=structuredClone(existing||draft||{copies:1,category:'Otros'});if(!existing&&!can('holdings.create')){book.copies=0;book.exemplars=[];}
  if(id!=='nuevo'&&!existing){location.hash='#biblioteca';return;}
  $('#main').innerHTML=`<div class="flow-header"><a href="${existing?'#ficha/'+existing.id:'#agregar'}" class="button secondary back-link">← Volver</a><span class="step">${existing?'EDICIÓN DE REGISTRO':'INCORPORACIÓN · PASO 2 DE 2'}</span></div><div class="page-heading"><div><h1>${existing?'Editar registro bibliográfico':'Revisar e incorporar material'}</h1><p class="muted">${existing?'Actualizá los datos bibliográficos o de inventario.':'El sistema se adapta al material. Revisá la información y completá solamente lo que falta.'}</p></div></div>${!existing&&!can('holdings.create')?'<p class="notice">Podés incorporar la ficha del material. Una persona con permiso para agregar ejemplares completará las copias físicas.</p>':''}${formHTML(book,!existing&&Boolean(draft?.sources?.length))}`;if(!can('holdings.create')&&!existing){const input=$('[name=copies]');input.readOnly=true;}
}
async function renderDetail(id,copyId){
  const detailRoute=route();
  const b=books.find(x=>x.id===id);if(!b){location.hash='#biblioteca';return;}
  const photos=await getPhotos(id).catch(()=>[]);
  if(route()!==detailRoute)return;
  detailPhotos=photos;
  const selected=b.exemplars?.find(e=>e.id===copyId)||b.exemplars?.[0];
  const photo=detailPhotos.find(p=>p.id===selected?.id);
  $('#main').innerHTML=`<div class="flow-header"><a href="#biblioteca" class="button secondary back-link">← Catálogo</a><span class="step">REGISTRO BIBLIOGRÁFICO</span></div>
  <article class="record-page"><section class="record-main"><div class="record-cover">${safeCover(b.cover)?`<button data-cover="${escape(b.id)}" class="cover-zoom" aria-label="Ampliar portada bibliográfica">${cover(b)}</button>`:cover(b)}<small>Portada bibliográfica${safeCover(b.cover)?' · Tocá para ampliar':''}</small></div><div class="record-info"><div class="record-title-row"><div><span class="eyebrow">${escape(b.category)}</span><h1>${escape(b.title)}</h1><p class="record-author">${escape(b.author||'Autor no informado')}</p></div><a class="button secondary" href="#editar/${escape(b.id)}">Editar registro</a></div>${subjectChips(b)}<div class="availability"><strong>${b.copies} ${b.copies===1?'ejemplar registrado':'ejemplares registrados'}</strong><span>${escape([...new Set((b.exemplars||[]).map(e=>e.location).filter(Boolean))].join(' · ')||b.location||'Ubicación pendiente')}</span><span>${escape([...new Set((b.exemplars||[]).map(holdingState))].join(' · ')||'Sin ejemplares')}</span><span>Estado: ${escape([...new Set((b.exemplars||[]).map(e=>e.condition).filter(Boolean))].join(' · ')||b.condition||'Bueno')}</span></div><details><summary>Datos de la edición</summary><dl class="detail-data"><div><dt>Tipo de material</dt><dd>${escape(MATERIAL_TYPES[b.materialType]||'Material')}</dd></div><div><dt>Publicación / fecha / edición</dt><dd>${escape([b.publication,b.publicationDate,b.edition].filter(Boolean).join(' · ')||'—')}</dd></div><div><dt>Otros identificadores</dt><dd>${escape([b.issn,b.doi,b.resourceUrl,b.otherIdentifier].filter(Boolean).join(' · ')||'—')}</dd></div><div><dt>ISBN</dt><dd>${escape(b.isbn||'Sin ISBN')}</dd></div><div><dt>Editorial</dt><dd>${escape(b.publisher||'Sin información')}</dd></div><div><dt>Año</dt><dd>${escape(b.year||'—')}</dd></div><div><dt>Páginas</dt><dd>${escape(b.pages||'—')}</dd></div><div><dt>Fuentes</dt><dd>${escape((b.sources||[]).join(' · ')||'Carga institucional')}</dd></div></dl></details>${b.description?`<details><summary>Descripción</summary><p class="detail-text">${escape(b.description)}</p></details>`:''}${(b.sourceSubjects||[]).length?`<details><summary>Más temas e información de origen</summary><p class="detail-text">${(b.sourceSubjects||[]).map(escape).join(' · ')}</p></details>`:''}${b.contents?.length?`<details><summary>Contenidos indexados (${b.contents.length})</summary><ul class="detail-text">${b.contents.map(c=>`<li>${escape(c)}</li>`).join('')}</ul></details>`:''}</div></section>
  <aside class="record-side panel"><h2>Ejemplar físico</h2><p class="muted">La portada editorial y la foto del ejemplar se mantienen separadas.</p><label>Ejemplar<select id="photo-copy">${(b.exemplars||[]).map((e,i)=>`<option value="${escape(e.id)}" ${e.id===selected?.id?'selected':''}>Ejemplar ${i+1}${e.inventoryCode?' · '+escape(e.inventoryCode):''}</option>`).join('')}</select></label><div id="photo-preview">${photo&&validPhotoURL(photo.dataUrl)?`<button class="photo-thumbnail" data-view-photo="${escape(photo.id)}"><img src="${photo.dataUrl}" alt="Foto del ejemplar físico"></button>`:'<div class="photo-empty">Sin fotografía del ejemplar</div>'}</div><div class="photo-actions"><button class="button secondary" data-photo="camera">Sacar foto</button><button class="button secondary" data-photo="file">Elegir archivo</button></div><div id="copy-details"></div></aside></article>${dangerZone('Eliminar este registro','Se perderán la ficha, todos sus ejemplares y sus fotografías. Esta acción no se puede deshacer.',`<button class="button danger" data-delete="${escape(b.id)}">Eliminar registro</button>`)}`;
  renderSelectedPhoto();
}
function selectedPhoto(){
 const id=$('#photo-copy')?.value;return detailPhotos.find(p=>p.id===id);
}
function renderSelectedPhoto(){
 const p=selectedPhoto(),box=$('#photo-preview');if(!box)return;
 const book=books.find(b=>b.id===route().split('/')[1]),copy=book?.exemplars?.find(e=>e.id===$('#photo-copy')?.value);
 document.querySelectorAll('[data-photo]').forEach(b=>b.disabled=!copy);
 const details=$('#copy-details');if(details)details.innerHTML=copy?copyHTML(copy):'<p class=muted>La biblioteca todavía no registró ejemplares físicos de este material.</p>';
 box.innerHTML=p&&validPhotoURL(p.dataUrl)?`<button class="photo-thumbnail" data-view-photo="${escape(p.id)}"><img src="${p.dataUrl}" alt="Foto del ejemplar físico"></button>`:'<div class="photo-empty">Sin fotografía del ejemplar</div>';
}
function copyHTML(copy){return `<p><strong>Código interno: ${escape(copy.internalCode||'Pendiente')} · ${escape(holdingState(copy))}</strong></p><div class="button-row"><a class="button secondary" href="#ejemplar/${escape(copy.id)}">Ubicación y circulación</a><a class="button secondary" href="#etiquetas/${escape(copy.id)}">Imprimir etiqueta</a></div><p class="copy-summary">${escape(copy.inventoryCode||'Sin código de inventario')} · ${escape(copy.location||'Ubicación pendiente')} · ${escape(copy.condition||'Bueno')}</p><details class="copy-editor"><summary>Editar datos de este ejemplar</summary><form id="copy-form"><h3>Datos de este ejemplar</h3><label>Inventario<input name="inventoryCode" maxlength="100" value="${escape(copy.inventoryCode||'')}" placeholder="Código interno opcional"></label><label>Ubicación<input name="location" maxlength="120" value="${escape(copy.location||'')}"></label><label>Estado físico<select name="condition">${['Nuevo','Bueno','Regular','Deteriorado'].map(c=>`<option ${c===copy.condition?'selected':''}>${c}</option>`).join('')}</select></label><p class="error" id="copy-error" role="alert"></p><button class="button secondary">Guardar ejemplar</button></form></details>${dangerZone('Foto y ejemplar','Borrar la foto conserva el ejemplar. Eliminar el ejemplar también elimina su fotografía, pero conserva la ficha bibliográfica.',`<div class="button-row"><button class="button danger" data-delete-photo="${escape(copy.id)}" ${selectedPhoto()?'':'disabled'}>Borrar fotografía</button><button class="button danger" data-delete-copy="${escape(copy.id)}">Eliminar ejemplar</button></div>`)}`;}
function showImage(url,title){
 if(!safeCover(url)&&!validPhotoURL(url))return;
 $('#image-title').textContent=title;$('#large-image').alt=title;$('#large-image').src=url;$('#image-status').textContent='';$('#image-viewer').showModal();
}
function stopScan(){scanController?.abort();scanController=null;const panel=$('#camera-panel');if(panel)panel.hidden=true;}
function cancelLookup(increment=true){if(increment)lookupVersion++;lookupController?.abort();lookupController=null;stopScan();}

document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.close)document.getElementById(button.dataset.close)?.close();
 if(button.dataset.query){query=button.dataset.query;category='';location.hash='#biblioteca';}
 if(button.dataset.action==='theme')setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
 if(button.dataset.action==='help')$('#help').showModal();
 if(button.dataset.action==='manual'){draft=identifierDraft($('#isbn-query')?.value||'');location.hash='#editar/nuevo';}
 if(button.dataset.action==='export'){try{const photos=await getPhotos();const blob=new Blob([JSON.stringify(await exportArchive(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='biblioteca-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Respaldo exportado.');}catch{notify('No se pudo exportar el respaldo.');}}
 if(button.dataset.action==='import')$('#import-file').click();
 if(button.dataset.action==='import-aguapey')$('#aguapey-file').click();
 if(button.dataset.action==='camera-unavailable')showRecognitionFallback('Si no podés usar la cámara, ingresá el código, usá una fotografía o incorporá el material manualmente.');
 if(button.dataset.action==='enter-code'){$('#isbn-form').hidden=false;$('#isbn-query').focus();}
 if(button.dataset.action==='retry-recognition')$('#scan-start').click();
 if(button.id==='scan-start'){
   stopScan();scanController=new AbortController();const controller=scanController;$('#camera-panel').hidden=false;$('#lookup-status').textContent='Solicitando acceso a la cámara…';
   try{await scanISBN($('#scanner-video'),{signal:controller.signal,detectorFactory:createMaterialDetector,accept:value=>Boolean(String(value).trim()),onReady:()=>{$('#lookup-status').textContent='Cámara lista. Encuadrá el código completo.';},onISBN:isbn=>{stopScan();$('#isbn-query').value=isbn;runLookup(isbn);},onError:()=>{stopScan();showRecognitionFallback('No pudimos leer el código en vivo. Intentá nuevamente o usá otra opción.');}});}catch(error){if(!controller.signal.aborted){stopScan();showRecognitionFallback(error.name==='NotAllowedError'?'El navegador bloqueó la cámara. Revisá el permiso o usá otra opción.':error.message);}}
 }
 if(button.id==='scan-stop'){stopScan();showRecognitionFallback();}
 if(button.id==='scan-photo')$('#barcode-photo').click();
 if(button.dataset.cover){const b=books.find(x=>x.id===button.dataset.cover);showImage(b?.cover,'Portada bibliográfica');}
 if(button.dataset.viewPhoto){const p=detailPhotos.find(x=>x.id===button.dataset.viewPhoto);if(p)showImage(p.dataUrl,'Foto del ejemplar físico');}
 if(button.dataset.photo){const id=route().split('/')[1];photoTarget={bookId:id,id:$('#photo-copy').value};$('#physical-'+(button.dataset.photo==='camera'?'camera':'photo')).click();}
 if(button.dataset.delete){const book=books.find(b=>b.id===button.dataset.delete);if(book&&await confirmAction('Eliminar registro',`Se eliminará “${book.title}”, sus ${book.copies} ejemplares y sus fotografías. Esta acción no se puede deshacer.`)){try{await deleteBook(book.id);books=await readBooks();notify('Registro eliminado.');location.hash='#biblioteca';}catch(error){notify(storageMessage(error));}}}
 if(button.dataset.deletePhoto&&await confirmAction('Borrar fotografía','Se eliminará la fotografía de este ejemplar. La ficha y el ejemplar se conservarán.','Borrar fotografía')){try{await deletePhoto(button.dataset.deletePhoto);detailPhotos=await getPhotos(route().split('/')[1]);renderSelectedPhoto();notify('Fotografía eliminada.');}catch(error){notify(storageMessage(error));}}
 if(button.dataset.deleteCopy&&await confirmAction('Eliminar ejemplar','Se eliminará esta copia física con su fotografía. La ficha bibliográfica y los demás ejemplares se conservarán.','Eliminar ejemplar')){try{await deleteExemplar(route().split('/')[1],button.dataset.deleteCopy);books=await readBooks();await renderDetail(route().split('/')[1]);notify('Ejemplar eliminado.');}catch(error){notify(storageMessage(error));}}
 if(button.dataset.action==='clear-catalog'&&await confirmAction('Vaciar catálogo',`Se eliminarán ${books.length} registros y todas sus fotografías de este navegador. Necesitarás un respaldo para recuperarlos.`,'Vaciar catálogo definitivamente')){try{await clearCatalog();books=[];renderSettings();notify('Catálogo local vaciado.');}catch(error){notify(storageMessage(error));}}
});
document.addEventListener('submit',async event=>{
 if(event.target.matches('#home-search')){event.preventDefault();query=$('#home-query').value;category='';location.hash='#biblioteca';return;}
 if(event.target.matches('#copy-form')){event.preventDefault();const form=event.target,submit=form.querySelector('button');submit.disabled=true;try{const id=$('#photo-copy').value,book=books.find(b=>b.id===route().split('/')[1]),fields=Object.fromEntries(new FormData(form));const copy=book.exemplars.find(e=>e.id===id);await execute('copy.save',{id,...(fields.location===copy.location?copy.physicalLocation:{}),...fields,status:['lost','withdrawn','damaged'].includes(copy.status)?copy.status:'available'});books=await readBooks();await renderDetail(book.id,id);notify('Ejemplar actualizado.');}catch(error){$('#copy-error').textContent=storageMessage(error);}finally{submit.disabled=false;}return;}
 if(event.target.matches('#isbn-form')){event.preventDefault();runLookup($('#isbn-query').value);return;}
 // A form control named "id" shadows HTMLFormElement.id in browsers.
 if(event.target.matches('#book-form')){
   event.preventDefault();const form=event.target,submit=form.querySelector('[type=submit]'),feedback=form.querySelector('#form-error');
   if(submit.disabled)return;
   feedback.textContent='';
   const invalid=[...form.elements].find(field=>field.willValidate&&!field.validity.valid);
   if(invalid){invalid.closest('details')?.setAttribute('open','');invalid.setAttribute('aria-invalid','true');feedback.textContent='Revisá '+(invalid.closest('label')?.firstChild.textContent.trim()||'el campo marcado')+': '+invalid.validationMessage;invalid.focus();return;}
   submit.disabled=true;submit.textContent='Guardando…';form.setAttribute('aria-busy','true');
   try{const raw=Object.fromEntries(new FormData(form)),existing=books.find(b=>b.id===raw.id);const book=assignMissingInventoryCodes(validateBook({...existing,...(!existing?draft:null),...raw,...(existing?{exemplars:existing.exemplars.map(e=>({...e,...(raw.location!==existing.location?{location:raw.location}:{}),...(raw.condition!==existing.condition?{condition:raw.condition}:{})}))}:{})}),books.filter(b=>b.id!==existing?.id));const duplicate=book.isbn&&books.find(b=>b.id!==book.id&&canonicalISBN(b.isbn)===canonicalISBN(book.isbn));if(duplicate)throw new Error('Este ISBN ya está registrado en '+duplicate.title+'.');if(existing&&book.copies<existing.copies&&!await confirmAction('Reducir ejemplares',`Se quitarán ${existing.copies-book.copies} ejemplares del final de la lista y sus fotografías. Exportá un respaldo antes de continuar.`,'Reducir ejemplares'))return;await saveBook(book);books=await readBooks();draft=null;notify(existing?'Registro actualizado.':'Material incorporado al catálogo.');location.hash='#ficha/'+book.id;}catch(error){feedback.textContent=storageMessage(error);feedback.focus();}finally{submit.disabled=false;submit.textContent='Guardar en el catálogo';form.removeAttribute('aria-busy');}
 }
});
document.addEventListener('input',event=>{event.target.removeAttribute('aria-invalid');if(event.target.id==='search'){query=event.target.value;const start=event.target.selectionStart,end=event.target.selectionEnd;renderLibrary();const input=$('#search');input.focus();input.setSelectionRange(start,end);}});
document.addEventListener('change',event=>{if(event.target.id==='category'){category=event.target.value;renderLibrary();}if(event.target.id==='photo-copy')renderSelectedPhoto();});
$('#barcode-photo').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;const status=$('#lookup-status');status.textContent='Analizando la fotografía del código…';try{const isbn=await scanMaterialFromFile(file);if(route()!=='agregar')return;$('#isbn-query').value=isbn;await runLookup(isbn);}catch(error){showRecognitionFallback(error.message);}});
$('#aguapey-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>25*1024*1024)throw new Error('El archivo ISO supera 25 MB.');const parsed=AguapeyMarcProvider.parse(await file.arrayBuffer());if(!parsed.books.length)throw new Error('No encontramos registros MARC válidos en el archivo.');if(!await confirmAction('Importar desde Aguapey',`Se detectaron ${parsed.records} registros y ${parsed.books.length} fichas utilizables. Se incorporarán al catálogo local; revisá luego inventarios y ubicaciones.`,'Importar registros'))return;const prepared=parsed.books.map(validateBook);await mergeBooks(prepared,[],'aguapey.imported');books=await readBooks();renderInteroperability();notify(`Importación completa: ${prepared.length} registros.`);}catch(error){notify(error.message||'No se pudo importar el archivo de Aguapey.');}});
$('#import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>50*1024*1024)throw new Error('El archivo supera 50 MB.');const archive=JsonBackupProvider.parse(await file.text());if(!await confirmAction('Importar respaldo','Se incorporarán '+archive.books.length+' registros. Un respaldo completo reemplaza su institución (incluye personas y circulación). Si todavía no existe en este navegador, se recupera como otro espacio; los respaldos antiguos combinan catálogo y fotos. Exportá el catálogo actual antes de continuar.','Importar y reemplazar coincidencias'))return;if(archive.version>=4)await restoreArchive(archive);else await mergeBooks(archive.books.map(localizeBook),archive.photos);books=await readBooks();render();notify('Respaldo importado.');}catch(error){notify(error.message||'No se pudo importar.');}});
for(const input of [$('#physical-photo'),$('#physical-camera')])input.addEventListener('change',async event=>{const file=event.target.files[0],target=photoTarget;event.target.value='';if(!file||!target)return;try{const dataUrl=await preparePhoto(file);if(detailPhotos.some(p=>p.id===target.id)&&!await confirmAction('Reemplazar fotografía','La foto anterior de este ejemplar será reemplazada por la nueva.','Reemplazar fotografía'))return;await savePhoto({...target,dataUrl,takenAt:new Date().toISOString()});detailPhotos=await getPhotos(target.bookId);renderSelectedPhoto();notify('Foto del ejemplar guardada localmente.');}catch(error){notify(error.message||'No se pudo guardar la foto.');}});
$('#large-image').addEventListener('error',()=>$('#image-status').textContent='No se pudo cargar la imagen.');
$('#image-viewer').addEventListener('close',()=>$('#large-image').removeAttribute('src'));
window.addEventListener('hashchange',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScan();});
window.addEventListener('pagehide',cancelLookup);
document.addEventListener('error',event=>{if(event.target.matches?.('.real-cover img')){event.target.hidden=true;event.target.nextElementSibling.hidden=false;}},true);

initAccessUI(async context=>{if(context){query='';category='';draft=null;detailPhotos=[];cancelLookup();}books=await readBooks();await render();});
initLocalUI(async context=>{if(context){query='';category='';draft=null;detailPhotos=[];cancelLookup();}books=await readBooks();await render();});
$('#main').innerHTML='<p class="muted">Abriendo catálogo institucional…</p>';
try{await openDatabase();const existing=await getBooks();books=existing.map(b=>localizeBook(b.schemaVersion===2?b:validateBook(b)));if(existing.some(b=>b.schemaVersion!==2))await mergeBooks(books);await refreshSession();ready=true;render();}catch{$('#main').innerHTML='<div class="notice"><h1>No pudimos abrir el catálogo local</h1><p>Revisá los permisos de almacenamiento del navegador y volvé a cargar la página.</p></div>';}

document.addEventListener('click',e=>{const b=e.target.closest('[data-dashboard-scroll]');if(b)document.getElementById(b.dataset.dashboardScroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});});
