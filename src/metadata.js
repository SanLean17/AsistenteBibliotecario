import { localizeBook } from './subjects.js?v=20261010-6';
import { cleanISBN, validISBN, canonicalISBN, isbnVariants } from './isbn.js?v=20261010-6';

export const OFFICIAL_CATALOGS = [
  {name:'Biblioteca Nacional Mariano Moreno',short:'BN Mariano Moreno',url:'https://catalogo.bn.gov.ar/',note:'Registros argentinos · Z39.50 requiere un servidor intermediario'},
  {name:'Biblioteca Nacional de Maestros', short:'BNM', url:'https://bnm-catalogo.educacion.gob.ar/', note:'Catálogo público educativo argentino'},
  {name:'Agencia Argentina de ISBN', short:'ISBN Argentina', url:'https://www.isbn.org.ar/web/busqueda-simple.php', note:'Registro nacional de ISBN'}
];

export {safeCover,googleRecord,openLibraryRecord} from './providers/records.js?v=20261010-6';
import {createBrowserProviders} from './providers/browser.js?v=20261010-6';
export function mergeMetadata(records, isbn) {
  const book = { isbn:cleanISBN(isbn), sources:[], fieldSources:{}, conflicts:[] };
  for (const record of records.filter(Boolean)) {
    if(!book.sources.includes(record.source))book.sources.push(record.source);
    for (const key of ['title','subtitle','authors','edition','publisher','publishedDate','year','pages','language','subjects','cover','contents','description','classification','identifiers']) {
      const value = record[key];
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
      if (!book[key]) { book[key]=value; book.fieldSources[key]=record.source; }
      else if(key==='authors'){book.authors=[...new Set([...book.authors,...value])];book.fieldSources.authors=[...new Set(String(book.fieldSources.authors).split(' + ').concat(record.source))].join(' + ');}
      else if (key === 'subjects') { book.subjects = [...new Set([...book.subjects,...value])]; book.fieldSources.subjects = [...new Set(String(book.fieldSources.subjects).split(' + ').concat(record.source))].join(' + '); }
      else if (key === 'contents') { book.contents=[...new Set([...(book.contents||[]),...value])]; book.fieldSources.contents=[...new Set(String(book.fieldSources.contents).split(' + ').concat(record.source))].join(' + '); }
      else if (['title','authors','publisher','year','pages'].includes(key) && JSON.stringify(book[key]) !== JSON.stringify(value)) book.conflicts.push({field:key,source:record.source,value});
    }
  }
  book.author = (book.authors || []).join('; ');
  book.lookupVariants=isbnVariants(isbn);
  book.sourceRecords=records.filter(Boolean);
  return localizeBook(book);
}
async function fetchJSON(fetcher,url,signal,timeout){
  const response=await fetcher(url,{signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
}
export async function lookupISBN(value, {signal, fetcher=fetch, timeout=10000, providers=createBrowserProviders()}={}) {
  const isbn = cleanISBN(value);
  if (!validISBN(isbn)) throw new Error('Revisá el ISBN: ingresá los 10 o 13 dígitos del libro. Los guiones y espacios se eliminan automáticamente.');
  const variants=isbnVariants(isbn);
  const results = await Promise.all(providers.map(async provider=>{
    try {const book=await provider.lookup({isbn,variants,fetchJSON:url=>fetchJSON(fetcher,url,signal,timeout),signal});return {source:provider.name,status:book?'found':'empty',book};}
    catch(error){if(signal?.aborted)throw error;return {source:provider.name,status:'error'};}
  }));
  if (signal?.aborted) throw new DOMException('Búsqueda cancelada','AbortError');
  const book = mergeMetadata(results.map(r=>r.book),isbn);
  return {book:book.title?book:null,results:results.map(({source,status})=>({source,status})),variants,officialCatalogs:OFFICIAL_CATALOGS};
}
