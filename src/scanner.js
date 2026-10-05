import { validISBN } from './isbn.js?v=20261004-2';
export async function createISBNDetector() {
  try {
    if (globalThis.BarcodeDetector && (await BarcodeDetector.getSupportedFormats()).includes('ean_13')) return new BarcodeDetector({formats:['ean_13']});
  } catch { /* Some browsers expose the API but cannot initialize it. */ }
  await import('../vendor/zxing-browser-0.2.1.min.js');
  const reader = new globalThis.ZXingBrowser.BrowserMultiFormatOneDReader();
  return {async detect(video) {
    try {return [{rawValue:reader.decode(video).getText()}];}
    catch(error) {
      const kind=error.getKind?.()||error.name;
      if(['NotFoundException','ChecksumException','FormatException'].includes(kind))return [];
      throw error;
    }
  }};
}
// Own the stream in both decoders, including late permission results on iOS.
export async function scanISBN(video, {signal,onISBN,onError,onReady,detectorFactory=createISBNDetector}) {
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Abrí la página con HTTPS en Safari o Chrome y habilitá la cámara.');
  if (signal.aborted) return;
  const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  let timer, stopped=false;
  const stop = () => {stopped=true;clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());if(video.srcObject===stream)video.srcObject=null;};
  if (signal.aborted) {stop();return;}
  signal.addEventListener('abort',stop,{once:true});
  video.srcObject=stream;video.muted=true;
  try {
    await video.play();
    const detector=await detectorFactory();
    if(signal.aborted){stop();return;}
    onReady?.();
    const read=async()=>{
      if(stopped||signal.aborted)return;
      try {
        const found=(await detector.detect(video)).find(b=>validISBN(b.rawValue));
        if(stopped||signal.aborted)return;
        if(found){stop();onISBN(found.rawValue);return;}
        timer=setTimeout(read,250);
      } catch(error){stop();if(!signal.aborted)onError(error);}
    };
    read();
  } catch(error){stop();throw error;}
}
