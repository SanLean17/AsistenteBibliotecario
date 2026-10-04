export const categories = ['Cuentos', 'Novela', 'Poesía', 'Informativo', 'Otros'];
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function searchBooks(books, query, category = '') {
  const words = normalize(query).trim().split(/\s+/);
  return books.filter(book => (!category || book.category === category) && words.every(word => normalize([book.title, book.author, book.isbn, book.publisher, book.location, ...book.contents].join(' ')).includes(word)));
}
export function validateBook(raw) {
  const text = (key, max) => String(raw[key] ?? '').trim().slice(0, max);
  const title = text('title', 180);
  if (!title) throw new Error('Escribí un título para el libro.');
  const copies = Number(raw.copies);
  if (!Number.isInteger(copies) || copies < 1 || copies > 9999) throw new Error('La cantidad de ejemplares debe ser un entero entre 1 y 9999.');
  const isbn = text('isbn', 24).replace(/[\s-]/g, '').toUpperCase();
  if (isbn) {
    const valid13 = /^\d{13}$/.test(isbn) && [...isbn].reduce((n, c, i) => n + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0;
    const valid10 = /^\d{9}[\dX]$/.test(isbn) && [...isbn].reduce((n, c, i) => n + (c === 'X' ? 10 : Number(c)) * (10 - i), 0) % 11 === 0;
    if (!valid13 && !valid10) throw new Error('Revisá el ISBN: debe ser un código válido de 10 o 13 caracteres. También podés dejarlo vacío.');
  }
  return { id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(), title, author: text('author', 160), isbn, category: categories.includes(raw.category) ? raw.category : 'Otros', publisher: text('publisher', 120), copies, location: text('location', 120), contents: (Array.isArray(raw.contents) ? raw.contents.join('\n') : String(raw.contents ?? '')).slice(0, 10000).split('\n').map(x => x.trim()).filter(Boolean), notes: text('notes', 5000), createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString(), cover: null };
}
export function parseBackup(text) {
  const data = JSON.parse(text);
  if (data.app !== 'asistente-bibliotecario' || data.version !== 1 || !Array.isArray(data.books) || data.books.length > 10000) throw new Error('El archivo no es un respaldo compatible de Asistente Bibliotecario.');
  const books = data.books.map(validateBook);
  if (new Set(books.map(b => b.id)).size !== books.length) throw new Error('El respaldo contiene identificadores repetidos.');
  return books;
}
