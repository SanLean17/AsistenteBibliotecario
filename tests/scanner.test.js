import test from 'node:test';
import assert from 'node:assert/strict';
import { scanISBN } from '../src/scanner.js';

test('closing during camera permission stops late stream without replacing a newer session', async()=>{
  const originals = Object.fromEntries(['isSecureContext','navigator','BarcodeDetector'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  let resolveMedia, stopped=0;
  try {
    Object.defineProperty(globalThis,'isSecureContext',{value:true,configurable:true});
    Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>resolveMedia=resolve)}},configurable:true});
    Object.defineProperty(globalThis,'BarcodeDetector',{value:class {static async getSupportedFormats(){return ['ean_13'];}},configurable:true});
    const controller=new AbortController(), newerStream={}, video={srcObject:null};
    const pending=scanISBN(video,{signal:controller.signal,onISBN:()=>assert.fail('cancelled session must not emit')});
    await Promise.resolve();
    controller.abort();video.srcObject=newerStream;
    resolveMedia({getTracks:()=>[{stop:()=>stopped++}]});await pending;
    assert.equal(stopped,1);assert.equal(video.srcObject,newerStream);
    resolveMedia=null;
    await scanISBN(video,{signal:controller.signal});assert.equal(resolveMedia,null,'no new camera request after cancellation');
  } finally {
    for(const [key,descriptor] of Object.entries(originals))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
});

test('continuous capture ignores stationary frames and accepts same ISBN only after absence',async()=>{
 const originals=Object.fromEntries(['isSecureContext','navigator'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const oldTimer=globalThis.setTimeout,oldClear=globalThis.clearTimeout,oldNow=Date.now;let scheduled,clock=10000,visible=true,detected=0,stopped=0;
 try{
  globalThis.setTimeout=fn=>{scheduled=fn;return 1;};globalThis.clearTimeout=()=>{scheduled=null;};Date.now=()=>clock;
  Object.defineProperty(globalThis,'isSecureContext',{value:true,configurable:true});Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]})}},configurable:true});
  const controller=new AbortController(),video={play:async()=>{},setAttribute:()=>{},srcObject:null};
  await scanISBN(video,{signal:controller.signal,continuous:true,repeatAfterAbsence:true,detectorFactory:async()=>({detect:async()=>visible?[{rawValue:'9505470630'}]:[]}),onISBN:()=>{detected++;},onError:e=>{throw e;}});
  await Promise.resolve();await Promise.resolve();assert.equal(detected,1);
  for(let i=0;i<8;i++){clock+=1000;await scheduled();}assert.equal(detected,1);
  visible=false;clock+=1500;await scheduled();visible=true;clock+=200;await scheduled();assert.equal(detected,2);
  controller.abort();assert.equal(stopped,1);assert.equal(video.srcObject,null);
 }finally{globalThis.setTimeout=oldTimer;globalThis.clearTimeout=oldClear;Date.now=oldNow;for(const [k,d] of Object.entries(originals)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
