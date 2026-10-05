// Local scope is explicit so a future remote repository can require tenant IDs.
// These are local prototype identifiers, not authenticated institutions.
export const LOCAL_SCOPE=Object.freeze({institutionId:'local-institution',libraryId:'local-library',collectionId:'local-collection'});
export const CIRCULATION_STATES=Object.freeze(['untracked','available','loaned','reserved','overdue','lost','withdrawn']);
export const RESERVATION_STATES=Object.freeze(['requested','approved','ready','collected','cancelled','expired']);
export function splitCatalogRecord(book){
 const {id,workId,editionId,title,subtitle,author,authors,subjects,contents,description,isbn,publisher,year,language,pages,edition,classification,identifiers,sources,exemplars}=book;
 return {work:{id:workId,title,subtitle,author,authors,subjects,contents,description},edition:{id:editionId,workId,isbn,publisher,year,language,pages,edition,classification,identifiers,sources},holdings:(exemplars||[]).map(e=>({...LOCAL_SCOPE,...e,editionId,recordId:id}))};
}
