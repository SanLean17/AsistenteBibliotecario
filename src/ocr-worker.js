/* Classic worker owns the OCR worker; termination also stops its descendants. */
self.onmessage=async({data})=>{
 let worker;
 try{
  const root=new URL('../vendor/ocr-6.0.1/',self.location.href).href;
  importScripts(root+'tesseract.min.js');
  worker=await Tesseract.createWorker('spa',1,{workerPath:root+'worker.min.js',corePath:root,langPath:root,gzip:false,workerBlobURL:false,cacheMethod:'none',logger:value=>self.postMessage({type:'progress',value})});
  const result=await worker.recognize(data.image,{}, {text:true});
  self.postMessage({type:'result',value:{text:result.data.text.slice(0,40000),confidence:result.data.confidence,engine:'Tesseract.js 6.0.1 · spa'}});
 }catch(error){self.postMessage({type:'error',message:'No pudimos leer la imagen: '+error.message});}
 finally{if(worker)await worker.terminate();self.close();}
};
