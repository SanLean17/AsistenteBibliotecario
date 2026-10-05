// A single mobile navigation behavior for the public site and workspace.
export function mobileNavigation({toggle,panel,breakpoint,background,header}){
 const media=matchMedia('(max-width:'+breakpoint+'px)');let previousOverflow='',inertState=[];
 const open=()=>toggle.getAttribute('aria-expanded')==='true';
 function close(restoreFocus=false){if(!open())return;toggle.setAttribute('aria-expanded','false');panel.classList.remove('is-open');document.body.style.overflow=previousOverflow;inertState.forEach(([el,value])=>el.inert=value);inertState=[];if(restoreFocus)toggle.focus();}
 toggle.addEventListener('click',()=>{if(open()){close(true);return;}if(!media.matches)return;previousOverflow=document.body.style.overflow;inertState=background.map(el=>[el,el.inert]);background.forEach(el=>el.inert=true);document.body.style.overflow='hidden';toggle.setAttribute('aria-expanded','true');panel.classList.add('is-open');panel.querySelector('a,button')?.focus();});
 panel.addEventListener('click',event=>{if(event.target.closest('a,button'))close(true);});
 document.addEventListener('keydown',event=>{if(!open())return;if(event.key==='Escape'){event.preventDefault();close(true);}if(event.key==='Tab'){const items=[...new Set([...header.querySelectorAll('a,button,select,input,textarea'),...panel.querySelectorAll('a,button,select,input,textarea')])].filter(el=>el.getClientRects().length&&!el.disabled);const at=items.indexOf(document.activeElement);event.preventDefault();items[(at+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();}});
 media.addEventListener('change',()=>close());window.addEventListener('hashchange',()=>close());return close;
}
