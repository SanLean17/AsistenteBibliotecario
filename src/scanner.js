import { validISBN } from './isbn.js?v=20261006-1';

async function createZXingReader(){
  await import('../vendor/zxing-browser-0.2.1.min.js?v=20261006-1');
  return new globalThis.ZXingBrowser.BrowserMultiFormatOneDReader();
}
export async function createISBNDetector() {
  try {
    if (globalThis.BarcodeDetector && (await BarcodeDetector.getSupportedFormats()).includes('ean_13')) return new BarcodeDetector({formats:['ean_13']});
  } catch { /* El navegador puede exponer la API sin poder inicializarla. */ }
  const reader=await createZXingReader();
  return {async detect(source) {
    try {return [{rawValue:reader.decode(source).getText()}];}
    catch(error) {
      const kind=error.getKind?.()||error.name;
      if(['NotFoundException','ChecksumException','FormatException'].includes(kind))return [];
      throw error;
    }
  }};
}
async function requestRearCamera(){
  try {
    return await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
  } catch(error) {
    if(['OverconstrainedError','NotFoundError'].includes(error.name)) return navigator.mediaDevices.getUserMedia({video:true,audio:false});
    throw error;
  }
}
// La cámara y la decodificación ocurren en el dispositivo; no se envían fotogramas.
export async function scanISBN(video, {signal,onISBN,onError,onReady,detectorFactory=createISBNDetector,accept=validISBN}) {
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('La cámara necesita una conexión HTTPS y permiso del navegador.');
  if (signal.aborted) return;
  const stream = await requestRearCamera();
  let timer, stopped=false;
  const stop = () => {stopped=true;clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());if(video.srcObject===stream)video.srcObject=null;};
  if (signal.aborted) {stop();return;}
  signal.addEventListener('abort',stop,{once:true});
  video.srcObject=stream;video.muted=true;video.setAttribute('playsinline','');
  try {
    await video.play();
    const detector=await detectorFactory();
    if(signal.aborted){stop();return;}
    onReady?.();
    const read=async()=>{
      if(stopped||signal.aborted)return;
      try {
        const found=(await detector.detect(video)).find(b=>accept(b.rawValue));
        if(stopped||signal.aborted)return;
        if(found){stop();onISBN(found.rawValue);return;}
        timer=setTimeout(read,180);
      } catch(error){stop();if(!signal.aborted)onError(error);}
    };
    read();
  } catch(error){stop();throw error;}
}
export async function scanISBNFromFile(file){
  if(!file?.type?.startsWith('image/'))throw new Error('Seleccioná una foto del código de barras.');
  const objectUrl=URL.createObjectURL(file);
  try{
    const image=new Image();
    image.src=objectUrl;
    await image.decode();
    try{
      if(globalThis.BarcodeDetector && (await BarcodeDetector.getSupportedFormats()).includes('ean_13')){
        const detector=new BarcodeDetector({formats:['ean_13']});
        const found=(await detector.detect(image)).find(b=>validISBN(b.rawValue));
        if(found)return found.rawValue;
      }
    }catch{/* Continúa con ZXing */}
    const reader=await createZXingReader();
    try{
      const value=reader.decode(image).getText();
      if(validISBN(value))return value;
    }catch{/* Se informa abajo */}
    throw new Error('No pudimos leer un ISBN en la foto. Probá con más luz, sin reflejos y con el código completo.');
  } finally {URL.revokeObjectURL(objectUrl);}
}

// Multi-format acquisition: QR content and linear codes use the same review flow.
export async function createMaterialDetector(){
 await import('../vendor/zxing-browser-0.2.1.min.js?v=20261006-1');
 const reader=new globalThis.ZXingBrowser.BrowserMultiFormatReader();
 return {async detect(source){try{return [{rawValue:reader.decode(source).getText()}];}catch(error){const kind=error.getKind?.()||error.name;if(['NotFoundException','ChecksumException','FormatException'].includes(kind))return [];throw error;}}};
}
export async function scanMaterialFromFile(file){
 if(!file?.type?.startsWith('image/'))throw new Error('Seleccioná una fotografía del código.');
 const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();const result=await(await createMaterialDetector()).detect(image);if(result[0]?.rawValue)return result[0].rawValue;throw new Error('No pudimos reconocer un código. Intentá nuevamente, ingresá un código o incorporá el material manualmente.');}finally{URL.revokeObjectURL(url);}
}
