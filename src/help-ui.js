import {helpArticles,glossary,contextualHelp,learningPaths,checklists,HELP_VERSION} from './help-content.js?v=20261015-field2';
import {helpDocuments,helpReleases} from './help-documents.js?v=20261015-field2';
import {visibleArticles,searchHelp,tourTransition} from './help.js?v=20261015-field2';
import {readState,getActorId,getInstitutionId} from './storage.js?v=20261015-field2';
import {accessForRoute,can} from './local-ui.js?v=20261015-field2';
import {legacyProfile,PROFILES} from './permissions.js?v=20261015-field2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(id,text)=>`<a href="#ayuda/${esc(id)}">${esc(text)}</a>`;
const identity=()=>JSON.stringify([getInstitutionId(),getActorId()]);
let tour=null,currentRole='',currentScope='',initialized=false;
const articleFor=id=>visibleArticles(currentRole).find(a=>a.id===id);
const guideFor=id=>helpDocuments.find(d=>d.id===({empezar:'ingreso',jornada:'biblioteca',prestamos:'biblioteca',devoluciones:'biblioteca',inventario:'biblioteca',backup:'ingreso',calidad:'biblioteca',ocr:'biblioteca',proyectos:'docente'}[id]||id)&&d.roles.includes(currentRole));
const routeLink=(route,label)=>accessForRoute(route)?`<a class="button secondary" href="#${esc(route)}">${esc(label)}</a>`:'<p>Esta tarea requiere un perfil habilitado. Consultá con el responsable institucional.</p>';
const cards=articles=>articles.map(a=>`<article class="help-card"><h3>${link(a.id,a.title)}</h3><p>${esc(a.summary)}</p></article>`).join('');
function documentBlocks(blocks){return blocks.map(b=>b.type==='heading'?`<h2>${esc(b.text)}</h2>`:b.type==='item'?`<p class="help-doc-item">• ${esc(b.text)}</p>`:`<p>${esc(b.text)}</p>`).join('');}
function support(){return `<section class="help-support"><h2>Si necesitás más ayuda</h2><p>Describí los pasos y el resultado sin nombres de personas. No adjuntes el respaldo completo. El diagnóstico contiene versión, cantidades y comprobaciones; no nombres ni fichas. Nada se envía automáticamente.</p><div class="button-row">${accessForRoute('diagnostico')?routeLink('diagnostico','Revisar diagnóstico'):link('permisos','Cómo pedir ayuda al responsable')}${can('sensitive.export')?'<button class="button secondary" data-action="diagnostic">Exportar diagnóstico</button>':''}${accessForRoute('piloto')?routeLink('piloto','Registrar observación en modo piloto'):''}</div></section>`;}
function checklist(a,state){const steps=checklists[a.id];if(!steps)return '';return `<section class="help-checklist"><h2>Lista para acompañar la tarea</h2><p>Marcas manuales temporales: no ejecutan operaciones ni demuestran que la tarea esté terminada.</p>${steps.map((s,i)=>`<label><input type="checkbox"> ${i+1}. ${esc(s)}</label>`).join('')}${a.id==='inventario'&&accessForRoute('inventario')?`<p>Estado registrado: ${(state.inventorySessions||[]).filter(s=>s.status==='open').length} inventarios abiertos. Revisá sus diferencias en Inventario.</p>`:''}</section>`;}
export async function renderHelp(route){
 if(route.split('/')[0]!=='ayuda')return false;
 const scope=identity(),state=await readState();if(scope!==identity()||location.hash.slice(1)!==route)return true;
 const actor=state.patrons.find(p=>p.id===getActorId());currentRole=actor?.accessProfile||legacyProfile(actor?.role);currentScope=scope;
 const allowed=visibleArticles(currentRole),id=route.split('/')[1]||'',a=allowed.find(a=>a.id===id);
 let body='';
 if(!id){body=`<h1>Centro de ayuda</h1><p>Guías para ${esc(PROFILES[currentRole]||'tu perfil')}. Buscá una duda o elegí una tarea.</p><form id="help-search-form" role="search"><label for="help-search">Buscar en la ayuda</label><input id="help-search" type="search" maxlength="160" placeholder="Ej.: backup, devolver libro, copias" autocomplete="off"><button class="button secondary">Buscar ayuda</button></form><p id="help-count" role="status" aria-live="polite"></p><section id="help-results" aria-label="Artículos encontrados" hidden></section><div id="help-browse"><section><h2>Capacitación para tu perfil</h2><ol class="help-levels">${(learningPaths[currentRole]||[]).map(([title,id],i)=>`<li>Nivel ${i+1} — ${link(id,title)}</li>`).join('')}</ol></section><nav class="help-shortcuts" aria-label="Recursos de ayuda">${link('glosario','Glosario')} · ${link('documentos','Guías completas para imprimir')} · ${link('novedades','Nuevo en esta versión')}</nav>${[...new Set(allowed.map(a=>a.category))].map(category=>`<details class="help-category"><summary>${esc(category)}</summary><div class="help-grid">${cards(allowed.filter(a=>a.category===category))}</div></details>`).join('')}</div>`;}
 else if(id==='glosario')body=`<h1>Glosario</h1><dl>${glossary.map(g=>`<dt>${esc(g.term)}</dt><dd>${esc(g.definition)}</dd>`).join('')}</dl>`;
 else if(id==='documentos')body=`<h1>Documentación integrada</h1><p>Contenido generado desde los documentos locales de esta versión. Elegí una guía para leerla o imprimirla.</p><ul>${helpDocuments.filter(d=>d.roles.includes(currentRole)).map(d=>`<li>${link('doc-'+d.id,d.title)}</li>`).join('')}</ul>`;
 else if(id==='novedades')body=`<h1>Nuevo en esta versión</h1><p>Notas del archivo RELEASE_NOTES.md.</p>${documentBlocks(helpReleases)}`;
 else if(id.startsWith('doc-')){const d=helpDocuments.find(d=>d.id===id.slice(4)&&d.roles.includes(currentRole));body=d?`<h1>${esc(d.title)}</h1><p>Fuente: ${esc(d.path)} · Versión ${HELP_VERSION}</p>${documentBlocks(d.blocks)}`:'<h1>Guía no disponible para este perfil</h1>';}
 else if(a){body=`<article><h1>${esc(a.title)}</h1><p class="muted">Ayuda versión ${a.version}</p>${a.content.map(p=>`<p>${esc(p)}</p>`).join('')}<div class="help-no-print button-row">${routeLink(a.relatedRoute,'Abrir '+a.title)}${a.tour.length&&accessForRoute(a.relatedRoute)?`<button class="button primary" data-help-tour="${a.id}">Mostrarme cómo</button>`:''}</div>${checklist(a,state)}<h2>Seguir leyendo</h2><ul>${a.relatedArticles.map(articleFor).filter(Boolean).map(a=>`<li>${link(a.id,a.title)}</li>`).join('')}<li>${link('glosario','Consultar el glosario')}</li>${guideFor(a.id)?`<li>${link('doc-'+guideFor(a.id).id,'Leer guía completa: '+guideFor(a.id).title)}</li>`:''}<li>${link('documentos','Ver documentación integrada')}</li></ul></article>`;}
 else body='<h1>Artículo no disponible para este perfil</h1><p>Volvé al centro para consultar las guías de tu perfil actual.</p>';
 document.querySelector('#main').innerHTML=`<div id="help-center" class="help-center"><nav class="help-no-print" aria-label="Navegación de ayuda">${id?link('','Volver al Centro de ayuda'):''}</nav>${body}${id?'<button class="button secondary help-no-print" data-help-print>Imprimir esta guía</button>':''}${support()}</div>`;
 const input=document.querySelector('#help-search');if(input){const search=()=>{const query=input.value.trim(),results=searchHelp(query,currentRole);document.querySelector('#help-browse').hidden=Boolean(query);const box=document.querySelector('#help-results');box.hidden=!query;box.innerHTML=query?`<h2>Resultados</h2>${results.length?cards(results):'<p>No encontramos esa duda. Probá una palabra más breve o consultá el glosario.</p>'+link('glosario','Abrir glosario')}`:'';document.querySelector('#help-count').textContent=query?results.length+' artículos para tu perfil':'';};input.addEventListener('input',search);document.querySelector('#help-search-form').addEventListener('submit',e=>{e.preventDefault();search();});}
 const heading=document.querySelector('#help-center h1');heading.tabIndex=-1;heading.focus({preventScroll:true});return true;
}
function renderTour(){
 document.querySelector('#help-tour-panel')?.remove();
 const a=articleFor(tour?.id);if(!tour||tour.identity!==identity()||!a||!accessForRoute(a.relatedRoute)){tour=null;return;}
 document.querySelector('#main').insertAdjacentHTML('afterbegin',`<aside id="help-tour-panel" class="help-inline" aria-label="Recorrido guiado"><h2>${esc(a.title)} — paso ${tour.step+1} de ${a.tour.length}</h2><p role="status">${esc(a.tour[tour.step])}</p><p>Avanzar solo cambia la explicación. Realizá la tarea cuando estés listo.</p><div class="button-row"><button class="button secondary" data-help-step="back" ${tour.step===0?'disabled':''}>Anterior</button><button class="button secondary" data-help-step="next">${tour.step===a.tour.length-1?'Terminar recorrido':'Siguiente paso'}</button><button class="button secondary" data-help-step="close">Cerrar recorrido</button></div></aside>`);
}
export async function enhanceHelp(route){
 document.querySelector('#context-help')?.remove();
 const scope=identity(),state=await readState();if(scope!==identity()||location.hash.slice(1)!==route)return;
 const actor=state.patrons.find(p=>p.id===getActorId());currentRole=actor?.accessProfile||legacyProfile(actor?.role);if(scope!==currentScope)tour=null;currentScope=scope;
 const id=contextualHelp[route.split('/')[0]],a=articleFor(id);
 if(a&&accessForRoute(route)&&document.querySelector('#main h1'))document.querySelector('#main h1').insertAdjacentHTML('afterend',`<details id="context-help" class="help-inline"><summary>¿Qué es esto? · Ayuda</summary><h2>${esc(a.title)}</h2><p>${esc(a.summary)}</p><p>${esc(a.content[1]||'')}</p>${link(a.id,'Leer guía de '+a.title)} · ${link('glosario','Consultar términos')}<p><button class="button secondary" data-help-close>Cerrar ayuda</button></p></details>`);
 renderTour();
}
export function initHelpUI(){if(initialized)return;initialized=true;
 document.addEventListener('click',event=>{
 const button=event.target.closest('[data-help-tour],[data-help-step],[data-help-print],[data-help-close]');if(!button)return;
 if(button.hasAttribute('data-help-print')){window.print();return;}
 if(button.hasAttribute('data-help-close')){const details=button.closest('details');details.open=false;details.querySelector('summary').focus();return;}
 if(button.dataset.helpTour){const a=articleFor(button.dataset.helpTour);if(!a||!accessForRoute(a.relatedRoute))return;tour=tourTransition(null,'start',a,identity());location.hash=a.relatedRoute;return;}
 tour=tourTransition(tour,button.dataset.helpStep,articleFor(tour?.id),identity());renderTour();document.querySelector('#help-tour-panel button:not([disabled])')?.focus();
 });
}
