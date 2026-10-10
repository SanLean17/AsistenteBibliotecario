import {canonicalISBN,isbnVariants} from '../isbn.js?v=20261010-5';
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
  return { title:v.title, subtitle:v.subtitle, authors:v.authors, publisher:v.publisher, year:v.publishedDate?.match(/\d{4}/)?.[0], pages:v.pageCount, language:v.language, subjects:v.categories, cover:safeCover(v.imageLinks?.extraLarge||v.imageLinks?.large||v.imageLinks?.medium||v.imageLinks?.thumbnail), description:v.description, publishedDate:v.publishedDate, edition:v.edition, sourceRecord:v, source:'Google Books' };
}
export function openLibraryRecord(data, isbn) {
  const variants=isbnVariants(isbn);
  const key=variants.map(v=>'ISBN:'+v).find(k=>data[k]);
  const v = key ? data[key] : null;
  if (!v?.title) return null;
  return { title:v.title, subtitle:v.subtitle, authors:v.authors?.map(a=>a.name), publisher:v.publishers?.map(p=>p.name).join('; '), year:v.publish_date?.match(/\d{4}/)?.[0], pages:v.number_of_pages, subjects:v.subjects?.map(s=>s.name), contents:v.table_of_contents?.map(c=>c.title).filter(Boolean), cover:safeCover(v.cover?.large || v.cover?.medium), description:typeof v.notes==='string'?v.notes:v.notes?.value, publishedDate:v.publish_date, sourceRecord:v, source:'Open Library' };
}
