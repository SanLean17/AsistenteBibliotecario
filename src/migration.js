import {isSerialDraft,prepareSerialDraft,serialDraftKey,serialDraftMatches,combineSerialRows} from './serial-migration.js?v=20261012-hemeroteca2';
import {canonicalISBN} from './isbn.js?v=20261012-hemeroteca2';
import {validISSN,MATERIAL_TYPES} from './recognition.js?v=20261012-hemeroteca2';
import {validateBook} from './catalog.js?v=20261012-hemeroteca2';
import {parseISO2709,marcRecordToCatalog} from './marc.js?v=20261012-hemeroteca2';
import {detectCatalogMatches} from './duplicates.js?v=20261012-hemeroteca2';

export const MIGRATION_LIMITS={bytes:20*1024*1024,rows:10000,columns:80,cell:20000,copies:30000};
export const MIGRATION_FIELDS={publication:'Publicación madre',publicationDate:'Fecha del número',volume:'Volumen',issueNumber:'Número',editionLabel:'Edición / sección',article:'Artículo / titular',articleAuthor:'Autor del artículo',articlePage:'Página del artículo',title:'Título',subtitle:'Subtítulo',author:'Autor / responsable',isbn:'ISBN',issn:'ISSN',doi:'DOI',publisher:'Editorial',year:'Año',language:'Idioma',edition:'Edición',pages:'Páginas',category:'Categoría',subjects:'Temas / palabras clave',contents:'Contenidos internos',description:'Descripción',location:'Ubicación antigua',inventoryCode:'Inventario legado',copies:'Cantidad de ejemplares',condition:'Estado físico',circulationPolicy:'Política de circulación',notes:'Notas',materialType:'Tipo de material'};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const key=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const aliases={publication:['publicacion','publicación','revista','diario'],publicationDate:['fecha','fecha publicacion'],volume:['volumen','volume'],issueNumber:['numero','número','issue'],editionLabel:['edicion del numero'],article:['articulo','artículo','titular'],articleAuthor:['autor articulo'],articlePage:['pagina','página'],title:['titulo','title'],subtitle:['subtitulo','subtitle'],author:['autor','autores','autor1','author','authors','responsable'],isbn:['isbn'],issn:['issn'],doi:['doi'],publisher:['editorial','publisher'],year:['año','ano','year'],language:['idioma','language'],edition:['edicion','edition'],pages:['paginas','pages'],category:['categoria','category'],subjects:['temas','tema','keywords','subjects','palabras clave'],contents:['contenidos','contents','contenidos internos'],description:['descripcion','resumen','description'],location:['ubicacion','location'],inventoryCode:['inventario','codigo','inventorycode','codigo de inventario legado'],copies:['cantidad','ejemplares','copies'],condition:['estado','estado fisico','condition'],circulationPolicy:['politica de circulacion','circulationpolicy'],notes:['notas','notes'],materialType:['tipo','materialtype']};
export function suggestMapping(headers){const used=new Set();return headers.map(h=>{const field=Object.keys(aliases).find(f=>aliases[f].some(a=>key(a)===key(h)));if(!field||used.has(field))return '';used.add(field);return field;});}
export function validateMapping(mapping){const chosen=mapping.filter(Boolean);if(chosen.some(f=>!Object.hasOwn(MIGRATION_FIELDS,f))||new Set(chosen).size!==chosen.length)throw Error('Cada destino debe usarse una sola vez.');if(!chosen.includes('title')&&!chosen.includes('publication'))throw Error('Mapeá una columna a Título.');}
export function decodeMigration(input,encoding='utf-8'){if(!['utf-8','windows-1252'].includes(encoding))throw Error('Codificación no admitida.');try{return new TextDecoder(encoding,{fatal:true}).decode(input);}catch{throw Error('No es UTF-8 válido. Elegí Windows-1252 solo si corresponde y revisá á é í ó ú ñ ü.');}}
export function parseCSV(text,delimiter=','){
 if(![',',';','\t'].includes(delimiter))throw Error('Separador inválido.');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const pushCell=()=>{if(cell.length>MIGRATION_LIMITS.cell)throw Error('Una celda supera 20.000 caracteres.');row.push(cell);cell='';closed=false;if(row.length>MIGRATION_LIMITS.columns)throw Error('El archivo supera 80 columnas.');};
 const pushRow=()=>{pushCell();if(row.some(v=>v.trim()))rows.push(row);row=[];if(rows.length>MIGRATION_LIMITS.rows+1)throw Error('El archivo supera 10.000 filas.');};
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}else if(c===delimiter)pushCell();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}else if(c==='"'){if(cell||closed)throw Error('Comillas CSV fuera de posición.');quoted=true;}else{if(closed)throw Error('Texto después de una comilla de cierre.');cell+=c;}if(cell.length>MIGRATION_LIMITS.cell)throw Error('Una celda supera 20.000 caracteres.');}
 if(quoted)throw Error('CSV con comillas sin cerrar.');if(cell||row.length||closed)pushRow();return rows;
}
export function detectDelimiter(text){const scores=[',',';','\t'].map(d=>{try{const r=parseCSV(text,d),width=r[0]?.length||0;return {d,score:width>1?width*r.filter(x=>x.length===width).length/r.length:0};}catch{return {d,score:0};}}).sort((a,b)=>b.score-a.score);return scores[0].score?scores[0].d:',';}
export function analyzeFile(bytes,{name='',format='auto',encoding='utf-8',delimiter='auto',header=true}={}){
 if(!bytes.byteLength||bytes.byteLength>MIGRATION_LIMITS.bytes)throw Error('Elegí un archivo no vacío de hasta 20 MB.');
 const prefix=new TextDecoder().decode(bytes.slice(0,24));
 if(format==='auto')format=/^\d{5}/.test(prefix)&&prefix.length>=24?'marc':/^\s*\{/.test(prefix)?'json':'csv';
 if(/\.xlsx?$/i.test(name))throw Error('Exportá la planilla como CSV UTF-8 antes de continuar.');
 if(format==='marc'){const records=parseISO2709(bytes);if(records.length>10000)throw Error('El archivo supera 10.000 registros.');return {format,name,records:records.map(r=>marcRecordToCatalog(r)||{title:'',copies:0}),count:records.length,warnings:[],mapping:[]};}
 const text=decodeMigration(bytes,encoding),warnings=[];
 if(/\uFFFD|Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]/.test(text))warnings.push('Encoding sospechoso: revisá los caracteres antes de confirmar.');
 if(format==='json'){const data=JSON.parse(text,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw Error('JSON con propiedades no permitidas.');return v;});if(data.app!=='asistente-bibliotecario'||![1,2,3,4,5].includes(data.version)||!Array.isArray(data.books)||data.books.length>10000)throw Error('No es un JSON propio compatible.');return {format,name,records:data.books,count:data.books.length,mapping:[],warnings:[...warnings,'Solo se migra catálogo y ejemplares. Para fotos, personas y circulación usá Restaurar respaldo.']};}
 if(format!=='csv')throw Error('Formato no admitido.');
 const separator=delimiter==='auto'?detectDelimiter(text):delimiter,rows=parseCSV(text,separator);if(!rows.length)throw Error('Archivo sin filas.');const headers=header?rows.shift():rows[0].map((_,i)=>'Columna '+(i+1));if(rows.length>10000)throw Error('El archivo supera 10.000 filas.');
 if(headers.some(h=>!h.trim())||new Set(headers.map(key)).size!==headers.length)warnings.push('Encabezados vacíos o repetidos: revisá cada columna por su posición.');
 return {format,name,rows,headers,header,delimiter:separator,encoding,count:rows.length,mapping:suggestMapping(headers),warnings};
}
function list(value,separator){return [...new Map(String(value||'').split(separator).map(clean).filter(Boolean).map(x=>[key(x),x])).values()];}
export function mapRow(row,mapping,separator='|'){
 validateMapping(mapping);const d={materialType:'libro',copies:1};mapping.forEach((field,i)=>{if(field)d[field]=clean(row[i]);});
 for(const field of ['author','subjects','contents']){const i=mapping.indexOf(field);if(i<0)continue;const values=list(row[i],separator);if(field==='author'){d.author=values.join('; ');d.authors=values;}else d[field]=values;}
 d.copies=d.copies===''?1:Number(d.copies);d.exemplars=Number.isInteger(d.copies)&&d.copies>=0&&d.copies<=9999?Array.from({length:d.copies},(_,i)=>({inventoryCode:i===0?d.inventoryCode||'':'',location:d.location||'',condition:d.condition||'Bueno'})):[];
 if(d.inventoryCode&&d.copies>1)d.mappingWarning='Solo el primer ejemplar conserva el código legado; revisá la cantidad.';
 return d;
}
const limits={title:180,subtitle:300,author:1000,publisher:120,year:4,language:30,edition:300,description:20000,location:120,notes:5000,doi:500,inventoryCode:100};
export function inspectDraft(raw){
 const errors=[],warnings=[];if(!raw||typeof raw!=='object'||Array.isArray(raw))return {errors:['Registro inválido.'],warnings,draft:{title:'',copies:0}};
 const d=structuredClone(raw);try{prepareSerialDraft(d);}catch(e){errors.push(e.message);}for(const f of ['title','subtitle','author','publisher','location','notes'])if(d[f]!=null)d[f]=clean(d[f]);
 d.isbn=String(d.isbn||'').replace(/[\s-]/g,'').toUpperCase();d.doi=clean(d.doi).replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'');
 if(!d.title)errors.push('Título vacío.');if(d.isbn&&!canonicalISBN(d.isbn))errors.push('ISBN inválido.');if(d.issn&&!validISSN(d.issn))errors.push('ISSN inválido.');if(d.doi&&!/^10\.\d{4,9}\/\S+$/i.test(d.doi))errors.push('DOI inválido.');
 if(!Number.isInteger(d.copies)||d.copies<0||d.copies>9999)errors.push('Cantidad inválida (0–9999).');
 for(const [f,max] of Object.entries(limits))if(String(d[f]||'').length>max)errors.push(MIGRATION_FIELDS[f]+' excede '+max+' caracteres.');
 for(const f of ['subjects','contents','authors'])if(d[f]&&(!Array.isArray(d[f])||d[f].length>100||d[f].some(v=>typeof v!=='string'||v.length>500)))errors.push('Revisá el límite de '+f+' (100 valores de 500 caracteres).');
 if(d.contentEntries&&!Array.isArray(d.contentEntries)){errors.push('Estructura de contenidos inválida.');d.contentEntries=[];}
 if(d.contentEntries?.length>100||d.contentEntries?.some(e=>!e||String(e.title||'').length>500))errors.push('Contenidos demasiado extensos o inválidos.');
 if(!d.exemplars&&Number.isInteger(d.copies)&&d.copies>=0&&d.copies<=9999)d.exemplars=Array.from({length:d.copies},()=>({inventoryCode:'',location:d.location||'',condition:d.condition||'Bueno'}));
 if(d.exemplars&&(!Array.isArray(d.exemplars)||d.exemplars.length!==d.copies))errors.push('Ejemplares y cantidad inconsistentes.');
 if(!Array.isArray(d.exemplars))d.exemplars=[];
 for(const e of Array.isArray(d.exemplars)?d.exemplars:[]){if(!e||typeof e!=='object'){errors.push('Ejemplar sin datos.');continue;}if(String(e.inventoryCode||'').length>100||String(e.location||'').length>120)errors.push('Código o ubicación excede el límite.');if(e.condition&&!['Bueno','Regular','Deteriorado','Nuevo'].includes(e.condition))errors.push('Estado físico desconocido.');}
 if(d.condition&&!['Bueno','Regular','Deteriorado','Nuevo'].includes(d.condition))errors.push('Estado físico desconocido.');
 if(d.category&&!['Cuentos','Novela','Poesía','Informativo','Otros'].includes(d.category))errors.push('Categoría no admitida. Mapeá ese vocabulario a Temas para conservarlo o usá una categoría del catálogo.');
 if(d.materialType&&!Object.hasOwn(MATERIAL_TYPES,d.materialType))errors.push('Tipo de material desconocido. Revisá el mapeo.');
 if(d.circulationPolicy&&!['standard','room-only','non-renewable'].includes(d.circulationPolicy))errors.push('Política desconocida: usá standard, room-only o non-renewable.');
 if(d.mappingWarning)warnings.push(d.mappingWarning);if(d.copies&&!d.exemplars?.every(e=>e?.location))warnings.push('Ubicación pendiente: se conserva el texto, sin crear ubicaciones.');
 if(/\uFFFD|Ã[\u0080-\u00bf]/.test(JSON.stringify(d)))warnings.push('Encoding sospechoso.');
 if(d.copies&&d.exemplars?.some(e=>!e?.inventoryCode))warnings.push('Sin inventario legado: no se puede reconocer una reimportación de esos ejemplares.');
 if(d.exemplars?.some(e=>e?.loanPolicy))warnings.push('La política local MARC se conserva como referencia. Revisá la política de circulación de la ficha antes de prestar.');
 d.exemplars=d.exemplars.filter(e=>e&&typeof e==='object');
 if(!errors.length)try{validateBook(d);}catch(e){errors.push(e.message);}
 return {draft:d,errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
// Indexed candidates avoid an all-pairs scan. A bounded similarity scan is visible,
// and an incomplete review never defaults to importing a new record.
const similarityKey=v=>key(v).replace(/[^a-z0-9]+/g,' ').trim();
const tokens=b=>{const author=b.author||b.authors?.join('; ');return [author&&'author:'+similarityKey(author),b.publisher&&'publisher:'+similarityKey(b.publisher),b.year&&'year:'+b.year,b.doi&&'doi:'+key(b.doi).replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,''),b.issn&&'issn:'+String(b.issn).replace(/[^0-9Xx]/g,'').toUpperCase()].filter(Boolean);};
export async function planMigration(file,books,{mapping=file.mapping,separator='|',signal,onProgress=()=>{}}={}){
 if(file.format==='csv')validateMapping(mapping);
 const serialRows=new Map();
 const rows=file.format==='csv'?file.rows:file.records,entries=[],buckets=new Map(),exact=new Map();let comparisons=0,totalCopies=0;
 const add=b=>{const isbn=canonicalISBN(b.isbn);if(isbn){if(!exact.has(isbn))exact.set(isbn,[]);exact.get(isbn).push(b);}for(const t of new Set(tokens(b))){if(!buckets.has(t))buckets.set(t,[]);buckets.get(t).push(b);}};books.forEach(add);
 for(let i=0;i<rows.length;i++){
  if(signal?.aborted)throw new DOMException('Análisis cancelado.','AbortError');
  const raw=file.format==='csv'?mapRow(rows[i],mapping,separator):rows[i],inspected=inspectDraft(raw),{draft,errors,warnings}=inspected;
  if(file.format==='csv'&&rows[i].length!==file.headers.length)errors.push('Cantidad de columnas distinta del encabezado.');
  totalCopies+=Number.isInteger(draft.copies)?draft.copies:0;if(totalCopies>MIGRATION_LIMITS.copies)throw Error('El lote supera 30.000 ejemplares. Dividilo en archivos más pequeños.');
  if(isSerialDraft(draft)&&!errors.length){
   const signature=serialDraftKey(draft),previous=serialRows.get(signature),matches=serialDraftMatches(books,draft);
   const entry={index:i,row:i+(file.format==='csv'&&file.header?2:1),...inspected,kind:matches.length?'exact-edition':'new',targetId:matches[0]?.id||'',matchTitle:matches[0]?.title||'',matchAuthor:'',action:matches.length?'keep':'new'};
   if(matches.length>1){entry.errors.push('Varios números coinciden; resolvé duplicados.');entry.kind='error';entry.action='keep';}
   if(!draft.issn)entry.warnings.push('Sin ISSN: revisá la publicación; no se fusiona por título con el catálogo.');
   if(previous){entry.groupedInto=previous.index;combineSerialRows(previous.draft,draft);entry.action='keep';entry.warnings.push('Artículos y ejemplares identificados agrupados en fila '+previous.row+'. Esta fila no crea otro número.');}
   else serialRows.set(signature,entry);entries.push(entry);continue;
  }
  const isbn=canonicalISBN(draft.isbn),strong=isbn?exact.get(isbn)||[]:[],candidates=new Set();let partial=false;
  if(!strong.length)outer:for(const t of new Set(tokens(draft)))for(const b of buckets.get(t)||[]){candidates.add(b);if(candidates.size>=200||comparisons+candidates.size>100000){partial=true;break outer;}}
  comparisons+=candidates.size;const matches=strong.length?strong.map(book=>({book,kind:'exact-edition'})):detectCatalogMatches([...candidates],draft);
  if(strong.length>1)errors.push('Varias fichas comparten ISBN. Resolvé esa duplicación en Calidad antes de importar esta fila.');
  const match=matches[0],kind=errors.length?'error':match?.kind==='exact-edition'&&!strong.length?'review':match?.kind||(partial?'review':'new');
  if(partial)warnings.push('Revisión de similitud parcial: requiere decisión manual.');if(strong.length>1)warnings.push('Hay varias ediciones con el mismo ISBN: conservadas para revisión manual.');
  const conflicts=match&&kind==='exact-edition'?['title','author','publisher','year','edition'].filter(f=>draft[f]&&match.book[f]&&key(match.book[f])!==key(draft[f])):[];
  if(conflicts.length)warnings.push('Mismo ISBN con datos diferentes ('+conflicts.map(f=>MIGRATION_FIELDS[f]).join(', ')+'): compará ambas fichas.');
  const entry={index:i,row:i+(file.format==='csv'&&file.header?2:1),...inspected,kind,targetId:kind==='exact-edition'&&strong.length===1?match.book.id:'',matchTitle:match?.book.title||'',matchAuthor:match?.book.author||'',action:kind==='new'?'new':kind==='exact-edition'&&match?.book.id.startsWith('migration-row:')&&!conflicts.length?'copies':'keep'};
  entries.push(entry);if(!errors.length&&!strong.length)add({...draft,id:'migration-row:'+i});
  if(i%100===0){onProgress({done:i,total:rows.length});await new Promise(r=>setTimeout(r,0));}
 }
 const counts={records:entries.length,new:0,'exact-edition':0,'same-work':0,similar:0,review:0,error:0,copies:totalCopies,possibleDuplicateCopies:0};const codes=new Set(books.flatMap(b=>b.exemplars||[]).map(e=>e.inventoryCode).filter(Boolean));
 for(const e of entries){counts[e.kind]++;for(const copy of e.draft.exemplars||[]){if(copy.inventoryCode){if(codes.has(copy.inventoryCode)){counts.possibleDuplicateCopies++;e.warnings.push('Inventario legado repetido: '+copy.inventoryCode);}codes.add(copy.inventoryCode);}}}
 return {id:crypto.randomUUID(),fileName:file.name,source:file.format,encoding:file.encoding||'utf-8',mapping:[...(mapping||[])],headers:file.headers||[],separator,warnings:file.warnings,entries,counts,snapshot:JSON.stringify(books)};
}
export function csvEncode(rows){const cell=v=>{let s=String(v??'');if(/^[\s\uFEFF]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n');}
export function exportMigrationCSV(books){return {materials:csvEncode([['id material','título','autor','ISBN','ISSN','DOI','editorial','año','tipo','temas','contenidos','ejemplares'],...books.map(b=>[b.id,b.title,b.author,b.isbn,b.issn,b.doi,b.publisher,b.year,b.materialType,(b.subjects||[]).join('|'),(b.contents||[]).join('|'),b.exemplars.length])]),copies:csvEncode([['id material','título','autor','ISBN','código AB','inventario legado','ubicación','estado'],...books.flatMap(b=>b.exemplars.map(e=>[b.id,b.title,b.author,b.isbn,e.internalCode,e.inventoryCode,e.location,e.condition]))])};}
