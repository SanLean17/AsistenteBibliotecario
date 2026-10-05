// Photos are separate from catalog records so listing/search never loads image bytes.
let database;
export function openDatabase() {
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('asistente-bibliotecario',2);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('books'))db.createObjectStore('books',{keyPath:'id'});if(!db.objectStoreNames.contains('photos')){const store=db.createObjectStore('photos',{keyPath:'id'});store.createIndex('bookId','bookId');}};
  request.onsuccess=()=>{database=request.result;database.onversionchange=()=>database.close();resolve();};
  request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Cerrá otras pestañas de la biblioteca e intentá otra vez.'));
 });
}
function transaction(stores,mode,action) {
 return new Promise((resolve,reject)=>{const tx=database.transaction(stores,mode);const result=action(tx);tx.oncomplete=()=>resolve(result?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('No se pudo guardar.'));});
}
function putBook(tx,book) {
 tx.objectStore('books').put(book);
 const cursor=tx.objectStore('photos').index('bookId').openCursor(IDBKeyRange.only(book.id));
 const valid=new Set((book.exemplars||[]).map(e=>e.id));
 cursor.onsuccess=()=>{const c=cursor.result;if(c){if(!valid.has(c.value.id))c.delete();c.continue();}};
}
export const getBooks=()=>transaction(['books'],'readonly',tx=>tx.objectStore('books').getAll());
export const saveBook=book=>transaction(['books','photos'],'readwrite',tx=>putBook(tx,book));
export const deleteBook=id=>transaction(['books','photos'],'readwrite',tx=>{tx.objectStore('books').delete(id);const req=tx.objectStore('photos').index('bookId').openCursor(IDBKeyRange.only(id));req.onsuccess=()=>{const c=req.result;if(c){c.delete();c.continue();}};});
export const clearCatalog=()=>transaction(['books','photos'],'readwrite',tx=>{tx.objectStore('books').clear();tx.objectStore('photos').clear();});
export const mergeBooks=(books,photos=[])=>transaction(['books','photos'],'readwrite',tx=>{for(const b of books)putBook(tx,b);for(const p of photos)tx.objectStore('photos').put(p);});
export const getPhotos=bookId=>transaction(['photos'],'readonly',tx=>bookId?tx.objectStore('photos').index('bookId').getAll(bookId):tx.objectStore('photos').getAll());
export const savePhoto=photo=>transaction(['books','photos'],'readwrite',tx=>{const req=tx.objectStore('books').get(photo.bookId);req.onsuccess=()=>{if(!req.result?.exemplars?.some(e=>e.id===photo.id)){tx.abort();return;}tx.objectStore('photos').put(photo);};});
export const deletePhoto=id=>transaction(['photos'],'readwrite',tx=>tx.objectStore('photos').delete(id));
export const deleteExemplar=(bookId,copyId)=>transaction(['books','photos'],'readwrite',tx=>{const req=tx.objectStore('books').get(bookId);req.onsuccess=()=>{const book=req.result;if(!book){tx.abort();return;}book.exemplars=book.exemplars.filter(e=>e.id!==copyId);book.copies=book.exemplars.length;book.updatedAt=new Date().toISOString();tx.objectStore('books').put(book);tx.objectStore('photos').delete(copyId);};});
