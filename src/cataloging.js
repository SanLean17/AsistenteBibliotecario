import {canonicalISBN} from './isbn.js?v=20261010-5';
import {detectCatalogMatches} from './duplicates.js?v=20261010-5';
import {validateBook} from './catalog.js?v=20261010-5';
import {hasPermission,requirePermission} from './permissions.js?v=20261010-5';
import {locationLabelsFromNode} from './inventory.js?v=20261010-5';

export const QUEUE_LABELS={pending:'Buscando metadatos','ready-new':'Listo para incorporar','existing-edition':'Edición existente','same-work':'Posible otra edición',similar:'Registro parecido','metadata-missing':'Sin metadatos',invalid:'Código inválido / ilegible','needs-review':'Requiere revisión',incorporated:'Incorporado'};
export const SESSION_LABELS={open:'Jornada en curso',completed:'Jornada finalizada',cancelled:'Jornada cancelada'};
const now=()=>new Date().toISOString();
const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
const cfg=s=>s.settings.find(x=>x.id==='local');
const active=j=>j.status==='open';
export function canCatalog(s,actor){return ['catalog.create','holdings.create'].some(p=>hasPermission(actor,p,s.grants||[]));}
function requireCapture(s,id){if(!canCatalog(s,s.patrons.find(p=>p.id===id)))throw new Error('Necesitás permiso para crear fichas o agregar ejemplares.');}
function quantity(v){const n=Number(v);if(!Number.isInteger(n)||n<0||n>9999)throw new Error('Cantidad inválida: usá un entero entre 0 y 9999.');return n;}
export function classifyCapture(books,item){
 if(item.status==='incorporated')return {status:'incorporated',matches:[]};
 const draft=item.draft||{},isbn=canonicalISBN(item.isbn||draft.isbn);
 if(item.source!=='marc'&&!isbn)return {status:'invalid',matches:[]};
 if(item.source==='marc'&&draft.isbn&&!canonicalISBN(draft.isbn))return {status:'needs-review',matches:[],reason:'ISBN MARC inválido: corregilo o dejalo vacío.'};
 const matches=detectCatalogMatches(books,{...draft,isbn:isbn||'',workId:''});
 const marc=clean(draft.identifiers?.marc001);
 if(marc)for(const book of books)if(book.identifiers?.marc001===marc&&!matches.some(m=>m.book.id===book.id))matches.unshift({kind:'exact-edition',book,reasons:['Mismo MARC001']});
 const exact=matches.filter(m=>m.kind==='exact-edition');
 if(exact.length>1)return {status:'needs-review',matches,reason:'Hay varias coincidencias exactas. Revisá el catálogo antes de incorporar.'};
 if(exact.length){const existing=exact[0].book;if(marc&&existing.identifiers?.marc001===marc&&isbn&&canonicalISBN(existing.isbn)&&canonicalISBN(existing.isbn)!==isbn)return {status:'needs-review',matches,reason:'El MARC001 coincide pero el ISBN es diferente. Revisá el registro de origen.'};return {status:'existing-edition',matches,targetId:existing.id};}
 if(!clean(draft.title))return {status:item.status==='pending'?'pending':'metadata-missing',matches};
 try{validateBook({...draft,isbn:isbn||draft.isbn||'',copies:0});}catch(error){return {status:'needs-review',matches,reason:error.message};}
 if(item.resolution==='new')return {status:'ready-new',matches};
 if(item.resolution==='link-work'){
  if(!books.some(b=>b.workId===item.workId))return {status:'needs-review',matches,reason:'La obra vinculada ya no existe.'};
  return {status:'ready-new',matches,workId:item.workId};
 }
 if(draft.conflicts?.length)return {status:'needs-review',matches,reason:'Las fuentes bibliográficas difieren. Revisá y confirmá los campos.'};
 if(matches.some(m=>m.kind==='same-work'))return {status:'same-work',matches};
 if(matches.some(m=>m.kind==='similar'))return {status:'similar',matches};
 return {status:'ready-new',matches};
}
function classify(s,item){const c=classifyCapture(s.books,item);item.status=c.status;item.reason=c.reason||'';item.targetId=c.targetId||'';item.matches=c.matches.map(m=>({bookId:m.book.id,kind:m.kind,reasons:m.reasons}));return c;}
export function catalogingSummary(j){
 const done=j.items.filter(i=>i.status==='incorporated');
 return {captures:j.captures.length,newEditions:done.filter(i=>i.result.action==='new').length,newCopies:done.reduce((n,i)=>n+i.result.exemplarIds.length,0),addedCopies:done.filter(i=>i.result.action==='existing').reduce((n,i)=>n+i.result.exemplarIds.length,0),duplicatesAvoided:done.filter(i=>i.result.action==='existing').length+j.items.reduce((n,i)=>n+Math.max(0,i.captureCount-1),0),pending:j.items.filter(i=>i.status!=='incorporated').length,missing:j.items.filter(i=>i.status==='metadata-missing').length,invalid:j.items.filter(i=>i.status==='invalid').length};
}
function incomingCopies(item,target){
 if(item.source!=='marc')return item.quantity;
 const incoming=item.draft.exemplars||[];
 if(item.quantity!==incoming.length)return item.quantity;
 return incoming.filter(e=>!e.inventoryCode||!(target?.exemplars||[]).some(old=>old.inventoryCode===e.inventoryCode)).length;
}
export function planCataloging(s,j,ids){
 const selected=new Set(ids),rows=[],virtualBooks=[...s.books];
 for(const item of j.items){if(!selected.has(item.id)||item.status==='incorporated')continue;const c=classifyCapture(virtualBooks,item);
  if(!['ready-new','existing-edition'].includes(c.status))throw new Error('La selección incluye pendientes. Revisalos antes de incorporar.');
  const target=virtualBooks.find(b=>b.id===c.targetId),count=quantity(incomingCopies(item,target));
  rows.push({id:item.id,action:target?'existing':'new',targetId:target?.id||'',targetUpdated:target?.updatedAt||'',count,workId:c.workId||'',revision:item.revision||0});
  if(!target)virtualBooks.push({...item.draft,id:'queue:'+item.id,isbn:item.isbn||item.draft.isbn,exemplars:item.draft.exemplars||[]});
 }
 if(!rows.length)throw new Error('Seleccioná al menos un ítem pendiente y seguro.');
 const plan={rows,newEditions:rows.filter(r=>r.action==='new').length,newCopies:rows.reduce((n,r)=>n+r.count,0),addedCopies:rows.filter(r=>r.action==='existing').reduce((n,r)=>n+r.count,0),pending:j.items.filter(i=>i.status!=='incorporated'&&!selected.has(i.id)).length};
 return {...plan,signature:JSON.stringify(rows)};
}
function safeCommon(s,data){
 const allowed=new Set(['location','sector','shelving','shelf','locationId','condition','quantity','circulationPolicy']);
 if(Object.keys(data).some(k=>!allowed.has(k)))throw new Error('Solo se pueden aplicar datos físicos comunes, cantidad y política.');
 const out={};for(const [key,value] of Object.entries(data))if(value!==''&&value!=null)out[key]=clean(value,120);
 if(out.quantity!==undefined)out.quantity=quantity(out.quantity);
 if(out.condition&&!['Nuevo','Bueno','Regular','Deteriorado'].includes(out.condition))throw new Error('Condición inválida.');
 if(out.circulationPolicy&&!['standard','room-only','non-renewable'].includes(out.circulationPolicy))throw new Error('Política inválida.');
 if(out.locationId){if(!s.libraryLocations.some(l=>l.id===out.locationId))throw new Error('La ubicación ya no existe.');Object.assign(out,locationLabelsFromNode(s.libraryLocations,out.locationId));}
 return out;
}
function copiesFor(s,item,count,target){
 let incoming=item.source==='marc'?(item.draft.exemplars||[]):[];
 if(target&&item.quantity===incoming.length)incoming=incoming.filter(e=>!e.inventoryCode||!target.exemplars.some(old=>old.inventoryCode===e.inventoryCode));
 const c=item.common||{},loc=c.location??item.draft?.location??'';
 return Array.from({length:count},(_,index)=>{
  const old=incoming[index]||{};
  return {...old,id:crypto.randomUUID(),internalCode:'',inventoryCode:old.inventoryCode||'',location:c.location||[c.sector,c.shelving,c.shelf].filter(Boolean).join(' · ')||old.location||loc,physicalLocation:{...(old.physicalLocation||{}),...Object.fromEntries(['sector','shelving','shelf','sectorId','shelvingId','shelfId'].filter(k=>c[k]!=null).map(k=>[k,c[k]]))},condition:c.condition||old.condition||'Bueno',status:old.status==='lost'||old.status==='withdrawn'?old.status:'available'};
 });
}
function incorporate(s,actorId,j,data,helpers){
 const oldBatch=j.batches.find(b=>b.id===data.batchId);if(oldBatch)return oldBatch;
 const plan=planCataloging(s,j,data.ids||[]);if(plan.signature!==data.signature)throw new Error('Cambió la selección o el catálogo. Volvé a revisar el resumen.');
 if(!clean(data.batchId,100))throw new Error('Falta la identificación del lote.');
 for(const row of plan.rows){requirePermission(s,actorId,row.action==='new'?'catalog.create':'holdings.create');if(row.count)requirePermission(s,actorId,'holdings.create');}
 const created=[],createdBooks=new Map();
 for(const row of plan.rows){
  const item=j.items.find(i=>i.id===row.id);let target=s.books.find(b=>b.id===row.targetId)||createdBooks.get(row.targetId);
  // Recheck earlier rows from the same batch: MARC and ISBN aliases can converge.
  if(!target){const exact=classifyCapture(s.books,item);if(exact.status==='existing-edition')target=s.books.find(b=>b.id===exact.targetId);}
  const actualAction=target?'existing':'new';const exemplars=copiesFor(s,item,row.count,target);
  if(target){requirePermission(s,actorId,'holdings.create');target.exemplars.push(...exemplars);target.copies=target.exemplars.length;target.updatedAt=now();}
  else{
   target=validateBook({...item.draft,id:crypto.randomUUID(),editionId:undefined,workId:row.workId||undefined,isbn:canonicalISBN(item.isbn||item.draft.isbn)||'',copies:row.count,exemplars,circulationPolicy:item.common?.circulationPolicy||item.draft.circulationPolicy,createdAt:now()});
   if(row.workId){const work=s.books.find(b=>b.workId===row.workId);for(const key of ['title','subtitle','author','authors','subjects','contents','contentEntries','description'])if(work[key]!==undefined)target[key]=structuredClone(work[key]);}
   Object.assign(target,{institutionId:s.institutionId||cfg(s).institutionId,libraryId:cfg(s).libraryId,collectionId:cfg(s).collectionId});s.books.push(target);createdBooks.set('queue:'+item.id,target);
  }
  helpers.normalizeHoldings(s);
  item.result={action:actualAction,bookId:target.id,exemplarIds:exemplars.map(e=>e.id),incorporatedAt:now(),incorporatedBy:actorId};
  // validateBook preserves the incoming copy IDs while creating the new edition.
  item.status='incorporated';created.push(...item.result.exemplarIds);
  helpers.audit(s,'cataloging.incorporated',actorId,{sessionId:j.id,itemId:item.id,bookId:target.id,count:row.count});
 }
 const result={id:data.batchId,createdAt:now(),actorId,exemplarIds:created,itemIds:plan.rows.map(r=>r.id)};j.batches.push(result);return result;
}
export function catalogingCommand(s,actorId,type,data={},helpers){
 requireCapture(s,actorId);s.catalogingSessions??=[];
 if(type==='start'){
  const current=s.catalogingSessions.find(active);if(current)return current;
  const j={id:crypto.randomUUID(),institutionId:s.institutionId||cfg(s).institutionId,status:'open',startedAt:now(),startedBy:actorId,items:[],captures:[],batches:[],revision:0};s.catalogingSessions.push(j);helpers.audit(s,'cataloging.started',actorId,{sessionId:j.id});return j;
 }
 const j=s.catalogingSessions.find(j=>j.id===data.sessionId);if(!j)throw new Error('Jornada inexistente.');
 if(type==='incorporate'&&j.batches.some(b=>b.id===data.batchId))return j.batches.find(b=>b.id===data.batchId);
 if(!active(j))throw new Error('La jornada ya está cerrada.');
 let result;
 if(type==='import'){
  if(!Array.isArray(data.entries)||data.entries.length>10000)throw new Error('Lote MARC inválido.');
  const candidate=structuredClone(s);for(const entry of data.entries)catalogingCommand(candidate,actorId,'capture',{sessionId:j.id,source:'marc',raw:entry.draft?.identifiers?.marc001||entry.draft?.isbn||'',draft:entry.draft},helpers);Object.assign(s,candidate);return candidate.catalogingSessions.find(x=>x.id===j.id);
 }else if(type==='capture'){
  if(j.captures.length>=10000)throw new Error('La jornada alcanzó 10000 capturas. Cerrala e iniciá otra.');
  const raw=clean(data.raw),isbn=canonicalISBN(raw),draft=data.source==='marc'?structuredClone(data.draft||{}):{isbn};
  const key=data.source==='marc'?(canonicalISBN(draft.isbn)||(draft.identifiers?.marc001?'marc:'+clean(draft.identifiers.marc001):crypto.randomUUID())):isbn;
  let item=key?j.items.find(i=>i.key===key&&i.status!=='incorporated'):null;
  if(item&&data.source==='marc'){
   const existing=item.draft.exemplars||[],incoming=draft.exemplars||[];for(const e of incoming)if(e.inventoryCode&&!existing.some(x=>x.inventoryCode===e.inventoryCode))existing.push(e);item.draft.exemplars=existing;item.draft.copies=existing.length;item.quantity=Math.max(item.quantity,existing.length);item.draft.sourceRecords=[...(item.draft.sourceRecords||[]),...(draft.sourceRecords||[])].slice(-10);item.revision++;classify(s,item);j.captures.push({id:crypto.randomUUID(),itemId:item.id,raw,source:'marc',capturedAt:now(),capturedBy:actorId,reimport:true});j.revision++;return item;
  } // Re-importing a record does not count as another physical copy.
  if(item){item.quantity=quantity(item.quantity+1);item.captureCount++;}
  else{item={id:crypto.randomUUID(),key:key||crypto.randomUUID(),isbn:isbn||canonicalISBN(draft.isbn)||'',raw,source:data.source||'manual',draft,quantity:data.source==='marc'?quantity(draft.copies||0):1,captureCount:1,common:{},status:isbn?'pending':'invalid',revision:0};j.items.push(item);classify(s,item);}
  j.captures.push({id:crypto.randomUUID(),itemId:item.id,raw,source:item.source,capturedAt:now(),capturedBy:actorId});result=item;
 }else if(type==='metadata'){
  const item=j.items.find(i=>i.id===data.itemId);if(!item||item.status!=='pending'||item.revision!==(data.revision||0))return;
  item.revision++;item.draft=data.book?{...structuredClone(data.book),isbn:item.isbn}:{isbn:item.isbn};item.lookupResults=data.results||[];item.status='metadata-missing';classify(s,item);result=item;
 }else if(type==='review'){
  const item=j.items.find(i=>i.id===data.itemId);if(!item||item.status==='incorporated')throw new Error('Ítem no editable.');
  const fields=['title','author','publisher','year','isbn','subjects','description','edition'];
  const patch=Object.fromEntries(fields.filter(k=>Object.hasOwn(data.fields||{},k)).map(k=>[k,data.fields[k]]));
  const draft={...item.draft,...patch};if(draft.isbn&&!canonicalISBN(draft.isbn))throw new Error('ISBN inválido. Corregilo antes de confirmar.');
  validateBook({...draft,copies:0});
  for(const k of Object.keys(patch))if(JSON.stringify(patch[k])!==JSON.stringify(item.draft[k])){draft.fieldSources={...draft.fieldSources};delete draft.fieldSources[k==='author'?'authors':k];}
  item.draft=draft;item.isbn=canonicalISBN(draft.isbn)||'';item.key=item.isbn||(item.source==='marc'&&draft.identifiers?.marc001?'marc:'+clean(draft.identifiers.marc001):item.id);item.quantity=quantity(data.quantity);item.resolution=data.resolution==='link-work'?'link-work':'new';item.workId=clean(data.workId);item.reviewedAt=now();item.reviewedBy=actorId;item.revision++;classify(s,item);result=item;
 }else if(type==='common'){
  const common=safeCommon(s,data.common||{});for(const item of j.items.filter(i=>(data.ids||[]).includes(i.id)&&i.status!=='incorporated')){if(common.quantity!==undefined)item.quantity=common.quantity;item.common={...item.common,...common};item.revision++;}result=j;
 }else if(type==='refresh'){
  for(const item of j.items)if(item.status!=='incorporated')classify(s,item);result=j;
 }else if(type==='incorporate'){
  const candidate=structuredClone(s),copy=candidate.catalogingSessions.find(x=>x.id===j.id);result=incorporate(candidate,actorId,copy,data,helpers);copy.revision++;copy.summary=catalogingSummary(copy);Object.assign(s,candidate);return result;
 }else if(type==='cancel'||type==='complete'){
  if(data.confirmed!==true)throw new Error('Confirmá el cierre de la jornada.');j.status=type==='cancel'?'cancelled':'completed';j.closedAt=now();j.closedBy=actorId;helpers.audit(s,'cataloging.'+j.status,actorId,{sessionId:j.id});result=j;
 }else throw new Error('Operación de jornada desconocida.');
 j.revision++;j.updatedAt=now();j.summary=catalogingSummary(j);return result;
}

