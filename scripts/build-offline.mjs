import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const version=read('app.html').toString().match(/src\/app\.js\?v=([^"']+)/)[1];
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const files=['app.html','manifest.webmanifest','icon.svg','styles.css','design.css','workspace.css','theme.css',...walk('src').filter(p=>p.endsWith('.js')),...walk('assets/fonts').filter(p=>p.endsWith('.ttf')),...walk('assets/illustrated-covers'),...walk('vendor').filter(p=>!p.includes('/ocr-')&&/\.(js)$/.test(p))];
const appVersion=read('src/offline.js').toString().match(/FIELD_VERSION='([^']+)'/)[1];
// Git publishes LF according to .gitattributes. Refuse to hash CRLF bytes that
// would change on checkout and prevent the deployed worker from installing.
for(const file of files)if(/\.(js|css|html|svg|webmanifest)$/.test(file)&&read(file).includes(Buffer.from('\r\n')))throw Error('Offline asset must use LF before hashing: '+file);
if(JSON.parse(read('package.json')).version!==appVersion)throw Error('Package and visible version differ');
const assets=files.flatMap(file=>{const sha256=crypto.createHash('sha256').update(read(file)).digest('hex');return [file,...(/\.(js|css|svg)$/.test(file)?[file+'?v='+version]:[])].map(url=>({url,sha256}));});
const output=read('scripts/offline-worker.template.js').toString().replace('__RELEASE__',JSON.stringify(version)).replace('__ASSETS__',JSON.stringify(assets));
if(process.argv.includes('--check')){if(!fs.existsSync(path.join(root,'sw.js'))||read('sw.js').toString()!==output)throw Error('Offline release outdated: run node scripts/build-offline.mjs');console.log('Offline release manifest and digests OK');}
else{fs.writeFileSync(path.join(root,'sw.js'),output);console.log('Offline release: '+files.length+' files, '+files.reduce((n,p)=>n+read(p).length,0)+' bytes');}
