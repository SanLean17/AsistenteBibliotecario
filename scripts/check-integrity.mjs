import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rel=p=>path.relative(root,p).split(path.sep).join('/');
const issues=[];
const exists=p=>fs.existsSync(p);

function walk(dir,filter){
  const full=path.join(root,dir);
  if(!exists(full))return [];
  const out=[];
  for(const entry of fs.readdirSync(full,{withFileTypes:true})){
    const p=path.join(full,entry.name);
    if(entry.isDirectory())out.push(...walk(rel(p),filter));
    else if(filter(p))out.push(p);
  }
  return out;
}

function resolveLocal(from,spec){
  const clean=spec.split('?')[0].split('#')[0];
  const base=path.resolve(path.dirname(from),clean);
  for(const p of [base,base+'.js',base+'.mjs',base+'.cjs',path.join(base,'index.js')]){
    if(exists(p)&&fs.statSync(p).isFile())return p;
  }
  return null;
}

const codeFiles=[
  ...walk('src',p=>/\.(js|mjs|cjs)$/.test(p)),
  ...walk('server',p=>/\.(js|mjs|cjs)$/.test(p)),
  ...walk('scripts',p=>/\.(js|mjs|cjs)$/.test(p))
];

for(const file of codeFiles){
  const text=fs.readFileSync(file,'utf8');
  const specs=[];
  for(const m of text.matchAll(/\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g))specs.push(m[1]);
  if(rel(file).startsWith('src/')||rel(file).startsWith('server/')){
    for(const m of text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g))specs.push(m[1]);
  }
  for(const spec of specs){
    if(spec.startsWith('.')&&!resolveLocal(file,spec))issues.push(rel(file)+': referencia local inexistente '+spec);
  }
}

const ocrDir=path.join(root,'vendor/ocr-6.0.1');
const ocrManifest=JSON.parse(fs.readFileSync(path.join(ocrDir,'manifest.json'),'utf8'));
for(const asset of ocrManifest.assets){const file=path.join(ocrDir,asset.file);if(!exists(file)){issues.push('OCR: falta '+asset.file);continue;}const bytes=fs.readFileSync(file);if(bytes.length!==asset.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)issues.push('OCR: checksum incorrecto '+asset.file);}

const appHtml=fs.readFileSync(path.join(root,'app.html'),'utf8');
const appVersion=appHtml.match(/src\/app\.js\?v=([^"'&]+)/)?.[1];
if(!appVersion)issues.push('app.html: falta versión de caché en src/app.js');

for(const file of [...walk('src',p=>p.endsWith('.js')),...walk('tests',p=>/\.(js|cjs)$/.test(p)),...walk('scripts',p=>/\.(js|cjs)$/.test(p))]){
  const text=fs.readFileSync(file,'utf8');
  for(const m of text.matchAll(/(?:\.\.\/|\.\/)(?:src\/)?[^'"\s?]+\.js\?v=([^'"]+)/g)){
    if(appVersion&&m[1]!==appVersion)issues.push(rel(file)+': versión '+m[1]+' distinta de app '+appVersion);
  }
}

for(const htmlName of ['app.html','index.html']){
  const file=path.join(root,htmlName),text=fs.readFileSync(file,'utf8');
  for(const m of text.matchAll(/\?v=([^"'&\s]+)/g))if(m[1]!==appVersion)issues.push(htmlName+': versión de recurso '+m[1]+' distinta de '+appVersion);
  for(const m of text.matchAll(/\b(?:src|href)=['"]([^'"]+)['"]/g)){
    const ref=m[1];
    if(!ref||ref.startsWith('#')||ref.includes('://')||ref.startsWith('mailto:')||ref.startsWith('tel:')||ref.startsWith('data:'))continue;
    const clean=ref.split('?')[0].split('#')[0];
    if(!clean||clean==='./')continue;
    const target=path.resolve(path.dirname(file),clean);
    if(!exists(target))issues.push(htmlName+': recurso inexistente '+ref);
  }
}

for(const name of ['styles.css','design.css','theme.css','workspace.css','landing.css','landing-refinement.css']){
  const file=path.join(root,name);
  if(!exists(file))continue;
  const text=fs.readFileSync(file,'utf8');
  for(const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)){
    const ref=m[1].trim();
    if(!ref||ref.includes('://')||ref.startsWith('data:')||ref.startsWith('#'))continue;
    const target=path.resolve(path.dirname(file),ref.split('?')[0].split('#')[0]);
    if(!exists(target))issues.push(name+': recurso inexistente '+ref);
  }
}

if(issues.length){
  console.error('Integrity check failed:\n- '+issues.join('\n- '));
  process.exit(1);
}
console.log('Integrity OK: '+codeFiles.length+' módulos revisados; caché '+appVersion+'; referencias válidas.');
