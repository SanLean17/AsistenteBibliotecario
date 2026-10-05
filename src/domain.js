// Dominio local preparado para migrar a multi-institución.
export const LOCAL_SCOPE=Object.freeze({institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection'});
export const USER_ROLES=Object.freeze(['administrador','bibliotecario','docente','alumno']);
export const CIRCULATION_STATES=Object.freeze(['untracked','available','loaned','reserved','overdue','lost','withdrawn']);
export const RESERVATION_STATES=Object.freeze(['requested','approved','ready','collected','cancelled','expired']);
export const LOCATION_FIELDS=Object.freeze(['sector','shelving','shelf']);

export function splitCatalogRecord(book){
 const {id,workId,editionId,title,subtitle,author,authors,subjects,contents,description,isbn,publisher,year,language,pages,edition,classification,identifiers,sources,exemplars}=book;
 return {
  work:{id:workId,title,subtitle,author,authors,subjects,contents,description},
  edition:{id:editionId,workId,isbn,publisher,year,language,pages,edition,classification,identifiers,sources},
  holdings:(exemplars||[]).map(e=>({...LOCAL_SCOPE,...e,editionId,recordId:id}))
 };
}
export function normalizeLocation(value={}){
 if(typeof value==='string')return {sector:value.trim().slice(0,80),shelving:'',shelf:''};
 return {
  sector:String(value.sector||'').trim().slice(0,80),
  shelving:String(value.shelving||'').trim().slice(0,80),
  shelf:String(value.shelf||'').trim().slice(0,80)
 };
}
export function displayLocation(value={}){
 const l=normalizeLocation(value);
 return [l.sector,l.shelving,l.shelf].filter(Boolean).join(' · ');
}
export function inventoryNumber(code){
 const match=String(code||'').match(/(\d+)$/);
 return match?Number(match[1]):0;
}
export function nextInventorySequence(books=[]){
 return books.flatMap(b=>b.exemplars||[]).reduce((max,e)=>Math.max(max,inventoryNumber(e.inventoryCode)),0)+1;
}
export function formatInventoryCode(sequence,{prefix='AB',width=6}={}){
 const n=Math.max(1,Number(sequence)||1);
 return String(prefix).replace(/[^A-Za-z0-9-]/g,'').toUpperCase()+'-'+String(n).padStart(width,'0');
}
export function assignMissingInventoryCodes(book,books=[],options={}){
 let next=nextInventorySequence(books);
 const used=new Set(books.flatMap(b=>b.exemplars||[]).map(e=>e.inventoryCode).filter(Boolean));
 const exemplars=(book.exemplars||[]).map(e=>{
  if(e.inventoryCode)return e;
  let code;
  do{code=formatInventoryCode(next++,options);}while(used.has(code));
  used.add(code);return {...e,inventoryCode:code,status:e.status==='untracked'?'available':(e.status||'available')};
 });
 return {...book,exemplars,copies:exemplars.length};
}
