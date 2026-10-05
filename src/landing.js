const legacy=['inicio','biblioteca','agregar','editar','ficha','configuracion','ejemplares'];
function redirectLegacy(){if(legacy.includes(location.hash.slice(1).split('/')[0]))location.replace('./app.html'+location.hash);}
redirectLegacy();window.addEventListener('hashchange',redirectLegacy);
let theme;try{theme=localStorage.getItem('ab-theme');}catch{}
function setTheme(value){document.documentElement.dataset.theme=value;try{localStorage.setItem('ab-theme',value);}catch{}document.querySelector('meta[name="theme-color"]').content=value==='dark'?'#0A112F':'#EBF3FF';}
setTheme(theme|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
document.querySelector('[data-theme-toggle]').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
const toggle=document.querySelector('#menu-toggle'),nav=document.querySelector('#site-nav');
function closeMenu(){toggle.setAttribute('aria-expanded','false');nav.classList.remove('is-open');}
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();toggle.focus();}});
