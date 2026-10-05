// IndexedDB local para catálogo, fotos y circulación.
let database;
export function openDatabase() {
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('asistente-bibliotecario',3);
  request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains('books'))db.createObjectStore('books',{keyPath:'id'});
    if(!db.objectStoreNames.contains('photos')){
      const store=db.createObjectStore('photos',{keyPath:'id'});store.createIndex('bookId','bookId');
    }
    if(!db.objectStoreNames.contains('loans')){
      const store=db.createObjectStore('loans',{keyPath:'id'});store.createIndex('bookId','bookId');store.createIndex('exemplarId','exemplarId');store.createIndex('status','status');
    }
    if(!db.objectStoreNames.contains('reservations')){
      const store=db.createObjectStore('reservations',{keyPath:'id'});store.createIndex('bookId','bookId');store.createIndex('status','status');
    }
    if(!db.objectStoreNames.contains('patrons')){
      const store=db.createObjectStore('patrons',{keyPath:'id'});store.createIndex('role','role');
    }
    if(!db.objectStoreNames.contains('activity')){
      const store=db.createObjectStore('activity',{keyPath:'id'});store.createIndex('type','type');store.createIndex('createdAt','createdAt');
    }
  };
  request.onsuccess=()=>{database=request.result;database.onversionchange=()=>database.close();resolve();};
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error('Cerrá otras pestañas de la biblioteca e intentá otra vez.'));
 });
}
function transaction(stores,mode,action) {
 return new Promise((resolve,reject)=>{
  const tx=database.transaction(stores,mode);
  let result;
  try{result=action(tx);}catch(error){tx.abort();reject(error);return;}
  tx.oncomplete=()=>resolve(result?.result??result);
  tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error||new Error('No se pudo guardar.'));
 });
}
function putBook(tx,book) {
 tx.objectStore('books').put(book);
 const cursor=tx.objectStore('photos').index('bookId').openCursor(IDBKeyRange.only(book.id));
 const valid=new Set((book.exemplars||[]).map(e=>e.id));
 cursor.onsuccess=()=>{const c=cursor.result;if(c){if(!valid.has(c.value.id))c.delete();c.continue();}};
}
export const getBooks=()=>transaction(['books'],'readonly',tx=>tx.objectStore('books').getAll());
export const saveBook=book=>transaction(['books','photos'],'readwrite',tx=>putBook(tx,book));
export const deleteBook=id=>transaction(['books','photos','loans','reservations'],'readwrite',tx=>{
 tx.objectStore('books').delete(id);
 const photos=tx.objectStore('photos').index('bookId').openCursor(IDBKeyRange.only(id));photos.onsuccess=()=>{const c=photos.result;if(c){c.delete();c.continue();}};
 const loans=tx.objectStore('loans').index('bookId').openCursor(IDBKeyRange.only(id));loans.onsuccess=()=>{const c=loans.result;if(c){c.delete();c.continue();}};
 const reservations=tx.objectStore('reservations').index('bookId').openCursor(IDBKeyRange.only(id));reservations.onsuccess=()=>{const c=reservations.result;if(c){c.delete();c.continue();}};
});
export const clearCatalog=()=>transaction(['books','photos','loans','reservations','activity'],'readwrite',tx=>{
 tx.objectStore('books').clear();tx.objectStore('photos').clear();tx.objectStore('loans').clear();tx.objectStore('reservations').clear();tx.objectStore('activity').clear();
});
export const mergeBooks=(books,photos=[])=>transaction(['books','photos'],'readwrite',tx=>{for(const b of books)putBook(tx,b);for(const p of photos)tx.objectStore('photos').put(p);});
export const getPhotos=bookId=>transaction(['photos'],'readonly',tx=>bookId?tx.objectStore('photos').index('bookId').getAll(bookId):tx.objectStore('photos').getAll());
export const savePhoto=photo=>transaction(['books','photos'],'readwrite',tx=>{const req=tx.objectStore('books').get(photo.bookId);req.onsuccess=()=>{if(!req.result?.exemplars?.some(e=>e.id===photo.id)){tx.abort();return;}tx.objectStore('photos').put(photo);};});
export const deletePhoto=id=>transaction(['photos'],'readwrite',tx=>tx.objectStore('photos').delete(id));
export const deleteExemplar=(bookId,copyId)=>transaction(['books','photos','loans','reservations'],'readwrite',tx=>{
 const req=tx.objectStore('books').get(bookId);
 req.onsuccess=()=>{
  const book=req.result;if(!book){tx.abort();return;}
  const activeLoan=tx.objectStore('loans').index('exemplarId').getAll(copyId);
  activeLoan.onsuccess=()=>{
    if((activeLoan.result||[]).some(l=>['loaned','overdue'].includes(l.status))){tx.abort();return;}
    book.exemplars=book.exemplars.filter(e=>e.id!==copyId);book.copies=book.exemplars.length;book.updatedAt=new Date().toISOString();
    tx.objectStore('books').put(book);tx.objectStore('photos').delete(copyId);
  };
 };
});
export const getLoans=()=>transaction(['loans'],'readonly',tx=>tx.objectStore('loans').getAll());
export const saveLoan=loan=>transaction(['loans'],'readwrite',tx=>tx.objectStore('loans').put(loan));
export const getReservations=()=>transaction(['reservations'],'readonly',tx=>tx.objectStore('reservations').getAll());
export const saveReservation=reservation=>transaction(['reservations'],'readwrite',tx=>tx.objectStore('reservations').put(reservation));
export const getPatrons=()=>transaction(['patrons'],'readonly',tx=>tx.objectStore('patrons').getAll());
export const savePatron=patron=>transaction(['patrons'],'readwrite',tx=>tx.objectStore('patrons').put(patron));
export const getActivity=()=>transaction(['activity'],'readonly',tx=>tx.objectStore('activity').getAll());
export const appendActivity=entry=>transaction(['activity'],'readwrite',tx=>{
 const record={id:entry.id||crypto.randomUUID(),createdAt:entry.createdAt||new Date().toISOString(),...entry};
 return tx.objectStore('activity').put(record);
});
