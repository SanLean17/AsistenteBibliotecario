import {MATERIAL_TYPES} from './recognition.js?v=20261009-6';
import {contentSearchText} from './material-types.js?v=20261009-6';
import {cleanISBN} from './isbn.js?v=20261009-6';

export const STOPWORDS=new Set(['de','del','la','el','los','las','un','una','que','con','sobre','tengan','tenga','algo','para','en','necesito','busco','quiero','material','materiales','recurso','recursos','tema','temas']);

const REPLACEMENTS=[
  [/(segunda|2da|2a|ii|2)s+guerras+mundial|guerras+mundials+(segunda|2da|2a|ii|2)/g,' segunda guerra mundial '],
  [/(primera|1ra|1a|i|1)s+guerras+mundial|guerras+mundials+(primera|1ra|1a|i|1)/g,' primera guerra mundial '],
  [/(cuentos|relatos|relato)/g,' cuento '],
  [/(monstruos|criaturas)/g,' monstruo '],
  [/amistades/g,' amistad '],
  [/(murcielagos|bats|bat)/g,' murcielago '],
  [/(quinto|5to|5º|5°)/g,' quinto '],
  [/(cuarto|4to|4º|4°)/g,' cuarto '],
  [/(tercero|3ro|3º|3°)/g,' tercero '],
  [/(segundo|2do|2º|2°)/g,' segundo '],
  [/(primero|1ro|1º|1°)/g,' primero '],
  [/(sexto|6to|6º|6°)/g,' sexto '],
  [/(septimo|7mo|7º|7°)/g,' septimo '],
  [/(profesores|profesoras|maestros|maestras)/g,' docente ']
];

export function normalizeSearch(value){
  let s=String(value??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  for(const [pattern,replacement] of REPLACEMENTS)s=s.replace(pattern,replacement);
  return s.replace(/[^a-z0-9]+/g,' ').replace(/s+/g,' ').trim();
}

const TYPE_TERMS={
  libro:['libro','libros'],
  revista:['revista','revistas'],
  diario:['diario','diarios','periodico','periodicos'],
  articulo:['articulo','articulos'],
  documento:['documento','documentos'],
  produccion:['produccion escolar','producciones escolares'],
  digital:['recurso digital','recursos digitales']
};

function materialIntent(query){
  const q=' '+normalizeSearch(query)+' ';
  for(const [type,terms] of Object.entries(TYPE_TERMS))if(terms.some(t=>q.includes(' '+normalizeSearch(t)+' ')))return type;
  return '';
}
function availabilityIntent(query){
  const q=normalizeSearch(query);
  return /(disponible|disponibles|para retirar|para prestar)/.test(q)?'available':'';
}
function tokens(query){
  const type=materialIntent(query);
  const typeWords=new Set((TYPE_TERMS[type]||[]).flatMap(t=>normalizeSearch(t).split(' ')));
  return normalizeSearch(query).split(' ').filter(w=>w&&!STOPWORDS.has(w)&&!typeWords.has(w)&&!['disponible','disponibles','retirar','prestar'].includes(w));
}
const includesAll=(text,terms)=>terms.every(term=>text.includes(term));
const countMatches=(text,terms)=>terms.reduce((n,t)=>n+(text.includes(t)?1:0),0);

function fieldEntries(book){
  return [
    ['Título',10,[book.title,book.subtitle]],
    ['Contenido interno',9,[contentSearchText(book)]],
    ['Temas',8,[...(book.subjects||[]),...(book.sourceSubjects||[])]],
    ['Autoría',7,[book.author,...(book.authors||[])]],
    ['Curso / audiencia',7,[book.audience,book.courseLevel]],
    ['Publicación',6,[book.publication,book.containerTitle]],
    ['Fecha',6,[book.publicationDate,book.year]],
    ['Descripción',4,[book.description,book.notes]],
    ['Área / entidad',4,[book.schoolArea,book.issuingBody]],
    ['Identificadores',6,[book.isbn,book.issn,book.doi,book.documentNumber,book.otherIdentifier]],
    ['Ubicación',2,[book.location,...(book.exemplars||[]).flatMap(e=>[e.location,e.internalCode,e.inventoryCode,...Object.values(e.physicalLocation||{})])]]
  ].map(([label,weight,values])=>[label,weight,normalizeSearch(values.filter(Boolean).join(' '))]);
}

export function searchCatalog(books,query,{category='',materialType='',availability='',isAvailable=()=>true}={}){
  const raw=String(query||'').trim();
  const isbn=cleanISBN(raw);
  const inferredType=materialType||materialIntent(raw);
  const inferredAvailability=availability||availabilityIntent(raw);
  const terms=tokens(raw);
  const results=[];
  for(const book of books){
    if(category&&book.category!==category)continue;
    if(inferredType&&book.materialType!==inferredType)continue;
    if(inferredAvailability==='available'&&!isAvailable(book))continue;
    if(isbn&&/^[dXxs-]+$/.test(raw)){
      if(!cleanISBN(book.isbn).includes(isbn))continue;
      results.push({book,score:100,matches:['ISBN'],queryTerms:terms});
      continue;
    }
    const fields=fieldEntries(book),combined=fields.map(([, ,t])=>t).join(' ');
    if(terms.length&&!includesAll(combined,terms))continue;
    let score=0;const matches=[];
    for(const [label,weight,text] of fields){
      const n=countMatches(text,terms);
      if(n){score+=weight*n;matches.push(label);}
    }
    const title=normalizeSearch(book.title);
    if(raw&&title===normalizeSearch(raw))score+=30;
    else if(terms.length&&includesAll(title,terms))score+=12;
    if(inferredType)score+=4;
    if(isAvailable(book))score+=1;
    results.push({book,score,matches:[...new Set(matches)].slice(0,4),queryTerms:terms});
  }
  return results.sort((a,b)=>b.score-a.score||String(a.book.title).localeCompare(String(b.book.title),'es'));
}

export function searchBooks(books,query,category='',materialType=''){
  return searchCatalog(books,query,{category,materialType}).map(r=>r.book);
}

export function searchSummary(result){
  if(!result?.matches?.length)return '';
  return 'Coincide en: '+result.matches.join(' · ');
}

export function suggestedQueries(books,limit=6){
  const counts=new Map();
  for(const book of books)for(const subject of (book.subjects||[]).slice(0,6)){
    const label=String(subject||'').trim();if(!label)continue;
    counts.set(label,(counts.get(label)||0)+1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es')).slice(0,limit).map(([label])=>label);
}
