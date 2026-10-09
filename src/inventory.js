import {normalizeLocation,displayLocation} from './domain.js?v=20261009-12';

export const LOCATION_TYPES=Object.freeze(['sector','shelving','shelf']);
export const INVENTORY_STATUSES=Object.freeze(['open','closed']);
export const INVENTORY_FINDING_STATUSES=Object.freeze(['found','misplaced','outside-scope','unscanned']);

const clean=(v,max=160)=>String(v??'').trim().slice(0,max);

export function normalizeLibraryLocation(raw={}){
  const type=LOCATION_TYPES.includes(raw.type)?raw.type:'sector';
  const name=clean(raw.name,80);
  if(!name)throw new Error('Ingresá un nombre para la ubicación.');
  return {
    id:clean(raw.id,160)||crypto.randomUUID(),
    type,
    name,
    parentId:clean(raw.parentId,160),
    active:raw.active!==false,
    order:Number.isFinite(Number(raw.order))?Math.max(0,Math.trunc(Number(raw.order))):0
  };
}

export function locationPath(locations,id){
  const byId=new Map((locations||[]).map(x=>[x.id,x]));
  const parts=[];let current=byId.get(id),guard=0;
  while(current&&guard++<10){parts.unshift(current);current=current.parentId?byId.get(current.parentId):null;}
  return parts;
}

export function validateLocationHierarchy(locations,location){
  const byId=new Map((locations||[]).map(x=>[x.id,x]));
  if(location.type==='sector'&&location.parentId)throw new Error('Un sector no puede depender de otra ubicación.');
  if(location.type==='shelving'){
    const parent=byId.get(location.parentId);
    if(!parent||parent.type!=='sector')throw new Error('Una estantería debe pertenecer a un sector.');
  }
  if(location.type==='shelf'){
    const parent=byId.get(location.parentId);
    if(!parent||parent.type!=='shelving')throw new Error('Un estante debe pertenecer a una estantería.');
  }
  return true;
}

export function locationLabelsFromNode(locations,id){
  const path=locationPath(locations,id);
  return normalizeLocation({
    sector:path.find(x=>x.type==='sector')?.name||'',
    shelving:path.find(x=>x.type==='shelving')?.name||'',
    shelf:path.find(x=>x.type==='shelf')?.name||'',
    sectorId:path.find(x=>x.type==='sector')?.id||'',
    shelvingId:path.find(x=>x.type==='shelving')?.id||'',
    shelfId:path.find(x=>x.type==='shelf')?.id||''
  });
}

export function scopeContainsLocation(scope,copyLocation={}){
  const l=normalizeLocation(copyLocation);
  if(!scope)return true;
  if(scope.type==='sector')return scope.id?l.sectorId===scope.id:clean(l.sector).toLowerCase()===clean(scope.name).toLowerCase();
  if(scope.type==='shelving')return scope.id?l.shelvingId===scope.id:clean(l.shelving).toLowerCase()===clean(scope.name).toLowerCase();
  if(scope.type==='shelf')return scope.id?l.shelfId===scope.id:clean(l.shelf).toLowerCase()===clean(scope.name).toLowerCase();
  return false;
}

export function buildInventoryScope(location,locations=[]){
  if(!location)return {type:'all',id:'',name:'Toda la biblioteca',label:'Toda la biblioteca'};
  const path=locationPath(locations,location.id);
  return {
    type:location.type,
    id:location.id,
    name:location.name,
    label:path.map(x=>x.name).join(' · ')||location.name
  };
}

export function expectedCopiesForScope(books,scope){
  return (books||[]).flatMap(book=>(book.exemplars||[]).map(copy=>({book,copy})))
    .filter(({copy})=>!['withdrawn'].includes(copy.status)&&scopeContainsLocation(scope,copy.physicalLocation||copy.location));
}

export function classifyInventoryScan({session,book,copy}){
  if(!session||session.status!=='open')throw new Error('El inventario no está abierto.');
  const expected=(session.expectedExemplarIds||[]).includes(copy.id);
  if(!expected)return {
    exemplarId:copy.id,bookId:book.id,internalCode:copy.internalCode,title:book.title,
    status:'outside-scope',expectedLocation:displayLocation(copy.physicalLocation)||copy.location||'',scannedAt:new Date().toISOString()
  };
  const inScope=scopeContainsLocation(session.scope,copy.physicalLocation||copy.location);
  return {
    exemplarId:copy.id,bookId:book.id,internalCode:copy.internalCode,title:book.title,
    status:inScope?'found':'misplaced',expectedLocation:displayLocation(copy.physicalLocation)||copy.location||'',scannedAt:new Date().toISOString()
  };
}

export function inventorySummary(session){
  const findings=session?.findings||[];
  const counts={found:0,misplaced:0,'outside-scope':0,unscanned:0};
  for(const f of findings)if(Object.hasOwn(counts,f.status))counts[f.status]++;
  return {...counts,totalExpected:(session?.expectedExemplarIds||[]).length,totalScanned:findings.filter(f=>f.status!=='unscanned').length};
}
