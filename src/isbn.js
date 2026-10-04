export const cleanISBN = value => String(value ?? '').replace(/[\s-]/g, '').toUpperCase();
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
