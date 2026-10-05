export const cleanISBN = value => String(value ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
export function validISBN(value) {
  const s = cleanISBN(value);
  return (/^(978|979)\d{10}$/.test(s) && [...s].reduce((n,c,i)=>n+Number(c)*(i%2?3:1),0)%10===0) ||
    (/^\d{9}[\dX]$/.test(s) && [...s].reduce((n,c,i)=>n+(c==='X'?10:Number(c))*(10-i),0)%11===0);
}
export function canonicalISBN(value) {
  const s = cleanISBN(value);
  if (!validISBN(s)) return '';
  if (s.length === 13) return s;
  const base = '978'+s.slice(0,9);
  return base + (10-[...base].reduce((n,c,i)=>n+Number(c)*(i%2?3:1),0)%10)%10;
}
export function isbn10From13(value) {
  const s = canonicalISBN(value);
  if (!/^978\d{10}$/.test(s)) return '';
  const body = s.slice(3,12);
  const sum = [...body].reduce((n,c,i)=>n+Number(c)*(10-i),0);
  const check = (11-(sum%11))%11;
  return body + (check===10?'X':String(check));
}
export function isbnVariants(value) {
  const clean = cleanISBN(value);
  if (!validISBN(clean)) return [];
  const canonical = canonicalISBN(clean);
  const ten = isbn10From13(canonical);
  return [...new Set([clean, canonical, ten].filter(Boolean))];
}
