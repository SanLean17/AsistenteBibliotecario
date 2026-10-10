export * from './storage/indexeddb.js?v=20261010-5';
import * as adapter from './storage/indexeddb.js?v=20261010-5';
export const repositoryMethods=['openDatabase','getBooks','saveBook','deleteBook','clearCatalog','mergeBooks','getPhotos','savePhoto','deletePhoto','deleteExemplar','getLoans','saveLoan','getReservations','saveReservation','getPatrons','savePatron','getActivity','appendActivity'];
export function createRepository(source){for(const method of repositoryMethods)if(typeof source[method]!=='function')throw new TypeError('Falta el método de almacenamiento: '+method);return Object.freeze(Object.fromEntries(repositoryMethods.map(key=>[key,source[key].bind(source)])));}
export const repository=createRepository(adapter);
