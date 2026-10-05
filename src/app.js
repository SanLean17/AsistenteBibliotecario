import { localizeBook } from './subjects.js?v=20261004-2';
import { preparePhoto, validPhotoURL } from './photos.js?v=20261004-2';
import { lookupISBN, safeCover } from './metadata.js?v=20261004-2';
import { scanISBN } from './scanner.js?v=20261004-2';
import { canonicalISBN } from './isbn.js?v=20261004-2';
import { categories, searchBooks, validateBook, parseArchive } from './catalog.js?v=20261004-2';
import { openDatabase, getBooks, saveBook, deleteBook, mergeBooks, getPhotos, savePhoto } from './storage.js?v=20261004-2';
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let activeDetail=null, detailVersion=0, detailPhotos=[], photoTarget=null;
const readBooks = async () => (await getBooks()).map(localizeBook);
let draft = null, lookupController, scanController, lookupVersion=0;
let books = [], query = '', category = '', ready = false, toastTimer;
const isLibrary = () => location.hash === '#biblioteca';
function notify(message) { $('#toast').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').textContent = '', 5000); }
function cover(book) { if(safeCover(book.cover)) return `<div class="cover real-cover"><img src="${escape(safeCover(book.cover))}" alt="Portada de ${escape(book.title)}" loading="lazy" referrerpolicy="no-referrer"><span class="cover-fallback" hidden>Portada no disponible</span></div>`; const color = [...book.title].reduce((n,c)=>n+c.charCodeAt(0),0)%4; return `<div class="cover" data-color="${color}"><small>${escape(book.category)}</small><strong>${escape(book.title)}</strong><span>❧</span></div>`; }
function cards(list) { return `<div class="book-grid">${list.map(book => `<button class="book-card" data-book="${escape(book.id)}" aria-label="Ver ${escape(book.title)}">${cover(book)}<h3>${escape(book.title)}</h3><p>${escape(book.author || 'Autor por completar')}</p><div class="book-meta"><span>${escape(book.category)}</span><span>${book.copies} ej.</span></div></button>`).join('')}</div>`; }
function empty(filtered = false) { return `<div class="empty"><div class="empty-symbol">▤</div><h3>${filtered ? 'No encontramos ese libro' : 'Tu primera historia empieza acá'}</h3><p>${filtered ? 'Probá con otro título, autor, ISBN o cuento, o cambiá la categoría.' : 'Agregá un libro de tu casa y empezá a darle forma a tu biblioteca.'}</p><button class="button secondary" data-action="${filtered ? 'clear' : 'add'}">${filtered ? 'Limpiar búsqueda' : '＋ Agregar mi primer libro'}</button></div>`; }
function render() {
  document.querySelectorAll('[data-nav]').forEach(el => { const active = el.dataset.nav === (isLibrary() ? 'biblioteca' : 'inicio'); el.classList.toggle('active', active); if(active) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current'); });
  if (!ready) return;
  const recent = [...books].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,4);
  $('#main').innerHTML = isLibrary() ? `<div class="page-heading"><div><span class="eyebrow">CADA LIBRO TIENE SU LUGAR</span><h1>Mi biblioteca</h1><p class="muted">Encontrá tu próxima lectura entre tus propios libros.</p></div><button class="button primary" data-action="add">＋ Agregar libro</button></div><div class="catalog-tools"><div class="search-box"><span aria-hidden="true">⌕</span><input id="search" type="search" aria-label="Buscar libros" placeholder="Título, autor, ISBN o cuento…" value="${escape(query)}"></div><select id="category" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>${categories.map(c => `<option ${c === category ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div id="results"></div><div class="backup-bar"><p>Tu catálogo queda en este navegador.<br>Guardá una copia para cuidarlo.</p><div><button class="button secondary" data-action="export">↓ Exportar respaldo</button><button class="button secondary" data-action="import">↑ Importar</button></div></div>` : `<div class="page-heading"><div><span class="eyebrow">BIENVENIDO A TU BIBLIOTECA</span><h1>Un mundo por descubrir.</h1><p class="muted">Tus libros, sus historias y un lugar para encontrarlos.</p></div><button class="button secondary" data-action="add">＋ Agregar libro</button></div><section class="hero"><div class="hero-copy"><h2>Grandes historias.<br>Pequeños comienzos.</h2><p>Un libro a la vez, construimos una biblioteca llena de posibilidades.</p><button class="button primary" data-action="add">＋ Agregar un libro</button></div><div class="books-art" aria-hidden="true"><div class="art-circle"></div><div class="book-spine spine-one">CUENTOS</div><div class="book-spine spine-two">HISTORIAS</div><div class="book-spine spine-three">DESCUBRIR</div></div></section><section class="stats" aria-label="Resumen de la biblioteca"><div class="stat"><span class="stat-icon">▥</span><div><strong>${books.length}</strong><small>Libros en catálogo</small></div></div><div class="stat"><span class="stat-icon">▤</span><div><strong>${books.reduce((n,b)=>n+b.copies,0)}</strong><small>Ejemplares</small></div></div><div class="stat"><span class="stat-icon">☷</span><div><strong>${books.reduce((n,b)=>n+b.contents.length,0)}</strong><small>Cuentos / capítulos</small></div></div></section><section><div class="section-heading"><h2>Últimos libros agregados</h2><a class="text-button" href="#biblioteca">Ver biblioteca →</a></div>${recent.length ? cards(recent) : empty()}</section><div class="bottom-note"><span aria-hidden="true">❧</span><div><strong>Hoy en casa. Mañana, en la escuela.</strong><p>Este es tu espacio para probar, ordenar y descubrir. Empezá con los libros que tenés a mano.</p></div></div>`;
  if (isLibrary()) renderResults();
}
function renderResults() { const list = searchBooks(books, query, category).sort((a,b)=>a.title.localeCompare(b.title,'es')); $('#results').innerHTML = `<p class="catalog-summary" role="status">${list.length} ${list.length === 1 ? 'libro' : 'libros'}${query || category ? ' encontrados' : ' en tu catálogo'}</p>${list.length ? cards(list) : empty(Boolean(query || category))}`; }
function edit(book, suggested = false) {
  if (!ready) return notify('No se pudo abrir el almacenamiento del navegador.');
  draft = suggested ? book : null;
  const form = $('#book-form'); form.reset(); $('#optional-contents').open=false; $('#form-error').textContent = '';
  form.elements.id.value = '';
  if (book) for (const [key,value] of Object.entries(book)) if (form.elements.namedItem(key)) form.elements.namedItem(key).value = Array.isArray(value) ? value.join('\n') : value ?? '';
  if(book?.categorySuggested)$('#editor-provenance').dataset.suggestion='Categoría sugerida por los temas; podés corregirla.'; else $('#editor-provenance').dataset.suggestion='';
  $('#editor-title').textContent = suggested ? '2 · Tus ejemplares' : book ? 'Editar libro' : 'Carga manual'; $('#bibliographic-fields').open=!suggested; $('#editor-provenance').hidden=!book?.sources?.length; $('#editor-provenance').textContent='Datos consultados: '+(book?.sources||[]).join(' · ')+'. '+($('#editor-provenance').dataset.suggestion||'Podés revisar y corregir la ficha.'); $('#editor').showModal(); (suggested ? form.elements.copies : form.elements.title).focus();
}
function subjectChips(book) {
 const topics=book.subjects||[];
 return `${topics.length?`<div class="subject-chips">${topics.slice(0,4).map(t=>`<span>${escape(t)}</span>`).join('')}</div>`:''}${topics.length>4?`<details><summary>Ver más temas (${topics.length-4})</summary><div class="subject-chips">${topics.slice(4).map(t=>`<span>${escape(t)}</span>`).join('')}</div></details>`:''}`;
}
async function showDetail(id) {
 const b=books.find(book=>book.id===id);if(!b)return;
 activeDetail=id;detailPhotos=[];const version=++detailVersion;
 const rows=entries=>entries.map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('');
 $('#detail').innerHTML=`<div class="dialog-heading"><div><span class="eyebrow">FICHA DEL LIBRO</span><h2 id="detail-title">${escape(b.title)}</h2></div><button class="close" data-close="detail" aria-label="Cerrar">×</button></div><p class="muted">${escape(b.author||'Autor por completar')}</p><div class="detail-cover">${safeCover(b.cover)?`<button class="cover-zoom" data-cover="${escape(id)}" aria-label="Ampliar portada">${cover(b)}</button><small>Tocá la portada para ampliarla</small>`:cover(b)}</div>${subjectChips(b)}<dl class="detail-data">${rows([['Categoría',b.category+(b.categorySuggested?' (sugerida)':'')],['Ejemplares',b.copies],['Ubicación',b.location||'Sin asignar'],['Estado',b.condition||'Bueno']])}</dl><details><summary>Datos de la edición y fuentes</summary><dl class="detail-data">${rows([['ISBN',b.isbn||'Sin ISBN'],['Editorial',b.publisher||'Sin completar'],['Año',b.year||'Sin completar'],['Páginas',b.pages||'Sin completar'],['Idioma',b.language||'Sin completar'],['Fuentes',(b.sources||[]).join(' · ')||'Carga manual']])}</dl>${b.sourceSubjects?.length?`<details><summary>Etiquetas originales de la fuente (${b.sourceSubjects.length})</summary><p class="muted">Se conservan para consulta. Pueden incluir otras adaptaciones, idiomas o formatos de la obra.</p><p class="detail-text">${escape(b.sourceSubjects.join(' · '))}</p></details>`:''}</details>${b.contents.length?`<details><summary>Cuentos y capítulos (${b.contents.length})</summary><ul class="detail-text">${b.contents.map(c=>`<li>${escape(c)}</li>`).join('')}</ul></details>`:''}${b.notes?`<details><summary>Notas</summary><p class="detail-text">${escape(b.notes)}</p></details>`:''}
 <section class="physical-photo-section"><h3>Foto de tu ejemplar</h3><p class="muted">Mostrá su estado real. Se guarda en este navegador y en el respaldo, no en Internet.</p><label>Ejemplar a fotografiar<select id="photo-copy">${b.exemplars.map((e,i)=>`<option value="${escape(e.id)}">Ejemplar ${i+1}</option>`).join('')}</select></label><div id="photo-preview"></div><p id="photo-status" role="status">Buscando foto…</p><div class="photo-actions"><button class="button secondary" data-photo="camera">Sacar foto</button><button class="button secondary" data-photo="file">Elegir foto</button></div></section>
 <div class="dialog-actions"><button class="danger" data-delete="${escape(b.id)}">Eliminar libro</button><button class="button primary" data-edit="${escape(b.id)}">Editar ficha</button></div>`;
 if(!$('#detail').open)$('#detail').showModal();
 try {const photos=await getPhotos(id);if(version!==detailVersion||activeDetail!==id)return;detailPhotos=photos;renderPhoto();}catch{if(version===detailVersion&&activeDetail===id)$('#photo-status').textContent='No se pudo leer la foto. Intentá abrir la ficha otra vez.';}
}
function renderPhoto() {
 const selected=$('#photo-copy')?.value,photo=detailPhotos.find(p=>p.id===selected);
 $('#photo-preview').innerHTML=photo&&validPhotoURL(photo.dataUrl)?`<button class="photo-thumbnail" data-view-photo="${escape(selected)}" aria-label="Ampliar foto de tu ejemplar"><img src="${photo.dataUrl}" alt="Foto del ejemplar físico"></button>`:'';
 $('#photo-status').textContent=photo?'Tocá la foto para ampliarla. Elegir otra la reemplaza.':'Este ejemplar todavía no tiene foto.';
}
function showImage(url,title) {
 if(!safeCover(url)&&!validPhotoURL(url))return;
 $('#image-title').textContent=title;$('#image-status').textContent='';$('#large-image').alt=title;$('#large-image').src=url;$('#image-viewer').showModal();
}

document.addEventListener('click', async event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.close) $(`#${target.dataset.close}`).close();
  if(target.dataset.cover){const book=books.find(b=>b.id===target.dataset.cover);showImage(book?.cover,'Portada editorial');}
  if(target.dataset.viewPhoto){const photo=detailPhotos.find(p=>p.id===target.dataset.viewPhoto);if(photo)showImage(photo.dataUrl,'Foto de tu ejemplar');}
  if(target.dataset.photo){photoTarget={bookId:activeDetail,id:$('#photo-copy').value};$('#physical-'+(target.dataset.photo==='camera'?'camera':'photo')).click();}
  if (target.dataset.book) showDetail(target.dataset.book);
  if (target.dataset.edit) { $('#detail').close(); edit(books.find(b=>b.id===target.dataset.edit)); }
  if (target.dataset.delete && confirm('¿Eliminar este libro y sus ejemplares del catálogo?')) { try { await deleteBook(target.dataset.delete); books = await readBooks(); $('#detail').close(); render(); notify('Libro eliminado.'); } catch { notify('No se pudo eliminar el libro. Intentá de nuevo.'); } }
  switch (target.dataset.action) {
    case 'add': openLookup(); break;
    case 'help': $('#help').showModal(); break;
    case 'clear': query=''; category=''; render(); $('#search').focus(); break;
    case 'export': { try {
      const photos=await getPhotos(); const blob = new Blob([JSON.stringify({ app:'asistente-bibliotecario', version:3, exportedAt:new Date().toISOString(), books, photos },null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`biblioteca-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); notify('Respaldo exportado con las fotos. Guardalo en un lugar seguro.'); } catch(error){notify('No se pudo exportar: '+(error.message||'intentá de nuevo.'));} break;
    }
    case 'import': $('#import-file').click(); break;
  }
});
document.addEventListener('input', event => { if(event.target.id==='search'){query=event.target.value;renderResults();} });
document.addEventListener('change', event => { if(event.target.id==='category'){category=event.target.value;renderResults();} });
$('#book-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target; const button = form.querySelector('[type=submit]'); button.disabled=true;
  try { const raw = Object.fromEntries(new FormData(form)); const previous = books.find(b=>b.id===raw.id); const book=validateBook({...previous,...draft,...raw,categorySuggested:raw.category===(previous||draft)?.category?(previous||draft)?.categorySuggested:false}); const duplicate = book.isbn && books.find(b=>b.id!==book.id && canonicalISBN(b.isbn)===canonicalISBN(book.isbn)); if(duplicate)throw new Error('Este ISBN ya está en tu catálogo: '+duplicate.title+'. Editá esa ficha para sumar ejemplares.'); await saveBook(book); books=await readBooks(); $('#editor').close(); render(); notify(previous ? 'Ficha actualizada.' : 'Libro agregado a tu biblioteca.'); }
  catch(error) { $('#form-error').textContent=error.name === 'QuotaExceededError' ? 'No queda espacio en este navegador. Exportá un respaldo.' : error.message || 'No se pudo guardar el libro.'; }
  finally { button.disabled=false; }
});
$('#import-file').addEventListener('change', async event => {
  const file=event.target.files[0]; if(!file)return;
  try { if(file.size>50*1024*1024)throw new Error('El archivo supera el máximo de 50 MB.'); const archive=parseArchive(await file.text()); const incoming=archive.books.map(localizeBook); const overlap=incoming.filter(b=>books.some(existing=>existing.id===b.id)).length;
    if(!confirm(`Se importarán ${incoming.length} libros. ${overlap} fichas existentes se actualizarán. Los demás libros se conservarán. ¿Continuar?`))return;
    await mergeBooks(incoming,archive.photos);books=await readBooks();render();notify('Respaldo importado correctamente.');
  } catch(error){notify(error instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : error.message || 'No se pudo importar.');} finally {event.target.value='';}
});
window.addEventListener('hashchange',render);
$('#main').innerHTML='<p class="muted" role="status">Abriendo tu biblioteca…</p>';
try { await openDatabase(); const existing=await getBooks(); books=existing.map(b=>localizeBook(b.schemaVersion===2?b:validateBook(b))); if(existing.some(b=>b.schemaVersion!==2))await mergeBooks(books); ready=true;render(); }
catch { $('#main').innerHTML='<h1>No pudimos abrir la biblioteca</h1><p>El navegador no permite guardar datos en este momento. Revisá sus permisos de almacenamiento y volvé a cargar la página.</p>'; }
// Cover failures do not hide the title or the rest of the card.
document.addEventListener('error',event=>{if(event.target.matches?.('.real-cover img')){event.target.hidden=true;event.target.nextElementSibling.hidden=false;}},true);
function stopScan() {scanController?.abort();scanController=null;$('#camera-panel').hidden=true;$('#scan-start').disabled=false;}
function cancelLookup() {lookupVersion++;lookupController?.abort();lookupController=null;stopScan();}
function openLookup() {
  if(!ready)return notify('No se pudo abrir el almacenamiento del navegador.');
  cancelLookup();$('#isbn-form').reset();$('#lookup-status').textContent='';$('#lookup-result').replaceChildren();$('#isbn-search').disabled=false;$('#lookup').showModal();$('#isbn-query').focus();
}
$('#lookup').addEventListener('close',cancelLookup);
$('#lookup').addEventListener('cancel',cancelLookup);
$('#manual-entry').addEventListener('click',()=>{const isbn=$('#isbn-query').value;cancelLookup();$('#lookup').close();edit();if(canonicalISBN(isbn))$('#book-form').elements.isbn.value=isbn;});
$('#isbn-query').addEventListener('input',()=>{cancelLookup();$('#lookup-result').replaceChildren();$('#lookup-status').textContent='';$('#isbn-search').disabled=false;});
$('#isbn-form').addEventListener('submit',async event=>{
  event.preventDefault();cancelLookup();const version=lookupVersion;lookupController=new AbortController();
  $('#lookup-result').replaceChildren();$('#lookup-status').textContent='Buscando en Google Books y Open Library…';$('#isbn-search').disabled=true;
  try {
    const {book,results}=await lookupISBN($('#isbn-query').value,{signal:lookupController.signal});
    if(version!==lookupVersion||!$('#lookup').open)return;
    $('#lookup-status').textContent=results.map(r=>r.source+': '+({found:'encontrado ✓',empty:'sin coincidencia',error:'no disponible; podés reintentar'}[r.status])).join(' · ');
    if(!book){$('#lookup-result').innerHTML='<p>No pudimos completar este ISBN. Revisá el número, reintentá o usá la carga manual.</p>';return;}
    const duplicate=books.find(b=>canonicalISBN(b.isbn)===canonicalISBN(book.isbn));
    const labels={title:'Título',subtitle:'Subtítulo',authors:'Autores',publisher:'Editorial',year:'Año',pages:'Páginas',language:'Idioma',subjects:'Temas',cover:'Portada',contents:'Contenidos'};
    $('#lookup-result').innerHTML=`<div class="lookup-preview">${cover({...book,category:'ISBN'})}<div><h3>${escape(book.title)}</h3><p>${escape(book.subtitle||'')}</p><p>${escape(book.author||'Autor sin información')}</p></div></div><dl class="detail-data">${['publisher','year','pages'].map(k=>`<div><dt>${labels[k]}</dt><dd>${escape(Array.isArray(book[k])?book[k].join(' · '):book[k]||'Sin información')}</dd></div>`).join('')}</dl>${subjectChips(book)}<p class="muted">Categoría sugerida: ${escape(book.category||'Otros')}. Podés corregirla.</p><details><summary>Ver origen de los datos</summary><ul>${Object.entries(book.fieldSources).map(([k,v])=>`<li>${labels[k]}: ${escape(v)}</li>`).join('')}</ul></details>${book.conflicts.length?`<div class="inline-note">Las fuentes tienen diferencias. Revisá la edición antes de confirmar.<ul>${book.conflicts.map(c=>`<li>${labels[c.field]} en ${escape(c.source)}: ${escape(Array.isArray(c.value)?c.value.join('; '):c.value)}</li>`).join('')}</ul></div>`:''}<p>${duplicate?'Ya tenés este ISBN. Podés editar su ficha para sumar ejemplares.':'Revisá que sea la edición que tenés. Los datos faltantes se pueden completar después.'}</p><button id="confirm-isbn" class="button primary">${duplicate?'Editar libro existente':'Confirmar libro'}</button>`;
    $('#confirm-isbn').addEventListener('click',()=>{$('#lookup').close();edit(duplicate||{copies:1,category:'Otros',...book},!duplicate);});
  } catch(error) {if(version===lookupVersion&&error.name!=='AbortError')$('#lookup-status').textContent=error.message;}
  finally {if(version===lookupVersion)$('#isbn-search').disabled=false;}
});
$('#scan-start').addEventListener('click',async()=>{
  stopScan();scanController=new AbortController();const controller=scanController;$('#scan-start').disabled=true;$('#camera-panel').hidden=false;$('#camera-panel').scrollIntoView({block:'center'});$('#lookup-status').textContent='Habilitá la cámara para leer el ISBN. No guardamos ni enviamos imágenes.';
  try {await scanISBN($('#scanner-video'),{signal:controller.signal,onReady:()=>{$('#lookup-status').textContent='Cámara lista. Alejá un poco el libro y encuadrá el código completo con buena luz.';},onISBN:isbn=>{stopScan();$('#isbn-query').value=isbn;$('#isbn-form').requestSubmit();},onError:()=>{stopScan();$('#lookup-status').textContent='No pudimos leer la cámara. Probá otra vez o escribí el ISBN.';}});}
  catch(error){if(controller.signal.aborted)return;stopScan();$('#lookup-status').textContent=error.name==='NotAllowedError'?'Cámara bloqueada. En Chrome del iPhone revisá el permiso de cámara del sitio y de Chrome en Ajustes. También podés abrir esta página en Safari.':error.message;}
});
$('#scan-stop').addEventListener('click',stopScan);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScan();});
window.addEventListener('pagehide',cancelLookup);
$('#book-form').addEventListener('invalid',()=>{$('#bibliographic-fields').open=true;},true);

$('#detail').addEventListener('close',()=>{activeDetail=null;detailVersion++;detailPhotos=[];});
document.addEventListener('change',event=>{if(event.target.id==='photo-copy')renderPhoto();});
$('#large-image').addEventListener('error',()=>{$('#image-status').textContent='No se pudo cargar la imagen. Revisá la conexión e intentá de nuevo.';});
$('#image-viewer').addEventListener('close',()=>{$('#large-image').removeAttribute('src');});
for(const input of [$('#physical-photo'),$('#physical-camera')])input.addEventListener('change',async event=>{
 const file=event.target.files[0],target=photoTarget;event.target.value='';if(!file||!target)return;
 const version=detailVersion;
 if(activeDetail===target.bookId){$('#photo-status').textContent='Preparando foto…';document.querySelectorAll('[data-photo]').forEach(b=>b.disabled=true);}
 try {
  const dataUrl=await preparePhoto(file);await savePhoto({...target,dataUrl,takenAt:new Date().toISOString()});
  if(version===detailVersion&&activeDetail===target.bookId){detailPhotos=await getPhotos(target.bookId);if(version===detailVersion)renderPhoto();}
  notify('Foto del ejemplar guardada en este navegador.');
 }catch(error){if(version===detailVersion&&$('#photo-status')){$('#photo-status').textContent='No se guardó la foto. Podés intentar con otra.';}notify(error.name==='QuotaExceededError'?'No queda espacio. Exportá un respaldo antes de continuar.':error.message||'No se pudo guardar la foto.');}
 finally{if(version===detailVersion)document.querySelectorAll('[data-photo]').forEach(b=>b.disabled=false);}
});
