import {canonicalISBN,validISBN} from './isbn.js?v=20261010-rc1';
import {validISSN,recognizeIdentifier} from './recognition.js?v=20261010-rc1';
import {normalizeContentEntries} from './material-types.js?v=20261010-rc1';
export const CAPTURE_KINDS={cover:'Portada','title-page':'Portadilla / título','copyright-page':'Página legal',index:'Índice','newspaper-front':'Primera plana de diario','magazine-cover':'Tapa / sumario de revista',document:'Documento',other:'Otra captura'};
export const ASSIST_FIELDS={title:'Título',subtitle:'Subtítulo',author:'Autoría / responsables',publisher:'Editorial',year:'Año',edition:'Edición',isbn:'ISBN',issn:'ISSN',doi:'DOI',resourceUrl:'URL',publication:'Publicación',publicationDate:'Fecha de publicación',volume:'Volumen',issueNumber:'Número',issuingBody:'Organismo',documentNumber:'Número de documento',materialType:'Tipo de material',description:'Descripción',subjects:'Tema / palabra clave',contentEntries:'Contenido interno'};
export const sourceLabel=kind=>'OCR · '+(CAPTURE_KINDS[kind]||'Otra captura').toLowerCase();
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clean=v=>String(v??'').trim();
export function extractIdentifiers(text){
 const result={isbn:[],issn:[],doi:[],url:[],invalid:[]};
 const add=(k,v)=>{if(!result[k].includes(v))result[k].push(v);};
 for(const line of String(text).split(/\r?\n/)){
  for(const m of line.matchAll(/\bISBN(?:-1[03])?\s*:?\s*([0-9XO][0-9XO -]{7,22})/gi)){const value=m[1].trim().replace(/[ -]/g,'');if(/^[\dX]+$/i.test(value)&&validISBN(value))add('isbn',canonicalISBN(value));else add('invalid',m[1].trim());}
  for(const m of line.matchAll(/(?<![\w\d])(?:97[89][ -]?(?:\d[ -]?){9}\d|(?:\d[ -]?){9}[\dX])(?![\w\d])/gi)){const value=m[0].replace(/[ -]/g,'');if(validISBN(value))add('isbn',canonicalISBN(value));}
  for(const m of line.matchAll(/\b(?:ISSN\s*:?\s*)?(\d{4}-?\d{3}[\dX])\b/gi))if(validISSN(m[1])){const v=m[1].replace('-','');add('issn',v.slice(0,4)+'-'+v.slice(4));}
 }
 for(const m of String(text).matchAll(/\b10\.\d{4,9}\/[^\s<>"\]]+/gi)){const value=m[0].replace(/[.,;:)]+$/,'');if(recognizeIdentifier(value).kind==='doi')add('doi',value);}
 for(const m of String(text).matchAll(/https?:\/\/[^\s<>"\]]+/gi)){const value=m[0].replace(/[.,;)]+$/,'');try{const u=new URL(value);if(!u.username&&!u.password)add('url',u.href);}catch{}}
 return result;
}
const STOP=new Set('para sobre desde entre hasta donde cuando como esta este estos estas tiene tienen todos todas libro libros indice contenido contenidos pagina paginas editorial autor autora autores edicion diario revista portada primera parte capitulo tabla sumario copyright derechos reservados imprimir impreso texto lectura ano fecha numero volumen isbn issn todos otras otros'.split(' '));
export function suggestKeywords(text,known=[]){
 const normalized=' '+norm(text).replace(/[^a-z0-9]+/g,' ')+' ',out=[];
 for(const topic of known)if(topic&&normalized.includes(' '+norm(topic).replace(/[^a-z0-9]+/g,' ')+' ')&&!out.some(v=>norm(v)===norm(topic)))out.push(topic);
 const counts=new Map();for(const word of String(text).match(/[\p{L}]{5,}/gu)||[]){const key=norm(word);if(STOP.has(key))continue;const old=counts.get(key)||{word,count:0};old.count++;counts.set(key,old);}
 for(const {word} of [...counts.values()].sort((a,b)=>b.count-a.count).slice(0,12))if(!out.some(v=>norm(v)===norm(word)))out.push(word);
 return out.slice(0,20);
}
export function parseIndex(text,kind='index'){
 const out=[];for(const raw of String(text).split(/\r?\n/)){
  let line=raw.trim();if(/^(?:autor(?:a|es)?|responsables?|editorial|ISBN|ISSN)\s*:/i.test(line))continue;if(line.length<3||/^(índice|indice|sumario|contenidos|tabla de contenidos|p[aá]gina\s*\d*)$/i.test(line))continue;
  const page=line.match(/(?:\.{2,}|\s{2,}|\s)(\d{1,4}(?:\s*[-–]\s*\d{1,4})?)\s*$/);if(page)line=line.slice(0,page.index).replace(/[.·\s]+$/,'');
  line=line.replace(/^\d+[.)]\s+/,'');const parts=line.split(/\s+[—–]\s+|\s+\/\s+/);const title=parts[0]?.trim(),author=parts.slice(1).join(' — ').trim();if(!title||/^\d+$/.test(title))continue;
  out.push({title,author,page:page?.[1]||'',kind:kind==='index'?'item':'titular',type:kind==='index'?'item':'titular',source:sourceLabel(kind)});
 }
 return normalizeContentEntries(out.slice(0,200));
}
function dates(text){const out=[];for(const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b|\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/gi)){const month=m[8]?String('enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ').indexOf(m[8].toLowerCase())+1):m[2]||m[5],value=`${m[1]||m[6]||m[9]}-${month.padStart(2,'0')}-${(m[3]||m[4]||m[7]).padStart(2,'0')}`;if(Number.isFinite(+new Date(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value&&!out.includes(value))out.push(value);}return out;}
export function proposeFromOCR(text,{captureKind='cover',confidence=null,knownSubjects=[],materialType='libro'}={}){
 text=String(text||'').slice(0,40000);const lines=text.split(/\r?\n/).map(clean).filter(Boolean),ids=extractIdentifiers(text),proposals=[],source=sourceLabel(captureKind);
 const add=(field,value,evidence='',origin=source)=>{if(value!==''&&value!=null&&!proposals.some(p=>p.field===field&&JSON.stringify(p.value)===JSON.stringify(value)))proposals.push({id:crypto.randomUUID(),field,value,source:origin,evidence:String(evidence).slice(0,600),confidence:typeof confidence==='number'&&Number.isFinite(confidence)?Math.max(0,Math.min(100,confidence)):null,status:'proposed'});};
 for(const [kind,values] of Object.entries(ids))if(kind!=='invalid')for(const v of values)add(kind==='url'?'resourceUrl':kind,v,'Identificador validado por regla; comprobar edición física.');
 if(captureKind!=='index'){
  const first=lines.find(l=>l.length>3&&!/^(ISBN|ISSN|https?:|\d|copyright|©)/i.test(l));if(first){add('title',first.slice(0,180),'Primera línea de texto: puede no ser el título.');if(['newspaper-front','magazine-cover'].includes(captureKind))add('publication',first,'Primera línea: confirmar nombre de la publicación.');}
  for(const line of lines){for(const [pattern,field] of [[/^(?:t[ií]tulo)\s*:\s*(.+)/i,'title'],[/^subt[ií]tulo\s*:\s*(.+)/i,'subtitle'],[/^(?:autor(?:a|es)?|por|responsables?)\s*:\s*(.+)/i,'author'],[/^editorial\s*:?\s+(.+)/i,'publisher'],[/^(?:edici[oó]n)\s*:\s*(.+)/i,'edition'],[/^(?:organismo|instituci[oó]n)\s*:\s*(.+)/i,'issuingBody'],[/^(?:documento|resoluci[oó]n)\s*(?:n[º°o.]*)?\s*[: ]\s*(\d[\w/-]*)/i,'documentNumber'],[/^vol(?:umen|\.)?\s*:?\s*(\d+)/i,'volume'],[/^(?:n[uú]mero|n[º°])\s*:?\s*(\d+)/i,'issueNumber']]){const m=line.match(pattern);if(m&&!(field==='author'&&materialType==='produccion'))add(field,m[1],line);}}
  for(const d of dates(text))add('publicationDate',d,'Fecha explícita; comprobar interpretación.');
  for(const m of text.matchAll(/(?:año|©|copyright|edici[oó]n)\s*[:©]?\s*((?:18|19|20)\d{2})\b/gi))add('year',m[1],m[0]);
 }
 if(['index','newspaper-front','magazine-cover'].includes(captureKind)){
  let contents=lines;if(captureKind!=='index')contents=lines.slice(1).filter(l=>l.length>12&&!/^(ISBN|ISSN|https?:|\d|Volumen|N[uú]mero)/i.test(l)&&!dates(l).length);
  for(const entry of parseIndex(contents.join('\n'),captureKind))add('contentEntries',materialType==='produccion'?{...entry,author:''}:entry,entry.title);
 }
 if(captureKind==='newspaper-front')add('materialType','diario','Tipo de captura elegido por la persona.');if(captureKind==='magazine-cover')add('materialType','revista','Tipo de captura elegido por la persona.');if(captureKind==='document'&&materialType!=='produccion')add('materialType','documento','Tipo de captura elegido por la persona.');
 for(const keyword of suggestKeywords(text,knownSubjects).filter(k=>materialType!=='produccion'||knownSubjects.includes(k)))add('subjects',keyword,'Palabra o tema literal del texto; no interpretación semántica.');
 return {proposals,identifiers:ids,message:text.trim().length<8?'No pudimos leer suficiente texto. Probá otra foto, con más luz y enfoque.':ids.isbn.length>1?`Encontramos ${ids.isbn.length} ISBN posibles. Elegí la edición física.`:!ids.isbn.length&&!ids.issn.length&&!ids.doi.length&&!ids.url.length?'Encontramos texto, pero ningún identificador válido. Revisá las propuestas.':'Encontramos información para revisar.'};
}
export function confirmedPatch(base,proposals){
 const accepted=proposals.filter(p=>['accepted','edited'].includes(p.status)),patch={},seen=new Set();
 for(const p of accepted){if(!Object.hasOwn(ASSIST_FIELDS,p.field))throw new Error('Campo no permitido.');if(!['contentEntries','subjects'].includes(p.field)&&seen.has(p.field))throw new Error('Elegí una sola propuesta por campo: '+ASSIST_FIELDS[p.field]);seen.add(p.field);
  if(p.field==='subjects')patch.subjects=[...new Set([...(patch.subjects||base.subjects||[]),String(p.value).trim()])];
  else if(p.field==='contentEntries'){const list=normalizeContentEntries([p.value]);if(!list.length)throw new Error('Completá el título del contenido.');patch.contentEntries??=structuredClone(base.contentEntries?.length?base.contentEntries:normalizeContentEntries(base.contents));if(!patch.contentEntries.some(e=>e.title===list[0].title&&e.author===list[0].author&&e.page===list[0].page))patch.contentEntries.push({...list[0],id:crypto.randomUUID(),source:p.source});}
  else patch[p.field]=String(p.value).trim();
 }
 if(patch.contentEntries)patch.contents=patch.contentEntries.map(e=>e.title);
 if(Object.hasOwn(patch,'isbn')){if(patch.isbn&&!/^[\dX -]+$/i.test(patch.isbn))throw new Error('ISBN inválido; corregilo sin sustituir letras automáticamente.');if(patch.isbn&&!validISBN(patch.isbn.replace(/[ -]/g,'')))throw new Error('ISBN inválido.');patch.isbn=canonicalISBN(patch.isbn)||'';}
 if(Object.hasOwn(patch,'author'))patch.authors=patch.author.split(';').map(clean).filter(Boolean);
 if(!accepted.length)throw new Error('Aceptá o editá al menos una propuesta.');return patch;
}
