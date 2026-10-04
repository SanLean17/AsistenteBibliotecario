import { categories, searchBooks, validateBook, parseBackup } from './catalog.js';
import { openDatabase, getBooks, saveBook, deleteBook, mergeBooks } from './storage.js';
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let books = [], query = '', category = '', ready = false, toastTimer;
const isLibrary = () => location.hash === '#biblioteca';
function notify(message) { $('#toast').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').textContent = '', 5000); }
function cover(book) { const color = [...book.title].reduce((n,c)=>n+c.charCodeAt(0),0)%4; return `<div class="cover" data-color="${color}"><small>${escape(book.category)}</small><strong>${escape(book.title)}</strong><span>❧</span></div>`; }
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
function edit(book) {
  if (!ready) return notify('No se pudo abrir el almacenamiento del navegador.');
  const form = $('#book-form'); form.reset(); $('#form-error').textContent = '';
  form.elements.id.value = '';
  if (book) for (const [key,value] of Object.entries(book)) if (form.elements.namedItem(key)) form.elements.namedItem(key).value = Array.isArray(value) ? value.join('\n') : value ?? '';
  $('#editor-title').textContent = book ? 'Editar libro' : 'Agregar un libro'; $('#editor').showModal(); form.elements.title.focus();
}
function showDetail(id) {
  const b = books.find(book=>book.id === id); if(!b) return;
  $('#detail').innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">FICHA DEL LIBRO</span><h2 id="detail-title">${escape(b.title)}</h2></div><button class="close" data-close="detail" aria-label="Cerrar">×</button></div><p class="muted">${escape(b.author || 'Autor por completar')}</p><div class="detail-cover">${cover(b)}</div><dl class="detail-data">${[['Categoría',b.category],['Ejemplares',b.copies],['ISBN',b.isbn || 'Sin ISBN'],['Editorial',b.publisher || 'Sin completar'],['Ubicación',b.location || 'Sin asignar']].map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>${b.contents.length ? `<h3>Cuentos y capítulos</h3><ul class="detail-text">${b.contents.map(c=>`<li>${escape(c)}</li>`).join('')}</ul>` : ''}${b.notes ? `<h3>Notas</h3><p class="detail-text">${escape(b.notes)}</p>` : ''}<div class="dialog-actions"><button class="danger" data-delete="${escape(b.id)}">Eliminar libro</button><button class="button primary" data-edit="${escape(b.id)}">Editar ficha</button></div>`; $('#detail').showModal();
}
document.addEventListener('click', async event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.close) $(`#${target.dataset.close}`).close();
  if (target.dataset.book) showDetail(target.dataset.book);
  if (target.dataset.edit) { $('#detail').close(); edit(books.find(b=>b.id===target.dataset.edit)); }
  if (target.dataset.delete && confirm('¿Eliminar este libro y sus ejemplares del catálogo?')) { try { await deleteBook(target.dataset.delete); books = await getBooks(); $('#detail').close(); render(); notify('Libro eliminado.'); } catch { notify('No se pudo eliminar el libro. Intentá de nuevo.'); } }
  switch (target.dataset.action) {
    case 'add': edit(); break;
    case 'help': $('#help').showModal(); break;
    case 'clear': query=''; category=''; render(); $('#search').focus(); break;
    case 'export': {
      const blob = new Blob([JSON.stringify({ app:'asistente-bibliotecario', version:1, exportedAt:new Date().toISOString(), books },null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`biblioteca-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); notify('Respaldo exportado. Guardalo en un lugar seguro.'); break;
    }
    case 'import': $('#import-file').click(); break;
  }
});
document.addEventListener('input', event => { if(event.target.id==='search'){query=event.target.value;renderResults();} });
document.addEventListener('change', event => { if(event.target.id==='category'){category=event.target.value;renderResults();} });
$('#book-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target; const button = form.querySelector('[type=submit]'); button.disabled=true;
  try { const raw = Object.fromEntries(new FormData(form)); const previous = books.find(b=>b.id===raw.id); const book=validateBook({...previous,...raw}); await saveBook(book); books=await getBooks(); $('#editor').close(); render(); notify(previous ? 'Ficha actualizada.' : 'Libro agregado a tu biblioteca.'); }
  catch(error) { $('#form-error').textContent=error.name === 'QuotaExceededError' ? 'No queda espacio en este navegador. Exportá un respaldo.' : error.message || 'No se pudo guardar el libro.'; }
  finally { button.disabled=false; }
});
$('#import-file').addEventListener('change', async event => {
  const file=event.target.files[0]; if(!file)return;
  try { if(file.size>10*1024*1024)throw new Error('El archivo supera el máximo de 10 MB.'); const incoming=parseBackup(await file.text()); const overlap=incoming.filter(b=>books.some(existing=>existing.id===b.id)).length;
    if(!confirm(`Se importarán ${incoming.length} libros. ${overlap} fichas existentes se actualizarán. Los demás libros se conservarán. ¿Continuar?`))return;
    await mergeBooks(incoming);books=await getBooks();render();notify('Respaldo importado correctamente.');
  } catch(error){notify(error instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : error.message || 'No se pudo importar.');} finally {event.target.value='';}
});
window.addEventListener('hashchange',render);
$('#main').innerHTML='<p class="muted" role="status">Abriendo tu biblioteca…</p>';
try { await openDatabase(); books=await getBooks(); ready=true;render(); }
catch { $('#main').innerHTML='<h1>No pudimos abrir la biblioteca</h1><p>El navegador no permite guardar datos en este momento. Revisá sus permisos de almacenamiento y volvé a cargar la página.</p>'; }
