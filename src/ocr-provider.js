// Provider boundary: domain/UI know only recognize(image, {signal,onProgress}).
export const ocrProvider={recognize(image,{signal,onProgress=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Procesamiento cancelado.','AbortError'));return;}
  const worker=new Worker(new URL('./ocr-worker.js?v=20261010-7',import.meta.url));let settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',cancel);worker.terminate();error?reject(error):resolve(result);};
  const cancel=()=>finish(new DOMException('Procesamiento cancelado.','AbortError'));
  signal?.addEventListener('abort',cancel,{once:true});worker.onerror=event=>{event.preventDefault();finish(new Error('No se pudo iniciar el OCR local. Volvé a intentar o completá los datos manualmente.'));};
  worker.onmessage=({data})=>{if(data.type==='progress')onProgress(data.value);else if(data.type==='result')finish(null,data.value);else if(data.type==='error')finish(new Error(data.message));};
  worker.postMessage({image});
 });
}};
