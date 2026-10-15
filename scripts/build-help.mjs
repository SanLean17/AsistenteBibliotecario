import fs from 'node:fs';
import {helpArticles,contextualHelp,HELP_VERSION} from '../src/help-content.js';
import {validateHelp} from '../src/help.js';
const all=['biblioteca','autoridad','docente','lector','personal'],managers=['biblioteca','autoridad'];
const map=[['biblioteca','GUIA-BIBLIOTECA',['biblioteca']],['docente','GUIA-DOCENTE',['docente']],['autoridad','GUIA-AUTORIDAD',['autoridad']],['migracion','MIGRACION',['biblioteca']],['red','RED-ESCOLAR',managers],['hemeroteca','HEMEROTECA',all],['analitica','ANALITICA-BIBLIOTECA',managers],['organizacion','ADMINISTRACION-INSTITUCIONAL',managers],['ingreso','INGRESO-Y-ACCESO',all],['privacidad','PRIVACIDAD-PILOTO',all]];
// Markdown is converted to text blocks, never interpreted as HTML or remote URLs.
const plain=s=>s.replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[*`]/g,'');
export function blocks(text){return text.split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('```')).map(line=>{const heading=line.match(/^(#{1,6})\s+(.*)/);return {type:heading?'heading':/^\s*(?:[-*]|\d+\.)\s/.test(line)?'item':'paragraph',text:plain(heading?heading[2]:line.replace(/^\s*(?:[-*]|\d+\.)\s/,''))};});}
const docs=map.map(([id,name,roles])=>({id,title:name,path:'docs/'+name+'.md',roles,blocks:blocks(fs.readFileSync('docs/'+name+'.md','utf8'))}));
const routes=new Set([...helpArticles.map(a=>a.relatedRoute),...Object.keys(contextualHelp)]);
const sources=fs.readdirSync('src').filter(f=>(f.endsWith('-ui.js')||f==='app.js')&&f!=='help-ui.js').map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n');
for(const route of routes)if(!sources.includes("'"+route+"'")&&!sources.includes('"'+route+'"'))throw Error('Help points to absent route: '+route);
const issues=validateHelp(helpArticles,routes);if(issues.length)throw Error(issues.join('\n'));
if(JSON.parse(fs.readFileSync('package.json')).version!==HELP_VERSION)throw Error('Help version does not match package');
const output='// Generated from controlled repository docs. Run node scripts/build-help.mjs.\nexport const helpDocuments='+JSON.stringify(docs,null,2)+';\nexport const helpReleases='+JSON.stringify(blocks(fs.readFileSync('RELEASE_NOTES.md','utf8')),null,2)+';\n';
const target='src/help-documents.js';
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output)throw Error('Integrated help docs stale: run node scripts/build-help.mjs');console.log('Help integrity: articles, routes, documents and version OK');}else fs.writeFileSync(target,output);
