export const FIELD_VERSION='0.6.0-hemeroteca.2';
const OFFLINE='Sin conexión. Podés seguir trabajando con los datos locales y completar esta ficha manualmente.';
export function initOffline(){
 const host=document.createElement('aside');host.className='field-status';host.setAttribute('aria-label','Conexión y versión');
 const message=document.createElement('p');message.setAttribute('role','status');
 const button=document.createElement('button');button.className='button secondary';button.textContent='Aplicar actualización';button.hidden=true;
 host.append(message,button);document.querySelector('main').before(host);
 let registration,prepared=false,applying=false;
 const update=()=>{message.textContent=!navigator.onLine?OFFLINE:registration?.waiting?'Hay una nueva versión. Terminá las operaciones, cerrá otras pestañas y abrí Configuración para aplicarla.':prepared?'Preparada para abrir sin conexión en este navegador.':'Preparando apertura sin conexión…';button.hidden=!registration?.waiting;};
 addEventListener('online',()=>{update();registration?.update().catch(()=>{});});addEventListener('offline',update);
 button.onclick=()=>{
  if(location.hash!=='#configuracion'||document.querySelector('dialog[open]')||document.querySelector('main [aria-busy="true"]')){message.textContent='Terminá tu operación y abrí Configuración antes de actualizar.';return;}
  if(!registration?.waiting)return;button.disabled=true;applying=true;
  const channel=new MessageChannel();channel.port1.onmessage=event=>{if(!event.data?.accepted){applying=false;button.disabled=false;message.textContent='Cerrá las otras pestañas de esta biblioteca y volvé a intentar.';}channel.port1.close();};
  registration.waiting.postMessage({type:'APPLY_UPDATE',route:location.hash},[channel.port2]);
 };
 update();
 if(!('serviceWorker' in navigator)||!isSecureContext){message.textContent='Este navegador no permite preparar la apertura sin conexión. Mantené esta pestaña abierta.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applying)location.reload();else{prepared=true;update();}});
 navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:'./',updateViaCache:'none'}).then(reg=>{
  registration=reg;prepared=Boolean(reg.active);update();
  reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='activated'){prepared=true;update();}if(worker.state==='installed')update();if(worker.state==='redundant'&&!prepared)message.textContent='No se completó la preparación sin conexión. Conservá la conexión y volvé a abrir más tarde.';});});
  reg.update().catch(()=>{});
 }).catch(()=>{message.textContent='No se pudo preparar la apertura sin conexión. Podés seguir usando la pestaña actual.';});
}
