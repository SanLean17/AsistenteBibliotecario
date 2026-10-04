import { validISBN } from './isbn.js';
// No frames leave the device. The caller owns cancellation, including close/background.
export async function scanISBN(video, {signal,onISBN,onError}) {
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('La cámara necesita HTTPS y permiso del navegador. Podés escribir el ISBN.');
  if (!globalThis.BarcodeDetector || !(await BarcodeDetector.getSupportedFormats()).includes('ean_13')) throw new Error('Este navegador no permite leer códigos con la cámara. Escribí el ISBN o usá un lector externo.');
  const detector = new BarcodeDetector({formats:['ean_13']});
  const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  let timer;
  const stop = () => {clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());video.srcObject=null;};
  if (signal.aborted) {stop();return;}
  signal.addEventListener('abort',stop,{once:true});
  video.srcObject=stream;
  try { await video.play(); } catch(error) { stop();throw error; }
  const read = async () => {
    if (signal.aborted) return;
    try {
      const found = (await detector.detect(video)).find(b=>validISBN(b.rawValue));
      if (signal.aborted) return;
      if (found) {stop();onISBN(found.rawValue);return;}
      timer=setTimeout(read,250);
    } catch(error) {stop();if(!signal.aborted)onError(error);}
  };
  read();
}
