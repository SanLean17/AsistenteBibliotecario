import test from 'node:test';
import assert from 'node:assert/strict';
import {STORES,normalizeHoldings,command} from '../src/local-domain.js';
import {validateBook} from '../src/catalog.js';
import {JsonBackupProvider} from '../src/imports.js';
const archive=()=>{const s=Object.fromEntries(STORES.map(k=>[k,[]]));s.patrons=[{id:'admin',name:'Responsable',role:'administrador',active:true}];s.books=[validateBook({title:'Prueba de respaldo',copies:2})];normalizeHoldings(s);return {app:'asistente-bibliotecario',version:4,...s};};
test('full backup rejects duplicate codes and broken active loan references',()=>{const s=archive();assert.equal(JsonBackupProvider.parse(JSON.stringify(s)).books.length,1);s.books[0].exemplars[1].internalCode=s.books[0].exemplars[0].internalCode;assert.throws(()=>JsonBackupProvider.parse(JSON.stringify(s)),/Códigos/);const a=archive();const l=command(a,'admin','loan.create',{exemplarId:a.books[0].exemplars[0].id,patronId:'admin',dueAt:'2030-12-01'});a.loans.push({...l,id:'duplicate'});assert.throws(()=>JsonBackupProvider.parse(JSON.stringify(a)),/duplicado/);});
test('full backup rejects missing stores and absent enabled manager',()=>{const s=archive();delete s.grants;assert.throws(()=>JsonBackupProvider.parse(JSON.stringify(s)),/incompleto/);const a=archive();a.patrons[0].active=false;assert.throws(()=>JsonBackupProvider.parse(JSON.stringify(a)),/gestión/);});
