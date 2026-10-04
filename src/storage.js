// Storage boundary: future sync and image stores belong here, not in the UI.
let database;
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('asistente-bibliotecario', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('books', { keyPath: 'id' });
    request.onsuccess = () => { database = request.result; database.onversionchange = () => database.close(); resolve(); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Cerrá otras pestañas de la biblioteca e intentá otra vez.'));
  });
}
function transaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction('books', mode);
    const result = action(tx.objectStore('books'));
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('No se pudo guardar.'));
  });
}
export const getBooks = () => transaction('readonly', store => store.getAll());
export const saveBook = book => transaction('readwrite', store => store.put(book));
export const deleteBook = id => transaction('readwrite', store => store.delete(id));
export const mergeBooks = books => transaction('readwrite', store => { for (const book of books) store.put(book); });
