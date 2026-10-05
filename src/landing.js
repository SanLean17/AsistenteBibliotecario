import { mobileNavigation } from './navigation.js?v=20261005-9';
const legacy=['inicio','biblioteca','agregar','editar','ficha','configuracion','ejemplares'];
function redirectLegacy(){if(legacy.includes(location.hash.slice(1).split('/')[0]))location.replace('./app.html'+location.hash);}
redirectLegacy();window.addEventListener('hashchange',redirectLegacy);
let theme;try{theme=localStorage.getItem('ab-theme');}catch{}
function setTheme(value){document.documentElement.dataset.theme=value;try{localStorage.setItem('ab-theme',value);}catch{}document.querySelector('meta[name="theme-color"]').content=value==='dark'?'#0A112F':'#EBF3FF';}
setTheme(theme|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
document.querySelector('[data-theme-toggle]').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
mobileNavigation({toggle:document.querySelector('#menu-toggle'),panel:document.querySelector('#site-nav'),breakpoint:850,background:[document.querySelector('main'),document.querySelector('footer')],header:document.querySelector('.site-header')});
