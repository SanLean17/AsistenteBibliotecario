import {isSerialDraft,importSerialDraft} from './serial-migration.js?v=20261015-field2';
import {inspectDraft,MIGRATION_FIELDS} from './migration.js?v=20261015-field2';
import {validateBook} from './catalog.js?v=20261015-field2';
import {requirePermission} from './permissions.js?v=20261015-field2';
import {canonicalISBN} from './isbn.js?v=20261015-field2';

// Called only inside the existing institution-scoped IndexedDB transaction.
export function applyMigration(s,actorId,plan,{config,normalizeHoldings,audit}){
 requirePermission(s,actorId,'catalog.create');requirePermission(s,actorId,'holdings.create');
 const cfg=config(s);
 if(!plan.confirmed||plan.institutionId!==s.institutionId||plan.actorId!==actorId)throw Error('Confirmá la migración con la institución y el perfil originales.');
 const previous=cfg.migrationHistory?.find(h=>h.id===plan.id);if(previous)return previous;
 if(plan.snapshot!==JSON.stringify(s.books))throw Error('El catálogo cambió. Volvé a analizar el archivo antes de importar.');
 if(!Array.isArray(plan.entries)||plan.entries.length>10000)throw Error('Lote inválido.');
 const byId=new Map(s.books.map(b=>[b.id,b])),existingIds=new Set(byId.keys()),codes=new Map();for(const b of s.books)for(const e of b.exemplars)if(e.inventoryCode)codes.set(e.inventoryCode,b.id);
 const summary={newRecords:0,newCopies:0,reusedEditions:0,duplicatesAvoided:0,fieldsCompleted:0,warnings:0,errorsOmitted:0,kept:0},reused=new Set(),createdIds=[],duplicateRows=[],issues=[];
 let count=0;const stamp=new Date().toISOString();
 if(cfg.pilotMode?.enabled)audit(s,'migration.started',actorId,{migrationId:plan.id});
 for(const entry of plan.entries){
  if(!['new','copies','fill','keep'].includes(entry.action))throw Error('Decisión de migración inválida.');
  summary.warnings+=entry.warnings.length;if(entry.errors.length){summary.errorsOmitted++;issues.push({row:entry.row,severity:'error',messages:entry.errors});continue;}
  if(entry.warnings.length)issues.push({row:entry.row,severity:'warning',messages:entry.warnings.map(w=>w.startsWith('Inventario legado repetido:')?'Inventario legado repetido.':w)});
  if(entry.groupedInto!==undefined&&entry.action!=='keep')throw Error('La fila agrupada ya pertenece a otro número. Conservá la decisión de omitir esta fila.');
  if(entry.action==='keep'){summary.kept++;continue;}
  const checked=inspectDraft(entry.draft);if(checked.errors.length)throw Error('Fila '+entry.row+': '+checked.errors.join(' '));
  const d=checked.draft;let book;
  if(isSerialDraft(d)){const before=s.books.length;book=importSerialDraft(s,actorId,d,{config,normalizeHoldings,audit,migrationId:plan.id});if(s.books.length>before)summary.newRecords++;else reused.add(book.id);
  }else if(entry.action==='new'){
   if(entry.kind==='exact-edition')throw Error('No crees otra ficha para un ISBN ya existente.');
   // Allowlisted bibliographic data; no foreign IDs, links, photos or privileges.
   const raw=Object.fromEntries([...Object.keys(MIGRATION_FIELDS),'authors','contentEntries','identifiers','classification','sourceSubjects','sources','fieldSources','sourceRecords','publishedDate','audience','resourceUrl','publication','publicationDate','otherIdentifier','containerTitle','volume','issueNumber','editionLabel','pageRange','issuingBody','documentNumber','schoolArea','courseLevel','digitalFormat'].filter(f=>Object.hasOwn(d,f)).map(f=>[f,d[f]]));
   book=validateBook({...raw,copies:0,exemplars:[]});book.workId=crypto.randomUUID();book.editionId=crypto.randomUUID();book.institutionId=cfg.institutionId;book.libraryId=cfg.libraryId;book.collectionId=cfg.collectionId;book.migrationId=plan.id;
   s.books.push(book);byId.set('migration-row:'+entry.index,book);byId.set(book.id,book);summary.newRecords++;
  }else{
   book=byId.get(entry.targetId);if(!book||!canonicalISBN(d.isbn)||canonicalISBN(d.isbn)!==canonicalISBN(book.isbn))throw Error('La edición de destino no está disponible. Revisá las filas omitidas o el ISBN.');
   if(existingIds.has(book.id))reused.add(book.id);
   if(entry.action==='fill'){
    requirePermission(s,actorId,'catalog.edit');
    const incoming=validateBook({...d,copies:0,exemplars:[]});
    const allowed=['subtitle','author','authors','isbn','issn','doi','publisher','year','language','edition','pages','subjects','sourceSubjects','contents','contentEntries','description','notes'];
    // Work fields cannot diverge across linked editions. Shared works stay untouched.
    const shared=s.books.some(b=>b.id!==book.id&&b.workId===book.workId),workFields=['author','authors','subtitle','subjects','sourceSubjects','contents','contentEntries','description'];
    const empty=v=>v==null||v===''||(Array.isArray(v)&&!v.length),blocked=new Set();
    for(const pair of [['author','authors'],['contents','contentEntries'],['subjects','sourceSubjects']])if(pair.some(f=>!empty(book[f])))pair.forEach(f=>blocked.add(f));
    for(const f of allowed){if(blocked.has(f)||(shared&&workFields.includes(f)))continue;if(empty(book[f])&&!empty(incoming[f])){book[f]=structuredClone(incoming[f]);summary.fieldsCompleted++;}}
   }
  }
  for(const copy of d.exemplars||[]){
   if(++count>30000)throw Error('El lote supera 30.000 ejemplares.');
   const code=String(copy.inventoryCode||'');if(code&&codes.has(code)){if(codes.get(code)!==book.id)throw Error('Inventario legado repetido entre materiales distintos. Omití la fila y revisala.');summary.duplicatesAvoided++;duplicateRows.push(entry.row);continue;}
   const e={id:crypto.randomUUID(),inventoryCode:code,location:copy.location||d.location||[copy.physicalLocation?.sector,copy.physicalLocation?.shelving,copy.physicalLocation?.shelf].filter(Boolean).join(' · '),condition:copy.condition||d.condition||'Bueno',status:['lost','withdrawn','damaged'].includes(copy.status)?copy.status:'available',physicalLocation:{},migrationId:plan.id};
   for(const f of ['part','volume','loanPolicy','provenance','localNotes','classification','shelfmark'])if(typeof copy[f]==='string')e[f]=copy[f].slice(0,1200);
   book.exemplars.push(e);createdIds.push(e.id);if(code)codes.set(code,book.id);summary.newCopies++;
  }
  book.copies=book.exemplars.length;book.updatedAt=stamp;
 }
 normalizeHoldings(s);summary.reusedEditions=reused.size;
 const report={id:plan.id,date:stamp,source:plan.source,fileName:String(plan.fileName||'').slice(0,240),actorId,result:'completed',summary,exemplarIds:createdIds,encoding:plan.encoding,mapping:plan.headers.map((h,i)=>({column:i+1,header:String(h).slice(0,160),destination:plan.mapping[i]||'ignored'})),separator:plan.separator,issues,duplicateRows:[...new Set(duplicateRows)],warnings:plan.warnings};
 cfg.migrationHistory??=[];cfg.migrationHistory.push(report);audit(s,'migration.completed',actorId,{migrationId:plan.id,summary});return report;
}
