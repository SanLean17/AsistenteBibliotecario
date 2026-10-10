import {parseISO2709,marcRecordToCatalog} from './marc.js?v=20261010-rc1';
import {classifyCapture} from './cataloging.js?v=20261010-rc1';
import {canonicalISBN} from './isbn.js?v=20261010-rc1';

// Parsing and preview are read-only. No item is incorporated by selecting a file.
export function previewMarc(input,books){
 const records=parseISO2709(input);if(records.length>10000)throw new Error('El archivo supera 10000 registros.');
 const entries=[],seenISBN=new Map(),seenMARC=new Map();let repeated=0;
 for(const record of records){
  const draft=marcRecordToCatalog(record)||{title:'',copies:0,identifiers:{marc001:record.fields.find(f=>f.tag==='001')?.value||''},sourceRecords:[{source:'Aguapey · MARC ISO 2709',format:'MARC21/ISO2709',fields:record.fields,leader:record.leader}]};
  const isbn=canonicalISBN(draft.isbn),marc=draft.identifiers?.marc001;
  const previous=(isbn&&seenISBN.get(isbn))||(marc&&seenMARC.get(marc));
  if(previous){repeated++;previous.draft.exemplars??=[];previous.draft.sourceRecords=[...(previous.draft.sourceRecords||[]),...(draft.sourceRecords||[])].slice(-10);for(const field of ['title','author','publisher','year','isbn'])if(draft[field]&&previous.draft[field]&&draft[field]!==previous.draft[field]&&!(field==='isbn'&&canonicalISBN(draft[field])===canonicalISBN(previous.draft[field]))){previous.draft.conflicts??=[];previous.draft.conflicts.push({field,source:'Otro registro MARC del archivo',value:draft[field]});}for(const e of draft.exemplars||[])if(e.inventoryCode&&!previous.draft.exemplars.some(p=>p.inventoryCode===e.inventoryCode))previous.draft.exemplars.push(e);previous.draft.copies=previous.draft.exemplars?.length||0;continue;}
  const item={source:'marc',draft,isbn,quantity:draft.copies||0,status:'metadata-missing'};
  item.classification=classifyCapture(books,item);entries.push(item);if(isbn)seenISBN.set(isbn,item);if(marc)seenMARC.set(marc,item);
 }
 const summary={records:records.length,newEditions:0,exactMatches:0,existingISBN:0,newCopies:0,conflicts:0,needsReview:0,repeated};
 for(const item of entries){item.quantity=item.draft.copies||0;const c=item.classification=classifyCapture(books,item);
  if(c.status==='ready-new')summary.newEditions++;
  else if(c.status==='existing-edition'){summary.exactMatches++;if(item.isbn&&books.some(b=>canonicalISBN(b.isbn)===item.isbn))summary.existingISBN++;}
  else{summary.needsReview++;if(c.status==='needs-review'||c.status==='similar'||c.status==='same-work')summary.conflicts++;}
  if(['ready-new','existing-edition'].includes(c.status)){const target=books.find(b=>b.id===c.targetId);summary.newCopies+=(item.draft.exemplars||[]).filter(e=>!target||!e.inventoryCode||!target.exemplars.some(x=>x.inventoryCode===e.inventoryCode)).length;}
 }
 return {entries,summary};
}
