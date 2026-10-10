import {deriveNotices,filterNotices,NOTICE_AREAS,NOTICE_PRIORITIES} from './notices.js?v=20261010-rc1';
import {hasPermission} from './permissions.js?v=20261010-rc1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=labels=>Object.entries(labels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');

export function renderNoticeSummary(notices){
  const urgent=notices.filter(n=>n.priority==='high').length;
  return `<a class="notice-summary" href="#avisos"><span><strong>Avisos y pendientes <span class="notice-count">${notices.length}</span></strong><small>${notices.length?`${urgent} de prioridad alta · Revisá lo que necesita atención.`:'Todo al día. No hay pendientes para tu perfil.'}</small></span><span aria-hidden="true">↗</span></a>`;
}
function list(notices,can){
  return notices.map(n=>`<article class="notice-card" data-notice-id="${esc(n.id)}" data-priority="${n.priority}"><div class="notice-meta"><span class="notice-priority">${NOTICE_PRIORITIES[n.priority]}</span><span>${NOTICE_AREAS[n.area]}</span></div><h2>${esc(n.title)}</h2><p>${esc(n.detail)}</p>${n.target.permissions.some(can)?`<a class="button secondary" href="#${esc(n.target.route)}">${esc(n.target.label)}</a>`:'<small>Consultá con Biblioteca para gestionar este pendiente.</small>'}</article>`).join('');
}
function results(notices,can,filters={}){
  const filtered=filterNotices(notices,filters);
  return `<p class="notice-result-count" role="status">${filtered.length} de ${notices.length} avisos</p><div class="notice-grid">${filtered.length?list(filtered,can):`<div class="notice-empty"><h2>${notices.length?'No hay avisos con estos filtros':'Todo al día'}</h2><p>${notices.length?'Probá otra prioridad o área.':'No hay pendientes para tu perfil en esta institución.'}</p></div>`}</div>`;
}
export function renderNoticesCenter(notices,can){
  return `<section class="notices-center"><p>Se actualizan con el estado de esta institución en este navegador. Al resolver un pendiente, su aviso cambia o desaparece.</p><div class="notice-filters"><label>Prioridad<select id="notice-priority"><option value="">Todas las prioridades</option>${options(NOTICE_PRIORITIES)}</select></label><label>Área<select id="notice-area"><option value="">Todas las áreas</option>${options(NOTICE_AREAS)}</select></label></div><div id="notice-results">${results(notices,can)}</div></section>`;
}

// Update only this projection: leave filters, other forms, scroll and focus intact.
export function refreshNoticeViews(state,actor){
  const center=document.querySelector('#notice-results'),summary=document.querySelector('[data-notice-summary]');
  if(!center&&!summary)return;
  const notices=deriveNotices(state,actor),can=p=>hasPermission(actor,p,state.grants||[]);
  function update(node,html){if(!node||node.dataset.rendered===html)return;const active=document.activeElement,card=active?.closest('[data-notice-id]');const id=card?.dataset.noticeId;node.innerHTML=html;node.dataset.rendered=html;if(id){const next=[...node.querySelectorAll('[data-notice-id]')].find(n=>n.dataset.noticeId===id)?.querySelector('a');(next||document.querySelector('#notice-priority'))?.focus({preventScroll:true});}}
  update(summary,renderNoticeSummary(notices));
  update(center,results(notices,can,{priority:document.querySelector('#notice-priority')?.value,area:document.querySelector('#notice-area')?.value}));
}
