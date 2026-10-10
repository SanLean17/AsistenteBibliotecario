import {shareableHolding,validateSharedHolding} from './holding-identity.js?v=20261010-2';
const text=(value,max=500)=>String(value??'').trim().slice(0,max);

export function shareableCatalogRecord(book,{institutionId='',institutionName='',libraryName='',availability=null,includeHoldings=false}={}){
  if(!book?.id||!book?.title)throw new Error('Material inválido para compartir.');
  const identifiers={};
  for(const key of ['isbn','issn','doi'])if(book[key])identifiers[key]=text(book[key],500);
  return {
    version:1,
    institution:{id:text(institutionId,160),name:text(institutionName,240),libraryName:text(libraryName,240)},
    material:{
      localRecordId:text(book.id,160),
      workId:text(book.workId,160),
      editionId:text(book.editionId,160),
      materialType:text(book.materialType,80),
      title:text(book.title,300),
      author:text(book.author,500),
      publication:text(book.publication,300),
      publicationDate:text(book.publicationDate,20),
      publisher:text(book.publisher,240),
      year:text(book.year,10),
      subjects:(book.subjects||[]).slice(0,50).map(v=>text(v,200)).filter(Boolean),
      identifiers
    },
    holdings:{
      ...(includeHoldings?{items:(book.exemplars||[]).map(e=>shareableHolding(e,institutionId))}:{}),
      total:Number(book.copies)||0,
      status:availability?.status||'unknown',
      label:text(availability?.label||'',120),
      estimatedAt:availability?.estimatedAt instanceof Date?availability.estimatedAt.toISOString():null
    }
  };
}

export function validateSharedCatalogRecord(raw){
  if(!raw||raw.version!==1||!raw.material?.title||!raw.institution)throw new Error('Registro compartido inválido.');
  const forbidden=['patron','email','loan','borrower','person','userId','actorId','reservations'];
  const serialized=JSON.stringify(raw).toLowerCase();
  for(const word of forbidden)if(serialized.includes('"'+word.toLowerCase()+'"'))throw new Error('El registro compartido contiene datos internos no permitidos.');
  if(raw.holdings?.items!==undefined){
    if(!Array.isArray(raw.holdings.items))throw new Error('Ejemplares compartidos inválidos.');
    const refs=new Set(),ids=new Set();
    for(const holding of raw.holdings.items){validateSharedHolding(holding,raw.institution.id);if(refs.has(holding.globalHoldingRef)||ids.has(holding.exemplarId))throw new Error('Ejemplar compartido duplicado.');refs.add(holding.globalHoldingRef);ids.add(holding.exemplarId);}
  }
  return raw;
}

export function buildFederatedSearchDocument(records=[]){
  return records.map(validateSharedCatalogRecord).map(record=>({
    institutionId:record.institution.id,
    institutionName:record.institution.name,
    libraryName:record.institution.libraryName,
    recordId:record.material.localRecordId,
    workId:record.material.workId,
    editionId:record.material.editionId,
    title:record.material.title,
    author:record.material.author,
    materialType:record.material.materialType,
    subjects:record.material.subjects,
    identifiers:record.material.identifiers,
    availability:record.holdings
  }));
}
