import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {browserSuites} from '../scripts/browser-suites.mjs';
test('V2 shards retain each previous browser scenario once and contain no missing script',()=>{
 const all=Object.values(browserSuites).flat();assert.equal(new Set(all).size,all.length);
 const previous=['rc1-browser','entry-browser','help-browser','notices-browser','desk-browser','reader-browser','collection-planning-browser','inventory-dual-browser','cataloging-browser','assistance-browser','ocr-engine-browser','pilot-browser','school-pilot-browser','teaching-browser','analytics-browser','organization-browser','organization-responsive-browser','organization-migration-browser','federation-browser','migration-browser','migration-center-browser','holding-identity-browser','access-browser','import-browser','hemeroteca-browser','field-offline-browser','field-volume-browser','field-school-browser','field-cross-browser'];
 for(const name of previous)assert(all.includes(name),name+' disappeared');for(const name of all)assert(fs.existsSync('tests/'+name+'.cjs'),name);
});
test('V2 runtime never imports QA fixtures and pinned vendors retain licensed bytes',()=>{
 for(const path of fs.readdirSync('src',{recursive:true}).filter(p=>p.endsWith('.js'))){const source=fs.readFileSync('src/'+path,'utf8');assert.doesNotMatch(source,/(?:from\s*|import\s*\()['"][^'"]*(?:tests\/|school-v2)/,path);}
 const {files}=JSON.parse(fs.readFileSync('scripts/vendor-checksums.json','utf8'));
 for(const {file,sha256} of files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha256,file);
 for(const license of ['vendor/JsBarcode-LICENSE','vendor/qrcode-generator-LICENSE','vendor/ZXING-LICENSE.txt','vendor/ZXING-LIBRARY-LICENSE.txt','vendor/ocr-6.0.1/LICENSE','vendor/ocr-6.0.1/LICENSE-tesseract-js','vendor/ocr-6.0.1/LICENSE-tessdata'])assert(fs.statSync(license).size>100,license);
});