export function validateCatalogingBackup(sessions){
 if(!Array.isArray(sessions)||sessions.filter(active).length>1)throw new Error('Jornadas activas inválidas en respaldo.');
 for(const j of sessions){
  if(!/^[a-zA-Z0-9_-]+$/.test(j.id||'')||!SESSION_LABELS[j.status]||!j.startedBy||!Number.isFinite(Date.parse(j.startedAt))||!Array.isArray(j.items)||!Array.isArray(j.captures)||!Array.isArray(j.batches)||j.items.length>10000||j.captures.length>10000)throw new Error('Jornada inválida en respaldo.');
  const ids=new Set();for(const i of j.items){if(!i.id||ids.has(i.id)||!QUEUE_LABELS[i.status]||!Number.isInteger(i.quantity)||i.quantity<0||i.quantity>9999||!Number.isInteger(i.captureCount)||i.captureCount<1||!i.draft||typeof i.draft!=='object')throw new Error('Ítem de jornada inválido.');ids.add(i.id);if(i.status==='incorporated'&&(!i.result||!Array.isArray(i.result.exemplarIds)||!['new','existing'].includes(i.result.action)))throw new Error('Resultado de jornada inválido.');}
  if(j.captures.some(c=>!ids.has(c.itemId))||j.batches.some(b=>!b.id||!Array.isArray(b.exemplarIds)))throw new Error('Referencias de jornada inválidas.');
 }
}
