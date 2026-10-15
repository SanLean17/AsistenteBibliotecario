const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
exports.start=async()=>{
 const root=path.resolve(__dirname,'..'),state={release:'A',broken:false},prefix='/AsistenteBibliotecario/';
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://local');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const relative=decodeURIComponent(url.pathname.slice(prefix.length)),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  let body=await fs.readFile(file);
  if(state.release!=='A'){
   const original=await fs.readFile(path.join(root,'app.html')),updated=Buffer.from(original.toString().replace('<body ','<body data-qa-release="'+state.release+'" '));
   if(relative==='app.html')body=updated;
   if(relative==='sw.js')body=Buffer.from(body.toString().replace('const RELEASE="20261015-entry1"','const RELEASE="20261015-entry1-'+state.release+'"').replaceAll(crypto.createHash('sha256').update(original).digest('hex'),crypto.createHash('sha256').update(updated).digest('hex')));
  }
  if(state.broken&&relative==='workspace.css')body=Buffer.from('/* incomplete deploy */');
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.ttf':'font/ttf'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {base:'http://127.0.0.1:'+server.address().port+prefix,state,close:()=>new Promise(resolve=>server.close(resolve))};
};
