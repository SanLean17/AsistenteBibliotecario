import {fieldState} from '../tests/fixtures/field-state.js';
import {searchCatalog} from '../src/search-engine.js';
import {restoreIntegrity} from '../src/recovery.js';
import {JsonBackupProvider} from '../src/imports.js';
import {mergeScope} from '../src/access-model.js';
import fs from 'node:fs';
const report={version:JSON.parse(fs.readFileSync('package.json')).version,measurements:[]};
for(const size of ['small','medium','large']){
 const s=fieldState(size),row={size,materials:s.books.length,copies:s.books.reduce((n,b)=>n+b.copies,0),people:s.people.length};
 const measure=(key,fn)=>{const start=performance.now(),result=fn();row[key]=Math.round(performance.now()-start);return result;};
 measure('searchMs',()=>searchCatalog(s.books,'oceános'));measure('integrityMs',()=>restoreIntegrity(s));
 const json=measure('exportMs',()=>JSON.stringify(s));row.bytes=Buffer.byteLength(json);measure('parseMs',()=>JsonBackupProvider.parse(json));
 const all=Object.fromEntries(Object.entries(s).filter(([,v])=>Array.isArray(v)));measure('mergeMs',()=>mergeScope(all,structuredClone(s),s.institutionId));
 report.measurements.push(row);
}
fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/field-benchmark-'+(process.argv[2]||'current')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
