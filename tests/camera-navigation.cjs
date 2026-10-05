const {setup,assert}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish}=await setup();
 await page.addInitScript(()=>{
  window.stopped=0;
  window.BarcodeDetector=class{static async getSupportedFormats(){return ['ean_13'];}async detect(){return [];}};
  navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop:()=>window.stopped++}]});
  Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{set(v){this._stream=v;},get(){return this._stream;},configurable:true});HTMLMediaElement.prototype.play=async()=>{};
 });
 await go('agregar');await page.locator('#scan-start').click();await page.getByText('Cámara lista.',{exact:false}).waitFor();await page.locator('#scan-stop').click();assert.ok(await page.evaluate(()=>window.stopped>0));
 await page.locator('#scan-start').click();await page.getByText('Cámara lista.',{exact:false}).waitFor();const before=await page.evaluate(()=>window.stopped);await page.evaluate(()=>location.hash='#inicio');await page.locator('#home-search').waitFor();assert.ok(await page.evaluate(()=>window.stopped)>before);
 await go('agregar');await page.locator('#scan-start').click();await page.getByText('Cámara lista.',{exact:false}).waitFor();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});assert.ok(await page.locator('#camera-panel').isHidden());assert.ok(await page.evaluate(()=>document.querySelector('video').srcObject===null));
 await finish();console.log('PASS: camera tracks stop on close, route change and hidden document.');
})().catch(e=>{console.error(e);process.exit(1)});
