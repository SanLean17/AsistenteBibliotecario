import * as indexedDBAdapter from './storage/indexeddb.js?v=20261005-8';
export const repositoryMethods=[
 'openDatabase','getBooks','saveBook','deleteBook','clearCatalog','mergeBooks',
 'getPhotos','savePhoto','deletePhoto','deleteExemplar',
 'getLoans','saveLoan','getReservations','saveReservation',
 'getPatrons','savePatron','getActivity','appendActivity'
];
export function createRepository(adapter){
 for(const method of repositoryMethods)if(typeof adapter[method]!=='function')throw new TypeError('Falta el método de almacenamiento: '+method);
 return Object.freeze(Object.fromEntries(repositoryMethods.map(key=>[key,adapter[key].bind(adapter)])));
}
export const repository=createRepository(indexedDBAdapter);
export const {
 openDatabase,getBooks,saveBook,deleteBook,clearCatalog,mergeBooks,
 getPhotos,savePhoto,deletePhoto,deleteExemplar,
 getLoans,saveLoan,getReservations,saveReservation,
 getPatrons,savePatron,getActivity,appendActivity
}=repository;
