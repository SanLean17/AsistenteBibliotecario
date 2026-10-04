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
