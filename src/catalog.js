import {MATERIAL_TYPES,validISSN} from './recognition.js?v=20261009-4';
import {normalizeContentEntries,contentSearchText,createAssistanceDraft} from './material-types.js?v=20261009-4';
import { validPhotoURL } from './photos.js?v=20261006-3';
import { cleanISBN, validISBN } from './isbn.js?v=20261006-3';
import { safeCover } from './metadata.js?v=20261006-3';
import { SOURCE_NAMES } from './providers/registry.js?v=20261006-3';
import { LOCAL_SCOPE, CIRCULATION_STATES } from './domain.js?v=20261006-3';
export const categories = ['Cuentos', 'Novela', 'Poesía', 'Informativo', 'Otros'];
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const searchable = value => normalize(value)
  .replace(/\b(segunda|2da|2a|ii|2) guerra mundial\b|\bguerra mundial (segunda|2da|2a|ii|2)\b/g,' segunda guerra mundial ')
  .replace(/\b(primera|1ra|1a|i|1) guerra mundial\b|\bguerra mundial (primera|1ra|1a|i|1)\b/g,' primera guerra mundial ')
  .replace(/\b(cuentos|relatos|relato)\b/g,'cuento').replace(/\b(monstruos|criaturas)\b/g,'monstruo').replace(/\bamistades\b/g,'amistad')
  .replace(/\b(murcielagos|bats|bat)\b/g,'murcielago').replace(/\b(quinto|5to|5)\b/g,'quinto').replace(/[^a-z0-9]+/g,' ');
