// Optional server-side adapter. Never imported by the Pages application.
// Requires the open-source YAZ client on the server; no paid service is used.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isbnVariants, validISBN } from '../src/isbn.js';
import { marcToMetadata, parseISO2709 } from '../src/providers/marc.js';
const exec=promisify(execFile);
export const BN_TARGET=Object.freeze({host:'200.123.191.9',port:9991,database:'BNA01',authorities:'BNA10',charset:'UTF-8',format:'MARC21'});

export function buildBNCommands(isbn){
 if(!validISBN(isbn))throw new Error('ISBN inválido.');
 // User input becomes validated ISBN digits only, never a host or a command.
 return ['authentication Z39.50 Z39.50','charset UTF-8 UTF-8 UTF-8','format usmarc','elements F',`open ${BN_TARGET.host}:${BN_TARGET.port}/${BN_TARGET.database}`,`find @attr 1=7 ${isbnVariants(isbn)[0]}`,'show 1+5','quit'].join('\n')+'\n';
}
export async function yazTransport(isbn,{signal,binary=process.env.YAZ_CLIENT||'yaz-client'}={}){
 const commands=buildBNCommands(isbn),directory=await mkdtemp(join(tmpdir(),'ab-bn-'));
 try{
  const input=join(directory,'query.txt'),output=join(directory,'records.mrc');
  await writeFile(input,commands,{mode:0o600});
  const {stdout,stderr}=await exec(binary,['-f',input,'-m',output],{cwd:directory,timeout:12000,maxBuffer:1024*1024,windowsHide:true,signal});
  let bytes;try{bytes=await readFile(output);}catch(error){
   // An upstream failure must not masquerade as a legitimate empty result.
   if(error.code==='ENOENT'&&/Number of hits:\s*0\b/i.test(stdout))return [];
   throw new Error('La BN no devolvió registros MARC. Revisá conexión y autenticación.');
  }
  if(!bytes.length&&!/Number of hits:\s*0\b/i.test(stdout))throw new Error('Respuesta Z39.50 incompleta.');
  if(bytes.length>2*1024*1024)throw new Error('Respuesta bibliográfica demasiado grande.');
  return parseISO2709(bytes);
 }finally{await rm(directory,{recursive:true,force:true});}
}
export function createBNProvider({transport=yazTransport}={}){
 return {id:'bn-argentina',name:'Biblioteca Nacional Mariano Moreno',async lookup({isbn,signal}){
  for(const variant of isbnVariants(isbn)){
   signal?.throwIfAborted();
   const records=await transport(variant,{signal});
   for(const record of records){const book=marcToMetadata(record,{isbn});if(book)return {...book,marcRecord:record};}
  }
  return null;
 }};
}
