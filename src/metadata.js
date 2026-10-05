import { localizeBook } from './subjects.js?v=20261005-1';
import { cleanISBN, validISBN, canonicalISBN, isbnVariants } from './isbn.js?v=20261005-1';

export const OFFICIAL_CATALOGS = [
  {name:'Biblioteca Nacional de Maestros', short:'BNM', url:'https://bnm-catalogo.educacion.gob.ar/', note:'Catálogo público educativo argentino'},
  {name:'Agencia Argentina de ISBN', short:'ISBN Argentina', url:'https://www.isbn.org.ar/web/busqueda-simple.php', note:'Registro nacional de ISBN'}
];

export function safeCover(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (!['books.google.com','books.googleusercontent.com','covers.openlibrary.org'].includes(url.hostname)) return null;
    url.protocol = 'https:'; return url.href;
  } catch { return null; }
}
export function googleRecord(data, isbn) {
  const wanted=canonicalISBN(isbn);
  const volume = data.items?.find(item => item.volumeInfo?.industryIdentifiers?.some(id => canonicalISBN(id.identifier) === wanted));
  const v = volume?.volumeInfo;
  if (!v?.title) return null;
  return { title:v.title, subtitle:v.subtitle, authors:v.authors, publisher:v.publisher, year:v.publishedDate?.match(/\d{4}/)?.[0], pages:v.pageCount, language:v.language, subjects:v.categories, cover:safeCover(v.imageLinks?.extraLarge||v.imageLinks?.large||v.imageLinks?.medium||v.imageLinks?.thumbnail), source:'Google Books' };
}
export function openLibraryRecord(data, isbn) {
  const variants=isbnVariants(isbn);
  const key=variants.map(v=>'ISBN:'+v).find(k=>data[k]);
  const v = key ? data[key] : null;
  if (!v?.title) return null;
  return { title:v.title, subtitle:v.subtitle, authors:v.authors?.map(a=>a.name), publisher:v.publishers?.map(p=>p.name).join('; '), year:v.publish_date?.match(/\d{4}/)?.[0], pages:v.number_of_pages, subjects:v.subjects?.map(s=>s.name), contents:v.table_of_contents?.map(c=>c.title).filter(Boolean), cover:safeCover(v.cover?.large || v.cover?.medium), source:'Open Library' };
}
export function mergeMetadata(records, isbn) {
  const book = { isbn:cleanISBN(isbn), sources:[], fieldSources:{}, conflicts:[] };
  for (const record of records.filter(Boolean)) {
    if(!book.sources.includes(record.source))book.sources.push(record.source);
    for (const key of ['title','subtitle','authors','publisher','year','pages','language','subjects','cover','contents']) {
      const value = record[key];
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
      if (!book[key]) { book[key]=value; book.fieldSources[key]=record.source; }
      else if (key === 'subjects') { book.subjects = [...new Set([...book.subjects,...value])]; book.fieldSources.subjects = [...new Set(String(book.fieldSources.subjects).split(' + ').concat(record.source))].join(' + '); }
      else if (key === 'contents') { book.contents=[...new Set([...(book.contents||[]),...value])]; book.fieldSources.contents=[...new Set(String(book.fieldSources.contents).split(' + ').concat(record.source))].join(' + '); }
      else if (['title','authors','publisher','year','pages'].includes(key) && JSON.stringify(book[key]) !== JSON.stringify(value)) book.conflicts.push({field:key,source:record.source,value});
    }
  }
  book.author = (book.authors || []).join('; ');
  book.lookupVariants=isbnVariants(isbn);
  return localizeBook(book);
}
async function fetchJSON(fetcher,url,signal,timeout){
  const response=await fetcher(url,{signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
}
export async function lookupISBN(value, {signal, fetcher=fetch, timeout=10000}={}) {
  const isbn = cleanISBN(value);
  if (!validISBN(isbn)) throw new Error('Revisá el ISBN: ingresá los 10 o 13 dígitos del libro. Los guiones y espacios se eliminan automáticamente.');
  const variants=isbnVariants(isbn);
  const googleUrls=variants.map(v=>`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(v)}&maxResults=10&printType=books`);
  const openKeys=variants.map(v=>'ISBN:'+v).join(',');
  const endpoints = [
    ['Google Books', async()=>{
      for(const url of googleUrls){
        const data=await fetchJSON(fetcher,url,signal,timeout);
        const record=googleRecord(data,isbn);
        if(record)return record;
      }
      return null;
    }],
    ['Open Library', async()=>{
      const url=`https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(openKeys)}&jscmd=data&format=json`;
      return openLibraryRecord(await fetchJSON(fetcher,url,signal,timeout),isbn);
    }]
  ];
  const results = await Promise.all(endpoints.map(async ([source,run]) => {
    try {
      const book=await run();
      return {source,status:book?'found':'empty',book};
    } catch(error) {
      if(signal?.aborted)throw error;
      return {source,status:'error'};
    }
  }));
  if (signal?.aborted) throw new DOMException('Búsqueda cancelada','AbortError');
  const book = mergeMetadata(results.map(r=>r.book),isbn);
  return {book:book.title?book:null,results:results.map(({source,status})=>({source,status})),variants,officialCatalogs:OFFICIAL_CATALOGS};
}
