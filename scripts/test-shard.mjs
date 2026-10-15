import {spawnSync} from 'node:child_process';
import {browserSuites} from './browser-suites.mjs';
const name=process.argv[2],suite=browserSuites[name];if(!suite)throw Error('Unknown browser shard: '+name);
for(const test of suite){console.log('RUN '+name+' / '+test);const result=spawnSync(process.execPath,['tests/'+test+'.cjs'],{stdio:'inherit',env:process.env,timeout:300000});if(result.error)console.error(result.error.message);if(result.status!==0)process.exit(result.status||1);}
