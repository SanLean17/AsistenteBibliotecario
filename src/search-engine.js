import {MATERIAL_TYPES} from './recognition.js?v=20261010-3';
import {contentSearchText} from './material-types.js?v=20261010-3';
import {cleanISBN} from './isbn.js?v=20261010-3';

export const STOPWORDS=new Set(['de','del','la','el','los','las','un','una','que','con','sobre','tengan','tenga','algo','para','en','necesito','busco','quiero','material','materiales','recurso','recursos','tema','temas']);

const REPLACEMENTS=[
  [/\b(segunda|2da|2a|ii|2)\s+guerra\s+mundial\b|\bguerra\s+mundial\s+(segunda|2da|2a|ii|2)\b|\bwwii\b|\b2gm\b/g,' segunda guerra mundial '],
  [/\b(primera|1ra|1a|i|1)\s+guerra\s+mundial\b|\bguerra\s+mundial\s+(primera|1ra|1a|i|1)\b/g,' primera guerra mundial '],
  [/\b(cuentos|relatos|relato)\b/g,' cuento '],
  [/\b(monstruos|criaturas)\b/g,' monstruo '],
  [/\bamistades\b/g,' amistad '],
  [/\b(murcielagos|bats|bat)\b/g,' murcielago '],
  [/(?:\bquinto\b|\b5(?:to|º|°)?(?=\s|$))/g,' quinto '],
  [/(?:\bcuarto\b|\b4(?:to|º|°)?(?=\s|$))/g,' cuarto '],
  [/(?:\btercero\b|\b3(?:ro|º|°)?(?=\s|$))/g,' tercero '],
  [/(?:\bsegundo\b|\b2(?:do|º|°)?(?=\s|$))/g,' segundo '],
  [/(?:\bprimero\b|\b1(?:ro|º|°)?(?=\s|$))/g,' primero '],
  [/(?:\bsexto\b|\b6(?:to|º|°)?(?=\s|$))/g,' sexto '],
  [/(?:\bseptimo\b|\b7(?:mo|º|°)?(?=\s|$))/g,' septimo '],
  [/\b(profesores|profesoras|maestros|maestras)\b/g,' docente ']
];

export function normalizeSearch(value){
  let s=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  for(const [pattern,replacement] of REPLACEMENTS)s=s.replace(pattern,replacement);
  return s.replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
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
  for(const [type,terms] of Object.entries(TYPE_TERMS)){
    if(terms.some(term=>q.includes(' '+normalizeSearch(term)+' ')))return type;
  }
  return '';
}

function availabilityIntent(query){
  const q=normalizeSearch(query);
  return /\b(disponible|disponibles)\b/.test(q)||q.includes('para retirar')||q.includes('para prestar')?'available':'';
}

function tokens(query){
  const type=materialIntent(query);
  const typeWords=new Set((TYPE_TERMS[type]||[]).flatMap(term=>normalizeSearch(term).split(' ')));
  return normalizeSearch(query).split(' ').filter(word=>
    word&&!STOPWORDS.has(word)&&!typeWords.has(word)&&!['disponible','disponibles','retirar','prestar'].includes(word)
  );
}

const includesAll=(text,terms)=>terms.every(term=>text.includes(term));
const countMatches=(text,terms)=>terms.reduce((n,term)=>n+(text.includes(term)?1:0),0);

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

export function searchCatalog(books,query,{category='',materialType='',availability='',isAvailable=()=>true,inferIntent=true}={}){
  const raw=String(query||'').trim();
  const isbn=cleanISBN(raw);
  const inferredType=materialType||(inferIntent?materialIntent(raw):'');
  const inferredAvailability=availability||(inferIntent?availabilityIntent(raw):'');
  const terms=tokens(raw);
  const results=[];

  for(const book of books){
    if(category&&book.category!==category)continue;
    const effectiveType=book.materialType||(book.isbn?'libro':'otro');
    if(inferredType&&effectiveType!==inferredType)continue;
    if(inferredAvailability==='available'&&!isAvailable(book))continue;

    if(isbn&&/^[\dXx\s-]+$/.test(raw)){
      if(!cleanISBN(book.isbn).includes(isbn))continue;
      results.push({book,score:100,matches:['ISBN'],queryTerms:terms});
      continue;
    }

    const fields=fieldEntries(book);
    const combined=fields.map(([, ,text])=>text).join(' ');
    if(terms.length&&!includesAll(combined,terms))continue;

    let score=0;
    const matches=[];
    for(const [label,weight,text] of fields){
      const n=countMatches(text,terms);
      if(n){score+=weight*n;matches.push(label);}
    }

    const title=normalizeSearch(book.title);
    if(raw&&title===normalizeSearch(raw))score+=30;
    else if(terms.length&&includesAll(title,terms))score+=12;
    if(inferredType)score+=4;
    if(raw&&isAvailable(book))score+=1;

    results.push({book,score,matches:[...new Set(matches)].slice(0,4),queryTerms:terms});
  }

  return results.sort((a,b)=>b.score-a.score||String(a.book.title).localeCompare(String(b.book.title),'es'));
}

export function searchBooks(books,query,category='',materialType=''){
  return searchCatalog(books,query,{category,materialType,inferIntent:false}).map(result=>result.book);
}

export function searchSummary(result){
  if(!result?.matches?.length)return '';
  return 'Coincide en: '+result.matches.join(' · ');
}

export function suggestedQueries(books,limit=6){
  const counts=new Map();
  for(const book of books){
    for(const subject of (book.subjects||[]).slice(0,6)){
      const label=String(subject||'').trim();
      if(!label)continue;
      counts.set(label,(counts.get(label)||0)+1);
    }
  }
  return [...counts.entries()]
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es'))
    .slice(0,limit)
    .map(([label])=>label);
}
