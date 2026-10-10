import {spawnSync} from 'node:child_process';
const groups={smoke:['rc1-browser'],flows:['pilot-browser','school-pilot-browser','notices-browser','desk-browser','reader-browser','cataloging-browser','assistance-browser','collection-planning-browser','inventory-dual-browser','migration-browser','holding-identity-browser','access-browser','import-browser'],ocr:['ocr-engine-browser']};
const group=process.argv[2]||'smoke';
if(!groups[group])throw new Error('Unknown browser group: '+group);
for(const name of groups[group]){console.log('\nRUN '+name);const result=spawnSync(process.execPath,['tests/'+name+'.cjs'],{stdio:'inherit',env:process.env,timeout:240000});if(result.error)console.error(result.error.message);if(result.status!==0)process.exit(result.status||1);}
