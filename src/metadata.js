import { cleanISBN, validISBN, canonicalISBN } from './isbn.js';
export function safeCover(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (!['books.google.com','books.googleusercontent.com','covers.openlibrary.org'].includes(url.hostname)) return null;
    url.protocol = 'https:'; return url.href;
  } catch { return null; }
}
export function googleRecord(data, isbn) {
  const volume = data.items?.find(item => item.volumeInfo?.industryIdentifiers?.some(id => canonicalISBN(id.identifier) === canonicalISBN(isbn)));
  const v = volume?.volumeInfo;
  if (!v?.title) return null;
  return { title:v.title, subtitle:v.subtitle, authors:v.authors, publisher:v.publisher, year:v.publishedDate?.match(/\d{4}/)?.[0], pages:v.pageCount, language:v.language, subjects:v.categories, cover:safeCover(v.imageLinks?.thumbnail), source:'Google Books' };
}
export function openLibraryRecord(data, isbn) {
  const v = data['ISBN:'+isbn];
  if (!v?.title) return null;
  return { title:v.title, subtitle:v.subtitle, authors:v.authors?.map(a=>a.name), publisher:v.publishers?.map(p=>p.name).join('; '), year:v.publish_date?.match(/\d{4}/)?.[0], pages:v.number_of_pages, subjects:v.subjects?.map(s=>s.name), contents:v.table_of_contents?.map(c=>c.title).filter(Boolean), cover:safeCover(v.cover?.large || v.cover?.medium), source:'Open Library' };
}
export function mergeMetadata(records, isbn) {
  const book = { isbn, sources:[], fieldSources:{}, conflicts:[] };
  for (const record of records.filter(Boolean)) {
    book.sources.push(record.source);
    for (const key of ['title','subtitle','authors','publisher','year','pages','language','subjects','cover','contents']) {
      const value = record[key];
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
      if (!book[key]) { book[key]=value; book.fieldSources[key]=record.source; }
      else if (key === 'subjects') { book.subjects = [...new Set([...book.subjects,...value])]; book.fieldSources.subjects += ' + '+record.source; }
      else if (['title','authors','publisher','year','pages'].includes(key) && JSON.stringify(book[key]) !== JSON.stringify(value)) book.conflicts.push({field:key,source:record.source,value});
    }
  }
  book.author = (book.authors || []).join('; ');
  return book;
}
export async function lookupISBN(value, {signal, fetcher=fetch, timeout=10000}={}) {
  const isbn = cleanISBN(value);
  if (!validISBN(isbn)) throw new Error('Revisá el ISBN: debe tener 10 o 13 caracteres y un dígito de control válido.');
  const endpoints = [
    ['Google Books', `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=10`, googleRecord],
    ['Open Library', `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`, openLibraryRecord]
  ];
  const results = await Promise.all(endpoints.map(async ([source,url,parse]) => {
    try {
      const response = await fetcher(url,{signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout)});
      if (!response.ok) throw new Error('HTTP '+response.status);
      const book = parse(await response.json(),isbn);
      return {source,status:book?'found':'empty',book};
    } catch { return {source,status:'error'}; }
  }));
  if (signal?.aborted) throw new DOMException('Búsqueda cancelada','AbortError');
  const book = mergeMetadata(results.map(r=>r.book),isbn);
  return {book:book.title?book:null,results:results.map(({source,status})=>({source,status}))};
}