export function searchBooks(books, query, category = '', materialType = '') {
  const ignored = new Set(['de','del','la','el','los','las','un','una','que','con','sobre','tengan','tenga','libro','libros','algo','para','en','necesito','busco','quiero']);
  const words = searchable(query).trim().split(/\s+/).filter(w=>!ignored.has(w));
  return books.filter(book => (!category || book.category === category) && (!materialType || book.materialType===materialType) &&
    (/^[\dXx\s-]+$/.test(query)&&cleanISBN(query)&&cleanISBN(book.isbn).includes(cleanISBN(query)) || words.every(word => searchable([book.materialType,MATERIAL_TYPES[book.materialType],book.publication,book.publicationDate,book.edition,book.issn,book.doi,book.resourceUrl,book.otherIdentifier,book.title,book.subtitle,book.author,book.isbn,book.publisher,book.location,book.category,book.description,book.audience,...(book.subjects||[]),...(book.sourceSubjects||[]),contentSearchText(book),book.containerTitle,book.volume,book.issueNumber,book.editionLabel,book.pageRange,book.issuingBody,book.documentNumber,book.schoolArea,book.courseLevel,book.digitalFormat,...(book.exemplars||[]).flatMap(e=>[e.location,e.internalCode,e.inventoryCode,...Object.values(e.physicalLocation||{})])].join(' ')).includes(word))));
}
export function validateBook(raw) {
  const text = (key,max) => String(raw[key] ?? '').trim().slice(0,max);
  const list = (value,max=100) => (Array.isArray(value)?value:String(value??'').split(/\n|;/)).slice(0,max).map(v=>String(v).trim().slice(0,500)).filter(Boolean);
  const title=text('title',180);
  if(!title)throw new Error('Ingresá un título para identificar el material.');
  const copies=Number(raw.copies);
  if(raw.copies==null||String(raw.copies).trim()===''||!Number.isInteger(copies)||copies<0||copies>9999)throw new Error('La cantidad de ejemplares debe ser un número entero entre '+0+' y 9999.');
  const isbn=cleanISBN(raw.isbn);
  if(String(raw.isbn??'').trim()&&!validISBN(isbn))throw new Error('Revisá el ISBN: debe ser un código válido de 10 o 13 caracteres. También podés dejarlo vacío.');
  const year=text('year',4), pages=raw.pages===''||raw.pages==null?null:Number(raw.pages);
  if(year&&!/^\d{4}$/.test(year))throw new Error('El año debe tener cuatro cifras.');
  if(pages!==null&&(!Number.isInteger(pages)||pages<1||pages>100000))throw new Error('Revisá la cantidad de páginas.');
  if(raw.issn&&!validISSN(raw.issn))throw new Error('Revisá el ISSN o dejalo vacío.');
  if(raw.resourceUrl){try{const u=new URL(raw.resourceUrl);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();}catch{throw new Error('Ingresá un enlace HTTP o HTTPS válido.');}}
  const id=typeof raw.id==='string'&&raw.id?raw.id:crypto.randomUUID();
  const author=text('author',1000) || list(raw.authors).join('; ');
  const condition=['Bueno','Regular','Deteriorado','Nuevo'].includes(raw.condition)?raw.condition:'Bueno';
  const location=text('location',120);
  const sources=list(raw.sources).filter(s=>SOURCE_NAMES.includes(s)||s==='Aguapey · MARC ISO 2709');
  const fieldSources=Object.fromEntries(Object.entries(raw.fieldSources||{}).filter(([k,v])=>['title','subtitle','authors','edition','publisher','publishedDate','year','pages','language','subjects','cover','contents','description','classification','identifiers'].includes(k)&&typeof v==='string'&&v.split(' + ').every(s=>sources.includes(s))));
  const circulationPolicy=['standard','room-only','non-renewable'].includes(raw.circulationPolicy)?raw.circulationPolicy:'standard';
  const contentEntries=normalizeContentEntries(raw.contentEntries?.length?raw.contentEntries:raw.contents);
  return {id,title,materialType:Object.hasOwn(MATERIAL_TYPES,raw.materialType)?raw.materialType:(isbn?'libro':'otro'),circulationPolicy,publication:text('publication',300),publicationDate:text('publicationDate',10),issn:text('issn',20),doi:text('doi',500),resourceUrl:text('resourceUrl',2000),otherIdentifier:text('otherIdentifier',2000),containerTitle:text('containerTitle',300),volume:text('volume',80),issueNumber:text('issueNumber',80),editionLabel:text('editionLabel',120),pageRange:text('pageRange',80),issuingBody:text('issuingBody',300),documentNumber:text('documentNumber',120),schoolArea:text('schoolArea',160),courseLevel:text('courseLevel',160),digitalFormat:text('digitalFormat',120),subtitle:text('subtitle',300),author,authors:list(author),isbn,category:categories.includes(raw.category)?raw.category:'Otros',publisher:text('publisher',120),year,pages,language:text('language',30),subjects:list(raw.subjects),sourceSubjects:list(raw.sourceSubjects),subjectsLocalized:raw.subjectsLocalized===true,categorySuggested:raw.categorySuggested===true,copies,location,condition,contents:contentEntries.map(e=>e.title),contentEntries,notes:text('notes',5000),createdAt:typeof raw.createdAt==='string'?raw.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),cover:safeCover(raw.cover),sources,fieldSources,
    schemaVersion:2,workId:typeof raw.workId==='string'&&raw.workId?raw.workId:crypto.randomUUID(),editionId:typeof raw.editionId==='string'?raw.editionId:id,
    edition:text('edition',300),publishedDate:text('publishedDate',100),description:text('description',20000),audience:text('audience',500),classification:list(raw.classification),identifiers:raw.identifiers&&typeof raw.identifiers==='object'?JSON.parse(JSON.stringify(raw.identifiers)): {},sourceRecords:Array.isArray(raw.sourceRecords)?raw.sourceRecords.slice(0,10):[],
    ...LOCAL_SCOPE,importedFrom:raw.importedFrom||null,
    exemplars:Array.from({length:copies},(_,i)=>{const old=raw.exemplars?.[i];return {...old,...LOCAL_SCOPE,id:typeof old?.id==='string'?old.id:crypto.randomUUID(),location:old?.location??location,condition:old?.condition??condition,status:CIRCULATION_STATES.includes(old?.status)?old.status:'untracked',inventoryCode:String(old?.inventoryCode||'').slice(0,100)};}),
    // Future photo/OCR jobs store images separately. Nothing is uploaded or inferred now.
    enrichment:raw.enrichment&&typeof raw.enrichment==='object'?{...createAssistanceDraft({materialId:id}),...structuredClone(raw.enrichment)}:createAssistanceDraft({materialId:id})
  };
}
export function parseBackup(text) {
  const data=JSON.parse(text);
  if(data.app!=='asistente-bibliotecario'||![1,2,3,4,5].includes(data.version)||!Array.isArray(data.books)||data.books.length>10000)throw new Error('El archivo no es un respaldo compatible de Asistente Bibliotecario.');
  const books=data.books.map(validateBook);
  if(new Set(books.map(b=>b.id)).size!==books.length)throw new Error('El respaldo contiene identificadores repetidos.');
  return books;
}

export function parseArchive(text) {
 const books=parseBackup(text), data=JSON.parse(text), photos=data.version>=3?(data.photos||[]):[];
 if(!Array.isArray(photos)||photos.length>10000)throw new Error('Las fotos del respaldo no son válidas.');
 const seen=new Set();
 for(const photo of photos){
  const book=books.find(b=>b.id===photo.bookId);
  if(!book?.exemplars.some(e=>e.id===photo.id)||seen.has(photo.id)||!validPhotoURL(photo.dataUrl))throw new Error('El respaldo contiene una foto inválida o sin ejemplar asociado.');
  seen.add(photo.id);
 }
 return {books,photos:photos.map(p=>({id:p.id,bookId:p.bookId,dataUrl:p.dataUrl,takenAt:String(p.takenAt||'').slice(0,40)}))};
}
